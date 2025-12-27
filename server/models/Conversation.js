const { getDB } = require('../db');

const COLLECTION_NAME = 'conversations';

async function saveConversation(sessionId, userMessage, aiResponse, metadata = {}) {
  try {
    const db = await getDB();
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);
    
    const conversation = {
      sessionId,
      userMessage,
      aiResponse,
      timestamp: new Date(),
      ...metadata
    };
    
    const result = await collection.insertOne(conversation);
    return { ...conversation, _id: result.insertedId };
  } catch (error) {
    // Don't throw - just log the error so the API still responds
    // Return null instead of throwing so chat still works
    return null;
  }
}

async function getConversations(filters = {}, limit = 100, skip = 0) {
  try {
    const db = await getDB();
    const collection = db.collection(COLLECTION_NAME);
    
    const conversations = await collection
      .find(filters)
      .sort({ timestamp: -1 })
      .limit(limit)
      .skip(skip)
      .toArray();
    
    return conversations;
  } catch (error) {
    throw error;
  }
}

async function searchConversations(query, limit = 100) {
  try {
    const db = await getDB();
    const collection = db.collection(COLLECTION_NAME);
    
    const conversations = await collection
      .find({
        $or: [
          { userMessage: { $regex: query, $options: 'i' } },
          { aiResponse: { $regex: query, $options: 'i' } },
          { sessionId: { $regex: query, $options: 'i' } }
        ]
      })
      .sort({ timestamp: -1 })
      .limit(limit)
      .toArray();
    
    return conversations;
  } catch (error) {
    throw error;
  }
}

async function getStats() {
  try {
    const db = await getDB();
    const collection = db.collection(COLLECTION_NAME);
    
    const totalConversations = await collection.countDocuments();
    const totalMessages = totalConversations * 2; // Each conversation has user + AI message
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const chatsToday = await collection.countDocuments({
      timestamp: { $gte: today }
    });
    
    return {
      totalConversations,
      totalMessages,
      chatsToday
    };
  } catch (error) {
    throw error;
  }
}

async function getConversationsBySession(sessionId) {
  try {
    const db = await getDB();
    const collection = db.collection(COLLECTION_NAME);
    
    const conversations = await collection
      .find({ sessionId })
      .sort({ timestamp: 1 })
      .toArray();
    
    return conversations;
  } catch (error) {
    throw error;
  }
}

async function clearAllConversations() {
  try {
    const db = await getDB();
    if (!db) {
      throw new Error('Database not connected');
    }
    const collection = db.collection(COLLECTION_NAME);
    const result = await collection.deleteMany({});
    return result.deletedCount;
  } catch (error) {
    throw error;
  }
}

module.exports = {
  saveConversation,
  getConversations,
  searchConversations,
  getStats,
  getConversationsBySession,
  clearAllConversations
};

