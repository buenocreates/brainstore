# Quick Guide: Deploy Brainstore to Render

## 🚀 Step-by-Step Deployment

### Step 1: Push Code to GitHub

```bash
# If not already done
git init
git add .
git commit -m "Ready for deployment"
git remote add origin YOUR_GITHUB_REPO_URL
git push -u origin main
```

### Step 2: Deploy Backend (Node.js Service)

1. Go to [Render Dashboard](https://dashboard.render.com) → "New +" → "Web Service"
2. Connect your GitHub repository
3. **Settings:**
   - **Name**: `brainai-backend`
   - **Environment**: `Node`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`

4. **Environment Variables** (click "Add Environment Variable"):
   ```
   NODE_ENV = production
   PORT = 10000
   ANTHROPIC_API_KEY = your-claude-api-key
   SERPAPI_API_KEY = your-serpapi-key (optional)
   MONGODB_URI = your-mongodb-atlas-connection-string
   CHROMA_URL = http://localhost:8000
   ```
   ⚠️ **Note**: For ChromaDB, we'll use a workaround (see Step 3)

5. Click "Create Web Service"
6. Wait for deployment (takes 5-10 minutes)
7. **Copy your backend URL** (e.g., `https://brainai-backend.onrender.com`)

### Step 3: Handle ChromaDB (Memory Store)

**Option A: Skip ChromaDB for now (Simplest)**
- The app will work without ChromaDB, but memories won't persist
- You can add ChromaDB later

**Option B: Use External ChromaDB Service**
- Deploy ChromaDB separately or use a managed service
- Update `CHROMA_URL` in backend environment variables

**Option C: Deploy ChromaDB on Render (Advanced)**
- Create a new Web Service with Docker
- Use the `Dockerfile.chroma` file
- Set internal URL in backend

### Step 4: Deploy Frontend (Static Site)

1. Go to Render Dashboard → "New +" → "Static Site"
2. Connect your GitHub repository
3. **Settings:**
   - **Name**: `brainai-frontend`
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`

4. **Environment Variable:**
   ```
   REACT_APP_API_URL = https://brainai-backend.onrender.com
   ```
   (Replace with your actual backend URL from Step 2)

5. Click "Create Static Site"
6. Wait for deployment

### Step 5: Update Backend CORS (if needed)

Your backend should already allow all origins, but verify in `server/index.js`:
```javascript
app.use(cors()); // This allows all origins
```

### Step 6: Test Your Site

1. Visit your frontend URL (e.g., `https://brainai-frontend.onrender.com`)
2. Test the chat functionality
3. Check backend logs in Render dashboard if there are issues

## 🔧 Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify all environment variables are set
- Make sure MongoDB connection string is correct

### Frontend can't connect to backend
- Verify `REACT_APP_API_URL` matches your backend URL
- Check CORS settings
- Make sure backend is running (not sleeping)

### ChromaDB connection errors
- The app will still work without ChromaDB
- Check logs to see if it's a critical error
- You can disable ChromaDB temporarily

### Services are sleeping
- Render free tier puts services to sleep after inactivity
- First request after sleep takes ~30 seconds
- Consider upgrading for production

## 📝 Important Notes

1. **Free Tier Limitations:**
   - Services sleep after 15 minutes of inactivity
   - Limited build time
   - Limited bandwidth

2. **Environment Variables:**
   - Never commit `.env` files to GitHub
   - Always set them in Render dashboard

3. **MongoDB Atlas:**
   - Make sure your IP whitelist includes `0.0.0.0/0` (all IPs)
   - Or add Render's IP ranges

4. **Build Time:**
   - First build takes longer (5-10 minutes)
   - Subsequent builds are faster

## ✅ You're Done!

Your site should now be live! Share the frontend URL with users.

**Next Steps:**
- Monitor logs for errors
- Set up custom domain (optional)
- Consider upgrading for production use

