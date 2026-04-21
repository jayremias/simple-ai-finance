/**
 * Billing setup script — idempotent.
 * Creates Stripe product/prices verification + RevenueCat entitlements, products,
 * offerings, and packages via the RC Management API v2.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY          — Stripe secret key (sk_live_... or sk_test_...)
 *   REVENUECAT_SECRET_API_KEY  — RC secret key (sk_...) from dashboard → API Keys
 *   REVENUECAT_PROJECT_ID      — RC project ID from dashboard → Project Settings
 *   REVENUECAT_STRIPE_APP_ID   — RC app ID for your Stripe app (dashboard → Apps)
 *
 * Run:
 *   bun run src/scripts/setup-billing.ts
 */

import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY ?? '';
const RC_SECRET_API_KEY = process.env.REVENUECAT_SECRET_API_KEY ?? '';
const RC_PROJECT_ID = process.env.REVENUECAT_PROJECT_ID ?? '';
const RC_STRIPE_APP_ID = process.env.REVENUECAT_STRIPE_APP_ID ?? '';

// Known Stripe IDs
const STRIPE_PRODUCT_ID = 'prod_UNVWOlkN4Fcgua';
const STRIPE_PRICE_MONTHLY = 'price_1TOkVaRIo9q2LYEhKvKjHCdN';
const STRIPE_PRICE_ANNUAL = 'price_1TOkVaRIo9q2LYEhRJaZPywP';

const RC_BASE = 'https://api.revenuecat.com/v2';

function requireEnv() {
  const missing = [
    !STRIPE_SECRET_KEY && 'STRIPE_SECRET_KEY',
    !RC_SECRET_API_KEY && 'REVENUECAT_SECRET_API_KEY',
    !RC_PROJECT_ID && 'REVENUECAT_PROJECT_ID',
    !RC_STRIPE_APP_ID && 'REVENUECAT_STRIPE_APP_ID',
  ].filter(Boolean);

  if (missing.length > 0) {
    console.error('Missing required env vars:', missing.join(', '));
    process.exit(1);
  }
}

