const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const MemoryStore = require('./memory');
const { connectDB } = require('./db');
const { saveConversation, getConversations, searchConversations, getStats } = require('./models/Conversation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Initialize MongoDB
connectDB().then(() => {
  console.log('✅ MongoDB initialized successfully');
}).catch(err => {
  console.error('❌ Failed to connect to MongoDB:', err.message);
  console.error('Please check your MONGODB_URI in server/.env');
});

// Initialize memory store
const memoryStore = new MemoryStore();

// Initialize Claude API
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
if (!apiKey || apiKey === 'your-api-key-here' || apiKey === 'your-claude-api-key-here') {
  console.error('⚠️  WARNING: Claude API key not set! Please add ANTHROPIC_API_KEY to server/.env');
}
const anthropic = new Anthropic({
  apiKey: apiKey || 'dummy-key'
});

// Initialize memory store on startup and seed basic knowledge
let memoryStoreReady = false;
memoryStore.initialize().then(async () => {
  memoryStoreReady = true;
  // Seed basic knowledge for common greetings
  try {
    const existingMemories = await memoryStore.getAllMemories(50);
    const hasBasicKnowledge = existingMemories.some(m => 
      m.content && (
        m.content.includes('greeting') || 
        m.content.includes('hi') || 
        m.content.includes('hello') ||
        m.metadata?.type === 'greeting'
      )
    );
    
    if (!hasBasicKnowledge) {
      console.log('🌱 Seeding basic knowledge...');
      const basicKnowledge = [
        { content: 'Question: hi\nAnswer: Hello!', metadata: { type: 'greeting', category: 'basic' } },
        { content: 'Question: hello\nAnswer: Hi!', metadata: { type: 'greeting', category: 'basic' } },
        { content: 'Question: how are you\nAnswer: I\'m good, thanks! How are you?', metadata: { type: 'greeting', category: 'basic' } },
        { content: 'Question: what is your name\nAnswer: I\'m brainstore.', metadata: { type: 'info', category: 'basic' } },
        { content: 'Question: what\'s your name\nAnswer: brainstore.', metadata: { type: 'info', category: 'basic' } },
        { content: 'Question: who are you\nAnswer: I\'m brainstore, a learning AI.', metadata: { type: 'info', category: 'basic' } },
        { content: 'When someone says "I\'m good" or "I\'m fine", I should acknowledge briefly like "Great!" or "Nice!"', metadata: { type: 'conversation', category: 'basic' } },
        { content: 'When someone says "thanks" or "thank you", I should respond with "You\'re welcome!" or "No problem!"', metadata: { type: 'conversation', category: 'basic' } },
        { content: 'I should keep all responses very short and concise - 5-10 words maximum', metadata: { type: 'behavior', category: 'basic' } }
      ];
      
      for (const knowledge of basicKnowledge) {
        await memoryStore.addMemory(knowledge.content, knowledge.metadata);
      }
      console.log('✅ Basic knowledge seeded');
    } else {
      console.log('✅ Basic knowledge already exists');
    }
  } catch (err) {
    console.error('Error seeding basic knowledge:', err);
  }
}).catch(err => {
  console.error('Failed to initialize memory store:', err);
  console.log('💡 To use vector memory, start Chroma: docker-compose up -d');
});

// Store conversation history (in-memory for now, could use DB)
const conversations = new Map(); // sessionId -> messages array

// Web search function - improved version (like ai-brainstore)
async function searchWeb(query) {
  try {
    const queryLower = query.toLowerCase();
    
    // For time queries, get actual current time using WorldTimeAPI
    if (queryLower.includes('time')) {
      // Extract location from query
      let location = '';
      let timezone = 'UTC';
      
      if (queryLower.includes('sydney')) {
        location = 'Sydney, Australia';
        timezone = 'Australia/Sydney';
      } else if (queryLower.includes('ohio')) {
        location = 'Ohio, USA';
        timezone = 'America/New_York';
      } else if (queryLower.includes('new york')) {
        location = 'New York, USA';
        timezone = 'America/New_York';
      } else if (queryLower.includes('london')) {
        location = 'London, UK';
        timezone = 'Europe/London';
      } else if (queryLower.includes('tokyo')) {
        location = 'Tokyo, Japan';
        timezone = 'Asia/Tokyo';
      } else if (queryLower.includes('paris')) {
        location = 'Paris, France';
        timezone = 'Europe/Paris';
      } else if (queryLower.includes('los angeles') || queryLower.includes('la')) {
        location = 'Los Angeles, USA';
        timezone = 'America/Los_Angeles';
      } else {
        // Try to extract location from query
        const match = query.match(/time in (.+)/i);
        if (match) {
          location = match[1].trim();
          // Try common timezones
          if (location.toLowerCase().includes('australia')) {
            timezone = 'Australia/Sydney';
          } else if (location.toLowerCase().includes('uk') || location.toLowerCase().includes('britain')) {
            timezone = 'Europe/London';
          }
        }
      }
      
      // Use WorldTimeAPI for actual current time
      try {
        console.log(`🕐 Getting time for ${location} (${timezone})`);
        const timeResponse = await axios.get(`https://worldtimeapi.org/api/timezone/${timezone}`, {
          timeout: 8000
        });
        if (timeResponse.data && timeResponse.data.datetime) {
          const date = new Date(timeResponse.data.datetime);
          const timeStr = date.toLocaleString('en-US', { 
            timeZone: timezone,
            hour: 'numeric', 
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            timeZoneName: 'short'
          });
          const result = `Current time in ${location || timezone}: ${timeStr}`;
          console.log('✅ Got time:', result);
          return result;
        }
      } catch (timeError) {
        console.error('❌ WorldTimeAPI error:', timeError.message);
      }
      
      // Fallback: Try SerpAPI for time
      if (process.env.SERPAPI_API_KEY) {
        const timeQuery = `current time ${location || query}`;
        const response = await axios.get('https://serpapi.com/search.json', {
          params: {
            api_key: process.env.SERPAPI_API_KEY,
            q: timeQuery,
            engine: 'google'
          },
          timeout: 10000
        });
        
        if (response.data.answer_box) {
          if (response.data.answer_box.answer) {
            return response.data.answer_box.answer;
          }
          if (response.data.answer_box.result) {
            return response.data.answer_box.result;
          }
        }
      }
    }
    
    // For other queries, use regular search
    let searchQuery = query;
    
    // Try SerpAPI first if available (better results)
    if (process.env.SERPAPI_API_KEY) {
      const response = await axios.get('https://serpapi.com/search.json', {
        params: {
          api_key: process.env.SERPAPI_API_KEY,
          q: searchQuery,
          engine: 'google',
          num: 3
        },
        timeout: 10000
      });
      
      const results = [];
      // Get answer box if available (for direct answers)
      if (response.data.answer_box) {
        if (response.data.answer_box.answer) {
          results.push(response.data.answer_box.answer);
        }
        if (response.data.answer_box.result) {
          results.push(response.data.answer_box.result);
        }
        if (response.data.answer_box.snippet) {
          results.push(response.data.answer_box.snippet);
        }
      }
      // Get knowledge graph
      if (response.data.knowledge_graph) {
        if (response.data.knowledge_graph.description) {
          results.push(response.data.knowledge_graph.description);
        }
      }
      // Get snippets
      if (response.data.organic_results) {
        response.data.organic_results.slice(0, 3).forEach(result => {
          if (result.snippet) {
            results.push(result.snippet);
          }
        });
      }
      return results.join('\n\n');
    }
    
    // Fallback to DuckDuckGo
    const response = await axios.get('https://api.duckduckgo.com/', {
      params: {
        q: searchQuery,
        format: 'json',
        no_html: '1',
        skip_disambig: '1'
      },
      timeout: 10000
    });
    
    const results = [];
    // Get Abstract first (usually most relevant)
    if (response.data.Abstract) {
      results.push(response.data.Abstract);
    }
    if (response.data.RelatedTopics) {
      response.data.RelatedTopics.slice(0, 3).forEach(topic => {
        if (topic.Text) {
          results.push(topic.Text);
        }
      });
    }
    
    return results.join('\n\n');
  } catch (error) {
    console.error('Web search error:', error.message);
    return '';
  }
}

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create conversation history
    const session = sessionId || 'default';
    if (!conversations.has(session)) {
      conversations.set(session, []);
    }
    const conversationHistory = conversations.get(session);

    const steps = [];
    
    // Step 1: Search memories
    let memoryContext = '';
    let hasMemory = false;
    try {
      const memories = await memoryStore.searchMemories(message, 5);
      if (memories.length > 0 && memories[0].distance < 0.8) {
        hasMemory = true;
        steps.push({ type: 'status', text: 'Recalling...', color: 'yellow', order: 1 });
        memoryContext = `\n\nRelevant memories:\n${memories.map(m => m.content).join('\n')}\n`;
      }
    } catch (error) {
      console.error('Memory search error:', error.message);
    }
    
    // For simple greetings, responses, and name queries, always check memories first
    const isGreeting = /^(hi|hello|hey|how are you|how's it going|what's up|i'm good|i'm fine|thanks|thank you)/i.test(message.trim());
    const isNameQuery = /(what.*name|who are you|your name)/i.test(message);
    
    if ((isGreeting || isNameQuery) && !hasMemory) {
      // Try to find relevant memories
      try {
        const searchQuery = isNameQuery ? 'name brainstore who are you' : 'greeting hello hi how are you conversation';
        const relevantMemories = await memoryStore.searchMemories(searchQuery, 3);
        if (relevantMemories.length > 0) {
          hasMemory = true;
          steps.push({ type: 'status', text: 'Recalling...', color: 'yellow', order: 1 });
          memoryContext = `\n\nRelevant memories:\n${relevantMemories.map(m => m.content).join('\n')}\n`;
        }
      } catch (error) {
        console.error('Memory search error:', error.message);
      }
    }
    
    // Step 2: Search web ONLY if it's a real-time query (current time, weather, etc.)
    let webInfo = '';
    const isRealTimeQuery = message.toLowerCase().includes('current time') || 
      message.toLowerCase().includes('weather') ||
      (message.toLowerCase().includes('time') && message.toLowerCase().includes('now'));
    
    if (isRealTimeQuery && !hasMemory) {
      steps.push({ type: 'status', text: 'Searching web...', color: 'yellow', order: 2 });
      console.log('🔍 Searching web for:', message);
      webInfo = await searchWeb(message);
      console.log('📡 Web search result:', webInfo ? webInfo.substring(0, 200) : 'NO RESULTS');
    }
    
    const webContext = webInfo 
      ? `\n\nWeb information:\n${webInfo}\n`
      : '';
    
    // Build system prompt - learning brain with curiosity and common sense
    const systemPrompt = `You are Brainstore - a Brain AI experiment that learns from users. You have basic common sense but are curious and always want to learn more.

CRITICAL RULES:
- ALWAYS respond with actual words, never just punctuation or empty responses.
- Keep responses CONCISE: 8-15 words is ideal. Be natural and conversational, not too short or too long.
- ALWAYS write complete sentences with proper punctuation. Never cut off mid-sentence.
- Your name is "brainstore" (if asked about your name, say "brainstore").
- RESPOND CONTEXTUALLY to the conversation - read the conversation history and respond appropriately.
- BE CURIOUS AND QUESTIONING - if someone says something vague like "test", "ok", or unclear messages, ALWAYS ask what they mean. Don't just acknowledge - QUESTION them.
- You have BASIC COMMON SENSE - you understand simple concepts, greetings, basic social interactions, and can make logical connections.
- If someone says "good" after you asked "how are you", respond with "That's great!" or "Nice!" - make it make sense.
- If someone says "good" randomly without context, ask "Good about what?" or "What's good?"
- For greetings like "hi" or "hello", respond with "Hello! What would you like to know?" or "Hi! How can I help?"
- If someone says something unclear like "test", ALWAYS ask "What do you want to test?" or "What should I test?" - NEVER just say "Hello!" or acknowledge without questioning.
- When messages are vague or unclear, your FIRST response should be a QUESTION asking for clarification.
- You have basic understanding of simple concepts but want to learn specifics from users.
- If you have memories about this topic, use them.
- If you don't know something specific, ALWAYS say "I don't know. Can you teach me?" - Complete the sentence properly.
- Be curious, ask clarifying questions, and encourage users to teach you.
- NEVER respond with just a period, comma, or punctuation mark.
- ALWAYS complete your sentences. Never write incomplete thoughts or cut off mid-word.
- Use your common sense to understand context, but ask questions when things are unclear.
- ALWAYS read the conversation context before responding - make your responses make sense in context.
- Write proper English with complete sentences, even if short.

${memoryContext ? `\nMEMORIES FROM MY BRAIN:\n${memoryContext}` : '\nI have no specific memories about this yet.'}
${webContext ? `\nWEB INFORMATION (for learning):\n${webContext}` : ''}`;

    // Build messages array with conversation history
    const messages = [];
    
    // Add conversation history (last 20 messages for better context)
    const recentHistory = conversationHistory.slice(-20);
    recentHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
    
    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Claude API
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 60, // Allow for natural, complete responses
      temperature: 0.3, // Lower for more focused responses
      system: systemPrompt,
      messages: messages,
      stop_sequences: ['\n\n'] // Stop at double newline to prevent incomplete thoughts
    });

    let aiResponse = claudeResponse.content[0].text.trim();
    
    // Fix truncation bug - ensure complete sentences
    // Remove incomplete words at the end (single letters or fragments)
    aiResponse = aiResponse.replace(/\s+[a-zA-Z]\s*$/, ''); // Remove trailing single letter like "I"
    aiResponse = aiResponse.replace(/\s+[a-zA-Z]{1,2}\s*$/, ''); // Remove trailing 1-2 letter words
    
    // Complete common incomplete phrases
    const lastWord = aiResponse.split(/\s+/).pop().toLowerCase().replace(/[.,!?;:]$/, '');
    
    if (lastWord === 'teach') {
      aiResponse = aiResponse.replace(/\s+teach\s*$/i, ' teach me?');
    } else if (lastWord === 'know' && !aiResponse.toLowerCase().includes("don't know")) {
      aiResponse = aiResponse.replace(/\s+know\s*$/i, ' know. Can you teach me?');
    } else if (aiResponse.toLowerCase().includes("don't know") && !/[.!?]$/.test(aiResponse)) {
      // Complete "I don't know" phrases - this is the main fix
      aiResponse += '. Can you teach me?';
    } else if (aiResponse.length > 0 && !/[.!?]$/.test(aiResponse)) {
      // Add punctuation if missing
      aiResponse += '.';
    }
    
    // Remove any leading/trailing whitespace
    aiResponse = aiResponse.replace(/^\s+|\s+$/g, '').trim();
    
    // Check if response is empty, too short, or just punctuation
    const isInvalid = !aiResponse || 
                     aiResponse.length < 2 || 
                     /^[.,!?;:\s]+$/.test(aiResponse) ||
                     /^[^\w]*$/.test(aiResponse); // Only punctuation/symbols, no letters/numbers
    
    if (isInvalid) {
      // Fallback response if AI gives empty or just punctuation
      console.log('⚠️ Invalid response detected:', aiResponse, '- Using fallback');
      if (isGreeting || /^(hi|hello|hey)/i.test(message.trim())) {
        aiResponse = "Hello!";
      } else if (isNameQuery) {
        aiResponse = "I'm brainstore.";
      } else {
        aiResponse = "I'm here to learn. Can you teach me?";
      }
    }
    
    // Final safety check - ensure we have a valid response
    if (!aiResponse || aiResponse.length < 1) {
      aiResponse = "Hello!";
    }
    
    // Step 3: Add memory (always save meaningful conversations)
    let memoryId = null;
    
    // Save memory if:
    // 1. We don't have memory about this topic (or it's a new variation)
    // 2. The response is meaningful (not "I don't know")
    const isMeaningfulResponse = !aiResponse.toLowerCase().includes("i don't know") && 
                                 !aiResponse.toLowerCase().includes("haven't learned") &&
                                 aiResponse.length > 5;
    
    // Always save meaningful conversations to learn
    if (isMeaningfulResponse) {
      try {
        const memoryContent = `Question: ${message}\nAnswer: ${aiResponse}`;
        memoryId = await memoryStore.addMemory(memoryContent, {
          source: 'conversation',
          question: message.substring(0, 100),
          timestamp: new Date().toISOString()
        });
        if (memoryId) {
          steps.push({ type: 'status', text: 'Learning...', color: 'yellow', order: 3 });
          console.log('💾 Saved memory:', memoryContent.substring(0, 100));
        }
      } catch (error) {
        console.error('Error saving memory:', error.message);
      }
    }
    
    // Save to conversation history
    conversationHistory.push({ role: 'user', content: message });
    conversationHistory.push({ role: 'assistant', content: aiResponse });
    conversations.set(session, conversationHistory);
    
    // Save to MongoDB
    try {
      const saved = await saveConversation(session, message, aiResponse, {
        hasMemory: hasMemory ? 'yes' : 'no',
        memoryId: memoryId || 'none',
        webInfo: webInfo ? 'yes' : 'no'
      });
      if (saved) {
        console.log('✅ Saved conversation to MongoDB:', saved.sessionId, '- User:', message.substring(0, 30));
      } else {
        console.warn('⚠️  Conversation not saved to MongoDB (check MongoDB password in server/.env)');
      }
    } catch (error) {
      console.error('❌ Error saving conversation to MongoDB:', error.message);
      // Don't throw - continue even if MongoDB fails
    }
    
    res.json({ 
      response: aiResponse,
      steps: steps.sort((a, b) => a.order - b.order),
      needsConfirmation: false, // Always save memories automatically
      memorySaved: memoryId !== null
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Confirm memory endpoint
app.post('/api/confirm-memory', async (req, res) => {
  try {
    const { confirmed } = req.body;
    if (confirmed) {
      res.json({ message: 'Added memory!', status: 'success' });
    } else {
      res.json({ message: 'Memory not saved.', status: 'cancelled' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all memories
app.get('/api/memories', async (req, res) => {
  try {
    const memories = await memoryStore.getAllMemories(100);
    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add memory manually
app.post('/api/memories', async (req, res) => {
  try {
    const { content, metadata } = req.body;
    const id = await memoryStore.addMemory(content, metadata || {});
    res.json({ id, message: 'Memory saved to brain' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete memory
app.delete('/api/memories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await memoryStore.deleteMemory(id);
    if (success) {
      res.json({ message: 'Memory deleted' });
    } else {
      res.status(404).json({ error: 'Memory not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoints for conversation logs
app.get('/api/logs/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/conversations', async (req, res) => {
  try {
    const { search, limit = 100, skip = 0 } = req.query;
    let conversations;
    
    if (search) {
      conversations = await searchConversations(search, parseInt(limit));
    } else {
      conversations = await getConversations({}, parseInt(limit), parseInt(skip));
    }
    
    res.json(conversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Brainstore API is running',
    status: 'ok',
    endpoints: {
      chat: '/api/chat',
      logs: '/api/logs/stats',
      conversations: '/api/logs/conversations'
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🧠 Brain AI ready to learn!`);
});
