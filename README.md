# Brain AI - Interactive Learning Platform

An interactive web application featuring a 3D brain model that learns and grows through conversations with users. The AI has access to a memory store and web search capabilities to continuously expand its knowledge.

## Features

- 🧠 **3D Reflective Brain Model**: Interactive, spinnable 3D brain that slowly rotates in random directions
- 💬 **Chat Interface**: Teach the AI and have conversations at the bottom of the screen
- 🧠 **Memory Store**: The AI remembers past conversations and learns from them
- 🌐 **Web Search**: AI can search the web to gain additional information
- 🎨 **Modern UI**: Beautiful gradient background with glassmorphism effects

## Tech Stack

- **Frontend**: React, Three.js, React Three Fiber, Drei
- **Backend**: Node.js, Express
- **Database**: ChromaDB (vector database for semantic memory)
- **AI**: Claude (Anthropic) for chat, OpenAI for embeddings
- **Web Search**: SerpAPI (optional) or DuckDuckGo

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker (for ChromaDB)
- Claude API key ([Get one here](https://console.anthropic.com/))
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys)) - for embeddings
- SerpAPI key (optional, [Get one here](https://serpapi.com/)) - for better web search

### Installation

1. **Install all dependencies**:
   ```bash
   npm run install-all
   ```

2. **Start ChromaDB** (Vector Database):
   ```bash
   docker-compose up -d
   ```
   This starts ChromaDB on port 8000 for semantic memory storage.

3. **Set up environment variables**:
   
   The `.env` file is already set up in `server/.env` but is ignored by git for security.
   
   **Required API keys:**
   - Open `server/.env` 
   - Add your Claude API key: `ANTHROPIC_API_KEY=sk-ant-api03-...`
   - Add your OpenAI API key: `OPENAI_API_KEY=sk-...` (for embeddings)
   - Optional: Add SerpAPI key for better web search: `SERPAPI_API_KEY=...`
   
   Example:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...
   OPENAI_API_KEY=sk-...
   SERPAPI_API_KEY=your-key-here (optional)
   CHROMA_URL=http://localhost:8000
   COLLECTION_NAME=ai-brainstore
   PORT=5000
   ```
   
   ⚠️ **Important**: Never commit your `.env` file to GitHub! It's already in `.gitignore`.

4. **Start the development servers**:
   ```bash
   npm run dev
   ```
   
   This will start both the backend server (port 5000) and the React frontend (port 3000).

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## Project Structure

```
brainai/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── BrainModel.js      # 3D brain component
│   │   │   └── ChatInterface.js   # Chat UI component
│   │   ├── App.js
│   │   └── index.js
│   └── package.json
├── server/                 # Express backend
│   ├── index.js           # Main server file
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## How It Works

1. **3D Brain Model**: Uses Three.js to render a reflective, brain-like geometry that automatically rotates
2. **Chat Interface**: Users can type messages and teach the AI
3. **Vector Memory System**: Uses ChromaDB for semantic memory storage - memories are stored as embeddings and retrieved using similarity search
4. **Web Search**: When users ask questions, the AI searches the web (SerpAPI or DuckDuckGo) for additional context
5. **Learning**: The AI automatically saves question-answer pairs to its vector memory for future recall

## API Endpoints

- `POST /api/chat` - Send a message to the AI
- `GET /api/memories` - Get all stored memories
- `POST /api/memories` - Manually add a memory

## Customization

- **Brain Appearance**: Modify the `BrainModel.js` component to change colors, materials, or geometry
- **Chat Styling**: Edit `ChatInterface.css` to customize the chat appearance
- **AI Behavior**: Adjust the system prompt in `server/index.js` to change how the AI responds

## Notes

- The brain model uses a torus knot geometry modified to look more brain-like
- The reflective material creates a shiny, mirror-like surface
- The AI uses Claude 3.5 Sonnet (can be changed in `server/index.js`)
- Web search uses DuckDuckGo's free API (no key required)

## License

MIT

