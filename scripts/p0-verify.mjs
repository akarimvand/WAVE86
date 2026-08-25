/**
 * p0-verify.mjs — read-only verification of password hash state.
 */
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: 'root',
  password: '',
  database: process.env.DB_NAME || 'oytblnmz_mouj',
});
const [r] = await conn.query('SELECT COUNT(*) AS suspicious FROM users WHERE CHAR_LENGTH(password) < 30');
const [b] = await conn.query('SELECT COUNT(*) AS total FROM users');
console.log(`suspicious(short/plaintext): ${r[0].suspicious} of ${b[0].total}`);
await conn.end();
