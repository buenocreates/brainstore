# Deploying Brainstore to Render

This guide will help you deploy your Brainstore application to Render so it's accessible online.

## Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository
3. API keys ready:
   - Anthropic Claude API key
   - SerpAPI key (optional, for web search)
   - MongoDB Atlas connection string (already set up)

## Step 1: Push Your Code to GitHub

1. If you haven't already, initialize git and push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

## Step 2: Deploy Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `brainai-backend`
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: Leave empty (or set to root)

5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000` (Render assigns a port, but we set this as fallback)
   - `ANTHROPIC_API_KEY` = Your Claude API key
   - `SERPAPI_API_KEY` = Your SerpAPI key (if you have one)
   - `MONGODB_URI` = Your MongoDB Atlas connection string
   - `CHROMA_URL` = `http://chroma:8000` (we'll update this after deploying ChromaDB)

6. Click "Create Web Service"

## Step 3: Deploy ChromaDB (Memory Store)

**Option A: Use Render's Docker Service (Recommended)**

1. Go to Render Dashboard → "New +" → "Web Service"
2. Select your repository
3. Configure:
   - **Name**: `brainai-chroma`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `Dockerfile.chroma`
   - **Docker Context**: `.` (root)

4. Add Environment Variables:
   - `IS_PERSISTENT` = `TRUE`
   - `ANONYMIZED_TELEMETRY` = `FALSE`

5. Click "Create Web Service"

6. **Important**: After ChromaDB is deployed, note its internal URL (e.g., `http://brainai-chroma:8000`) and update the `CHROMA_URL` in your backend service.

**Option B: Use External ChromaDB Service**

Alternatively, you can use a managed ChromaDB service or deploy it separately. Update `CHROMA_URL` accordingly.

## Step 4: Deploy Frontend (Static Site)

1. Go to Render Dashboard → "New +" → "Static Site"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `brainai-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`

4. Add Environment Variable:
   - `REACT_APP_API_URL` = `https://brainai-backend.onrender.com` (replace with your actual backend URL)

5. Click "Create Static Site"

## Step 5: Update Environment Variables

After all services are deployed:

1. **Backend Service**:
   - Update `CHROMA_URL` to your ChromaDB service URL (e.g., `https://brainai-chroma.onrender.com` or internal URL)
   - If using internal services, use the internal URL format

2. **Frontend Service**:
   - Update `REACT_APP_API_URL` to your backend URL (e.g., `https://brainai-backend.onrender.com`)

## Step 6: Update CORS Settings

Make sure your backend allows requests from your frontend domain. The CORS should already be set to allow all origins, but verify in `server/index.js`.

## Step 7: Test Your Deployment

1. Visit your frontend URL (e.g., `https://brainai-frontend.onrender.com`)
2. Test the chat functionality
3. Check backend logs in Render dashboard for any errors

## Troubleshooting

### ChromaDB Connection Issues

If ChromaDB isn't connecting:
- Check that ChromaDB service is running
- Verify the `CHROMA_URL` is correct
- For internal services, use the internal URL format
- Check ChromaDB logs in Render dashboard

### MongoDB Connection Issues

- Verify your MongoDB Atlas connection string is correct
- Make sure your MongoDB Atlas IP whitelist includes Render's IP ranges (or use `0.0.0.0/0` for all)
- Check that the password in the connection string is correct

### Frontend Can't Connect to Backend

- Verify `REACT_APP_API_URL` is set correctly
- Check CORS settings in backend
- Make sure backend service is running

### Build Failures

- Check build logs in Render dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

## Alternative: Simplified Deployment (Single Service)

If you want to simplify, you can:

1. Deploy backend as a web service
2. Serve frontend from the backend (add static file serving)
3. Use a simpler ChromaDB setup or switch to a different vector DB

Let me know if you want help with this alternative approach!

## Notes

- Render free tier has limitations (services sleep after inactivity)
- Consider upgrading for production use
- ChromaDB on Render may need persistent storage configuration
- MongoDB Atlas free tier should be sufficient for development

