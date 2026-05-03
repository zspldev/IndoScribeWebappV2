import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, boolean, timestamp, integer, decimal, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const languages = pgTable("languages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  code: varchar("code", { length: 10 }).notNull(),
  script: varchar("script", { length: 50 }).notNull(),
  scriptFamily: varchar("script_family", { length: 50 }),
  fontFile: varchar("font_file", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const languageGroups = pgTable("language_groups", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const languageGroupLanguages = pgTable("language_group_languages", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => languageGroups.id, { onDelete: "cascade" }),
  languageId: integer("language_id").notNull().references(() => languages.id, { onDelete: "cascade" }),
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  planName: varchar("plan_name", { length: 100 }).notNull().unique(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  annualPrice: decimal("annual_price", { precision: 10, scale: 2 }).notNull().default("0"),
  totalMinutes: integer("total_minutes").notNull().default(0),
  daysLimit: integer("days_limit"),
  isActive: boolean("is_active").notNull().default(true),
  description: text("description"),
  features: jsonb("features").$type<string[]>().default([]),
  languageGroupId: integer("language_group_id").references(() => languageGroups.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 20 }),
  workplace: varchar("workplace", { length: 255 }).notNull().default("Organization/Freelance"),
  professionalGroup: varchar("professional_group", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  planId: integer("plan_id").references(() => plans.id).default(1),
  projectLimit: integer("project_limit").notNull().default(5),
  trialProjectsRemaining: integer("trial_projects_remaining").notNull().default(5),
  totalProjectsCompleted: integer("total_projects_completed").notNull().default(0),
  totalMinutesTranscribed: decimal("total_minutes_transcribed", { precision: 10, scale: 2 }).notNull().default("0"),
  consentAccepted: boolean("consent_accepted").notNull().default(false),
  consentDate: timestamp("consent_date"),
  trialEndsAt: timestamp("trial_ends_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("created"),
  audioFilename: varchar("audio_filename", { length: 255 }),
  audioDurationSeconds: integer("audio_duration_seconds"),
  audioData: text("audio_data"),
  audioS3Key: varchar("audio_s3_key", { length: 500 }),
  sampleRate: integer("sample_rate"),
  audioChannels: integer("audio_channels"),
  rawTranscript: text("raw_transcript"),
  formattedTranscript: text("formatted_transcript"),
  editedContent: text("edited_content"),
  sttProvider: varchar("stt_provider", { length: 50 }),
  sttJobId: varchar("stt_job_id", { length: 255 }),
  sttCostInr: decimal("stt_cost_inr", { precision: 10, scale: 4 }),
  exportedAt: timestamp("exported_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const providerConfig = pgTable("provider_config", {
  id: serial("id").primaryKey(),
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  primaryProvider: varchar("primary_provider", { length: 50 }).notNull(),
  fallbackProvider: varchar("fallback_provider", { length: 50 }),
  providerSettings: jsonb("provider_settings"),
  isActive: boolean("is_active").notNull().default(true),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const formattingCommandsDb = pgTable("formatting_commands_db", {
  id: serial("id").primaryKey(),
  languageCode: varchar("language_code", { length: 10 }).notNull(),
  commandType: varchar("command_type", { length: 50 }).notNull(),
  spokenForm: varchar("spoken_form", { length: 255 }).notNull(),
  output: varchar("output", { length: 255 }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const usageLog = pgTable("usage_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  action: varchar("action", { length: 50 }).notNull(),
  provider: varchar("provider", { length: 50 }),
  durationSeconds: integer("duration_seconds"),
  characterCount: integer("character_count"),
  costInr: decimal("cost_inr", { precision: 10, scale: 4 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const systemSettings = pgTable("system_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value"),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  ctaLabel: varchar("cta_label", { length: 100 }),
  ctaUrl: varchar("cta_url", { length: 500 }),
  targetType: varchar("target_type", { length: 20 }).notNull().default("all"),
  targetId: integer("target_id"),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const announcementDismissals = pgTable("announcement_dismissals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  announcementId: integer("announcement_id").notNull().references(() => announcements.id, { onDelete: "cascade" }),
  dismissedAt: timestamp("dismissed_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("uq_dismissals_user_announcement").on(table.userId, table.announcementId),
]);

export const translationsText = pgTable("translations_text", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  sourceLanguageCode: varchar("source_language_code", { length: 10 }).notNull(),
  targetLanguageCode: varchar("target_language_code", { length: 10 }).notNull(),
  translatedContent: text("translated_content"),
  editedContent: text("edited_content"),
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("uq_translations_project_lang").on(table.projectId, table.targetLanguageCode),
]);

export const transcriptions = pgTable("transcriptions", {
  id: serial("id").primaryKey(),
  languageId: integer("language_id").notNull().references(() => languages.id),
  audioFilename: varchar("audio_filename", { length: 255 }).notNull(),
  audioData: text("audio_data").notNull(),
  sampleRate: integer("sample_rate"),
  audioChannels: integer("audio_channels"),
  transcribedText: text("transcribed_text"),
  editedText: text("edited_text"),
  status: varchar("status", { length: 20 }).notNull().default("processing"),
  operationName: varchar("operation_name", { length: 500 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLanguageSchema = createInsertSchema(languages).omit({
  id: true,
  createdAt: true,
});

export const insertLanguageGroupSchema = createInsertSchema(languageGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,

});

export const insertLanguageGroupLanguageSchema = createInsertSchema(languageGroupLanguages).omit({
  id: true,
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true,
  trialProjectsRemaining: true,
  totalProjectsCompleted: true,
  totalMinutesTranscribed: true,
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  fullName: z.string().min(2, "Full name is required"),
  mobile: z.string().optional(),
  workplace: z.string().min(1, "Workplace is required"),
  professionalGroup: z.string().optional(),
  consentAccepted: z.boolean().refine(val => val === true, "You must accept the privacy policy"),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTranscriptionSchema = createInsertSchema(transcriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertLanguage = z.infer<typeof insertLanguageSchema>;
export type Language = typeof languages.$inferSelect;
export type InsertLanguageGroup = z.infer<typeof insertLanguageGroupSchema>;
export type LanguageGroup = typeof languageGroups.$inferSelect;
export type LanguageGroupLanguage = typeof languageGroupLanguages.$inferSelect;
export type LanguageGroupWithLanguages = LanguageGroup & { languages: Language[] };
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertTranscription = z.infer<typeof insertTranscriptionSchema>;
export type Transcription = typeof transcriptions.$inferSelect;
export const insertTranslationTextSchema = createInsertSchema(translationsText).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTranslationText = z.infer<typeof insertTranslationTextSchema>;
export type TranslationText = typeof translationsText.$inferSelect;

export type ProviderConfig = typeof providerConfig.$inferSelect;
export type FormattingCommandDb = typeof formattingCommandsDb.$inferSelect;
export type UsageLogEntry = typeof usageLog.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementDismissal = typeof announcementDismissals.$inferSelect;
