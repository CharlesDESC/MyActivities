import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    // Table de suivi des migrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const { rows: applied } = await client.query<{ filename: string }>(
      'SELECT filename FROM schema_migrations ORDER BY filename',
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  ⏭  ${file} (déjà appliquée)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      console.log(`  ▶  ${file}`);
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file],
      );
      await client.query('COMMIT');
      console.log(`  ✅ ${file}`);
    }

    console.log('\nMigrations terminées.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration échouée :', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
