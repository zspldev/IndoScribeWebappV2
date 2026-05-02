import { pool } from "./db";

async function migrateTranslations() {
  const client = await pool.connect();
  try {
    console.log("Starting translations_text migration on AWS RDS...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS translations_text (
        id SERIAL PRIMARY KEY,
        project_id INTEGER NOT NULL REFERENCES projects(id),
        source_language_code VARCHAR(10) NOT NULL,
        target_language_code VARCHAR(10) NOT NULL,
        translated_content TEXT,
        edited_content TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE(project_id, target_language_code)
      );
    `);
    console.log("translations_text table created/verified.");

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_translations_text_project_id ON translations_text(project_id);
    `);
    console.log("Index on project_id created/verified.");

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}

migrateTranslations().then(() => process.exit(0)).catch(() => process.exit(1));
