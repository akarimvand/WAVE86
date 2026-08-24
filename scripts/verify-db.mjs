/** verify-db.mjs — تأیید ساختار پس از بازسازی */
import mysql from 'mysql2/promise';

const HOST = process.env.DB_HOST || 'localhost';
const PORT = Number(process.env.DB_PORT) || 3306;
const USER = process.env.DB_USER || 'root';
const PASS = process.env.DB_PASSWORD ?? '';
const DB_NAME = process.env.DB_NAME || 'qdexnhxv_mouj';

const conn = await mysql.createConnection({ host: HOST, port: PORT, user: USER, password: PASS, database: DB_NAME });

const [fks] = await conn.query(
  `SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME
   FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? ORDER BY TABLE_NAME`, [DB_NAME]);
console.log(`Foreign Keys (${fks.length}):`);
fks.forEach(f => console.log(`  - ${f.TABLE_NAME}.${f.CONSTRAINT_NAME} -> ${f.REFERENCED_TABLE_NAME}`));

const [decimals] = await conn.query(
  `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ? AND DATA_TYPE='decimal' ORDER BY TABLE_NAME`, [DB_NAME]);
console.log(`\nDECIMAL money columns (${decimals.length}):`);
decimals.forEach(d => console.log(`  - ${d.TABLE_NAME}.${d.COLUMN_NAME} ${d.COLUMN_TYPE}`));

const [doubles] = await conn.query(
  `SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ? AND DATA_TYPE='double' ORDER BY TABLE_NAME`, [DB_NAME]);
console.log(`\nRemaining DOUBLE columns (${doubles.length}):`);
doubles.forEach(d => console.log(`  - ${d.TABLE_NAME}.${d.COLUMN_NAME}`));

const [versions] = await conn.query(
  `SELECT TABLE_NAME FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = ? AND COLUMN_NAME='version' ORDER BY TABLE_NAME`, [DB_NAME]);
console.log(`\nTables with version column (${versions.length}): ${versions.map(v=>v.TABLE_NAME).join(', ')}`);

// Ground-truth check of one FK table
const [ddl] = await conn.query('SHOW CREATE TABLE `enrollments`');
console.log('\n--- SHOW CREATE TABLE enrollments ---');
console.log(ddl[0]['Create Table']);

await conn.end();
