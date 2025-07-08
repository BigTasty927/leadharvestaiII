// Shared types for session management across frontend and backend

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

export interface CreateSessionRequest {
  userEmail?: string;
  metadata?: any;
}

export interface CreateAnalysisRequest {
  sessionId: string;
  videoUrl: string;
  platform: string;
  summary?: string;
  insights?: any;
  sentiment?: string;
  sentimentScore?: number;
  totalComments?: number;
  leadsFound?: number;
  rawData?: any;
}

export interface CreateExportRequest {
  sessionId: string;
  type: string;
  destination: string;
  metadata?: any;
}

export interface AssociateLeadsRequest {
  sessionId: string;
  leadIds: number[];
}

export interface CleanupResult {
  expiredCount: number;
  deletedCount: number;
}