import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

const app = new Hono();

app.use('*', logger());
app.use('*', cors());

app.get('/', (c) => c.json({ name: 'MoneyLens API', version: '1.0.0' }));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes (to be added per feature phase)
// app.route('/api/v1/auth', authRoutes);
// app.route('/api/v1/accounts', accountRoutes);
// app.route('/api/v1/transactions', transactionRoutes);

export default {
  port: Bun.env['PORT'] ?? 3000,
  fetch: app.fetch,
};
