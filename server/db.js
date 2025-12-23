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
      console.error('❌ MongoDB URI contains <db_password> placeholder!');
      console.error('Please replace <db_password> with your actual MongoDB password in server/.env');
      throw new Error('MongoDB password not configured');
    }
    
    client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('✅ Connected to MongoDB:', DB_NAME);
    
    // Test the connection
    await db.admin().ping();
    console.log('✅ MongoDB ping successful');
    
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.message.includes('authentication failed') || error.message.includes('password')) {
      console.error('💡 Tip: Check your MongoDB password in server/.env');
    }
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
    console.log('MongoDB connection closed');
  }
}

module.exports = { connectDB, getDB, closeDB };
