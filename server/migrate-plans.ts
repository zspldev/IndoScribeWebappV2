import { pool } from "./db";

async function migratePlans() {
  const client = await pool.connect();
  try {
    console.log("Starting plans migration on AWS RDS...");

    await client.query(`
      CREATE TABLE IF NOT EXISTS plans (
        id SERIAL PRIMARY KEY,
        plan_name VARCHAR(100) NOT NULL UNIQUE,
        monthly_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        annual_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        total_minutes INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log("Plans table created/verified.");

    await client.query(`
      INSERT INTO plans (plan_name, monthly_price, annual_price, total_minutes, is_active, description)
      VALUES ('Starter', 0.00, 0.00, 120, TRUE, 'Free starter plan with 120 minutes of transcription')
      ON CONFLICT (plan_name) DO NOTHING;
    `);
    console.log("Starter plan seeded.");

    const columnChecks = [
      { col: "workplace", sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS workplace VARCHAR(255) NOT NULL DEFAULT 'Organization/Freelance'" },
      { col: "professional_group", sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS professional_group VARCHAR(255)" },
      { col: "plan_id", sql: "ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_id INTEGER REFERENCES plans(id) DEFAULT 1" },
    ];

    for (const check of columnChecks) {
      await client.query(check.sql);
      console.log(`Column ${check.col} added/verified.`);
    }

    await client.query("UPDATE users SET plan_id = 1 WHERE plan_id IS NULL");
    console.log("Existing users assigned to Starter plan.");

    console.log("Migration complete!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    client.release();
  }
}

migratePlans().then(() => process.exit(0)).catch(() => process.exit(1));
