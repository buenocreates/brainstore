# MongoDB Atlas Setup (Simple)

## Quick Setup:

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up/Login
3. Create a free cluster
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/...`)
6. Add to `server/.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/brainai?retryWrites=true&w=majority
   ```
7. Replace `username` and `password` with your MongoDB credentials
8. Restart server - done!

That's it! Conversations will save automatically.

