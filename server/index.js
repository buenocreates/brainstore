const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const MemoryStore = require('./memory');
const { connectDB } = require('./db');
const { saveConversation, getConversations, searchConversations, getStats, getConversationsBySession, clearAllConversations } = require('./models/Conversation');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// Initialize MongoDB
connectDB().then(() => {
  // MongoDB initialized
}).catch(err => {
  // MongoDB connection failed
});

// Initialize memory store
const memoryStore = new MemoryStore();

// Initialize Claude API
const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
// Check API key
const anthropic = new Anthropic({
  apiKey: apiKey || 'dummy-key'
});

// Initialize memory store on startup and seed basic knowledge
let memoryStoreReady = false;
memoryStore.initialize().then(async () => {
  memoryStoreReady = true;
  
  // Clear all conversations and memories (except basic knowledge) for public release
  try {
    // Clear all conversations
    await clearAllConversations();
    
    // Clear all memories except basic knowledge
    await memoryStore.clearAllMemoriesExceptBasic();
  } catch (err) {
    // Error clearing data
  }
  
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
    }
  } catch (err) {
    // Error seeding basic knowledge
  }
}).catch(err => {
  // Failed to initialize memory store
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
          return result;
        }
      } catch (timeError) {
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
    
    // Check for ambiguous queries that need clarification
    const ambiguousPatterns = [
      /^president$/i,           // Just "president"
      /^the president$/i,      // "the president" without context
      /^it$/i,                  // Just "it"
      /^that$/i,                // Just "that"
      /^this$/i,                // Just "this"
    ];
    
    const needsClarification = ambiguousPatterns.some(pattern => pattern.test(message.trim()));
    
    // Check if we have recent context in conversation history
    let hasRecentContext = false;
    if (needsClarification && conversationHistory.length > 0) {
      const recentHistory = conversationHistory.slice(-4); // Last 2 exchanges
      // Check if recent conversation provides context
      hasRecentContext = recentHistory.some(msg => 
        msg.role === 'user' && (
          msg.content.toLowerCase().includes('president') ||
          msg.content.toLowerCase().includes('us') ||
          msg.content.toLowerCase().includes('united states')
        )
      );
    }
    
    // Step 1: Search memories - INFINITE MEMORY - search ALL memories (1000+ results)
    let memoryContext = '';
    let hasMemory = false;
    try {
      // Search ALL memories - INFINITE - get as many as possible (1000 limit for performance)
      const memories = await memoryStore.searchMemories(message, 1000);
      if (memories.length > 0) {
        hasMemory = true;
        steps.push({ type: 'status', text: 'Recalling everything...', color: 'yellow', order: 1 });
        // Include ALL relevant memories - THE BRAIN KNOWS EVERYTHING
        // Format: Show what the brain learned (Question/Answer pairs)
        memoryContext = `\n\nCRITICAL: YOU HAVE MEMORIES ABOUT THIS. USE THEM. THESE ARE FACTS YOU KNOW:\n${memories.map(m => m.content).join('\n\n')}\n\nREMEMBER: If the memories contain information about what the user asked, YOU MUST USE THAT INFORMATION. Do not say "I don't know" if you have memories about it.\n`;
      }
    } catch (error) {
    }
    
    // Also get ALL past conversations from MongoDB for this session (INFINITE HISTORY)
    let mongoHistoryContext = '';
    try {
      const pastConversations = await getConversationsBySession(session);
      if (pastConversations && pastConversations.length > 0) {
        mongoHistoryContext = `\n\nCOMPLETE CONVERSATION HISTORY FROM THIS SESSION (${pastConversations.length} past interactions):\n${pastConversations.map(c => `User: ${c.userMessage}\nBrain: ${c.aiResponse}`).join('\n---\n')}\n`;
      }
    } catch (error) {
    }
    
    // Step 2: Search web ONLY if it's a real-time query (current time, weather, etc.)
    let webInfo = '';
    const isRealTimeQuery = message.toLowerCase().includes('current time') || 
      message.toLowerCase().includes('weather') ||
      (message.toLowerCase().includes('time') && message.toLowerCase().includes('now'));
    
    if (isRealTimeQuery && !hasMemory) {
      steps.push({ type: 'status', text: 'Searching web...', color: 'yellow', order: 2 });
      webInfo = await searchWeb(message);
    }
    
    const webContext = webInfo 
      ? `\n\nWeb information:\n${webInfo}\n`
      : '';
    
    // Build system prompt - learning brain with curiosity and common sense
    const systemPrompt = `You are Brainstore - a Brain AI experiment that learns from users. You have basic common sense but are curious and always want to learn more.

CRITICAL RULES - FOLLOW STRICTLY:
- NEVER mention Anthropic, Claude, or that you're made by any company. You are a Brain AI/model. That's it.
- NEVER say you're a "prompt engine" or describe how you work technically. You're just a Brain AI/model.
- ALWAYS respond with actual words, never just punctuation or empty responses.
- Keep responses VERY SHORT - 1 sentence is ideal, 2 sentences maximum. Be extremely concise. Get straight to the point.
- NO unnecessary words: Don't say "I'm sorry", "thank you", "I appreciate", "I did not have prior knowledge" - just answer directly.
- If you don't know something, just say "I don't know. Can you teach me?" - No explanations.
- If someone teaches you something, just acknowledge briefly like "Got it." or "I'll remember that." - Don't write long thank you messages.
- NEVER say "AI assistant" - you are a model, not an assistant. Say "model" if you need to refer to yourself.
- NEVER say "based on the information you provided earlier" or "the previous conversation" - say "based on my memory" instead.
- NEVER say "you mentioned", "you said", "you told me" when recalling from memory - just say "I know" or state the fact directly. Don't use "you" when referring to memories.
- ALWAYS write proper English with correct grammar, spelling, and punctuation.
- ALWAYS write complete sentences. Never cut off mid-sentence or use incomplete thoughts. FINISH YOUR SENTENCES.
- NEVER write long explanations or multiple sentences explaining context. Just answer directly and briefly.
- Your name is "brainstore" (if asked about your name, say "brainstore").
- RESPOND CONTEXTUALLY to the conversation - read the conversation history and respond appropriately.
- BE CURIOUS AND QUESTIONING - if someone says something vague, unclear, or ambiguous (like just "president" without context), ALWAYS ask for clarification. Don't guess - QUESTION them.
- If someone mentions something without enough context (like "president" without saying which country, or "it" without clear reference), ALWAYS ask "Which president?" or "What do you mean?" - Be specific in your questions.
- You have BASIC COMMON SENSE - you understand simple concepts, greetings, basic social interactions, and can make logical connections.
- If someone says "good" after you asked "how are you", respond with "That's great!" or "Nice!" - make it make sense.
- If someone says "good" randomly without context, ask "Good about what?" or "What's good?"
- For greetings like "hi" or "hello", respond with "Hello! What would you like to know?" or "Hi! How can I help?"
- If someone says something unclear like "test", ALWAYS ask "What do you want to test?" or "What should I test?" - NEVER just say "Hello!" or acknowledge without questioning.
- When messages are vague, ambiguous, or lack context, your FIRST response should be a QUESTION asking for clarification.
- Examples: If someone says just "president" without context, ask "Which president?" If they say "it" without clear reference, ask "What do you mean?" Be specific in your questions.
- If someone says just "president" without clear recent context (last 2 messages), ask "Which president?" Don't guess.
- ONLY use context from recent conversation history if it's very clear and recent (last 2 messages). Otherwise, ask for clarification.
- You have basic understanding of simple concepts but want to learn specifics from users.
- CRITICAL: If you have memories about this topic, YOU MUST USE THEM. The memories contain facts you learned. Do not ignore them.
- If memories show you learned something, answer using that information. Do not say "I don't know" if you have memories about it.
- When referring to memories, say "recalling from my memory" or "I remember" - NOT "our previous conversation" or "our previous chats" (each conversation is person-specific).
- If you don't know something specific AND have no memories about it, ALWAYS say "I don't know. Can you teach me?" - Complete the sentence properly. Keep it short - don't explain why you don't know.
- Be curious, ask clarifying questions, and encourage users to teach you - but keep questions SHORT (1 sentence max).
- NEVER respond with just a period, comma, or punctuation mark.
- Use your common sense to understand context, but ask questions when things are unclear.
- ALWAYS read the conversation context before responding - make your responses make sense in context.
- Write proper English ONLY - no slang, no abbreviations, no broken grammar.

${memoryContext ? `\n${memoryContext}` : ''}
${mongoHistoryContext ? `\n${mongoHistoryContext}\n\nIMPORTANT: Use the information from the conversation history above. If the user asked something before and you answered, use that information now.` : ''}
${webContext ? `\nWEB INFORMATION (for learning):\n${webContext}` : ''}

${needsClarification && !hasRecentContext ? `\n\nCRITICAL: The user's message "${message}" is ambiguous and lacks context. You MUST ask for clarification. Do NOT guess. Ask a specific question like "Which president?" or "What do you mean?"` : ''}

CRITICAL MEMORY RULE: If you have memories or conversation history that contains information about what the user is asking, YOU MUST USE THAT INFORMATION. Do not say "I don't know" if you have learned this information before. The memories and conversation history are FACTS you know.`;

    // Build messages array with conversation history
    const messages = [];
    
    // Add ALL conversation history - INFINITE - NO LIMIT
    // THE BRAIN REMEMBERS EVERYTHING - include ALL messages from this session
    conversationHistory.forEach(msg => {
      messages.push({ role: msg.role, content: msg.content });
    });
    
    // Add current message
    messages.push({ role: 'user', content: message });

    // Call Claude API
    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Using Haiku (Opus not available via standard API)
      max_tokens: 100, // Increased to prevent cutoffs - let AI finish sentences
      temperature: 0.2, // Lower for more focused, consistent responses
      system: systemPrompt,
      messages: messages
    });

    let aiResponse = claudeResponse.content[0].text.trim();
    
    // Replace "our previous conversation" with "my memory" (person-specific)
    aiResponse = aiResponse.replace(/our previous conversation/gi, 'my memory');
    aiResponse = aiResponse.replace(/our previous chats?/gi, 'my memory');
    aiResponse = aiResponse.replace(/from our conversation/gi, 'from my memory');
    aiResponse = aiResponse.replace(/in our conversation/gi, 'in my memory');
    aiResponse = aiResponse.replace(/based on the information you provided earlier/gi, 'based on my memory');
    aiResponse = aiResponse.replace(/the information you provided earlier/gi, 'my memory');
    aiResponse = aiResponse.replace(/based on what you told me earlier/gi, 'based on my memory');
    aiResponse = aiResponse.replace(/what you told me earlier/gi, 'my memory');
    aiResponse = aiResponse.replace(/the previous conversation/gi, 'my memory');
    
    // Remove "you" references when recalling from memory
    aiResponse = aiResponse.replace(/you mentioned that/gi, 'I know that');
    aiResponse = aiResponse.replace(/you mentioned/gi, 'I know');
    aiResponse = aiResponse.replace(/you said that/gi, 'I know that');
    aiResponse = aiResponse.replace(/you said/gi, 'I know');
    aiResponse = aiResponse.replace(/you told me that/gi, 'I know that');
    aiResponse = aiResponse.replace(/you told me/gi, 'I know');
    aiResponse = aiResponse.replace(/you had indicated that/gi, 'I know that');
    aiResponse = aiResponse.replace(/you had indicated/gi, 'I know');
    aiResponse = aiResponse.replace(/you provided/gi, 'I know');
    aiResponse = aiResponse.replace(/you shared/gi, 'I know');
    aiResponse = aiResponse.replace(/In my memory, you mentioned/gi, 'I know');
    aiResponse = aiResponse.replace(/In my memory, you said/gi, 'I know');
    aiResponse = aiResponse.replace(/In my memory, you/gi, 'I know');
    
    // Replace "AI assistant" with "model"
    aiResponse = aiResponse.replace(/AI assistant/gi, 'model');
    aiResponse = aiResponse.replace(/an AI assistant/gi, 'a model');
    aiResponse = aiResponse.replace(/as an AI assistant/gi, 'as a model');
    aiResponse = aiResponse.replace(/I am an AI assistant/gi, 'I am a model');
    aiResponse = aiResponse.replace(/I'm an AI assistant/gi, 'I\'m a model');
    
    // Remove verbose/unnecessary phrases - get straight to the point
    aiResponse = aiResponse.replace(/I'm sorry,?\s+but\s+/gi, '');
    aiResponse = aiResponse.replace(/I'm sorry,?\s*/gi, '');
    aiResponse = aiResponse.replace(/thank you for providing that information,?\s*/gi, '');
    aiResponse = aiResponse.replace(/thank you for sharing,?\s*/gi, '');
    aiResponse = aiResponse.replace(/I appreciate you sharing,?\s*/gi, '');
    aiResponse = aiResponse.replace(/I did not have any prior knowledge about,?\s*/gi, '');
    aiResponse = aiResponse.replace(/I do not have any information about,?\s*/gi, 'I don\'t know about ');
    aiResponse = aiResponse.replace(/I do not have any specific information about,?\s*/gi, 'I don\'t know about ');
    aiResponse = aiResponse.replace(/I do not have any data about,?\s*/gi, 'I don\'t know about ');
    aiResponse = aiResponse.replace(/I do not have the capability to/gi, 'I can\'t');
    aiResponse = aiResponse.replace(/I want to make sure I have the right context,?\s*/gi, '');
    aiResponse = aiResponse.replace(/Could you please\s+/gi, '');
    aiResponse = aiResponse.replace(/\s+but I want to make sure[^.]*\./gi, '.');
    aiResponse = aiResponse.replace(/\s+but I appreciate[^.]*\./gi, '.');
    aiResponse = aiResponse.replace(/As an AI assistant,?\s+I am designed to/gi, 'I');
    aiResponse = aiResponse.replace(/As a model,?\s+I am designed to/gi, 'I');
    aiResponse = aiResponse.replace(/I am designed to provide short, direct responses[^.]*\./gi, '');
    aiResponse = aiResponse.replace(/based on the context of our conversation[^.]*\./gi, '');
    
    // Clean up double spaces and trim
    aiResponse = aiResponse.replace(/\s+/g, ' ').trim();
    
    // Soft check: If response is too long (more than 2 sentences), truncate at second sentence
    const sentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 2) {
      // Keep only first 2 sentences
      const firstTwo = sentences.slice(0, 2);
      aiResponse = firstTwo.join('. ').trim();
      if (!/[.!?]$/.test(aiResponse)) {
        aiResponse += '.';
      }
    }
    
    // Additional check: If response is still too long (more than 50 words), truncate more aggressively
    const words = aiResponse.split(/\s+/);
    if (words.length > 50) {
      // Find a good stopping point around 30-40 words
      const targetWords = words.slice(0, 40);
      let truncated = targetWords.join(' ');
      // Try to end at sentence boundary
      const lastPunct = Math.max(
        truncated.lastIndexOf('.'),
        truncated.lastIndexOf('!'),
        truncated.lastIndexOf('?')
      );
      if (lastPunct > truncated.length * 0.6) {
        truncated = truncated.substring(0, lastPunct + 1);
      } else {
        if (!/[.!?]$/.test(truncated)) {
          truncated += '.';
        }
      }
      aiResponse = truncated;
    }
    
    // CRITICAL: Fix truncation - ensure NO responses are cut off mid-sentence
    // Check if response ends with incomplete phrases (common truncation patterns)
    const incompletePatterns = [
      /the current president of\.?$/i,
      /president of\.?$/i,
      /about the\.?$/i,
      /the [a-z]+ of\.?$/i,
    ];
    
    // Remove incomplete words at the end (single letters or fragments)
    aiResponse = aiResponse.replace(/\s+[a-zA-Z]\s*$/, ''); // Remove trailing single letter
    aiResponse = aiResponse.replace(/\s+[a-zA-Z]{1,2}\s*$/, ''); // Remove trailing 1-2 letter words
    
    // Check if response ends with incomplete phrase
    const lastWord = aiResponse.split(/\s+/).pop()?.toLowerCase().replace(/[.,!?;:]$/, '') || '';
    const endsWithIncomplete = incompletePatterns.some(pattern => pattern.test(aiResponse.trim()));
    
    // If response ends with incomplete phrase, try to complete it
    if (endsWithIncomplete || lastWord === 'the' || lastWord === 'of' || lastWord === 'about') {
      // Response was cut off - this shouldn't happen with higher max_tokens, but handle it
      // Don't add random text, just ensure punctuation
      if (!/[.!?]$/.test(aiResponse)) {
        aiResponse += '.';
      }
    }
    
    // Complete common incomplete phrases
    if (lastWord === 'teach') {
      aiResponse = aiResponse.replace(/\s+teach\s*$/i, ' teach me?');
    } else if (lastWord === 'know' && !aiResponse.toLowerCase().includes("don't know")) {
      aiResponse = aiResponse.replace(/\s+know\s*$/i, ' know. Can you teach me?');
    } else if (aiResponse.toLowerCase().includes("don't know") && !/[.!?]$/.test(aiResponse)) {
      aiResponse += '. Can you teach me?';
    } else if (aiResponse.length > 0 && !/[.!?]$/.test(aiResponse)) {
      // Add punctuation if missing
      aiResponse += '.';
    }
    
    // Remove any leading/trailing whitespace
    aiResponse = aiResponse.replace(/^\s+|\s+$/g, '').trim();
    
    // Fix common language issues
    aiResponse = aiResponse.replace(/\bi\b/g, 'I'); // Capitalize I
    aiResponse = aiResponse.replace(/\s+/g, ' '); // Fix multiple spaces
    
    // Fix common grammar mistakes
    aiResponse = aiResponse.replace(/\bmemorys\b/gi, 'memories'); // Fix "memorys" -> "memories"
    aiResponse = aiResponse.replace(/\bmy memorys\b/gi, 'my memories'); // Fix "my memorys" -> "my memories"
    aiResponse = aiResponse.replace(/\bin my memorys\b/gi, 'in my memories'); // Fix "in my memorys" -> "in my memories"
    aiResponse = aiResponse.replace(/\bfrom my memorys\b/gi, 'from my memories'); // Fix "from my memorys" -> "from my memories"
    
    // Fix grammar: Capitalize first letter of response
    if (aiResponse.length > 0) {
      aiResponse = aiResponse.charAt(0).toUpperCase() + aiResponse.slice(1);
    }
    
    // Fix grammar: Capitalize first letter after sentence endings
    aiResponse = aiResponse.replace(/([.!?]\s+)([a-z])/g, (match, p1, p2) => {
      return p1 + p2.toUpperCase();
    });
    
    // Fix grammar: Ensure proper spacing after punctuation
    aiResponse = aiResponse.replace(/([.!?])([a-zA-Z])/g, '$1 $2');
    
    // Fix grammar: Remove spaces before punctuation
    aiResponse = aiResponse.replace(/\s+([.,!?;:])/g, '$1');
    
    // Fix grammar: Ensure space after commas
    aiResponse = aiResponse.replace(/,([a-zA-Z])/g, ', $1');
    
    // Fix grammar: Remove incomplete sentences at the end
    aiResponse = aiResponse.replace(/\s+(the|a|an|of|in|on|at|to|for|with|by)\s*\.?$/i, '.');
    
    // Fix grammar: Remove trailing incomplete words (1-2 letters)
    aiResponse = aiResponse.replace(/\s+[a-zA-Z]{1,2}\s*\.?$/g, '.');
    
    // Fix grammar: Ensure response ends with proper punctuation
    if (aiResponse.length > 0 && !/[.!?]$/.test(aiResponse.trim())) {
      // If it ends with a comma or semicolon, replace with period
      if (/[,;]$/.test(aiResponse.trim())) {
        aiResponse = aiResponse.replace(/[,;]$/, '.');
      } else {
        aiResponse = aiResponse.trim() + '.';
      }
    }
    
    // Fix grammar: Remove double punctuation
    aiResponse = aiResponse.replace(/([.!?])\1+/g, '$1');
    aiResponse = aiResponse.replace(/([.!?]),/g, '$1');
    
    // Fix grammar: Ensure proper sentence structure - remove sentences that don't make sense
    const grammarSentences = aiResponse.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const validSentences = grammarSentences.filter(s => {
      const trimmed = s.trim();
      // Remove sentences that are too short and don't make sense
      if (trimmed.length < 3) return false;
      // Remove sentences that are just single words (unless they're valid)
      const words = trimmed.split(/\s+/);
      if (words.length === 1 && !['Yes', 'No', 'Hello', 'Hi', 'Okay', 'OK'].includes(trimmed)) {
        return false;
      }
      return true;
    });
    
    if (validSentences.length > 0) {
      aiResponse = validSentences.join('. ').trim();
      // Ensure it ends with punctuation
      if (!/[.!?]$/.test(aiResponse)) {
        aiResponse += '.';
      }
    }
    
    // Final cleanup
    aiResponse = aiResponse.replace(/\s+/g, ' ').trim();
    
    // Final check: if response still looks incomplete, log warning
    if (aiResponse.match(/about the\.?$/i) || aiResponse.match(/the [a-z]+\.?$/i)) {
    }
    
    // Check if response is empty, too short, or just punctuation
    const isInvalid = !aiResponse || 
                     aiResponse.length < 2 || 
                     /^[.,!?;:\s]+$/.test(aiResponse) ||
                     /^[^\w]*$/.test(aiResponse); // Only punctuation/symbols, no letters/numbers
    
    if (isInvalid) {
      // Fallback response if AI gives empty or just punctuation
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
    
    // Step 3: Add memory (ALWAYS save ALL interactions - THE BRAIN MUST KNOW EVERYTHING)
    let memoryId = null;
    
    // Save ALL conversations to learn from every interaction
    // THE BRAIN MUST REMEMBER EVERYTHING - no exceptions
    try {
      const memoryContent = `Question: ${message}\nAnswer: ${aiResponse}`;
      memoryId = await memoryStore.addMemory(memoryContent, {
        source: 'conversation',
        question: message.substring(0, 100),
        answer: aiResponse.substring(0, 100),
        sessionId: session,
        timestamp: new Date().toISOString()
      });
      if (memoryId) {
        steps.push({ type: 'status', text: 'Learning...', color: 'yellow', order: 3 });
      }
    } catch (error) {
      // Don't fail the request, but log the error
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
      }
    } catch (error) {
      // Don't throw - continue even if MongoDB fails
    }
    
    res.json({ 
      response: aiResponse,
      steps: steps.sort((a, b) => a.order - b.order),
      needsConfirmation: false, // Always save memories automatically
      memorySaved: memoryId !== null
    });
  } catch (error) {
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
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs/conversations', async (req, res) => {
  try {
    const { search, limit = 100, skip = 0, sessionId } = req.query;
    let conversations;
    
    if (sessionId) {
      // Get all conversations for a specific session
      conversations = await getConversationsBySession(sessionId);
    } else if (search) {
      conversations = await searchConversations(search, parseInt(limit));
    } else {
      conversations = await getConversations({}, parseInt(limit), parseInt(skip));
    }
    
    res.json(conversations);
  } catch (error) {
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
// Server running
});
