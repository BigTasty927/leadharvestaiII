import { users, sessions, videoAnalyses, analyses, dataExports as exports, leads, type User, type InsertUser, type Session, type InsertSession, type VideoAnalysis, type InsertVideoAnalysis, type Analysis, type InsertAnalysis, type Export, type InsertExport, type Lead, type InsertLead } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Session management methods
  getSession(id: string): Promise<Session | undefined>;
  createSession(session: InsertSession): Promise<Session>;
  updateSessionActivity(id: string): Promise<Session | undefined>;
  updateSessionMetadata(id: string, metadata: any): Promise<Session | undefined>;
  expireSession(id: string): Promise<void>;
  getActiveSessions(): Promise<Session[]>;
  
  // Video analysis methods
  getAllVideoAnalyses(): Promise<VideoAnalysis[]>;
  getVideoAnalysis(id: number): Promise<VideoAnalysis | undefined>;
  createVideoAnalysis(analysis: InsertVideoAnalysis): Promise<VideoAnalysis>;
  updateVideoAnalysis(id: number, updates: Partial<InsertVideoAnalysis>): Promise<VideoAnalysis>;
  
  // Analysis methods (new comprehensive tracking)
  getAllAnalyses(): Promise<Analysis[]>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  getAnalysesBySession(sessionId: string): Promise<Analysis[]>;
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  updateAnalysis(id: number, updates: Partial<InsertAnalysis>): Promise<Analysis>;
  
  // Export methods
  getAllExports(): Promise<Export[]>;
  getExport(id: number): Promise<Export | undefined>;
  getExportsBySession(sessionId: string): Promise<Export[]>;
  createExport(exportData: InsertExport): Promise<Export>;
  updateExport(id: number, updates: Partial<InsertExport>): Promise<Export>;
  
  // Lead methods
  getAllLeads(): Promise<Lead[]>;
  getLeadsByVideoAnalysis(videoAnalysisId: number): Promise<Lead[]>;
  getLeadsBySession(sessionId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  createLeads(leads: InsertLead[]): Promise<Lead[]>;
  deleteLeadsBySession(sessionId: string): Promise<{ deletedCount: number }>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Session management methods
  async getSession(id: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(insertSession: InsertSession): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values(insertSession)
      .returning();
    return session;
  }

  async updateSessionActivity(id: string): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set({ lastActivity: new Date() })
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async updateSessionMetadata(id: string, metadata: any): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set({ metadata })
      .where(eq(sessions.id, id))
      .returning();
    return session || undefined;
  }

  async expireSession(id: string): Promise<void> {
    await db
      .update(sessions)
      .set({ status: 'expired' })
      .where(eq(sessions.id, id));
  }

  async getActiveSessions(): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.status, 'active'));
  }

  // Analysis methods
  async getAllAnalyses(): Promise<Analysis[]> {
    return await db.select().from(analyses);
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async getAnalysesBySession(sessionId: string): Promise<Analysis[]> {
    return await db.select().from(analyses).where(eq(analyses.sessionId, sessionId));
  }

  async createAnalysis(analysis: InsertAnalysis): Promise<Analysis> {
    const [created] = await db.insert(analyses).values(analysis).returning();
    return created;
  }

  async updateAnalysis(id: number, updates: Partial<InsertAnalysis>): Promise<Analysis> {
    const [updated] = await db
      .update(analyses)
      .set(updates)
      .where(eq(analyses.id, id))
      .returning();
    return updated;
  }

  // Export methods
  async getAllExports(): Promise<Export[]> {
    return await db.select().from(exports);
  }

  async getExport(id: number): Promise<Export | undefined> {
    const [exportRecord] = await db.select().from(exports).where(eq(exports.id, id));
    return exportRecord || undefined;
  }

  async getExportsBySession(sessionId: string): Promise<Export[]> {
    return await db.select().from(exports).where(eq(exports.sessionId, sessionId));
  }

  async createExport(exportData: InsertExport): Promise<Export> {
    const [created] = await db.insert(exports).values(exportData).returning();
    return created;
  }

  async updateExport(id: number, updates: Partial<InsertExport>): Promise<Export> {
    const [updated] = await db
      .update(exports)
      .set(updates)
      .where(eq(exports.id, id))
      .returning();
    return updated;
  }

  // Video analysis methods
  async getAllVideoAnalyses(): Promise<VideoAnalysis[]> {
    return await db.select().from(videoAnalyses);
  }

  async getVideoAnalysis(id: number): Promise<VideoAnalysis | undefined> {
    const [analysis] = await db.select().from(videoAnalyses).where(eq(videoAnalyses.id, id));
    return analysis || undefined;
  }

  async createVideoAnalysis(analysis: InsertVideoAnalysis): Promise<VideoAnalysis> {
    const [created] = await db.insert(videoAnalyses).values(analysis).returning();
    return created;
  }

  async updateVideoAnalysis(id: number, updates: Partial<InsertVideoAnalysis>): Promise<VideoAnalysis> {
    const [updated] = await db
      .update(videoAnalyses)
      .set(updates)
      .where(eq(videoAnalyses.id, id))
      .returning();
    return updated;
  }

  // Lead methods
  async getAllLeads(): Promise<Lead[]> {
    return await db.select().from(leads);
  }

  async getLeadsByVideoAnalysis(videoAnalysisId: number): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.videoAnalysisId, videoAnalysisId));
  }

  async getLeadsBySession(sessionId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.sessionId, sessionId));
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const [created] = await db.insert(leads).values(lead).returning();
    return created;
  }

  async createLeads(leadsData: InsertLead[]): Promise<Lead[]> {
    if (leadsData.length === 0) return [];
    return await db.insert(leads).values(leadsData).returning();
  }

  async deleteLeadsBySession(sessionId: string): Promise<{ deletedCount: number }> {
    const result = await db.delete(leads).where(eq(leads.sessionId, sessionId));
    return { deletedCount: result.rowCount || 0 };
  }
}

export const storage = new DatabaseStorage();