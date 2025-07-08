import { log } from "./vite";

const UNIVERSAL_WEBHOOK_URL = "https://primary-production-23e2a.up.railway.app/webhook/urlpath";

export interface UrlWebhookPayload {
  url: string;
  platform: string;
  timestamp: string;
  originalMessage: string;
}

export async function sendUrlToWebhook(
  message: string,
): Promise<{ success: boolean; platform?: string; url?: string }> {
  try {
    const url = extractUrlFromMessage(message);

    if (!url) {
      log(`No URL found in message: ${message.substring(0, 50)}...`);
      return { success: false };
    }

    const platform = detectPlatform(url);

    if (platform === "unknown") {
      log(`Unknown platform for URL: ${url}`);
      return { success: false, url };
    }

    const webhookUrl = UNIVERSAL_WEBHOOK_URL;

    const payload: UrlWebhookPayload = {
      url,
      platform,
      timestamp: new Date().toISOString(),
      originalMessage: message,
    };

    log(`Sending ${platform} URL to webhook: ${url}`);

    // n8n webhook expects GET request with URL parameters
    const urlParams = new URLSearchParams({
      url: payload.url,
      platform: payload.platform,
      timestamp: payload.timestamp,
      originalMessage: payload.originalMessage,
    });

    log(`🔗 Full webhook URL with params: ${webhookUrl}?${urlParams}`);
    log(`📦 URL Parameters: ${urlParams.toString()}`);
    
    const response = await fetch(`${webhookUrl}?${urlParams}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    log(`📊 Response status: ${response.status}`);
    log(`📄 Response headers:`, Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    log(`📄 Response body: ${responseText}`);

    if (response.ok) {
      log(`${platform} webhook sent successfully`);
      return { success: true, platform, url };
    } else {
      log(`${platform} webhook failed with status: ${response.status}, error: ${responseText}`);
      return { success: false, platform, url };
    }
  } catch (error) {
    log(`💥 Full error:`, error);
    return { success: false };
  }
}

export function extractUrlFromMessage(message: string): string | null {
  // Regex to match YouTube, TikTok, Instagram, and general URLs
  const urlRegex =
    /(https?:\/\/[^\s]+)|((?:youtube\.com\/watch\?v=|youtu\.be\/|tiktok\.com\/|instagram\.com\/)[^\s]+)/i;
  const match = message.match(urlRegex);

  if (match) {
    let url = match[0];
    // Ensure URL has protocol
    if (!url.startsWith("http")) {
      url = "https://" + url;
    }
    // Clean up URL - remove trailing punctuation
    url = url.replace(/[.,;!?]+$/, "");
    return url;
  }

  return null;
}

export function detectPlatform(url: string): string {
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    return "youtube";
  } else if (url.includes("tiktok.com")) {
    return "tiktok";
  } else if (url.includes("instagram.com")) {
    return "instagram";
  } else {
    return "unknown";
  }
}
