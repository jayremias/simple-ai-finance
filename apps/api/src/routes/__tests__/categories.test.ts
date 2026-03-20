import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import type { CategoryResponse, CategoryTreeResponse } from '@moneylens/shared';
import { app } from '@/index';
import {
  bearerHeader,
  createAuthenticatedUser,
  createAuthenticatedUserWithOrg,
} from '@/tests/helpers/auth';
import { truncateAll } from '@/tests/helpers/db';

type ErrorResponse = { error: { code: string; message: string } };

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await truncateAll();
});

// ---------------------------------------------------------------------------
// GET /api/v1/categories
// ---------------------------------------------------------------------------

describe('GET /api/v1/categories', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/categories');
    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();
    const res = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(400);
  });

  test('returns seeded default categories as a tree', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as CategoryTreeResponse[];
    // Should have 12 default parent categories
    expect(body.length).toBe(12);
    // Each parent has children
    for (const cat of body) {
      expect(cat.children.length).toBeGreaterThan(0);
      expect(cat.isDefault).toBe(true);
      expect(cat.translationKey).not.toBeNull();
      expect(cat.parentId).toBeNull();
    }
  });

  test('children are nested under parents', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });

    const body = (await res.json()) as CategoryTreeResponse[];
    const food = body.find((c) => c.translationKey === 'food_dining');
    expect(food).toBeDefined();
    expect(food?.children.length).toBe(4);
    expect(food?.children.every((c) => c.parentId === food.id)).toBe(true);
    expect(food?.children.every((c) => c.translationKey?.startsWith('food_dining.'))).toBe(true);
  });

  test('custom categories are included in the tree', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets', icon: '🐶', color: '#F59E0B' }),
    });

    const res = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });

    const body = (await res.json()) as CategoryTreeResponse[];
    const pets = body.find((c) => c.name === 'Pets');
    expect(pets).toBeDefined();
    expect(pets?.isDefault).toBe(false);
    expect(pets?.translationKey).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/categories
// ---------------------------------------------------------------------------

describe('POST /api/v1/categories', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 400 when session has no active organization', async () => {
    const { token } = await createAuthenticatedUser();
    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets' }),
    });
    expect(res.status).toBe(400);
  });

  test('returns 400 for invalid body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  test('creates a root category', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets', icon: '🐶', color: '#F59E0B' }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as CategoryResponse;
    expect(body.id).toBeDefined();
    expect(body.name).toBe('Pets');
    expect(body.icon).toBe('🐶');
    expect(body.color).toBe('#F59E0B');
    expect(body.parentId).toBeNull();
    expect(body.translationKey).toBeNull();
    expect(body.isDefault).toBe(false);
  });

  test('creates a child category under a valid parent', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    // Get seeded categories to find a parent
    const listRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const tree = (await listRes.json()) as CategoryTreeResponse[];
    const food = tree.find((c) => c.translationKey === 'food_dining');
    if (!food) throw new Error('food_dining category not found');

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Açaí', parentId: food.id }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as CategoryResponse;
    expect(body.parentId).toBe(food.id);
  });

  test('returns 400 when parentId does not belong to the same org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bad Child', parentId: crypto.randomUUID() }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('INVALID_PARENT');
  });

  test('returns 400 when parentId points to a child category (no nesting beyond one level)', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const listRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const tree = (await listRes.json()) as CategoryTreeResponse[];
    const child = tree[0]?.children[0];
    if (!child) throw new Error('No child category found');

    const res = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Deep Nest', parentId: child.id }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as ErrorResponse;
    expect(body.error.code).toBe('INVALID_PARENT');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/categories/:id
// ---------------------------------------------------------------------------

describe('PATCH /api/v1/categories/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/categories/abc', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(401);
  });

  test('returns 404 when category does not exist or belongs to another org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/categories/${crypto.randomUUID()}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(404);
  });

  test('returns 400 for invalid body', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const listRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const tree = (await listRes.json()) as CategoryTreeResponse[];
    const cat = tree[0];
    if (!cat) throw new Error('No category found');

    const res = await app.request(`/api/v1/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' }),
    });
    expect(res.status).toBe(400);
  });

  test('updates name, icon, and color', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const listRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const tree = (await listRes.json()) as CategoryTreeResponse[];
    const cat = tree[0];
    if (!cat) throw new Error('No category found');

    const res = await app.request(`/api/v1/categories/${cat.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'My Housing', icon: '🏡', color: '#FF0000' }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as CategoryResponse;
    expect(body.name).toBe('My Housing');
    expect(body.icon).toBe('🏡');
    expect(body.color).toBe('#FF0000');
    // translationKey preserved even after rename
    expect(body.translationKey).toBe(cat.translationKey);
  });

  test('can clear icon and color by setting to null', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets', icon: '🐶', color: '#F59E0B' }),
    });
    const created = (await createRes.json()) as CategoryResponse;

    const res = await app.request(`/api/v1/categories/${created.id}`, {
      method: 'PATCH',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ icon: null, color: null }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as CategoryResponse;
    expect(body.icon).toBeNull();
    expect(body.color).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/categories/:id
// ---------------------------------------------------------------------------

describe('DELETE /api/v1/categories/:id', () => {
  test('returns 401 when not authenticated', async () => {
    const res = await app.request('/api/v1/categories/abc', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  test('returns 404 when category does not exist or belongs to another org', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const res = await app.request(`/api/v1/categories/${crypto.randomUUID()}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(res.status).toBe(404);
  });

  test('deletes a custom category', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const createRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets' }),
    });
    const created = (await createRes.json()) as CategoryResponse;

    const deleteRes = await app.request(`/api/v1/categories/${created.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });
    expect(deleteRes.status).toBe(200);

    // Confirm it's gone from the list
    const listRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const tree = (await listRes.json()) as CategoryTreeResponse[];
    expect(tree.find((c) => c.id === created.id)).toBeUndefined();
  });

  test('deleting a parent also deletes its children', async () => {
    const { token } = await createAuthenticatedUserWithOrg();
    const parentRes = await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Pets' }),
    });
    const parent = (await parentRes.json()) as CategoryResponse;

    await app.request('/api/v1/categories', {
      method: 'POST',
      headers: { ...bearerHeader(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dog Food', parentId: parent.id }),
    });

    await app.request(`/api/v1/categories/${parent.id}`, {
      method: 'DELETE',
      headers: bearerHeader(token),
    });

    const listRes = await app.request('/api/v1/categories', {
      headers: bearerHeader(token),
    });
    const tree = (await listRes.json()) as CategoryTreeResponse[];
    const found = tree.find((c) => c.name === 'Pets');
    expect(found).toBeUndefined();
  });
});
