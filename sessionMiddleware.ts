import { Request, Response, NextFunction } from "express";
import { sessionService } from "../sessionService";

// Extend Request interface to include sessionId
declare global {
  namespace Express {
    interface Request {
      sessionId: string;
    }
  }
}

export const sessionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    let sessionId = req.cookies?.sessionId;
    
    // Skip activity updates for GET requests to session endpoint (polling)
    const shouldUpdateActivity = !(req.method === 'GET' && req.path === '/api/session');
    
    if (sessionId) {
      // Validate existing session
      const existingSession = await sessionService.getSession(sessionId);
      
      if (existingSession && existingSession.status === 'active') {
        // Only update activity timestamp for non-polling requests
        if (shouldUpdateActivity) {
          await sessionService.updateSessionActivity(sessionId);
        }
        req.sessionId = sessionId;
      } else {
        // Session doesn't exist or is expired, create new one
        const newSession = await sessionService.createSession();
        sessionId = newSession.id;
        req.sessionId = sessionId;
        
        // Set cookie for new session
        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 48 * 60 * 60 * 1000, // 48 hours
        });
      }
    } else {
      // No session cookie exists, create new session
      const newSession = await sessionService.createSession();
      sessionId = newSession.id;
      req.sessionId = sessionId;
      
      // Set cookie for new session
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 48 * 60 * 60 * 1000, // 48 hours
      });
    }
    
    next();
  } catch (error) {
    console.error('Session middleware error:', error);
    
    // Create fallback session on error
    try {
      const fallbackSession = await sessionService.createSession();
      req.sessionId = fallbackSession.id;
      
      res.cookie('sessionId', fallbackSession.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 48 * 60 * 60 * 1000, // 48 hours
      });
      
      next();
    } catch (fallbackError) {
      console.error('Fallback session creation failed:', fallbackError);
      res.status(500).json({ error: 'Session management failed' });
    }
  }
};