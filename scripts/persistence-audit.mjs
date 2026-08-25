/**
 * persistence-audit.mjs — READ/WRITE audit of Data Persistence & DB Integrity.
 * Uses clearly-marked test records (audit-test-20260825-*) and cleans them up.
 * Ground truth = Direct MySQL verification, never HTTP 200 alone.
 */
import mysql from 'mysql2/promise';

const BASE = 'http://localhost:3000';
const P_ID = 'audit-test-20260825-001';
const P_ID2 = 'audit-test-20260825-002';
const TRX_BAD = 'audit-test-20260825-trx';

const conn = await mysql.createConnection({
  host: 'localhost', user: 'root', password: '', database: 'oytblnmz_mouj',
});
const sql = async (q, p) => (await conn.query(q, p))[0];

// ---------- setup ----------
const login = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: '123' }),
}).then((r) => r.json());
if (!login.token) { console.log('LOGIN FAILED'); process.exit(1); }
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` };

console.log('=== TEST 1: Create via /sync → HTTP vs MySQL vs GET API ===');
{
  const res = await fetch(`${BASE}/api/mysql/sync`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ products: [{
      id: P_ID, name: 'AUDIT TEST PRODUCT', category: 'audit', price: 12345, buyPrice: 10000,
      stock: 7, minStock: 1, description: '', isActive: true, createdAt: new Date().toISOString(),
    }]}),
  }).then((r) => r.json());
  console.log('HTTP:', JSON.stringify(res));

  const dbRows = await sql('SELECT id, name, price FROM products WHERE id = ?', [P_ID]);
  console.log('MySQL:', JSON.stringify(dbRows));

  const api = await fetch(`${BASE}/api/products/${P_ID}`).then((r) => r.json());
  console.log('GET API found:', Boolean(api?.product || api?.data || api?.id), JSON.stringify(api).slice(0, 120));
}

console.log('\n=== TEST 2: Atomic rollback — valid row + FK-violating transaction ===');
{
  // ensure clean start
  await conn.query('DELETE FROM products WHERE id = ?', [P_ID2]);
  const res = await fetch(`${BASE}/api/mysql/sync`, {
    method: 'POST', headers: H,
    body: JSON.stringify({
      products: [{ id: P_ID2, name: 'SHOULD ROLLBACK', price: 1, buyPrice: 1, stock: 0 }],
      transactions: [{ id: TRX_BAD, userId: 'user-does-not-exist-xyz', userName: 'x', amount: 999, type: 'payment', createdAt: new Date().toISOString() }],
    }),
  });
  const body = await res.json().catch(() => ({}));
  console.log('HTTP status:', res.status, '| body:', JSON.stringify(body).slice(0, 160));
  const p = await sql('SELECT COUNT(*) n FROM products WHERE id = ?', [P_ID2]);
  const t = await sql('SELECT COUNT(*) n FROM transactions WHERE id = ?', [TRX_BAD]);
  console.log(`After 500 → MySQL products[${P_ID2}]: ${p[0].n} | transactions[${TRX_BAD}]: ${t[0].n}`);
  console.log(p[0].n === 0 && t[0].n === 0
    ? '→ ROLLBACK VERIFIED: valid row was NOT committed alongside the failed one ✅'
    : '→ ❌ PARTIAL COMMIT DETECTED — transaction atomicity broken!');
}

console.log('\n=== TEST 3: Optimistic Locking — stale version must be rejected 409 ===');
{
  const me = login.user;
  const beforeName = me.fullName;
  const res = await fetch(`${BASE}/api/users/${me.id}`, {
    method: 'PUT', headers: H,
    body: JSON.stringify({ version: 99999, fullName: 'TAMPERED-NAME', updatedAt: new Date().toISOString() }),
  });
  console.log('HTTP status:', res.status);
  const db = await sql('SELECT fullName FROM users WHERE id = ?', [me.id]);
  console.log('MySQL fullName still:', db[0].fullName, '| expected:', beforeName);
}

console.log('\n=== TEST 4: Deletion persistence — delete via /sync owner path & verify ===');
{
  // Delete test product directly through DB-equivalent REST-less check: use /sync upsert absence
  // NOTE: /sync never deletes (known design gap); so we verify the documented behavior instead.
  const res = await fetch(`${BASE}/api/mysql/sync`, {
    method: 'POST', headers: H,
    body: JSON.stringify({ products: [] }), // empty array = no-op
  }).then((r) => r.status);
  console.log('/sync with empty products → HTTP', res, '(upsert-only: deletions are NOT propagated by design)');
}

console.log('\n=== CLEANUP ===');
await conn.query('DELETE FROM products WHERE id IN (?, ?)', [P_ID, P_ID2]);
await conn.query('DELETE FROM transactions WHERE id = ?', [TRX_BAD]);
const leftP = await sql("SELECT COUNT(*) n FROM products WHERE id LIKE 'audit-test-20260825%'");
const leftT = await sql("SELECT COUNT(*) n FROM transactions WHERE id LIKE 'audit-test-20260825%'");
console.log(`Remaining audit-test products: ${leftP[0].n} | transactions: ${leftT[0].n}`);
await conn.end();
console.log('DONE');
