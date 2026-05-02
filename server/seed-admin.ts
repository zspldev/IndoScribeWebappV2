import bcrypt from "bcryptjs";
import { storage } from "./storage";

export async function seedAdminUser() {
  try {
    const existing = await storage.getUserByEmail("iswav2admin");
    if (existing) {
      console.log("Admin user already exists");
      return;
    }

    const passwordHash = await bcrypt.hash("adminmdk", 12);

    await storage.createUser({
      email: "iswav2admin",
      passwordHash,
      fullName: "ISP Admin",
      role: "admin",
      workplace: "Zapurzaa Systems",
      consentAccepted: true,
      consentDate: new Date(),
      planId: 1,
    });

    console.log("Admin user created: iswav2admin");
  } catch (error) {
    console.error("Error seeding admin user:", error);
  }
}
