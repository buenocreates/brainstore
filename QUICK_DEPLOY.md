# 🚀 Quick Deployment Guide - Brainstore

## ✅ You Already Have:
- ✅ Git repository connected to GitHub
- ✅ `render.yaml` file for easy deployment
- ✅ All code ready

## 📝 Before You Deploy - Commit Your Changes

You have uncommitted changes. Commit them first:

```bash
cd /Users/aoub/Desktop/brainai
git add .
git commit -m "Final updates: grammar fixes, cleared data, branding updates"
git push origin main
```

## 🎯 Quick Deploy Options

### Option 1: Use Render.yaml (Easiest - Recommended)

1. **Go to [Render Dashboard](https://dashboard.render.com)**
2. **Click "New +" → "Blueprint"**
3. **Connect your GitHub repo**
4. **Render will automatically detect `render.yaml`**
5. **It will create 3 services:**
   - Backend (Node.js)
   - Frontend (Static Site)
   - ChromaDB (Docker)

6. **Set Environment Variables in Render Dashboard:**

   **For Backend Service:**
   ```
   ANTHROPIC_API_KEY = your-claude-api-key
   MONGODB_URI = your-mongodb-connection-string
   SERPAPI_API_KEY = your-serpapi-key (optional)
   ```

   **For Frontend Service:**
   ```
   REACT_APP_API_URL = https://brainai-backend.onrender.com
   (Update after backend deploys)
   ```

### Option 2: Manual Deployment (More Control)

See `DEPLOYMENT_CHECKLIST.md` for detailed steps.

---

## 🔑 Required Environment Variables

### Backend Needs:
1. **ANTHROPIC_API_KEY** - Your Claude API key (REQUIRED)
2. **MONGODB_URI** - MongoDB Atlas connection string (REQUIRED)
3. **SERPAPI_API_KEY** - For web search (OPTIONAL)
4. **CHROMA_URL** - Leave as `http://localhost:8000` or external URL (OPTIONAL)

### Frontend Needs:
1. **REACT_APP_API_URL** - Your backend URL (set after backend deploys)

---

## 📋 Pre-Deployment Checklist

- [ ] All code committed and pushed to GitHub
- [ ] MongoDB Atlas account ready
- [ ] MongoDB connection string ready
- [ ] Claude API key ready
- [ ] Render account created (free tier works)

---

## 🚀 Deploy Steps (Using Blueprint)

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to Render Dashboard:**
   - Visit https://dashboard.render.com
   - Sign up/login (free account works)

3. **Create Blueprint:**
   - Click "New +" → "Blueprint"
   - Connect GitHub repo
   - Render will auto-detect `render.yaml`

4. **Set Environment Variables:**
   - After services are created, go to each service
   - Add environment variables (see above)

5. **Wait for Deployment:**
   - Backend: 5-10 minutes
   - Frontend: 3-5 minutes
   - ChromaDB: 5-10 minutes

6. **Update Frontend API URL:**
   - After backend deploys, copy its URL
   - Go to Frontend service → Environment
   - Update `REACT_APP_API_URL` with backend URL
   - Redeploy frontend

---

## ✅ After Deployment

1. **Test your site:**
   - Visit frontend URL
   - Try sending a message
   - Check conversation logs

2. **Monitor logs:**
   - Check Render dashboard for any errors
   - Backend logs show connection status

3. **Share your site:**
   - Your frontend URL is your live site!

---

## ⚠️ Important Notes

- **Free Tier**: Services sleep after 15 min inactivity (first request takes ~30 sec)
- **MongoDB**: Make sure Network Access allows all IPs (0.0.0.0/0)
- **ChromaDB**: Optional - app works without it (memories won't persist)
- **Environment Variables**: Set in Render dashboard, NOT in code

---

## 🐛 Common Issues

**Backend won't start:**
- Check all environment variables are set
- Verify MongoDB connection string format
- Check Render logs for errors

**Frontend can't connect:**
- Verify `REACT_APP_API_URL` matches backend URL
- Make sure backend is running (not sleeping)
- Check CORS (should already be enabled)

**MongoDB connection fails:**
- Check Network Access in MongoDB Atlas
- Verify connection string has correct password
- Make sure IP whitelist includes 0.0.0.0/0

---

## 🎉 You're Done!

Once deployed, your site will be live at:
- Frontend: `https://brainai-frontend.onrender.com` (or your custom name)
- Backend: `https://brainai-backend.onrender.com` (or your custom name)

**Next Steps:**
- Test everything works
- Share your frontend URL
- Monitor for any issues
- Consider custom domain (optional)

