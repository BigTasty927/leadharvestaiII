import { pgTable, text, serial, integer, boolean, timestamp, json, varchar, jsonb, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Sessions table for session management
export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivity: timestamp("last_activity").defaultNow().notNull(),
  status: text("status").default('active').notNull(),
  userEmail: text("user_email"),
  metadata: jsonb("metadata"),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const videoAnalyses = pgTable("video_analyses", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  platform: text("platform").notNull(), // youtube, tiktok, instagram
  title: text("title"),
  summary: text("summary"),
  leadCount: integer("lead_count").default(0),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New analyses table for comprehensive AI processing tracking
export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id),
  videoUrl: text("video_url").notNull(),
  platform: text("platform").notNull(),
  summary: text("summary"),
  insights: jsonb("insights"),
  sentiment: text("sentiment"),
  sentimentScore: real("sentiment_score"),
  totalComments: integer("total_comments"),
  leadsFound: integer("leads_found"),
  status: text("status").default('pending').notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  rawData: jsonb("raw_data"),
});

// New dataExports table for tracking data exports (renamed to avoid conflict with JavaScript exports)
export const dataExports = pgTable("exports", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").references(() => sessions.id),
  type: text("type").notNull(),
  destination: text("destination").notNull(),
  status: text("status").default('pending').notNull(),
  recordCount: integer("record_count"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  metadata: jsonb("metadata"),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  leadId: varchar("lead_id", { length: 100 }),
  sessionId: text("session_id").references(() => sessions.id), // New session reference
  videoAnalysisId: integer("video_analysis_id").references(() => videoAnalyses.id),
  
  // Core lead identification (matching JSON structure)
  username: varchar("username", { length: 100 }).notNull(),
  profileLink: varchar("profile_link", { length: 500 }),
  comment: text("comment").notNull(),
  
  // Lead qualification metrics (matching JSON structure)
  classification: varchar("classification", { length: 100 }), // "Interested Renter", "Potential Buyer", etc
  propertyType: varchar("property_type", { length: 50 }).default("rental"),
  confidenceScore: integer("confidence_score").default(50), // 0-100 percentage (renamed from confidence)
  urgencyLevel: varchar("urgency_level", { length: 20 }), // High, Medium, Low
  intentKeywords: text("intent_keywords").array().default([]), // ["available", "interested"]
  
  // Action planning (matching JSON structure)
  recommendedAction: text("recommended_action"),
  followUpTimeframe: varchar("follow_up_timeframe", { length: 100 }),
  
  // Legacy fields for backward compatibility
  priority: varchar("priority", { length: 20 }).default("medium"),
  type: varchar("type", { length: 50 }).default("rental"),
  
  // Source tracking
  platform: varchar("platform", { length: 20 }),
  videoUrl: varchar("video_url", { length: 500 }),
  
  createdAt: timestamp("created_at").defaultNow()
});

// Relations for better data management
export const sessionsRelations = relations(sessions, ({ many }) => ({
  leads: many(leads),
  analyses: many(analyses),
  exports: many(dataExports),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  session: one(sessions, {
    fields: [leads.sessionId],
    references: [sessions.id],
  }),
  videoAnalysis: one(videoAnalyses, {
    fields: [leads.videoAnalysisId],
    references: [videoAnalyses.id],
  }),
}));

export const analysesRelations = relations(analyses, ({ one }) => ({
  session: one(sessions, {
    fields: [analyses.sessionId],
    references: [sessions.id],
  }),
}));

export const exportsRelations = relations(dataExports, ({ one }) => ({
  session: one(sessions, {
    fields: [dataExports.sessionId],
    references: [sessions.id],
  }),
}));

// Insert schemas
export const insertSessionSchema = createInsertSchema(sessions).omit({
  createdAt: true,
  lastActivity: true,
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertVideoAnalysisSchema = createInsertSchema(videoAnalyses).pick({
  url: true,
  platform: true,
  title: true,
  summary: true,
  leadCount: true,
  status: true,
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
});

export const insertExportSchema = createInsertSchema(dataExports).omit({
  id: true,
  createdAt: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  leadId: true  // Remove required leadId since it can be auto-generated
}).extend({
  confidenceScore: z.number().min(0).max(100).default(50),
  intentKeywords: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  // Make leadId optional for when it's provided
  leadId: z.string().optional(),
  // Make legacy fields optional for backward compatibility
  type: z.string().optional(),
  priority: z.string().optional()
});

// Type definitions
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertVideoAnalysis = z.infer<typeof insertVideoAnalysisSchema>;
export type VideoAnalysis = typeof videoAnalyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;
export type Analysis = typeof analyses.$inferSelect;
export type InsertExport = z.infer<typeof insertExportSchema>;
export type Export = typeof dataExports.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
