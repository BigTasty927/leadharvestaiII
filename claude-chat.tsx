import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Send, 
  Upload,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Play,
  BarChart3,
  FileText,
  Loader2,
  Database
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import avatarImage from "@assets/leadharvestai_avatar_1750820310692.png";
import type { Lead } from "@shared/schema";
import { io, Socket } from "socket.io-client";
import { appState, type Message, type WorkflowStatus } from "@/lib/appState";

// Message and WorkflowStatus interfaces now imported from appState

export default function ClaudeChatInterface() {
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => appState.getState().messages);
  const [isTyping, setIsTyping] = useState(false);
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>({
    step: 'idle',
    progress: 0,
    message: ''
  });
  const [sessionData, setSessionData] = useState<any>(null);
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('leadscout-user-name') || '';
  });
  const [nameInput, setNameInput] = useState('');
  const [showNameForm, setShowNameForm] = useState(() => {
    return !localStorage.getItem('leadscout-user-name');
  });
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(''); // Store original user URL

  // Load state from global app state on component mount
  useEffect(() => {
    const state = appState.getState();
    setMessages(state.messages);
    setWorkflowStatus(state.workflowStatus);
    setIsTyping(state.isProcessing);

    // Subscribe to state changes
    const unsubscribe = appState.subscribe((newState) => {
      setMessages(newState.messages);
      setWorkflowStatus(newState.workflowStatus);
      setIsTyping(newState.isProcessing);
    });

    return unsubscribe;
  }, []);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const createAnalysisMutation = useMutation({
    mutationFn: async (data: { url: string; platform: string; title?: string }) => {
      const response = await fetch('/api/video-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create analysis');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-analyses'] });
    }
  });

  const updateAnalysisMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: any }) => {
      const response = await fetch(`/api/video-analyses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (!response.ok) throw new Error('Failed to update analysis');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/video-analyses'] });
    }
  });

  const processUrlMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await fetch('/api/process-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!response.ok) throw new Error('Failed to process message');
      return response.json();
    }
  });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim()) {
      const trimmedName = nameInput.trim();
      setUserName(trimmedName);
      localStorage.setItem('leadscout-user-name', trimmedName);
      setShowNameForm(false);
      
      // Update session with user name
      updateSessionWithName(trimmedName);
      
      // Show intro sequence with personalized greeting
      showIntroSequence('');
    }
  };

  const updateSessionWithName = async (name: string) => {
    try {
      await fetch('/api/session/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userName: name })
      });
    } catch (error) {
      console.error('Failed to update session with name:', error);
    }
  };

  const showIntroSequence = (userMessage: string) => {
    const greeting = userName ? `Hello ${userName}! 👋` : 'Hello! 👋';
    const introMessages = [
      `${greeting}\n\nI'm your Real Estate Lead Scout AI Assistant. I specialize in analyzing social media content to identify potential property leads from YouTube, TikTok, and Instagram video comments.`,
      '**Here\'s what I can do for you:**\n\n🔍 **Analyze video comments** to find people expressing interest in buying or renting properties\n📊 **Extract key details** like property type, location preferences, and contact information\n📋 **Format clean, structured lead records** ready for your CRM or follow-up\n\n**To get started, please provide:**\n• A video URL (YouTube, TikTok, or Instagram) related to real estate content\n• Let me know if you want to focus on a specific platform or analyze across all platforms',
      'For example, you could share a URL of a property tour, real estate market update, or any video where people might be commenting about their housing needs.\n\n**What video would you like me to analyze for potential leads?**'
    ];

    let messageCount = 0;

    const addNextMessage = () => {
      if (messageCount < introMessages.length) {
        setIsTyping(true);
        
        setTimeout(() => {
          setIsTyping(false);
          const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
          const message: Message = {
            id: `intro-${messageCount + 1}`,
            type: 'ai',
            text: introMessages[messageCount],
            time: responseTime,
            timestamp: new Date()
          };

          appState.addMessage(message);
          messageCount++;

          // Schedule next message
          if (messageCount < introMessages.length) {
            setTimeout(addNextMessage, 1500);
          } else {
            // After intro sequence, process the user's original message if it was a URL
            if (userMessage.includes('http') || userMessage.includes('tiktok') || userMessage.includes('youtube')) {
              setTimeout(() => {
                simulateWorkflow(userMessage);
              }, 2000);
            }
          }
        }, 2000);
      }
    };

    // Start the sequence
    setTimeout(addNextMessage, 1000);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // Load session data
  useEffect(() => {
    const loadSessionData = async () => {
      try {
        const response = await fetch('/api/session', {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setSessionData(data);
        }
      } catch (error) {
        console.error('Failed to load session data:', error);
      }
    };

    loadSessionData();
    // Refresh session data every 30 seconds
    const interval = setInterval(loadSessionData, 30000);
    return () => clearInterval(interval);
  }, []);



  // Set up WebSocket connection
  useEffect(() => {
    socketRef.current = io();
    
    socketRef.current.on('ai-response', (data: any) => {
      console.log('Received AI response from webhook:', data);
      
      // Store original message for database operations (includes both parts)
      const originalMessage = data.message;
      
      // Format the analysis text for user display - create clean summary
      let formattedText = data.message;
      if (formattedText.includes('qualified real estate leads') || formattedText.includes('🎯') || formattedText.includes('Lead Analysis')) {
        // This is a lead analysis response - create clean summary
        formattedText = createCleanSummary(formattedText);
      } else {
        // Apply basic formatting for other responses
        formattedText = formatAnalysisText(formattedText);
      }
      
      const responseMessage: Message = {
        id: `webhook-${Date.now()}`,
        type: 'ai',
        text: formattedText, // User sees clean summary
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        timestamp: new Date(),
        hasResults: false,
        results: undefined,
        canSaveToDatabase: !!(originalMessage.includes('qualified') || originalMessage.includes('leads') || originalMessage.includes('analysis') || originalMessage.includes('TikTok') || originalMessage.includes('YouTube') || originalMessage.includes('Instagram')),
        savedToDatabase: false,
        originalText: originalMessage, // Store original for database save
        detailedText: formatAnalysisText(originalMessage) // Store detailed version for viewing
      };
      
      appState.addMessage(responseMessage);
      appState.setProcessing(false);
      
      // Reset workflow status when AI response is received
      appState.updateWorkflowStatus({
        step: 'idle',
        progress: 0,
        message: ''
      });
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Function to format analysis text for better presentation
  const formatAnalysisText = (text: string) => {
    // Remove all markdown formatting and JSON artifacts
    let cleaned = text
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks completely
      .replace(/```/g, '') // Remove remaining backticks
      .replace(/^\s*🎯.*$/gm, '') // Remove emoji headers
      .replace(/### EXECUTIVE SUMMARY:/g, 'ANALYSIS SUMMARY')
      .replace(/###\s*/g, '') // Remove ### headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic markdown
      .replace(/^\s*\*\s*/gm, '• ') // Convert * bullets to clean bullets
      .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
      .trim();
    
    // Remove platform-specific headers and technical artifacts
    const lines = cleaned.split('\n');
    const cleanedLines = lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 0 && 
        !trimmed.match(/^[🎯📊📋📄📝📤💡✨⚡]/g) && // Remove emoji-prefixed lines
        !trimmed.includes('TikTok Real Estate Lead Analysis') &&
        !trimmed.includes('TikTok Analysis') &&
        !trimmed.includes('Complete Results') &&
        !trimmed.includes('**TikTok') &&
        !trimmed.includes('Lead Analysis -') &&
        !trimmed.startsWith('I\'ve identified') &&
        !trimmed.includes('achieving a') &&
        !trimmed.includes('conversion rate');
    });
    
    // Join and clean up the final text
    cleaned = cleanedLines
      .join('\n')
      .replace(/^\s*Key Findings:\s*$/gm, 'Key Findings:')
      .replace(/^\s*Top-Tier Leads.*$/gm, 'High-Priority Leads:')
      .trim();
    
    // If still too technical, extract just the essential lead information
    if (cleaned.includes('qualified') && cleaned.length > 500) {
      const essentialParts = cleaned.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.includes('@') || // Username mentions
               trimmed.includes('interested') ||
               trimmed.includes('looking') ||
               trimmed.includes('need') ||
               trimmed.includes('confidence') ||
               (trimmed.includes('•') && trimmed.length < 100);
      });
      
      if (essentialParts.length > 3) {
        cleaned = essentialParts.slice(0, 10).join('\n'); // Limit to top 10 essential items
      }
    }
    
    return cleaned;
  };

  // Function to create a clean, simple summary for users
  const createCleanSummary = (text: string) => {
    // Extract key numbers and information
    const leadsMatch = text.match(/(\d+)\s+qualified real estate leads/i);
    const totalCommentsMatch = text.match(/from\s+(\d+)\s+total comments/i);
    const conversionMatch = text.match(/(\d+(?:\.\d+)?%)\s+conversion rate/i);
    
    const leadsCount = leadsMatch ? leadsMatch[1] : 'several';
    const totalComments = totalCommentsMatch ? totalCommentsMatch[1] : 'many';
    const conversionRate = conversionMatch ? conversionMatch[1] : '';
    
    // Extract top leads (usernames with @)
    const usernameMatches = text.match(/@[a-zA-Z0-9_]+/g);
    const topUsernames = usernameMatches ? Array.from(new Set(usernameMatches)).slice(0, 5) : [];
    
    // Extract key phrases from comments
    const keyPhrases = [];
    const commentMatches = text.match(/"([^"]+)"/g);
    if (commentMatches) {
      const filtered = commentMatches
        .map(match => match.replace(/"/g, ''))
        .filter(comment => 
          comment.length < 80 && 
          (comment.includes('interested') || 
           comment.includes('need') || 
           comment.includes('looking') ||
           comment.includes('apartment') ||
           comment.includes('available'))
        )
        .slice(0, 3);
      keyPhrases.push(...filtered);
    }
    
    // Build clean summary
    let summary = `Found ${leadsCount} qualified leads`;
    if (totalComments && totalComments !== 'many') {
      summary += ` from ${totalComments} comments`;
    }
    if (conversionRate) {
      summary += ` (${conversionRate} conversion rate)`;
    }
    summary += '.\n\n';
    
    if (topUsernames.length > 0) {
      summary += `Top prospects: ${topUsernames.slice(0, 3).join(', ')}\n\n`;
    }
    
    if (keyPhrases.length > 0) {
      summary += 'Sample inquiries:\n';
      keyPhrases.forEach((phrase, index) => {
        summary += `• "${phrase}"\n`;
      });
      summary += '\n';
    }
    
    summary += 'Ready to export leads to CSV or save to database for follow-up.';
    
    return summary;
  };

  // Function to save analysis to database
  const saveToDatabase = async (messageId: string, originalText: string) => {
    try {
      // Get current session ID
      const sessionResponse = await fetch('/api/session');
      const sessionData = await sessionResponse.json();
      const currentSessionId = sessionData.session?.id;
      
      if (!currentSessionId) {
        console.error('No session ID found');
        return;
      }
      
      // Use the stored original user URL instead of extracting from webhook response
      if (!currentVideoUrl) {
        console.error('No original URL found for analysis');
        return;
      }
      
      console.log('Using original user URL for database save:', currentVideoUrl);

      // Extract JSON leads data from webhook response
      let leadsDataRaw = null;
      let userMessage = originalText;
      
      // Try different extraction patterns for JSON data
      if (originalText.includes('### JSON LEADS DATA:')) {
        const jsonSection = originalText.split('### JSON LEADS DATA:')[1];
        if (jsonSection && jsonSection.includes('```json')) {
          leadsDataRaw = jsonSection.split('```json')[1]?.split('```')[0]?.trim();
          userMessage = originalText.split('### JSON LEADS DATA:')[0].trim();
        }
      } else if (originalText.includes('---')) {
        // Fallback to old format
        const parts = originalText.split('---');
        userMessage = parts[0]; // User-facing summary
        leadsDataRaw = parts[1]; // Raw JSON data for database
      }
      
      // Create video analysis first using the original user URL
      const analysisResponse = await fetch('/api/video-analyses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: currentVideoUrl,
          platform: detectPlatform(currentVideoUrl),
          title: `Video Analysis - ${new Date().toLocaleDateString()}`,
          summary: userMessage.trim(),
          leadCount: extractLeadCount(userMessage)
        })
      });

      if (analysisResponse.ok) {
        const videoAnalysis = await analysisResponse.json();
        
        // Parse and save individual leads if JSON data exists
        if (leadsDataRaw && leadsDataRaw.trim()) {
          try {
            // Clean up the JSON string - remove any markdown artifacts
            let cleanJson = leadsDataRaw.trim();
            
            // Remove markdown code blocks if present
            cleanJson = cleanJson.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Try to find JSON object within the text
            const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              cleanJson = jsonMatch[0];
            }
            
            console.log('Attempting to parse JSON:', cleanJson.substring(0, 200) + '...');
            const leadsJson = JSON.parse(cleanJson);
            
            if (leadsJson.leads && Array.isArray(leadsJson.leads)) {
              console.log(`Found ${leadsJson.leads.length} leads to save`);
              
              // Create lead records for each lead
              const leadPromises = leadsJson.leads.map((lead: any, index: number) => {
                const leadData = {
                  leadId: lead.id || `lead_${Date.now()}_${index}`,
                  videoAnalysisId: videoAnalysis.id,
                  sessionId: currentSessionId,
                  
                  // Core identification (new JSON structure)
                  username: lead.username || lead.user || 'unknown',
                  profileLink: lead.profile_link || `https://www.tiktok.com/@${lead.username}` || '',
                  comment: lead.comment || lead.text || '',
                  
                  // Classification and scoring (new JSON structure)
                  classification: lead.classification || 'Interested Renter',
                  propertyType: lead.property_type || lead.type || 'rental',
                  confidenceScore: parseInt(String(lead.confidence_score || lead.confidence)) || 50,
                  urgencyLevel: lead.urgency_level || 'Medium',
                  intentKeywords: Array.isArray(lead.intent_keywords) ? lead.intent_keywords : [],
                  
                  // Action planning (new JSON structure)
                  recommendedAction: lead.recommended_action || '',
                  followUpTimeframe: lead.follow_up_timeframe || '',
                  
                  // Legacy fields for backward compatibility
                  priority: lead.priority || 'medium',
                  type: lead.type || 'rental',
                  
                  // Source tracking
                  platform: detectPlatform(currentVideoUrl),
                  videoUrl: currentVideoUrl
                };
                
                console.log('Saving lead:', leadData.username);
                return fetch('/api/leads', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(leadData)
                });
              });
              
              const results = await Promise.all(leadPromises);
              const successful = results.filter(r => r.ok).length;
              console.log(`Successfully saved ${successful}/${leadsJson.leads.length} leads`);
            } else {
              console.warn('No leads array found in JSON response');
            }
          } catch (parseError) {
            console.error('Failed to parse leads JSON:', parseError);
            console.error('Raw JSON data:', leadsDataRaw);
            
            // Try alternative parsing method for array format
            try {
              // If the raw data is an array, try parsing it directly
              if (leadsDataRaw.trim().startsWith('[')) {
                console.log('Trying array format parsing...');
                const leadsArray = JSON.parse(leadsDataRaw);
                
                if (Array.isArray(leadsArray) && leadsArray.length > 0) {
                  console.log(`Found ${leadsArray.length} leads in array format`);
                  
                  // Create lead records for each lead
                  const leadPromises = leadsArray.map((lead: any, index: number) => {
                    const leadData = {
                      leadId: lead.id || `lead_${Date.now()}_${index}`,
                      videoAnalysisId: videoAnalysis.id,
                      sessionId: currentSessionId,
                      
                      // Core identification (new JSON structure)
                      username: lead.username || lead.user || 'unknown',
                      profileLink: lead.profile_link || `https://www.tiktok.com/@${lead.username}` || '',
                      comment: lead.comment || lead.text || '',
                      
                      // Classification and scoring (new JSON structure)
                      classification: lead.classification || 'Interested Renter',
                      propertyType: lead.property_type || lead.type || 'rental',
                      confidenceScore: parseInt(String(lead.confidence_score || lead.confidence)) || 50,
                      urgencyLevel: lead.urgency_level || 'Medium',
                      intentKeywords: Array.isArray(lead.intent_keywords) ? lead.intent_keywords : [],
                      
                      // Action planning (new JSON structure)
                      recommendedAction: lead.recommended_action || '',
                      followUpTimeframe: lead.follow_up_timeframe || '',
                      
                      // Legacy fields for backward compatibility
                      priority: lead.priority || 'medium',
                      type: lead.type || 'rental',
                      
                      // Source tracking
                      platform: detectPlatform(currentVideoUrl),
                      videoUrl: currentVideoUrl
                    };
                    
                    console.log('Saving lead (array format):', leadData.username);
                    return fetch('/api/leads', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(leadData)
                    });
                  });
                  
                  const results = await Promise.all(leadPromises);
                  const successful = results.filter(r => r.ok).length;
                  console.log(`Successfully saved ${successful}/${leadsArray.length} leads from array format`);
                }
              }
            } catch (arrayParseError) {
              console.error('Array format parsing also failed:', arrayParseError);
            }
          }
        }
        
        // Update the message to show it's been saved using appState
        appState.updateMessage(messageId, { savedToDatabase: true });
        console.log('Analysis saved to database successfully');
      }
    } catch (error) {
      console.error('Failed to save to database:', error);
    }
  };

  // Helper function to detect platform from URL
  const detectPlatform = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
    if (url.includes('tiktok.com')) return 'tiktok';
    if (url.includes('instagram.com')) return 'instagram';
    return 'unknown';
  };

  // Helper function to extract lead count from analysis text
  const extractLeadCount = (text: string) => {
    const match = text.match(/(\d+)\s+qualified.*?leads?/i);
    return match ? parseInt(match[1]) : 0;
  };

  const quickActions = [
    { label: "Analyze TikTok Video", icon: Play },
    { label: "Process YouTube Comments", icon: BarChart3 },
    { label: "Generate Lead Report", icon: FileText },
    { label: "Export to CSV", icon: Download }
  ];

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: messageInput.trim(),
      time: timeString,
      timestamp: now
    };

    const isFirstMessage = messages.length === 0;
    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    appState.updateMessages(updatedMessages);
    setMessageInput('');

    // Check if user input contains a URL
    const hasUrl = /https?:\/\/[^\s]+/.test(messageInput);
    
    // Extract and store the original URL if present
    if (hasUrl) {
      const urlMatch = messageInput.trim().match(/(https?:\/\/[^\s]+)/);
      if (urlMatch) {
        const cleanUrl = urlMatch[0].trim().replace(/[",;:\s]+$/g, '').replace(/^[",;:\s]+/g, '');
        setCurrentVideoUrl(cleanUrl);
        console.log('Storing original user URL:', cleanUrl);
      }
    }

    // Check if message contains URL and process accordingly
    processUrlMutation.mutate(messageInput.trim(), {
      onSuccess: (result: any) => {
        console.log('Message processed:', result);
        // Set typing indicator if URL was sent to webhook
        if (!isFirstMessage && result.hasUrl && result.webhookSent) {
          appState.setProcessing(true);
        }
      },
      onError: (error: any) => {
        console.error('Processing failed:', error);
      }
    });

    // If this is the first message, show intro sequence, otherwise proceed with normal flow
    if (isFirstMessage) {
      showIntroSequence(messageInput.trim());
    } else if (!hasUrl) {
      // For non-URL messages, provide helpful response
      setTimeout(() => {
        const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const responseMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          text: 'I\'d be happy to help you with that! To analyze a video for real estate leads, please provide:\n\n• A complete video URL (YouTube, TikTok, or Instagram)\n• Any specific requirements or focus areas\n\nOnce you share a URL, I\'ll start the analysis process and walk you through each step.',
          time: responseTime,
          timestamp: new Date()
        };

        appState.addMessage(responseMessage);
        appState.setProcessing(false);
      }, 2000);
    }
    // For URL messages, the webhook will handle the response via WebSocket
  };

  const simulateWorkflow = async (videoUrl: string) => {
    // URL processing handled in handleSendMessage, so proceed with workflow

    // Determine platform from URL
    let platform = 'unknown';
    let title = 'Untitled Video';
    
    if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
      platform = 'youtube';
      title = 'Real Estate Market Update 2024';
    } else if (videoUrl.includes('tiktok.com')) {
      platform = 'tiktok';
      title = 'Downtown Apartment Tour';
    } else if (videoUrl.includes('instagram.com')) {
      platform = 'instagram';
      title = 'Property Investment Tips';
    }

    // Create initial analysis record
    let analysisId: number;
    try {
      const analysis = await createAnalysisMutation.mutateAsync({
        url: videoUrl,
        platform,
        title,
      });
      analysisId = analysis.id;
    } catch (error) {
      console.error('Failed to create analysis:', error);
      return;
    }

    // Step 1: Scraping
    setWorkflowStatus({
      step: 'scraping',
      progress: 0,
      message: 'Scraping comments from video...'
    });

    setTimeout(() => {
      setWorkflowStatus({
        step: 'scraping',
        progress: 60,
        message: 'Found 247 comments, processing...'
      });
    }, 1500);

    // Step 2: Analyzing
    setTimeout(() => {
      setWorkflowStatus({
        step: 'analyzing',
        progress: 80,
        message: 'Analyzing comments for lead signals...'
      });
    }, 3000);

    // Step 3: Complete
    setTimeout(async () => {
      setIsTyping(false);
      setWorkflowStatus({
        step: 'complete',
        progress: 100,
        message: 'Analysis complete!'
      });

      // Mock leads will be replaced with real data from webhook

      // Real analysis data will come from webhook response

      // Reset workflow after showing results
      setTimeout(() => {
        setWorkflowStatus({
          step: 'idle',
          progress: 0,
          message: ''
        });
      }, 2000);
    }, 4500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleQuickAction = (action: string) => {
    setMessageInput(action);
  };

  const toggleExpanded = (messageId: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, isExpanded: !msg.isExpanded }
        : msg
    ));
  };

  // Show name form if no name is provided
  if (showNameForm) {
    return (
      <div className="min-h-screen bg-bg-light font-inter flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-6">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <img 
                src={avatarImage} 
                alt="Real Estate Lead Scout AI" 
                className="w-16 h-16 rounded-full border border-gray-200 mx-auto mb-4"
              />
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Welcome to Lead Scout</h1>
              <p className="text-gray-600">AI Assistant for Social Media Lead Analysis</p>
            </div>
            
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  What's your name?
                </label>
                <input
                  type="text"
                  id="name"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-light font-inter">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <img 
              src={avatarImage} 
              alt="Real Estate Lead Scout AI" 
              className="w-10 h-10 rounded-full border border-gray-200"
            />
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Real Estate Lead Scout</h1>
              <p className="text-sm text-gray-600">AI Assistant for Social Media Lead Analysis {userName ? `• Welcome, ${userName}` : ''}</p>
            </div>
            <div className="ml-auto flex items-center space-x-4">
              <button 
                onClick={async () => {
                  try {
                    // Clear all local state and storage
                    appState.clearState();
                    localStorage.removeItem('leadscout-user-name');
                    localStorage.removeItem('leadscout-app-state');
                    
                    // Clear session cookies to force new session creation
                    document.cookie.split(";").forEach(function(c) { 
                      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                    });
                    
                    // Force page reload to start completely fresh
                    window.location.reload();
                  } catch (error) {
                    console.error('Error resetting session:', error);
                    // Fallback to simple reload
                    window.location.reload();
                  }
                }}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <span className="text-sm font-medium">New Chat</span>
              </button>
              
              <Link href="/database">
                <button className="flex items-center space-x-2 px-3 py-2 text-orange-primary hover:bg-orange-50 rounded-lg transition-colors">
                  <span className="text-lg">📊</span>
                  <span className="text-sm font-medium">Database</span>
                </button>
              </Link>
              
              <div className="flex items-center space-x-4">
                {/* Session Statistics */}
                <div className="flex items-center space-x-4 px-4 py-2 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Session:</span> {sessionData?.summary?.analysisCount || 0} analyses
                  </div>
                  <div className="text-xs text-gray-600">
                    <span className="font-medium">Leads:</span> {sessionData?.summary?.totalLeads || 0}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Ready to analyze</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Workflow Status */}
      {workflowStatus.step !== 'idle' && (
        <div className="border-b border-gray-200 bg-blue-50">
          <div className="max-w-4xl mx-auto px-6 py-3">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-900">{workflowStatus.message}</span>
                  <span className="text-sm text-blue-700">{workflowStatus.progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${workflowStatus.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chat Container */}
      <div className="max-w-4xl mx-auto">
        {/* Messages */}
        <div className="px-6 py-6 space-y-6">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl ${
                message.type === 'user' 
                  ? 'message-user ml-12' 
                  : message.type === 'ai' 
                    ? 'message-ai mr-12' 
                    : 'message-system mx-auto text-center'
              } p-4`}>
                {message.type !== 'user' && message.type !== 'system' && (
                  <div className="flex items-center space-x-2 mb-3">
                    <img 
                      src={avatarImage} 
                      alt="AI Assistant" 
                      className="w-6 h-6 rounded-full"
                    />
                    <span className="text-sm font-medium text-gray-700">Real Estate Lead Scout</span>
                    <span className="text-xs text-gray-500">{message.time}</span>
                  </div>
                )}
                
                <div className={`prose prose-sm max-w-none ${
                  message.type === 'user' ? 'text-gray-800' : 'text-gray-900'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">
                    {(message as any).showDetailed && (message as any).detailedText 
                      ? (message as any).detailedText 
                      : message.text}
                  </p>
                </div>
                
                {/* Toggle between Summary and Detailed View for Analysis Messages */}
                {(message as any).detailedText && message.type === 'ai' && (
                  <div className="mt-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        appState.updateMessage(message.id, { 
                          showDetailed: !(message as any).showDetailed 
                        });
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {(message as any).showDetailed ? (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                          </svg>
                          Show Summary
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          View Details
                        </>
                      )}
                    </button>
                  </div>
                )}
                
                {/* Add to Database Button */}
                {message.canSaveToDatabase && !message.savedToDatabase && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => saveToDatabase(message.id, (message as any).originalText || message.text)}
                      className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12" />
                      </svg>
                      Add Analysis to Database
                    </button>
                  </div>
                )}
                
                {/* Saved Confirmation */}
                {message.savedToDatabase && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="inline-flex items-center text-green-600 text-sm font-medium">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Analysis saved to database
                    </div>
                  </div>
                )}



                {message.type === 'user' && (
                  <div className="flex justify-end mt-2">
                    <span className="text-xs text-gray-500">{message.time}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="message-ai max-w-3xl mr-12 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <img 
                    src={avatarImage} 
                    alt="AI Assistant" 
                    className="w-6 h-6 rounded-full"
                  />
                  <span className="text-sm font-medium text-gray-700">Real Estate Lead Scout</span>
                </div>
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length === 0 && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.label)}
                  className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-orange-primary hover:bg-orange-50 transition-colors group"
                >
                  <action.icon className="w-4 h-4 text-gray-400 group-hover:text-orange-primary" />
                  <span className="text-sm text-gray-700 group-hover:text-orange-primary">{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white px-6 py-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <textarea
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Share a video URL or ask about lead analysis..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-primary focus:border-transparent resize-none text-sm"
                rows={3}
              />
            </div>
            <div className="flex flex-col space-y-2">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Upload className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="bg-orange-primary hover:bg-orange-600 disabled:bg-gray-300 text-white p-3 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-primary focus:ring-offset-2 disabled:hover:scale-100"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}