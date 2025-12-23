# MongoDB Setup

## Your Connection String:
```
mongodb+srv://oubeisia_db_user:<db_password>@cluster0.kfugj6n.mongodb.net/brainai?retryWrites=true&w=majority&appName=Cluster0
```

## Steps:

1. **Replace `<db_password>` with your actual MongoDB password**

2. **Add to `server/.env` file:**
   ```
   MONGODB_URI=mongodb+srv://oubeisia_db_user:YOUR_PASSWORD_HERE@cluster0.kfugj6n.mongodb.net/brainai?retryWrites=true&w=majority&appName=Cluster0
   ```

3. **Example (if your password is "mypass123"):**
   ```
   MONGODB_URI=mongodb+srv://oubeisia_db_user:mypass123@cluster0.kfugj6n.mongodb.net/brainai?retryWrites=true&w=majority&appName=Cluster0
   ```

4. **Restart your server** - MongoDB will connect automatically!

That's it! Conversations will now save to MongoDB Atlas.

