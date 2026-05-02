import { db } from "./db";
import { languages, providerConfig } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding database...");

  const languageEntries = [
    { name: "English", code: "en-IN", script: "Latin", isActive: true },
    { name: "Hindi", code: "hi-IN", script: "Devanagari", isActive: true },
    { name: "Marathi", code: "mr-IN", script: "Devanagari", isActive: true },
  ];

  for (const lang of languageEntries) {
    const existing = await db.select().from(languages).where(eq(languages.code, lang.code));
    if (existing.length === 0) {
      await db.insert(languages).values(lang);
    }
  }

  const langCodes = ["en-IN", "hi-IN", "mr-IN"];
  for (const code of langCodes) {
    const existing = await db.select().from(providerConfig).where(eq(providerConfig.languageCode, code));
    if (existing.length === 0) {
      await db.insert(providerConfig).values({
        languageCode: code,
        primaryProvider: "sarvam",
        fallbackProvider: "google",
        providerSettings: { model: "saarika:v2.5" },
        isActive: true,
      });
    }
  }

  console.log("Database seeded successfully!");
}

seed().catch((error) => {
  console.error("Error seeding database:", error);
  process.exit(1);
});
