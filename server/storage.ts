import { type User, type Project, type Language, type Transcription, type ProviderConfig, type UsageLogEntry, type Plan, type TranslationText, type LanguageGroup, type LanguageGroupWithLanguages } from "@shared/schema";
import { users, projects, languages, transcriptions, providerConfig, usageLog, systemSettings, plans, translationsText, languageGroups, languageGroupLanguages } from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

export interface IStorage {
  getLanguages(): Promise<Language[]>;
  getLanguageById(id: number): Promise<Language | undefined>;

  createUser(data: { email: string; passwordHash: string; fullName: string; mobile?: string; workplace?: string; professionalGroup?: string; role?: string; consentAccepted: boolean; consentDate?: Date; planId?: number }): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  updateUserPlan(userId: number, planId: number): Promise<void>;

  createProject(data: Partial<Project>): Promise<Project>;
  getProjectById(id: number): Promise<Project | undefined>;
  getProjectsByUserId(userId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  getProviderConfigs(): Promise<ProviderConfig[]>;
  getProviderConfigByLanguage(languageCode: string): Promise<ProviderConfig | undefined>;
  upsertProviderConfig(data: Partial<ProviderConfig>): Promise<ProviderConfig>;

  logUsage(data: Partial<UsageLogEntry>): Promise<UsageLogEntry>;
  getUsageByUser(userId: number): Promise<UsageLogEntry[]>;
  getUsageStats(): Promise<any>;

  getSetting(key: string): Promise<any>;
  setSetting(key: string, value: any, updatedBy?: number): Promise<void>;

  createTranscription(transcription: Partial<Transcription>): Promise<Transcription>;
  getTranscriptionById(id: number): Promise<Transcription | undefined>;
  updateTranscription(id: number, updates: Partial<Transcription>): Promise<Transcription | undefined>;

  getPlans(): Promise<Plan[]>;
  getPlanById(id: number): Promise<Plan | undefined>;
  createPlan(data: Partial<Plan>): Promise<Plan>;
  updatePlan(id: number, updates: Partial<Plan>): Promise<Plan | undefined>;
  deletePlan(id: number): Promise<boolean>;

  countUsersByProfessionalGroup(group: string): Promise<number>;

  getTranslationsByProjectId(projectId: number): Promise<TranslationText[]>;
  getTranslationById(translationTextId: number): Promise<TranslationText | undefined>;
  getTranslationByProjectAndLang(projectId: number, targetLangCode: string): Promise<TranslationText | undefined>;
  createTranslationText(data: { projectId: number; sourceLanguageCode: string; targetLanguageCode: string; translatedContent: string; status: string }): Promise<TranslationText>;
  updateTranslationText(id: number, updates: Partial<TranslationText>): Promise<TranslationText | undefined>;

  getLanguageGroups(): Promise<LanguageGroup[]>;
  getLanguageGroupById(id: number): Promise<LanguageGroup | undefined>;
  getAllLanguageGroupsWithLanguages(): Promise<LanguageGroupWithLanguages[]>;
  getLanguagesByGroupId(groupId: number): Promise<Language[]>;
  getLanguagesByPlanId(planId: number): Promise<Language[]>;
  createLanguageGroup(data: { name: string; description?: string }): Promise<LanguageGroup>;
  updateLanguageGroup(id: number, updates: { name?: string; description?: string }): Promise<LanguageGroup | undefined>;
  deleteLanguageGroup(id: number): Promise<boolean>;
  setLanguageGroupLanguages(groupId: number, languageIds: number[]): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getLanguages(): Promise<Language[]> {
    return db.select().from(languages).where(eq(languages.isActive, true));
  }

  async getLanguageById(id: number): Promise<Language | undefined> {
    const [lang] = await db.select().from(languages).where(eq(languages.id, id));
    return lang;
  }

  async createUser(data: { email: string; passwordHash: string; fullName: string; mobile?: string; workplace?: string; professionalGroup?: string; role?: string; consentAccepted: boolean; consentDate?: Date; planId?: number }): Promise<User> {
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      mobile: data.mobile || null,
      workplace: data.workplace || "Organization/Freelance",
      professionalGroup: data.professionalGroup || null,
      role: data.role || "user",
      consentAccepted: data.consentAccepted,
      consentDate: data.consentDate || now,
      trialEndsAt,
      planId: data.planId || 1,
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [user] = await db.update(users).set({ ...updates, updatedAt: new Date() }).where(eq(users.id, id)).returning();
    return user;
  }

  async createProject(data: Partial<Project>): Promise<Project> {
    const [project] = await db.insert(projects).values(data as any).returning();
    return project;
  }

  async getProjectById(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectsByUserId(userId: number): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set({ ...updates, updatedAt: new Date() }).where(eq(projects.id, id)).returning();
    return project;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
  }

  async getProviderConfigs(): Promise<ProviderConfig[]> {
    return db.select().from(providerConfig);
  }

  async getProviderConfigByLanguage(languageCode: string): Promise<ProviderConfig | undefined> {
    const [config] = await db.select().from(providerConfig)
      .where(and(eq(providerConfig.languageCode, languageCode), eq(providerConfig.isActive, true)));
    return config;
  }

  async upsertProviderConfig(data: Partial<ProviderConfig>): Promise<ProviderConfig> {
    const existing = await this.getProviderConfigByLanguage(data.languageCode!);
    if (existing) {
      const [updated] = await db.update(providerConfig).set({ ...data, updatedAt: new Date() }).where(eq(providerConfig.id, existing.id)).returning();
      return updated;
    }
    const [created] = await db.insert(providerConfig).values(data as any).returning();
    return created;
  }

  async logUsage(data: Partial<UsageLogEntry>): Promise<UsageLogEntry> {
    const [entry] = await db.insert(usageLog).values(data as any).returning();
    return entry;
  }

  async getUsageByUser(userId: number): Promise<UsageLogEntry[]> {
    return db.select().from(usageLog).where(eq(usageLog.userId, userId)).orderBy(desc(usageLog.createdAt));
  }

  async getUsageStats(): Promise<any> {
    const totalUsers = await db.select({ count: sql<number>`count(*)` }).from(users);
    const activeProjects = await db.select({ count: sql<number>`count(*)` }).from(projects);
    const totalMinutes = await db.select({ total: sql<number>`coalesce(sum(duration_seconds), 0)` }).from(usageLog).where(eq(usageLog.action, "transcription"));
    const totalCost = await db.select({ total: sql<number>`coalesce(sum(cost_inr), 0)` }).from(usageLog);
    return {
      totalUsers: Number(totalUsers[0]?.count || 0),
      activeProjects: Number(activeProjects[0]?.count || 0),
      totalMinutesTranscribed: parseFloat((Number(totalMinutes[0]?.total || 0) / 60).toFixed(1)),
      totalCostInr: Number(totalCost[0]?.total || 0),
    };
  }

  async getSetting(key: string): Promise<any> {
    const [setting] = await db.select().from(systemSettings).where(eq(systemSettings.key, key));
    return setting?.value;
  }

  async setSetting(key: string, value: any, updatedBy?: number): Promise<void> {
    await db.insert(systemSettings).values({ key, value, updatedBy: updatedBy || null, updatedAt: new Date() })
      .onConflictDoUpdate({ target: systemSettings.key, set: { value, updatedBy: updatedBy || null, updatedAt: new Date() } });
  }

  async createTranscription(data: Partial<Transcription>): Promise<Transcription> {
    const [t] = await db.insert(transcriptions).values(data as any).returning();
    return t;
  }

  async getTranscriptionById(id: number): Promise<Transcription | undefined> {
    const [t] = await db.select().from(transcriptions).where(eq(transcriptions.id, id));
    return t;
  }

  async updateTranscription(id: number, updates: Partial<Transcription>): Promise<Transcription | undefined> {
    const [t] = await db.update(transcriptions).set(updates).where(eq(transcriptions.id, id)).returning();
    return t;
  }

  async getPlans(): Promise<Plan[]> {
    return db.select().from(plans).orderBy(plans.id);
  }

  async getPlanById(id: number): Promise<Plan | undefined> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, id));
    return plan;
  }

  async updateUserPlan(userId: number, planId: number): Promise<void> {
    await db.execute(sql`UPDATE users SET plan_id = ${planId}, updated_at = NOW() WHERE id = ${userId}`);
  }

  async createPlan(data: Partial<Plan>): Promise<Plan> {
    const [plan] = await db.insert(plans).values(data as any).returning();
    return plan;
  }

  async updatePlan(id: number, updates: Partial<Plan>): Promise<Plan | undefined> {
    const [plan] = await db.update(plans).set({ ...updates, updatedAt: new Date() }).where(eq(plans.id, id)).returning();
    return plan;
  }

  async deletePlan(id: number): Promise<boolean> {
    const result = await db.delete(plans).where(eq(plans.id, id)).returning();
    return result.length > 0;
  }

  async countUsersByProfessionalGroup(group: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.professionalGroup, group));
    return Number(result[0]?.count || 0);
  }

  async getTranslationsByProjectId(projectId: number): Promise<TranslationText[]> {
    return db.select().from(translationsText).where(eq(translationsText.projectId, projectId)).orderBy(translationsText.createdAt);
  }

  async getTranslationById(translationTextId: number): Promise<TranslationText | undefined> {
    const [t] = await db.select().from(translationsText).where(eq(translationsText.id, translationTextId));
    return t;
  }

  async getTranslationByProjectAndLang(projectId: number, targetLangCode: string): Promise<TranslationText | undefined> {
    const [t] = await db.select().from(translationsText).where(
      and(eq(translationsText.projectId, projectId), eq(translationsText.targetLanguageCode, targetLangCode))
    );
    return t;
  }

  async createTranslationText(data: { projectId: number; sourceLanguageCode: string; targetLanguageCode: string; translatedContent: string; status: string }): Promise<TranslationText> {
    const [t] = await db.insert(translationsText).values(data).returning();
    return t;
  }

  async updateTranslationText(id: number, updates: Partial<TranslationText>): Promise<TranslationText | undefined> {
    const [t] = await db.update(translationsText).set({ ...updates, updatedAt: new Date() }).where(eq(translationsText.id, id)).returning();
    return t;
  }

  async getLanguageGroups(): Promise<LanguageGroup[]> {
    return db.select().from(languageGroups).orderBy(languageGroups.id);
  }

  async getLanguageGroupById(id: number): Promise<LanguageGroup | undefined> {
    const [g] = await db.select().from(languageGroups).where(eq(languageGroups.id, id));
    return g;
  }

  async getAllLanguageGroupsWithLanguages(): Promise<LanguageGroupWithLanguages[]> {
    const groups = await db.select().from(languageGroups).orderBy(languageGroups.id);
    const result: LanguageGroupWithLanguages[] = [];
    for (const group of groups) {
      const langs = await this.getLanguagesByGroupId(group.id);
      result.push({ ...group, languages: langs });
    }
    return result;
  }

  async getLanguagesByGroupId(groupId: number): Promise<Language[]> {
    const rows = await db
      .select({ langId: languageGroupLanguages.languageId })
      .from(languageGroupLanguages)
      .where(eq(languageGroupLanguages.groupId, groupId));
    const ids = rows.map(r => r.langId);
    if (ids.length === 0) return [];
    return db.select().from(languages).where(inArray(languages.id, ids)).orderBy(languages.name);
  }

  async getLanguagesByPlanId(planId: number): Promise<Language[]> {
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId));
    if (!plan || !plan.languageGroupId) {
      return db.select().from(languages).where(eq(languages.isActive, true)).orderBy(languages.name);
    }
    const langs = await this.getLanguagesByGroupId(plan.languageGroupId);
    return langs.filter(l => l.isActive);
  }

  async createLanguageGroup(data: { name: string; description?: string }): Promise<LanguageGroup> {
    const [g] = await db.insert(languageGroups).values({ name: data.name, description: data.description ?? null }).returning();
    return g;
  }

  async updateLanguageGroup(id: number, updates: { name?: string; description?: string }): Promise<LanguageGroup | undefined> {
    const [g] = await db.update(languageGroups).set({ ...updates, updatedAt: new Date() }).where(eq(languageGroups.id, id)).returning();
    return g;
  }

  async deleteLanguageGroup(id: number): Promise<boolean> {
    const result = await db.delete(languageGroups).where(eq(languageGroups.id, id)).returning();
    return result.length > 0;
  }

  async setLanguageGroupLanguages(groupId: number, languageIds: number[]): Promise<void> {
    await db.delete(languageGroupLanguages).where(eq(languageGroupLanguages.groupId, groupId));
    if (languageIds.length > 0) {
      await db.insert(languageGroupLanguages).values(languageIds.map(lid => ({ groupId, languageId: lid })));
    }
  }
}

export const storage = new DatabaseStorage();
