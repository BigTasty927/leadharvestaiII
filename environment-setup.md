# Environment Variables Setup

## Required Environment Variables

### 1. Database Connection (Already Set)
```bash
DATABASE_URL=postgresql://...  # Already configured by Replit
PGHOST=...                     # Already configured by Replit
PGPORT=...                     # Already configured by Replit
PGUSER=...                     # Already configured by Replit
PGPASSWORD=...                 # Already configured by Replit
PGDATABASE=...                 # Already configured by Replit
```

### 2. Make.com Integration (You Need to Set)
```bash
# Get this URL from Make.com after creating your scenario
MAKE_GOOGLE_SHEETS_WEBHOOK_URL=https://hook.us1.make.com/YOUR_WEBHOOK_ID_HERE
```

## How to Set Environment Variables in Replit

### Method 1: Replit Secrets (Recommended)
1. Go to your Replit project
2. Click on "Secrets" tab (lock icon) in the left sidebar
3. Add new secret:
   - **Key**: `MAKE_GOOGLE_SHEETS_WEBHOOK_URL`
   - **Value**: `https://hook.us1.make.com/YOUR_ACTUAL_WEBHOOK_ID`

### Method 2: .env File (Local Development)
```bash
# Create .env file in your project root
echo "MAKE_GOOGLE_SHEETS_WEBHOOK_URL=https://hook.us1.make.com/YOUR_WEBHOOK_ID" >> .env
```

## Getting Your Make.com Webhook URL

1. **Import the scenario** using `make-scenario-template.json`
2. **Configure the webhook module** (first module in the scenario)
3. **Copy the webhook URL** - it will look like:
   ```
   https://hook.us1.make.com/abcd1234efgh5678ijkl9012mnop3456
   ```
4. **Add this URL** to your Replit secrets as `MAKE_GOOGLE_SHEETS_WEBHOOK_URL`

## Testing Your Setup

### 1. Test Without Make.com (Current State)
```bash
# This will show 404 error (expected until you add real webhook URL)
curl -X POST "http://localhost:5000/api/export/sheets" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}' \
  --cookie-jar test.txt
```

### 2. Test With Make.com (After Setup)
```bash
# This should succeed and create Google Sheets
curl -X POST "http://localhost:5000/api/export/sheets" \
  -H "Content-Type: application/json" \
  -d '{"email": "your-real-email@example.com"}' \
  --cookie-jar test.txt
```

### 3. Test Callback Endpoint
```bash
# Simulate Make.com sending completion callback
./test-make-webhook.sh
```

## Verification Steps

1. **Check environment variable is loaded**:
   ```bash
   echo $MAKE_GOOGLE_SHEETS_WEBHOOK_URL
   ```

2. **Verify in your app**:
   - Google Sheets export should return success instead of 404
   - Export records should show "processing" then "completed" status
   - You should receive actual Google Sheets via email

3. **Database verification**:
   ```sql
   SELECT * FROM exports WHERE type = 'google_sheets' ORDER BY created_at DESC;
   ```

## Security Notes

- Never commit webhook URLs to version control
- Use Replit Secrets for production
- The webhook URL is sensitive - treat it like an API key
- Each Make.com scenario has a unique webhook URL