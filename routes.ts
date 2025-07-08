import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { insertVideoAnalysisSchema, insertLeadSchema, type Lead, sessions } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { ZodError } from "zod";
import { sendUrlToWebhook, extractUrlFromMessage, detectPlatform } from "./webhook";
import { log } from "./vite";
import { sessionService } from "./sessionService";
import { sessionMiddleware } from "./middleware/sessionMiddleware";
import type { 
  CreateSessionRequest, 
  CreateAnalysisRequest, 
  CreateExportRequest, 
  AssociateLeadsRequest 
} from "@shared/sessionTypes";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Apply session middleware to specific routes
  app.use(["/api/chat", "/api/webhook", "/api/session", "/api/export"], sessionMiddleware);

  // Session Data Export Endpoints
  
  // GET /api/session - returns ultra-fast session summary for stats display
  app.get("/api/session", async (req, res) => {
    try {
      const sessionId = req.sessionId;
      
      // Set aggressive caching headers for browser
      res.set({
        'Cache-Control': 'public, max-age=30', // 30 second browser cache
        'ETag': `"session-${sessionId}-${Math.floor(Date.now() / 30000)}"` // ETag changes every 30 seconds
      });
      
      const summary = await sessionService.calculateSessionSummary(sessionId);
      
      res.json({ 
        session: {
          id: sessionId
        },
        summary 
      });
    } catch (error: any) {
      console.error("Error fetching session summary:", error);
      res.status(500).json({ error: "Failed to fetch session summary" });
    }
  });

  // GET /api/session/export - returns full session data for exports
  app.get("/api/session/export", async (req, res) => {
    try {
      const sessionId = req.sessionId;
      const sessionData = await sessionService.getSessionExportData(sessionId);
      
      if (!sessionData) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(sessionData);
    } catch (error: any) {
      console.error("Error fetching session data:", error);
      res.status(500).json({ error: "Failed to fetch session data" });
    }
  });

  // POST /api/session/update - update session with user name
  app.post("/api/session/update", async (req, res) => {
    try {
      const sessionId = req.sessionId;
      const { userName } = req.body;
      
      if (!userName || typeof userName !== 'string') {
        return res.status(400).json({ error: "Valid userName is required" });
      }
      
      // Update session metadata with user name
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      const updatedMetadata = session.metadata ? 
        { ...session.metadata, userName: userName.trim() } : 
        { userName: userName.trim() };
      
      await db.update(sessions)
        .set({ 
          metadata: updatedMetadata,
          lastActivity: new Date()
        })
        .where(eq(sessions.id, sessionId));
      
      res.json({ success: true, userName: userName.trim() });
    } catch (error: any) {
      console.error("Error updating session with user name:", error);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // POST /api/export/sheets - exports to Google Sheets via Make.com webhook
  app.post("/api/export/sheets", async (req, res) => {
    try {
      const { email } = req.body;
      const sessionId = req.sessionId;
      
      if (!email || !email.includes('@')) {
        return res.status(400).json({ error: "Valid email address is required for Google Sheets access" });
      }
      
      // Get session data for export
      const sessionData = await sessionService.getSessionExportData(sessionId);
      if (!sessionData) {
        return res.status(404).json({ error: "Session not found or no data to export" });
      }
      
      // Create export record
      const exportRecord = await sessionService.createExport(sessionId, "google_sheets", email, {
        userEmail: email,
        exportFormat: "google_sheets",
        timestamp: new Date().toISOString()
      });
      
      // Prepare data for Google Sheets webhook (only specific fields)
      const cleanedLeads = sessionData.leads.map(lead => ({
        username: lead.username,
        profileLink: lead.profileLink,
        comment: lead.comment,
        classification: lead.classification,
        propertyType: lead.propertyType,
        confidenceScore: lead.confidenceScore,
        priority: lead.priority,
        recommendedAction: lead.recommendedAction,
        followUpTimeframe: lead.followUpTimeframe,
        platform: lead.platform,
        videoUrl: lead.videoUrl
      }));
      
      // Extract user name from session metadata
      const userName = sessionData.session.metadata?.userName || 'Anonymous User';
      
      const sheetsData = {
        sessionId,
        email,
        userName,
        exportId: exportRecord.id,
        leads: cleanedLeads,
        summary: sessionData.summary,
        analyses: sessionData.analyses,
        timestamp: new Date().toISOString()
      };
      
      // Send to Make.com Google Sheets webhook
      const webhookUrl = process.env.MAKE_GOOGLE_SHEETS_WEBHOOK_URL || "https://hook.us1.make.com/YOUR_WEBHOOK_ID_HERE";
      
      // Log the export data
      log(`📊 Google Sheets export - UserName: "${sheetsData.userName}", Email: ${sheetsData.email}, Leads: ${sheetsData.leads.length}`);
      
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sheetsData)
        });
        
        if (response.ok) {
          await sessionService.updateExportStatus(exportRecord.id, "completed", new Date());
          
          // Delete leads after successful export
          const deleteResult = await storage.deleteLeadsBySession(sessionId);
          log(`🗑️ Deleted ${deleteResult.deletedCount} leads after Google Sheets export for session ${sessionId}`);
          
          log(`Google Sheets export successful for session ${sessionId}, email: ${email}, ${deleteResult.deletedCount} leads exported and deleted`);
          
          res.json({
            success: true,
            message: "Export sent to Google Sheets successfully",
            exportId: exportRecord.id,
            email
          });
        } else {
          await sessionService.updateExportStatus(exportRecord.id, "failed");
          throw new Error(`Webhook failed with status: ${response.status}`);
        }
      } catch (webhookError) {
        await sessionService.updateExportStatus(exportRecord.id, "failed");
        console.error("Google Sheets webhook error:", webhookError);
        res.status(500).json({ 
          error: "Failed to send data to Google Sheets",
          details: webhookError instanceof Error ? webhookError.message : 'Unknown error'
        });
      }
      
    } catch (error: any) {
      console.error("Error exporting to Google Sheets:", error);
      res.status(500).json({ error: "Failed to export to Google Sheets" });
    }
  });

  // GET /api/export/csv - downloads session data as CSV
  app.get("/api/export/csv", async (req, res) => {
    try {
      const sessionId = req.sessionId;
      
      // Get session data
      const sessionData = await sessionService.getSessionExportData(sessionId);
      if (!sessionData) {
        return res.status(404).json({ error: "Session not found or no data to export" });
      }
      
      // Create export record
      const exportRecord = await sessionService.createExport(sessionId, "csv", "download", {
        exportFormat: "csv",
        timestamp: new Date().toISOString()
      });
      
      // Generate CSV content
      let csvContent = '';
      
      if (sessionData.leads.length > 0) {
        // CSV headers
        const headers = [
          'Username', 'Profile Link', 'Comment', 'Classification', 'Property Type',
          'Confidence Score', 'Urgency Level', 'Recommended Action',
          'Follow Up Timeframe', 'Platform', 'Video URL', 'Priority', 'Created At'
        ];
        csvContent += headers.join(',') + '\\n';
        
        // CSV data rows
        sessionData.leads.forEach(lead => {
          const row = [
            `"${(lead.username || '').replace(/"/g, '""')}"`,
            `"${(lead.profileLink || '').replace(/"/g, '""')}"`,
            `"${(lead.comment || '').replace(/"/g, '""')}"`,
            `"${(lead.classification || '').replace(/"/g, '""')}"`,
            `"${(lead.propertyType || '').replace(/"/g, '""')}"`,
            lead.confidenceScore || 0,
            `"${(lead.urgencyLevel || '').replace(/"/g, '""')}"`,
            `"${(lead.recommendedAction || '').replace(/"/g, '""')}"`,
            `"${(lead.followUpTimeframe || '').replace(/"/g, '""')}"`,
            `"${(lead.platform || '').replace(/"/g, '""')}"`,
            `"${(lead.videoUrl || '').replace(/"/g, '""')}"`,
            `"${(lead.priority || '').replace(/"/g, '""')}"`,
            `"${lead.createdAt ? new Date(lead.createdAt).toISOString() : ''}"`
          ];
          csvContent += row.join(',') + '\\n';
        });
      } else {
        csvContent = 'No leads found for this session\\n';
      }
      
      // Update export status
      await sessionService.updateExportStatus(exportRecord.id, "completed", new Date());
      
      // Delete leads after successful export
      const deleteResult = await storage.deleteLeadsBySession(sessionId);
      log(`🗑️ Deleted ${deleteResult.deletedCount} leads after CSV export for session ${sessionId}`);
      
      // Set headers for file download
      const filename = `leads-session-${sessionId}-${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent));
      
      log(`CSV export completed for session ${sessionId}, ${sessionData.leads.length} leads exported and deleted`);
      res.send(csvContent);
      
    } catch (error: any) {
      console.error("Error generating CSV export:", error);
      res.status(500).json({ error: "Failed to generate CSV export" });
    }
  });

  // Process URL and send to platform-specific webhook
  app.post("/api/process-url", async (req, res) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      const url = extractUrlFromMessage(message);
      
      if (!url) {
        return res.json({
          success: true,
          hasUrl: false,
          message: "No URL found in message"
        });
      }

      const result = await sendUrlToWebhook(message);

      res.json({
        success: true,
        hasUrl: true,
        url: result.url,
        platform: result.platform,
        webhookSent: result.success,
        message: result.success 
          ? `${result.platform} URL sent to webhook successfully` 
          : `URL detected but webhook failed for ${result.platform || 'unknown platform'}`
      });
    } catch (error) {
      console.error("Error processing URL:", error);
      res.status(500).json({ error: "Failed to process URL" });
    }
  });



  // Get all video analyses
  app.get("/api/video-analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllVideoAnalyses();
      res.json(analyses);
    } catch (error) {
      console.error("Error fetching video analyses:", error);
      res.status(500).json({ error: "Failed to fetch video analyses" });
    }
  });

  // Get all leads
  app.get("/api/leads", async (req, res) => {
    try {
      const allLeads = await storage.getAllLeads();
      res.json(allLeads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ error: "Failed to fetch leads" });
    }
  });

  // Create a new lead
  app.post("/api/leads", async (req, res) => {
    try {
      console.log('Creating lead with data:', req.body);
      
      // Generate leadId if not provided
      const requestData = {
        ...req.body,
        leadId: req.body.leadId || `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
      
      const leadData = insertLeadSchema.parse(requestData);
      const lead = await storage.createLead(leadData);
      console.log('Lead created successfully:', lead.id);
      res.status(201).json(lead);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        console.error("Lead validation error:", error.errors);
        res.status(400).json({ error: "Invalid lead data", details: error.errors });
      } else {
        console.error("Error creating lead:", error);
        res.status(500).json({ error: "Failed to create lead" });
      }
    }
  });

  // Get leads for specific video analysis
  app.get("/api/video-analyses/:id/leads", async (req, res) => {
    try {
      const videoAnalysisId = parseInt(req.params.id);
      const videoLeads = await storage.getLeadsByVideoAnalysis(videoAnalysisId);
      res.json(videoLeads);
    } catch (error) {
      console.error("Error fetching leads for video analysis:", error);
      res.status(500).json({ error: "Failed to fetch leads for video analysis" });
    }
  });

  // Get specific video analysis
  app.get("/api/video-analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const analysis = await storage.getVideoAnalysis(id);
      
      if (!analysis) {
        return res.status(404).json({ error: "Video analysis not found" });
      }
      
      res.json(analysis);
    } catch (error) {
      console.error("Error fetching video analysis:", error);
      res.status(500).json({ error: "Failed to fetch video analysis" });
    }
  });

  // Create video analysis
  app.post("/api/video-analyses", async (req, res) => {
    try {
      const validatedData = insertVideoAnalysisSchema.parse(req.body);
      const analysis = await storage.createVideoAnalysis(validatedData);
      res.status(201).json(analysis);
    } catch (error) {
      console.error("Error creating video analysis:", error);
      res.status(500).json({ error: "Failed to create video analysis" });
    }
  });

  // Update video analysis (for adding leads after analysis)
  app.patch("/api/video-analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const analysis = await storage.updateVideoAnalysis(id, updates);
      res.json(analysis);
    } catch (error) {
      console.error("Error updating video analysis:", error);
      res.status(500).json({ error: "Failed to update video analysis" });
    }
  });



  // Webhook response endpoint to receive responses from n8n/Make.com
  app.post('/webhook/response', (req, res) => {
    try {
      console.log('🎯 WEBHOOK RESPONSE RECEIVED!');
      console.log('📨 Full request body:', JSON.stringify(req.body, null, 2));
      console.log('📨 Request headers:', JSON.stringify(req.headers, null, 2));
      
      const { response, threadId, timestamp, messageType, leads } = req.body;
      
      log(`✅ Received webhook response: ${response?.substring(0, 100) || leads?.substring?.(0, 100) || 'data received'}...`);
      
      // Determine message content based on what was received
      let messageContent = response;
      if (!messageContent && leads) {
        // If leads data is received, format it as a message
        if (typeof leads === 'string') {
          messageContent = leads;
        } else if (typeof leads === 'object') {
          messageContent = `Found ${Array.isArray(leads) ? leads.length : Object.keys(leads).length} potential leads from the video analysis.`;
        }
      }
      
      console.log('📤 Sending to frontend:', messageContent?.substring(0, 200));
      
      // Emit the response to connected clients
      if ((global as any).io && messageContent) {
        (global as any).io.emit('ai-response', {
          message: messageContent,
          threadId: threadId,
          timestamp: timestamp || new Date().toISOString(),
          messageType: messageType || 'ai',
          data: leads ? { leads } : undefined
        });
        log(`✅ Response sent to frontend via WebSocket`);
      }
      
      res.status(200).json({ status: 'received' });
    } catch (error) {
      console.log('❌ Webhook response error:', error);
      log(`Webhook response error: ${error}`);
      res.status(500).json({ error: 'Failed to process webhook response' });
    }
  });

  // Enhanced webhook endpoint for parsing nested JSON leads data from n8n
  app.post('/api/webhook/leads', (req, res) => {
    try {
      console.log('🎯 LEADS WEBHOOK RECEIVED!');
      console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
      console.log('📨 Full Body:', JSON.stringify(req.body, null, 2));
      console.log('📨 Content-Type:', req.headers['content-type']);
      
      // Handle both JSON and form-urlencoded data from n8n/Make.com
      let leadsData;
      let isPlainText = false;
      
      // Check if data comes from form-urlencoded (Make.com format)
      if (req.body.leads && typeof req.body.leads === 'string') {
        leadsData = req.body.leads;
        isPlainText = true;
        log(`📄 Received form-urlencoded data from Make.com`);
      } else {
        // Try to parse as JSON for other sources
        try {
          leadsData = JSON.parse(req.body.leads);
          log(`📊 Successfully parsed JSON data: ${typeof leadsData}`);
        } catch (parseError) {
          // If JSON parsing fails, treat as plain text
          leadsData = req.body.leads;
          isPlainText = true;
          log(`📄 Received plain text data`);
        }
      }
      
      // Format message based on data type
      let messageContent;
      let parsedLeads = null;
      
      if (isPlainText) {
        // Handle plain text response (markdown format)
        messageContent = leadsData;
        log(`📝 Using plain text content`);
      } else if (Array.isArray(leadsData)) {
        log(`📋 Number of items in array: ${leadsData.length}`);
        messageContent = `Analysis complete! Found ${leadsData.length} potential leads from the video comments.`;
        parsedLeads = leadsData;
      } else if (typeof leadsData === 'object' && leadsData !== null) {
        // Handle object structure - check for common response formats
        if (leadsData.choices && Array.isArray(leadsData.choices)) {
          // OpenAI-style response
          const content = leadsData.choices[0]?.message?.content;
          if (content) {
            messageContent = content;
            try {
              // Try to extract structured data from content
              const contentData = JSON.parse(content);
              if (Array.isArray(contentData)) {
                parsedLeads = contentData;
              }
            } catch {
              // Content is plain text, keep as is
            }
          }
        } else if (leadsData.content) {
          // Direct content field
          messageContent = leadsData.content;
        } else if (leadsData.summary || leadsData.results) {
          // Summary or results field
          messageContent = leadsData.summary || leadsData.results;
        } else {
          // Generic object handling
          const keys = Object.keys(leadsData);
          messageContent = `Analysis complete! Received data with fields: ${keys.join(', ')}`;
          parsedLeads = leadsData;
        }
      } else if (typeof leadsData === 'string') {
        messageContent = leadsData;
      } else {
        messageContent = 'Video analysis complete.';
      }
      
      // Send to frontend via WebSocket
      if ((global as any).io && messageContent) {
        (global as any).io.emit('ai-response', {
          message: messageContent,
          timestamp: new Date().toISOString(),
          messageType: 'ai',
          data: parsedLeads ? { leads: parsedLeads } : undefined
        });
        log(`📤 Data sent to frontend via WebSocket`);
      }
      
      console.log('✅ ANALYSIS RESULTS SENT TO FRONTEND SUCCESSFULLY!');
      
      res.status(200).json({ 
        success: true, 
        message: 'Data parsed and sent successfully!',
        count: Array.isArray(parsedLeads) ? parsedLeads.length : 'processed'
      });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process webhook data';
      log(`❌ Webhook processing error: ${errorMessage}`);
      res.status(500).json({ 
        success: false, 
        error: errorMessage
      });
    }
  });

  // Session Service API Routes (moved to after WebSocket setup)
  
  // Create new session
  app.post("/api/session-service/create", async (req, res) => {
    try {
      const { userEmail, metadata }: CreateSessionRequest = req.body;
      const session = await sessionService.createSession(userEmail, metadata);
      res.status(201).json(session);
    } catch (error: any) {
      console.error("Error creating session:", error);
      res.status(500).json({ error: "Failed to create session" });
    }
  });

  // Get session by ID
  app.get("/api/session-service/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const session = await sessionService.getSession(sessionId);
      
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }
      
      res.json(session);
    } catch (error: any) {
      console.error("Error fetching session:", error);
      res.status(500).json({ error: "Failed to fetch session" });
    }
  });

  // Save analysis to session
  app.post("/api/session-service/analysis", async (req, res) => {
    try {
      const analysisData: CreateAnalysisRequest = req.body;
      const analysis = await sessionService.saveAnalysisToSession(
        analysisData.sessionId,
        analysisData
      );
      res.status(201).json(analysis);
    } catch (error: any) {
      console.error("Error saving analysis:", error);
      res.status(500).json({ error: "Failed to save analysis" });
    }
  });

  // Create export record
  app.post("/api/session-service/export", async (req, res) => {
    try {
      const exportData: CreateExportRequest = req.body;
      const exportRecord = await sessionService.createExport(
        exportData.sessionId,
        exportData.type,
        exportData.destination,
        exportData.metadata
      );
      res.status(201).json(exportRecord);
    } catch (error: any) {
      console.error("Error creating export:", error);
      res.status(500).json({ error: "Failed to create export" });
    }
  });

  // Get session summary
  app.get("/api/session-service/:sessionId/summary", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const summary = await sessionService.calculateSessionSummary(sessionId);
      res.json(summary);
    } catch (error: any) {
      console.error("Error calculating session summary:", error);
      res.status(500).json({ error: "Failed to calculate session summary" });
    }
  });

  // Get session export data
  app.get("/api/session-service/:sessionId/export", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const exportData = await sessionService.getSessionExportData(sessionId);
      
      if (!exportData) {
        return res.status(404).json({ error: "Session not found or no data available" });
      }
      
      res.json(exportData);
    } catch (error: any) {
      console.error("Error fetching session export data:", error);
      res.status(500).json({ error: "Failed to fetch session export data" });
    }
  });

  // Get active sessions
  app.get("/api/session-service/active-sessions", async (req, res) => {
    try {
      const sessions = await sessionService.getActiveSessions();
      res.json(sessions);
    } catch (error: any) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ error: "Failed to fetch active sessions" });
    }
  });

  // Cleanup old sessions
  app.post("/api/session-service/cleanup", async (req, res) => {
    try {
      const { hoursOld } = req.body;
      const result = await sessionService.cleanupOldSessions(hoursOld || 48);
      res.json(result);
    } catch (error: any) {
      console.error("Error cleaning up sessions:", error);
      res.status(500).json({ error: "Failed to cleanup sessions" });
    }
  });

  const httpServer = createServer(app);
  
  // Set up WebSocket server
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Store io instance globally for webhook access
  (global as any).io = io;

  io.on('connection', (socket: any) => {
    log(`Client connected: ${socket.id}`);
    
    socket.on('disconnect', () => {
      log(`Client disconnected: ${socket.id}`);
    });
  });

  return httpServer;
}
