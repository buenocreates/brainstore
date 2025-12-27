# 🚀 Brainstore Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code is Ready
- [x] All console.log statements removed
- [x] Old conversations cleared
- [x] Basic knowledge preserved
- [x] Grammar fixes applied
- [x] Font and styling updated

### 2. Environment Variables Needed

**Backend (Render Web Service):**
```
NODE_ENV=production
PORT=10000
ANTHROPIC_API_KEY=your-claude-api-key-here
MONGODB_URI=your-mongodb-atlas-connection-string
CHROMA_URL=http://localhost:8000 (or external ChromaDB URL)
SERPAPI_API_KEY=your-serpapi-key (optional, for web search)
```

**Frontend (Render Static Site):**
```
REACT_APP_API_URL=https://brainai-backend.onrender.com
(Update this with your actual backend URL after deployment)
```

### 3. MongoDB Atlas Setup
- [ ] MongoDB Atlas account created
- [ ] Database cluster created
- [ ] Database user created with password
- [ ] Network Access: Allow all IPs (0.0.0.0/0) OR add Render IP ranges
- [ ] Connection string copied (format: `mongodb+srv://username:password@cluster.mongodb.net/brainai?retryWrites=true&w=majority`)

### 4. GitHub Repository
- [ ] Code pushed to GitHub
- [ ] `.env` files NOT committed (should be in .gitignore)
- [ ] All code changes committed

---

## 📋 Step-by-Step Deployment

### Step 1: Push to GitHub

```bash
# If you haven't already
cd /Users/aoub/Desktop/brainai

# Initialize git if needed
git init

# Add all files (except .env)
git add .

# Commit
git commit -m "Ready for deployment - Brainstore"

# Create GitHub repo, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy Backend on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. **Settings:**
   - **Name**: `brainai-backend` (or `brainstore-backend`)
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`

5. **Environment Variables** (Add each one):
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `ANTHROPIC_API_KEY` = (your Claude API key)
   - `MONGODB_URI` = (your MongoDB Atlas connection string)
   - `CHROMA_URL` = `http://localhost:8000` (or leave empty if not using ChromaDB)
   - `SERPAPI_API_KEY` = (optional, for web search)

6. Click **"Create Web Service"**
7. Wait 5-10 minutes for first deployment
8. **Copy your backend URL** (e.g., `https://brainai-backend.onrender.com`)

### Step 3: Deploy Frontend on Render

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Connect the same GitHub repository
3. **Settings:**
   - **Name**: `brainai-frontend` (or `brainstore-frontend`)
   - **Branch**: `main`
   - **Root Directory**: Leave empty
   - **Build Command**: `cd client && npm install && npm run build`
   - **Publish Directory**: `client/build`

4. **Environment Variable:**
   - `REACT_APP_API_URL` = `https://brainai-backend.onrender.com`
   (Use the actual backend URL from Step 2)

5. Click **"Create Static Site"**
6. Wait for deployment

### Step 4: (Optional) Deploy ChromaDB

**Option A: Skip ChromaDB** (Simplest - app works without it)
- The app will work, but memories won't persist between restarts
- You can add this later

**Option B: Deploy ChromaDB on Render**
1. Click **"New +"** → **"Web Service"**
2. Connect GitHub repo
3. **Settings:**
   - **Name**: `chroma`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./Dockerfile.chroma`
4. After deployment, update backend `CHROMA_URL` to ChromaDB's internal URL

---

## 🔍 Post-Deployment Verification

### Test These:
1. ✅ Frontend loads at your Render URL
2. ✅ Chat interface appears
3. ✅ Can send messages
4. ✅ AI responds correctly
5. ✅ Conversation logs page works
6. ✅ No console errors in browser
7. ✅ Backend API responds (check `/api/logs/stats`)

### Check Backend Logs:
- Go to Render Dashboard → Your Backend Service → Logs
- Look for any errors
- Should see "Server running" message

---

## ⚠️ Important Notes

### Free Tier Limitations:
- Services sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Consider upgrading for production use

### MongoDB Atlas:
- Make sure Network Access allows all IPs (0.0.0.0/0)
- Or add Render's IP ranges manually

### CORS:
- Your backend already has `app.use(cors())` which allows all origins
- This should work out of the box

### Environment Variables:
- **NEVER** commit `.env` files
- Always set them in Render dashboard
- They're secure and encrypted on Render

---

## 🐛 Troubleshooting

### Backend won't start:
- Check Render logs
- Verify all environment variables are set
- Check MongoDB connection string format
- Make sure PORT is set to 10000

### Frontend can't connect:
- Verify `REACT_APP_API_URL` matches backend URL exactly
- Check backend is running (not sleeping)
- Check CORS settings

### MongoDB connection fails:
- Verify connection string format
- Check Network Access in MongoDB Atlas
- Verify username/password are correct

### ChromaDB errors:
- App works without ChromaDB
- Can be added later
- Check logs for specific errors

---

## ✅ You're Ready!

Once deployed:
1. Share your frontend URL
2. Monitor logs for any issues
3. Consider setting up a custom domain
4. Upgrade plan if needed for production

**Your site will be live at:** `https://brainai-frontend.onrender.com` (or your custom name)

