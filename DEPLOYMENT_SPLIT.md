# Split Deployment Guide: Vercel + Docker Backend

## Architecture
- **Frontend (Vercel)**: React components, pages, lightweight API routes
- **Backend (Docker)**: Heavy processing, PDF generation, Redis, image processing

## Backend Deployment (Docker)

### 1. Deploy Backend to VPS/Cloud
```bash
# On your server
cd backend-docker
docker-compose up -d --build
```

### 2. Get Backend URL
Your backend will be available at: `http://your-server-ip:4000`

For production, set up a domain and SSL:
- Point subdomain to your server: `api.yourdomain.com`
- Use nginx reverse proxy with SSL

## Frontend Deployment (Vercel)

### 1. Set Environment Variables in Vercel
```bash
NEXT_PUBLIC_BACKEND_URL=https://api.yourdomain.com
# or http://your-server-ip:4000 for testing
```

### 2. Deploy to Vercel
```bash
npm install -g vercel
vercel login
vercel --prod
```

### 3. Update Backend CORS
In your backend `.env.docker`, set:
```
FRONTEND_URL=https://your-app.vercel.app
```

## Local Development

### Start Backend
```bash
cd backend-docker
docker-compose up -d
```

### Start Frontend
```bash
npm run dev
```

Set in `.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

## API Usage in Frontend

Replace direct API calls with:
```typescript
import { apiClient } from '@/lib/api-client';

// Instead of fetch('/api/generate-compact-study', ...)
const result = await apiClient.post('/api/generate-compact-study', data);
```

## Benefits
- ✅ Vercel handles frontend scaling automatically
- ✅ Docker backend handles heavy processing
- ✅ Redis and file processing stay on backend
- ✅ Faster frontend deployments
- ✅ Better resource utilization