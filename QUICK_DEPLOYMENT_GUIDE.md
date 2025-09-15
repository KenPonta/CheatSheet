# Quick Deployment Guide

## Current Status
✅ Frontend deployed to Vercel  
⚠️ Backend needs to be deployed and connected

## Next Steps

### 1. Deploy Backend to a Server

**Option A: DigitalOcean Droplet ($5/month)**
```bash
# Create a droplet, then SSH in
ssh root@your-server-ip

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Upload your code (from your local machine)
scp -r backend-docker root@your-server-ip:/app

# On the server
cd /app
docker-compose up -d --build
```

**Option B: Railway (Easiest)**
1. Go to railway.app
2. Connect your GitHub repo
3. Deploy the backend-docker folder
4. Add Redis addon

### 2. Update Frontend Environment

In Vercel dashboard:
1. Go to your project → Settings → Environment Variables
2. Add: `NEXT_PUBLIC_BACKEND_URL` = `https://your-backend-url`
3. Redeploy: `vercel --prod`

### 3. Test the Connection

Visit your Vercel URL and try uploading a file. The frontend should now communicate with your backend!

## Architecture
- **Frontend (Vercel)**: https://your-app.vercel.app
- **Backend (Your Server)**: https://your-backend-url
- **Database**: Redis (on same server as backend)

## Troubleshooting

If you get API errors:
1. Check backend logs: `docker-compose logs -f`
2. Verify CORS settings in backend
3. Make sure environment variables are set correctly

## Local Development

Backend:
```bash
cd backend-docker
docker-compose up -d
```

Frontend:
```bash
# Set in .env.local: NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
npm run dev
```