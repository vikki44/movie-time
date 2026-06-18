import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const JSON_DB_PATH = path.join(__dirname, '../db.json');

// Mongoose Schemas (used if MongoDB is connected)
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  sender: { type: String, required: true },
  text: { type: String, required: true },
  type: { type: String, default: 'text' }, // 'text', 'system', 'popcorn', 'heart', 'hug', 'bonk', 'wakeup'
  timestamp: { type: Date, default: Date.now }
});

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  note: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const MessageModel = mongoose.model('Message', messageSchema);
const RoomModel = mongoose.model('Room', roomSchema);

class DatabaseService {
  constructor() {
    this.isMongoConnected = false;
    this.localDb = { rooms: {}, messages: {} };
    this.initializeLocalDb();
  }

  // Load local JSON DB if present
  initializeLocalDb() {
    try {
      if (fs.existsSync(JSON_DB_PATH)) {
        const data = fs.readFileSync(JSON_DB_PATH, 'utf8');
        this.localDb = JSON.parse(data);
      } else {
        this.saveLocalDb();
      }
    } catch (error) {
      console.error('Failed to initialize local JSON database, using in-memory store:', error);
    }
  }

  // Save local JSON DB to file
  saveLocalDb() {
    try {
      fs.writeFileSync(JSON_DB_PATH, JSON.stringify(this.localDb, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save local JSON database:', error);
    }
  }

  // Connect to MongoDB, fallback to JSON db
  async connect() {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.log('⚠️ MONGO_URI not found in environment. Using local JSON database (db.json) fallback.');
      this.isMongoConnected = false;
      return;
    }

    try {
      mongoose.set('strictQuery', false);
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000 // Timeout quickly if not running
      });
      this.isMongoConnected = true;
      console.log('✅ Connected to MongoDB successfully.');
    } catch (error) {
      console.error('❌ MongoDB connection failed. Falling back to local JSON database (db.json). Error:', error.message);
      this.isMongoConnected = false;
    }
  }

  // Verify room password
  async verifyRoomPassword(roomName, password) {
    const defaultPassword = process.env.ROOM_PASSWORD;

    if (this.isMongoConnected) {
      try {
        let room = await RoomModel.findOne({ name: roomName });
        if (!room) {
          // Auto-create room with default password
          room = await RoomModel.create({ name: roomName, password: defaultPassword });
        }
        return room.password === password;
      } catch (error) {
        console.error('Error verifying password via MongoDB, using fallback:', error);
      }
    }

    // JSON Fallback
    if (!this.localDb.rooms[roomName]) {
      this.localDb.rooms[roomName] = {
        password: defaultPassword,
        note: '',
        createdAt: new Date().toISOString()
      };
      this.saveLocalDb();
    }
    return this.localDb.rooms[roomName].password === password;
  }

  // Get room note
  async getRoomNote(roomName) {
    if (this.isMongoConnected) {
      try {
        const room = await RoomModel.findOne({ name: roomName });
        return room ? (room.note || '') : '';
      } catch (err) {
        console.error('Error fetching room note from MongoDB:', err);
      }
    }
    return this.localDb.rooms[roomName] ? (this.localDb.rooms[roomName].note || '') : '';
  }

  // Update room note
  async updateRoomNote(roomName, note) {
    if (this.isMongoConnected) {
      try {
        await RoomModel.updateOne({ name: roomName }, { $set: { note } });
        return;
      } catch (err) {
        console.error('Error updating room note in MongoDB:', err);
      }
    }
    if (this.localDb.rooms[roomName]) {
      this.localDb.rooms[roomName].note = note;
      this.saveLocalDb();
    }
  }

  // Save chat/system message
  async saveMessage(roomName, sender, text, type = 'text') {
    const messageData = {
      room: roomName,
      sender,
      text,
      type,
      timestamp: new Date()
    };

    if (this.isMongoConnected) {
      try {
        const msg = await MessageModel.create(messageData);
        return msg;
      } catch (error) {
        console.error('Error saving message to MongoDB, falling back to local JSON:', error);
      }
    }

    // JSON Fallback
    if (!this.localDb.messages[roomName]) {
      this.localDb.messages[roomName] = [];
    }
    const localMsg = {
      _id: Math.random().toString(36).substring(2, 9),
      ...messageData,
      timestamp: messageData.timestamp.toISOString()
    };
    this.localDb.messages[roomName].push(localMsg);
    // Limit to last 200 messages to keep file clean
    if (this.localDb.messages[roomName].length > 200) {
      this.localDb.messages[roomName].shift();
    }
    this.saveLocalDb();
    return localMsg;
  }

  // Get messages for a room
  async getMessages(roomName) {
    if (this.isMongoConnected) {
      try {
        return await MessageModel.find({ room: roomName }).sort({ timestamp: 1 }).limit(100);
      } catch (error) {
        console.error('Error retrieving messages from MongoDB, falling back to local JSON:', error);
      }
    }

    // JSON Fallback
    return this.localDb.messages[roomName] || [];
  }
}

export default new DatabaseService();
