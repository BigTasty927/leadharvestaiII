// Simple webhook monitor to check if Make.com is sending requests
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.text());
app.use(express.raw());

// Monitor ALL requests to webhook endpoints
app.all('/api/webhook/*', (req, res) => {
  console.log('\n=== WEBHOOK REQUEST RECEIVED ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body (raw):', req.body);
  console.log('Body (type):', typeof req.body);
  console.log('=================================\n');
  
  res.json({ status: 'monitored', received: true });
});

app.all('/webhook/*', (req, res) => {
  console.log('\n=== LEGACY WEBHOOK REQUEST ===');
  console.log('Time:', new Date().toISOString());
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  console.log('Body:', req.body);
  console.log('==============================\n');
  
  res.json({ status: 'monitored', received: true });
});

// Catch-all for any other requests
app.all('*', (req, res) => {
  console.log(`Received ${req.method} request to ${req.url} - not a webhook`);
  res.status(404).json({ error: 'Not found' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Webhook monitor running on port ${PORT}`);
  console.log('Monitoring for requests to:');
  console.log('- /api/webhook/*');
  console.log('- /webhook/*');
  console.log('\nWaiting for Make.com requests...\n');
});