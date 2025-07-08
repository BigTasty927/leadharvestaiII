import { randomUUID } from "crypto";
import { db } from "./db";
import { sessions, leads, analyses, dataExports } from "@shared/schema";
import { eq, lt, desc, and, sql } from "drizzle-orm";

// Enhanced caching for session summaries and basic session data
const summaryCache = new Map<string, { data: SessionSummary; expiry: number }>();
const sessionCache = new Map<string, { session: any; expiry: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minute cache for better performance
const SESSION_CACHE_DURATION = 10 * 60 * 1000; // 10 minute cache for session data

// Fast lookup cache for polling endpoints - stores minimal data for ultra-fast responses
const fastSessionCache = new Map<string, { 
  id: string; 
  totalLeads: number; 
  analysisCount: number; 
  lastUpdate: number;
  expiry: number; 
}>();
const FAST_CACHE_DURATION = 2 * 60 * 1000; // 2 minute cache for polling

export interface SessionSummary {
  sessionId: string;
  totalLeads: number;
  averageConfidence: number;
  topPlatforms: { platform: string; count: number }[];
  analysisCount: number;
  exportCount: number;
  createdAt: Date;
  lastActivity: Date;
  status: string;
}

export interface SessionExportData {
  session: {
    id: string;
    createdAt: Date;
    lastActivity: Date;
    status: string;
    userEmail?: string;
    metadata?: any;
  };
  leads: any[];
  analyses: any[];
  exports: any[];
  summary: SessionSummary;
}

export class SessionService {
  /**
   * Creates a new session with a unique ID
   */
  async createSession(userEmail?: string, metadata?: any) {
    const sessionId = randomUUID();
    
    const [session] = await db
      .insert(sessions)
      .values({
        id: sessionId,
        status: 'active',
        userEmail,
        metadata
      })
      .returning();
    
    return session;
  }

  /**
   * Retrieves session data by ID with caching
   */
  async getSession(sessionId: string) {
    // Check cache first
    const cached = sessionCache.get(sessionId);
    if (cached && cached.expiry > Date.now()) {
      return cached.session;
    }

    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));
    
    // Cache the result
    if (session) {
      sessionCache.set(sessionId, {
        session,
        expiry: Date.now() + SESSION_CACHE_DURATION
      });
    }
    
    return session || null;
  }

  /**
   * Updates session activity timestamp
   */
  async updateSessionActivity(sessionId: string) {
    const [updatedSession] = await db
      .update(sessions)
      .set({ 
        lastActivity: new Date(),
        status: 'active'
      })
      .where(eq(sessions.id, sessionId))
      .returning();
    
    return updatedSession || null;
  }

  /**
   * Saves analysis results linked to a session
   */
  async saveAnalysisToSession(sessionId: string, analysisData: {
    videoUrl: string;
    platform: string;
    summary?: string;
    insights?: any;
    sentiment?: string;
    sentimentScore?: number;
    totalComments?: number;
    leadsFound?: number;
    rawData?: any;
  }) {
    // Update session activity
    await this.updateSessionActivity(sessionId);
    
    const [analysis] = await db
      .insert(analyses)
      .values({
        sessionId,
        ...analysisData,
        status: 'completed'
      })
      .returning();
    
    return analysis;
  }

  /**
   * Associates leads with a session
   */
  async associateLeadsWithSession(sessionId: string, leadIds: number[]) {
    if (leadIds.length === 0) return [];
    
    // Update session activity
    await this.updateSessionActivity(sessionId);
    
    const updatedLeads = await db
      .update(leads)
      .set({ sessionId })
      .where(sql`${leads.id} = ANY(${leadIds})`)
      .returning();
    
    return updatedLeads;
  }

  /**
   * Gets all data for a session (leads + analyses + exports) for export
   */
  async getSessionExportData(sessionId: string): Promise<SessionExportData | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    // Get all related data in parallel
    const [sessionLeads, sessionAnalyses, sessionExports] = await Promise.all([
      db.select().from(leads).where(eq(leads.sessionId, sessionId)),
      db.select().from(analyses).where(eq(analyses.sessionId, sessionId)),
      db.select().from(dataExports).where(eq(dataExports.sessionId, sessionId))
    ]);

    // Calculate summary
    const summary = await this.calculateSessionSummary(sessionId);

    return {
      session: {
        id: session.id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        status: session.status,
        userEmail: session.userEmail || undefined,
        metadata: session.metadata
      },
      leads: sessionLeads,
      analyses: sessionAnalyses,
      exports: sessionExports,
      summary
    };
  }

  /**
   * Calculates session summaries (total leads, avg confidence, top platforms)
   * Optimized version with caching and fewer database queries
   */
  async calculateSessionSummary(sessionId: string): Promise<SessionSummary> {
    // Check cache first
    const cached = summaryCache.get(sessionId);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    // Run all queries in parallel for better performance
    const [session, leadsResult, analysisResult, exportResult] = await Promise.all([
      this.getSession(sessionId),
      db.select({
        platform: leads.platform,
        confidenceScore: leads.confidenceScore
      }).from(leads).where(eq(leads.sessionId, sessionId)),
      db.select({ count: sql<number>`count(*)` }).from(analyses).where(eq(analyses.sessionId, sessionId)),
      db.select({ count: sql<number>`count(*)` }).from(dataExports).where(eq(dataExports.sessionId, sessionId))
    ]);

    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Calculate total leads
    const totalLeads = leadsResult.length;

    // Calculate average confidence score
    const validConfidenceScores = leadsResult
      .map(lead => lead.confidenceScore)
      .filter(score => score !== null && score !== undefined) as number[];
    
    const averageConfidence = validConfidenceScores.length > 0
      ? Math.round(validConfidenceScores.reduce((sum, score) => sum + score, 0) / validConfidenceScores.length)
      : 0;

    // Calculate top platforms
    const platformCounts = leadsResult.reduce((acc, lead) => {
      if (lead.platform) {
        acc[lead.platform] = (acc[lead.platform] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    const topPlatforms = Object.entries(platformCounts)
      .map(([platform, count]) => ({ platform, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5 platforms

    const analysisCount = analysisResult[0]?.count || 0;
    const exportCount = exportResult[0]?.count || 0;

    const summary = {
      sessionId,
      totalLeads,
      averageConfidence,
      topPlatforms,
      analysisCount,
      exportCount,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      status: session.status
    };

    // Cache the result
    summaryCache.set(sessionId, {
      data: summary,
      expiry: Date.now() + CACHE_DURATION
    });

    // Also update fast cache
    fastSessionCache.set(sessionId, {
      id: sessionId,
      totalLeads: summary.totalLeads,
      analysisCount: summary.analysisCount,
      lastUpdate: Date.now(),
      expiry: Date.now() + FAST_CACHE_DURATION
    });

    return summary;
  }

  /**
   * Ultra-fast session stats for polling - returns cached data instantly
   */
  async getFastSessionStats(sessionId: string) {
    // Check fast cache first
    const fastCached = fastSessionCache.get(sessionId);
    if (fastCached && fastCached.expiry > Date.now()) {
      return {
        sessionId,
        totalLeads: fastCached.totalLeads,
        analysisCount: fastCached.analysisCount,
        averageConfidence: 0,
        topPlatforms: [],
        exportCount: 0,
        createdAt: new Date(),
        lastActivity: new Date(),
        status: 'active'
      };
    }

    // Fall back to full calculation if not in fast cache
    return this.calculateSessionSummary(sessionId);
  }

  /**
   * Gets summaries for multiple sessions
   */
  async getSessionSummaries(sessionIds?: string[]): Promise<SessionSummary[]> {
    let allSessions;
    
    if (sessionIds && sessionIds.length > 0) {
      allSessions = await db
        .select()
        .from(sessions)
        .where(sql`${sessions.id} = ANY(${sessionIds})`)
        .orderBy(desc(sessions.lastActivity));
    } else {
      allSessions = await db
        .select()
        .from(sessions)
        .orderBy(desc(sessions.lastActivity));
    }
    
    const summaries = await Promise.all(
      allSessions.map(session => this.calculateSessionSummary(session.id))
    );

    return summaries;
  }

  /**
   * Cleans up old sessions (older than 48 hours)
   */
  async cleanupOldSessions(hoursOld: number = 48): Promise<{ expiredCount: number; deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - hoursOld);

    // First, mark old sessions as expired
    const expiredSessions = await db
      .update(sessions)
      .set({ status: 'expired' })
      .where(
        and(
          lt(sessions.lastActivity, cutoffDate),
          eq(sessions.status, 'active')
        )
      )
      .returning({ id: sessions.id });

    const expiredCount = expiredSessions.length;

    // Optionally delete very old sessions (older than 7 days)
    const deleteCutoffDate = new Date();
    deleteCutoffDate.setDate(deleteCutoffDate.getDate() - 7);

    const deletedSessions = await db
      .delete(sessions)
      .where(
        and(
          lt(sessions.lastActivity, deleteCutoffDate),
          eq(sessions.status, 'expired')
        )
      )
      .returning({ id: sessions.id });

    const deletedCount = deletedSessions.length;

    return { expiredCount, deletedCount };
  }

  /**
   * Creates an export record for a session
   */
  async createExport(sessionId: string, type: string, destination: string, metadata?: any) {
    // Update session activity
    await this.updateSessionActivity(sessionId);

    // Get session data to count records
    const sessionData = await this.getSessionExportData(sessionId);
    const recordCount = sessionData ? sessionData.leads.length + sessionData.analyses.length : 0;

    const [exportRecord] = await db
      .insert(dataExports)
      .values({
        sessionId,
        type,
        destination,
        status: 'pending',
        recordCount,
        metadata
      })
      .returning();

    return exportRecord;
  }

  /**
   * Updates an export record status
   */
  async updateExportStatus(exportId: number, status: string, completedAt?: Date) {
    const [updatedExport] = await db
      .update(dataExports)
      .set({ 
        status,
        completedAt: completedAt || (status === 'completed' ? new Date() : undefined)
      })
      .where(eq(dataExports.id, exportId))
      .returning();

    return updatedExport;
  }

  /**
   * Gets active sessions
   */
  async getActiveSessions() {
    return await db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'active'))
      .orderBy(desc(sessions.lastActivity));
  }

  /**
   * Expires a specific session
   */
  async expireSession(sessionId: string) {
    const [expiredSession] = await db
      .update(sessions)
      .set({ status: 'expired' })
      .where(eq(sessions.id, sessionId))
      .returning();

    return expiredSession;
  }
}

// Export singleton instance
export const sessionService = new SessionService();