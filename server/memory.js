const { ChromaClient } = require('chromadb');
const Anthropic = require('@anthropic-ai/sdk');

class MemoryStore {
  constructor() {
    this.client = new ChromaClient({
      path: process.env.CHROMA_URL || 'http://localhost:8000'
    });
    this.collectionName = process.env.COLLECTION_NAME || 'ai-brainstore';
    this.collection = null;
    this.anthropic = null;
    
    // Initialize Claude for embeddings
    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
    if (apiKey) {
      this.anthropic = new Anthropic({
        apiKey: apiKey
      });
    }
  }

  async initialize() {
    try {
      // Get or create collection
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: { description: 'AI Brain Memory Store' }
      });
    } catch (error) {
      throw error;
    }
  }

  async getEmbedding(text) {
    // Simple hash-based embedding (Claude doesn't have embeddings API)
    // This works for basic similarity search
    return this.simpleEmbedding(text);
  }

  // Hash-based embedding for similarity search
  simpleEmbedding(text) {
    const words = text.toLowerCase().split(/\s+/);
    const embedding = new Array(384).fill(0);
    words.forEach((word, i) => {
      const hash = this.simpleHash(word);
      embedding[i % 384] += hash / 1000;
    });
    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => magnitude > 0 ? val / magnitude : val);
  }

  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash);
  }

  async addMemory(content, metadata = {}) {
    try {
      const embedding = await this.getEmbedding(content);
      const id = `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      await this.collection.add({
        ids: [id],
        embeddings: [embedding],
        documents: [content],
        metadatas: [{
          ...metadata,
          timestamp: new Date().toISOString()
        }]
      });

      return id;
    } catch (error) {
      throw error;
    }
  }

  async searchMemories(query, limit = 5) {
    try {
      const queryEmbedding = await this.getEmbedding(query);
      
      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit
      });

      if (results.documents && results.documents[0]) {
        return results.documents[0].map((doc, i) => ({
          content: doc,
          distance: results.distances[0][i],
          metadata: results.metadatas[0][i]
        }));
      }

      return [];
    } catch (error) {
      return [];
    }
  }

  async getAllMemories(limit = 100) {
    try {
      const results = await this.collection.get({
        limit: limit
      });

      return results.documents.map((doc, i) => ({
        content: doc,
        metadata: results.metadatas[i],
        id: results.ids[i]
      }));
    } catch (error) {
      return [];
    }
  }

  async deleteMemory(id) {
    try {
      await this.collection.delete({
        ids: [id]
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async clearAllMemoriesExceptBasic() {
    try {
      // Get all memories
      const allMemories = await this.getAllMemories(10000);
      
      // Filter out basic knowledge (those with category: 'basic' in metadata)
      const memoriesToDelete = allMemories.filter(m => {
        const metadata = m.metadata || {};
        return metadata.category !== 'basic';
      });
      
      // Delete non-basic memories
      if (memoriesToDelete.length > 0) {
        const idsToDelete = memoriesToDelete.map(m => m.id).filter(id => id);
        if (idsToDelete.length > 0) {
          await this.collection.delete({
            ids: idsToDelete
          });
        }
      }
      
      return memoriesToDelete.length;
    } catch (error) {
      return 0;
    }
  }

  async clearAllMemories() {
    try {
      // Get all memories
      const allMemories = await this.getAllMemories(10000);
      const idsToDelete = allMemories.map(m => m.id).filter(id => id);
      
      if (idsToDelete.length > 0) {
        await this.collection.delete({
          ids: idsToDelete
        });
      }
      
      return idsToDelete.length;
    } catch (error) {
      return 0;
    }
  }
}

module.exports = MemoryStore;

