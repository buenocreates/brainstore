# Quick Start Guide

## ✅ Already Set Up For You:
- ✅ API key configured in `server/.env`
- ✅ Client API URL configured in `client/.env`
- ✅ All project files created

## 🚀 Next Steps:

### 1. Install Node.js (if not already installed)

**Option A: Using Homebrew (Recommended for Mac)**
```bash
brew install node
```

**Option B: Download from official site**
Visit: https://nodejs.org/ and download the LTS version

**Option C: Using Cursor's built-in terminal**
Cursor may have Node.js available. Try opening a new terminal in Cursor.

### 2. Install Dependencies

Once Node.js is installed, run:
```bash
npm run install-all
```

This will install all dependencies for:
- Root project
- Server (backend)
- Client (frontend)

### 3. Start the Application

```bash
npm run dev
```

This starts both:
- Backend server on `http://localhost:5000`
- Frontend React app on `http://localhost:3000`

### 4. Open in Browser

Navigate to: **http://localhost:3000**

You should see:
- 🧠 3D spinning brain in the center
- 💬 Chat interface at the bottom

## 🎯 What to Do:

1. Start chatting with the Brain AI
2. Teach it new things - it will remember!
3. The brain will slowly rotate and reflect light
4. You can click and drag to spin the brain manually

## 🔧 Troubleshooting:

**If npm is not found:**
- Make sure Node.js is installed: `node --version`
- Try restarting your terminal
- In Cursor, try opening a new integrated terminal

**If port 5000 or 3000 is already in use:**
- Change `PORT` in `server/.env`
- React will automatically use a different port if 3000 is taken

**If you see API errors:**
- Verify your API key in `server/.env`
- Make sure you have credits in your OpenAI account

## 📝 Notes:

- The AI uses GPT-4 (can be changed to GPT-3.5-turbo in `server/index.js` for cost savings)
- All conversations are stored in `server/memory.db`
- The brain model uses Three.js for 3D rendering

Enjoy your Brain AI! 🧠✨

