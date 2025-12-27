const { MongoClient } = require('mongodb');
require('dotenv').config();

let client = null;
let db = null;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://oubeisia_db_user:<db_password>@cluster0.kfugj6n.mongodb.net/brainai?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = process.env.DB_NAME || 'brainai';

async function connectDB() {
  if (db) {
    return db;
  }

  try {
    // Check if URI has placeholder
    if (MONGODB_URI.includes('<db_password>')) {
      throw new Error('MongoDB password not configured');
    }
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    // Test the connection
    await db.admin().ping();
    
    return db;
  } catch (error) {
    throw error;
  }
}

async function getDB() {
  if (!db) {
    await connectDB();
  }
  return db;
}

async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
  }
}

module.exports = { connectDB, getDB, closeDB };
