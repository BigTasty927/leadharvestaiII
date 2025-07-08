# n8n Webhook Integration Setup

## Current Status ✅

Your app is successfully sending URLs to the n8n webhook and is ready to receive results. Here's what's working:

### 1. URL Submission (Working ✅)
- URLs are sent to: `https://primary-production-23e2a.up.railway.app/webhook/urlpath`
- Method: GET with URL parameters
- Response: `{"message":"Workflow was started"}`

### 2. Results Reception (Ready ✅)
Your app has two endpoints ready to receive results from n8n:

**Option A: `/api/webhook/leads` (Recommended)**
```
POST https://your-replit-app.replit.app/api/webhook/leads
Content-Type: application/json

{
  "leads": "🎯 Lead Analysis Results\n\nFound 5 qualified real estate leads from TikTok video\n\n1. @user1 - Looking for apartments (95% confidence)\n2. @user2 - Need rental info (88% confidence)"
}
```

**Option B: `/webhook/response`**
```
POST https://your-replit-app.replit.app/webhook/response
Content-Type: application/json

{
  "response": "Analysis complete text...",
  "messageType": "ai"
}
```

## What Your n8n Workflow Needs

Your n8n workflow should:

1. **Receive the URL** (Already working ✅)
   - Webhook URL: `https://primary-production-23e2a.up.railway.app/webhook/urlpath`
   - Parameters: `url`, `platform`, `timestamp`, `originalMessage`

2. **Process the Video** 
   - Scrape comments from TikTok/YouTube/Instagram
   - Analyze with AI (ChatGPT, Claude, etc.)
   - Format results as text

3. **Send Results Back** (This is what's missing ❌)
   - Send POST request to your app's webhook endpoint
   - Include the analysis results in the request body

## Test Results

✅ **Test successful**: Sent test data to `/api/webhook/leads` and it appeared in the browser immediately.

## Example n8n HTTP Request Node

Add this as the final step in your n8n workflow:

```json
{
  "method": "POST",
  "url": "https://your-replit-app.replit.app/api/webhook/leads",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "leads": "{{ $json.analysis_results }}",
    "timestamp": "{{ $now }}",
    "messageType": "ai"
  }
}
```

## Next Steps

1. ✅ Your app is ready to receive results
2. ❌ Configure your n8n workflow to send results back
3. ✅ Test with a real URL to see the complete flow

The webhook infrastructure is working perfectly - you just need to complete the n8n workflow configuration.