const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'https://your-app.vercel.app',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'backend', timestamp: new Date().toISOString() });
});

// Import and mount API routes
const apiRoutes = [
  'analyze-reference-template',
  'content-modification',
  'content-utilization',
  'extract-topics',
  'extract-topics-space-aware',
  'generate-compact-study',
  'monitoring',
  'recreate-images',
  'reference-format-matching',
  'regenerate-images',
  'space-optimization'
];

// Simple API routes for now - we'll add the complex ones later
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'backend-api', 
    timestamp: new Date().toISOString(),
    port: PORT 
  });
});

// Test route
app.post('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!', body: req.body });
});

console.log('Available routes:');
console.log('GET /api/health');
console.log('POST /api/test');

// Error handling
app.use((error, req, res, next) => {
  console.error('Backend error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend server running on port ${PORT}`);
});