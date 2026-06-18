import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import db from './database.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static client assets
app.use(express.static(path.join(__dirname, '../../client/dist')));

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Keep track of active rooms and their users
// Structure: { [roomName]: { hostSocketId: string, viewerSocketId: string, hostName: string, viewerName: string } }
const activeRooms = {};

app.get('/health', (req, res) => {
  res.send({ status: 'ok', mongoConnected: db.isMongoConnected });
});

// Http validation for password before joining room
app.post('/api/verify-password', async (req, res) => {
  const { roomName, password } = req.body;
  if (!roomName || !password) {
    return res.status(400).json({ success: false, message: 'Room name and password are required.' });
  }

  const isValid = await db.verifyRoomPassword(roomName, password);
  if (isValid) {
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, message: 'Oops! Incorrect password 😭' });
  }
});

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join Room
  socket.on('join-room', async ({ roomName, password, userName, role }) => {
    // 1. Verify password again
    const isValid = await db.verifyRoomPassword(roomName, password);
    if (!isValid) {
      socket.emit('join-error', 'Incorrect password for this room 🎀');
      return;
    }

    // 2. Initialize room if not exists
    if (!activeRooms[roomName]) {
      activeRooms[roomName] = {
        hostSocketId: null,
        viewerSocketId: null,
        hostName: null,
        viewerName: null,
        streamState: { isStreaming: false, isMuted: false }
      };
    }

    const room = activeRooms[roomName];

    // 3. Enforce the 2-user rule (1 Host, 1 Viewer maximum)
    if (role === 'host') {
      if (room.hostSocketId && room.hostSocketId !== socket.id) {
        socket.emit('join-error', 'Pookie, a Host is already in this room! 🍿');
        return;
      }
      room.hostSocketId = socket.id;
      room.hostName = userName;
    } else if (role === 'viewer') {
      if (room.viewerSocketId && room.viewerSocketId !== socket.id) {
        socket.emit('join-error', 'Pookie, a Viewer is already in this room! 🍿');
        return;
      }
      room.viewerSocketId = socket.id;
      room.viewerName = userName;
    } else {
      socket.emit('join-error', 'Invalid role selection.');
      return;
    }

    // Join the socket room
    socket.join(roomName);
    socket.roomName = roomName;
    socket.userName = userName;
    socket.userRole = role;

    console.log(`User ${userName} (${role}) joined room: ${roomName}`);

    // Send existing chat history to the newly joined user
    const history = await db.getMessages(roomName);
    const note = await db.getRoomNote(roomName);
    socket.emit('room-joined', {
      role,
      history,
      activeUsers: {
        host: room.hostName,
        viewer: room.viewerName
      },
      streamState: room.streamState,
      note
    });

    // Save and broadcast join system message
    const joinText = role === 'host'
      ? `Your pookie (Host: ${userName}) has arrived 🩷✨`
      : `Your pookie (Viewer: ${userName}) has arrived 🩷✨`;

    const systemMsg = await db.saveMessage(roomName, 'System', joinText, 'system');
    io.to(roomName).emit('message-received', systemMsg);

    // Notify other peer in the room
    const targetSocketId = role === 'host' ? room.viewerSocketId : room.hostSocketId;
    if (targetSocketId) {
      io.to(targetSocketId).emit('peer-joined', {
        socketId: socket.id,
        userName,
        role
      });
    }
  });

  // WebRTC Screen Share Signaling
  socket.on('screen-signal', ({ signal }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    const room = activeRooms[roomName];
    if (room) {
      const targetSocketId = socket.userRole === 'host' ? room.viewerSocketId : room.hostSocketId;
      if (targetSocketId) {
        io.to(targetSocketId).emit('screen-signal', {
          from: socket.id,
          signal
        });
      }
    }
  });

  // WebRTC Webcam Signaling
  socket.on('webcam-signal', ({ signal }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    const room = activeRooms[roomName];
    if (room) {
      const targetSocketId = socket.userRole === 'host' ? room.viewerSocketId : room.hostSocketId;
      if (targetSocketId) {
        io.to(targetSocketId).emit('webcam-signal', {
          from: socket.id,
          signal
        });
      }
    }
  });

  // Request Screen Share (Viewer -> Host)
  socket.on('request-screen-stream', () => {
    const roomName = socket.roomName;
    if (!roomName) return;

    const room = activeRooms[roomName];
    if (room && room.hostSocketId) {
      io.to(room.hostSocketId).emit('viewer-requests-screen');
    }
  });

  // Sync webcam hardware states (On/Off toggles)
  socket.on('update-webcam-state', ({ isCameraOn, isMicOn }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    socket.to(roomName).emit('webcam-state-updated', {
      role: socket.userRole,
      userName: socket.userName,
      isCameraOn,
      isMicOn
    });
  });

  // Handle stream state changes (Host controls)
  socket.on('update-stream-state', ({ isStreaming, isMuted }) => {
    const roomName = socket.roomName;
    if (!roomName || socket.userRole !== 'host') return;

    const room = activeRooms[roomName];
    if (room) {
      room.streamState = { isStreaming, isMuted };
      // Broadcast stream state update to the room (especially to the viewer)
      socket.to(roomName).emit('stream-state-updated', room.streamState);
    }
  });

  // Send message
  socket.on('send-message', async ({ text }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    const savedMsg = await db.saveMessage(roomName, socket.userName, text, 'text');
    io.to(roomName).emit('message-received', savedMsg);
  });

  // Typing indicator
  socket.on('typing', ({ isTyping }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    socket.to(roomName).emit('user-typing', {
      userName: socket.userName,
      isTyping
    });
  });

  // Sync lobby notes
  socket.on('update-note', async ({ note }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    await db.updateRoomNote(roomName, note);
    socket.to(roomName).emit('note-updated', { note });
  });

  // Handle interactive action trigger (Popcorn, Heart Burst, Virtual Hug, Bonk, Wake Up)
  socket.on('trigger-action', async ({ actionType }) => {
    const roomName = socket.roomName;
    if (!roomName) return;

    let systemText = '';
    switch (actionType) {
      case 'popcorn':
        systemText = `${socket.userName} shared some fresh popcorn! 🍿`;
        break;
      case 'heart-burst':
        systemText = `${socket.userName} sent a burst of love! 💕`;
        break;
      case 'hug':
        systemText = `${socket.userName} sent a warm virtual hug! 🤗`;
        break;
      case 'bonk':
        systemText = `${socket.userName} bonked pookie! 🔨🎀`;
        break;
      case 'wakeup':
        systemText = `${socket.userName} is yelling: WAKE UP POOKIE! 😴⏰`;
        break;
      default:
        systemText = `${socket.userName} sent a reaction! ✨`;
    }

    // Broadcast the action to trigger animations on the client
    io.to(roomName).emit('action-triggered', {
      actionType,
      senderName: socket.userName,
      senderId: socket.id
    });

    // Save as system message so it appears in the persistent chat history
    const savedMsg = await db.saveMessage(roomName, 'System', systemText, actionType);
    io.to(roomName).emit('message-received', savedMsg);
  });

  // Host ends session
  socket.on('end-session', () => {
    const roomName = socket.roomName;
    if (!roomName || socket.userRole !== 'host') return;

    io.to(roomName).emit('session-ended');

    // Clear room active users
    if (activeRooms[roomName]) {
      delete activeRooms[roomName];
    }
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomName = socket.roomName;
    const userName = socket.userName;
    const role = socket.userRole;

    if (roomName && activeRooms[roomName]) {
      const room = activeRooms[roomName];

      // Update room state
      if (role === 'host' && room.hostSocketId === socket.id) {
        room.hostSocketId = null;
        room.hostName = null;
        room.streamState = { isStreaming: false, isMuted: false };
      } else if (role === 'viewer' && room.viewerSocketId === socket.id) {
        room.viewerSocketId = null;
        room.viewerName = null;
      }

      // If room is completely empty, clean it up after a slight delay
      // to allow for quick refreshes without deleting chat status
      const hostStillConnected = room.hostSocketId !== null;
      const viewerStillConnected = room.viewerSocketId !== null;

      if (!hostStillConnected && !viewerStillConnected) {
        // Wait 30 seconds before removing from active rooms cache
        setTimeout(() => {
          if (activeRooms[roomName] && !activeRooms[roomName].hostSocketId && !activeRooms[roomName].viewerSocketId) {
            delete activeRooms[roomName];
            console.log(`Cleaned up empty room cache: ${roomName}`);
          }
        }, 30000);
      }

      // Save and broadcast leave message
      const leaveText = `${userName} (Pookie) vanished into the void 😭🎀`;
      const systemMsg = await db.saveMessage(roomName, 'System', leaveText, 'system');
      io.to(roomName).emit('message-received', systemMsg);

      // Notify other user about the disconnect
      socket.to(roomName).emit('peer-left', { role, userName });
    }
  });
});

// Fallback route for Single Page Application routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
});

// Connect to Database and start server
db.connect().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Watch with Pookie server running on http://localhost:${PORT}`);
  });
});
