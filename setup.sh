#!/bin/bash

echo "🧠 Setting up Brain AI..."
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
cd ..

# Install client dependencies
echo "📦 Installing client dependencies..."
cd client
npm install
cd ..

echo ""
echo "✅ Setup complete!"
echo ""
echo "⚠️  Don't forget to:"
echo "   1. Create a .env file in the server/ directory"
echo "   2. Add your OPENAI_API_KEY to the .env file"
echo "   3. Run 'npm run dev' to start the application"
echo ""