async function rcRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const response = await fetch(`${RC_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${RC_SECRET_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as { message?: string };
    // 409 = already exists — treat as success for idempotency
    if (response.status === 409) return data;
    throw new Error(`RC API ${method} ${path} failed ${response.status}: ${error.message}`);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Step 1 — Verify Stripe product & prices
// ---------------------------------------------------------------------------

async function verifyStripe() {
  console.log('\n[1/5] Verifying Stripe product and prices...');
  const stripe = new Stripe(STRIPE_SECRET_KEY);

  const product = await stripe.products.retrieve(STRIPE_PRODUCT_ID);
  console.log(`  ✓ Product: ${product.name} (${product.id})`);

  const monthly = await stripe.prices.retrieve(STRIPE_PRICE_MONTHLY);
  console.log(
    `  ✓ Monthly price: ${monthly.unit_amount ? monthly.unit_amount / 100 : '?'} ${monthly.currency?.toUpperCase()} / ${monthly.recurring?.interval}`
  );

  const annual = await stripe.prices.retrieve(STRIPE_PRICE_ANNUAL);
  console.log(
    `  ✓ Annual price:  ${annual.unit_amount ? annual.unit_amount / 100 : '?'} ${annual.currency?.toUpperCase()} / ${annual.recurring?.interval}`
  );
}

// ---------------------------------------------------------------------------
// Step 2 — Create RC entitlement
// ---------------------------------------------------------------------------

async function createEntitlement(): Promise<string> {
  console.log('\n[2/5] Creating RevenueCat entitlement...');

  const result = (await rcRequest('POST', `/projects/${RC_PROJECT_ID}/entitlements`, {
    lookup_key: 'premium',
    display_name: 'Premium',
  })) as { id: string; lookup_key: string };

  console.log(`  ✓ Entitlement: ${result.lookup_key} (${result.id})`);
  return result.id;
}

// ---------------------------------------------------------------------------
// Step 3 — Create RC products (Stripe price IDs as store identifiers)
// ---------------------------------------------------------------------------

async function createProducts(): Promise<{ monthlyId: string; annualId: string }> {
  console.log('\n[3/5] Creating RevenueCat products...');

  const monthly = (await rcRequest('POST', `/projects/${RC_PROJECT_ID}/products`, {
    store_identifier: STRIPE_PRICE_MONTHLY,
    type: 'subscription',
    app_id: RC_STRIPE_APP_ID,
  })) as { id: string; store_identifier: string };

  console.log(`  ✓ Monthly product: ${monthly.store_identifier} (${monthly.id})`);

  const annual = (await rcRequest('POST', `/projects/${RC_PROJECT_ID}/products`, {
    store_identifier: STRIPE_PRICE_ANNUAL,
    type: 'subscription',
    app_id: RC_STRIPE_APP_ID,
  })) as { id: string; store_identifier: string };

  console.log(`  ✓ Annual product:  ${annual.store_identifier} (${annual.id})`);

  return { monthlyId: monthly.id, annualId: annual.id };
}

// ---------------------------------------------------------------------------
// Step 4 — Create RC offering + packages
// ---------------------------------------------------------------------------

async function createOffering(monthlyProductId: string, annualProductId: string): Promise<void> {
  console.log('\n[4/5] Creating RevenueCat offering and packages...');

  const offering = (await rcRequest('POST', `/projects/${RC_PROJECT_ID}/offerings`, {
    lookup_key: 'default',
    display_name: 'Default',
  })) as { id: string; lookup_key: string };

  console.log(`  ✓ Offering: ${offering.lookup_key} (${offering.id})`);

  const monthlyPackage = (await rcRequest(
    'POST',
    `/projects/${RC_PROJECT_ID}/offerings/${offering.id}/packages`,
    { lookup_key: '$monthly', display_name: 'Monthly', position: 2 }
  )) as { id: string; lookup_key: string };

  console.log(`  ✓ Package: ${monthlyPackage.lookup_key} (${monthlyPackage.id})`);

  const annualPackage = (await rcRequest(
    'POST',
    `/projects/${RC_PROJECT_ID}/offerings/${offering.id}/packages`,
    { lookup_key: '$annual', display_name: 'Annual', position: 1 }
  )) as { id: string; lookup_key: string };

  console.log(`  ✓ Package: ${annualPackage.lookup_key} (${annualPackage.id})`);

  // Attach products to packages
  await rcRequest(
    'POST',
    `/projects/${RC_PROJECT_ID}/offerings/${offering.id}/packages/${monthlyPackage.id}/products`,
    { product_id: monthlyProductId }
  );
  console.log('  ✓ Monthly product → monthly package');

  await rcRequest(
    'POST',
    `/projects/${RC_PROJECT_ID}/offerings/${offering.id}/packages/${annualPackage.id}/products`,
    { product_id: annualProductId }
  );
  console.log('  ✓ Annual product → annual package');
}

// ---------------------------------------------------------------------------
// Step 5 — Attach products to entitlement
// ---------------------------------------------------------------------------

async function attachProductsToEntitlement(
  entitlementId: string,
  monthlyProductId: string,
  annualProductId: string
): Promise<void> {
  console.log('\n[5/5] Attaching products to entitlement...');

  await rcRequest(
    'POST',
    `/projects/${RC_PROJECT_ID}/entitlements/${entitlementId}/actions/attach_products`,
    { product_ids: [monthlyProductId, annualProductId] }
  );

  console.log('  ✓ Monthly + Annual products → premium entitlement');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('MoneyLens billing setup');
  console.log('=======================');

  requireEnv();

  await verifyStripe();
  const entitlementId = await createEntitlement();
  const { monthlyId, annualId } = await createProducts();
  await createOffering(monthlyId, annualId);
  await attachProductsToEntitlement(entitlementId, monthlyId, annualId);

  console.log('\n✓ Billing setup complete.');
  console.log('\nNext steps:');
  console.log('  1. In RC dashboard → Apps, copy the Stripe app webhook URL');
  console.log('  2. Add it in Stripe → Webhooks pointing to your API /webhooks/revenuecat');
  console.log('  3. Set REVENUECAT_WEBHOOK_SECRET from the RC webhook secret');
}

main().catch((error: unknown) => {
  console.error('\nSetup failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
