/**
 * p0-cleanup.mjs — removes test artifacts created during the sync-guard live test.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: 'localhost', user: 'root', password: '', database: 'oytblnmz_mouj',
});
await conn.query("DELETE FROM transactions WHERE id = 'evil-trx'");
const [rows] = await conn.query("SELECT COUNT(*) AS n FROM transactions WHERE id = 'evil-trx'");
console.log('evil-trx remaining:', rows[0].n);
await conn.end();
