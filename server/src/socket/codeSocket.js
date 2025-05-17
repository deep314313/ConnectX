const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

// Store code state for each room
const roomCode = new Map();

// Helper to extract room ID from JWT token if needed
const extractRoomId = (roomId) => {
  // First check if the roomId is a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(roomId)) {
    // console.log('[Server] roomId is already a valid ObjectId:', roomId);
    return roomId;
  }
  
  try {
    // Check if roomId is a JWT token
    if (roomId.split('.').length === 3) {
      const payload = JSON.parse(Buffer.from(roomId.split('.')[1], 'base64').toString());
      // console.log('[Server] Successfully decoded JWT. Payload:', payload);
      
      if (payload && payload.roomId) {
        // console.log('[Server] Using decoded roomId:', payload.roomId);
        return payload.roomId;
      }
    }
  } catch (err) {
    console.error('[Server] Error extracting roomId from JWT:', err.message);
  }
  
  // Return the original if we couldn't extract a valid roomId
  // console.log('[Server] Using roomId as is:', roomId);
  return roomId;
};

function getActualRoomId(roomId) {
  try {
    // First, check if it's a valid MongoDB ObjectId
    if (typeof roomId === 'string' && /^[0-9a-fA-F]{24}$/.test(roomId)) {
      console.log('[Server] roomId is already a valid ObjectId:', roomId);
      return roomId;
    }
    
    // Check if it looks like a JWT (has two periods)
    if (typeof roomId === 'string' && roomId.split('.').length === 3) {
      try {
        const decoded = jwt.verify(roomId, JWT_SECRET);
        console.log('[Server] Successfully decoded JWT. Payload:', decoded);
        
        if (decoded && decoded.roomId) {
          console.log('[Server] Using decoded roomId:', decoded.roomId);
          return decoded.roomId;
        }
      } catch (jwtError) {
        console.error('[Server] JWT verification failed:', jwtError.message);
      }
    }
    
    // Fallback to original value
    console.log('[Server] Using roomId as is:', roomId);
    return roomId;
  } catch (err) {
    console.error('[Server] Error in getActualRoomId:', err);
    return roomId;
  }
}

const handleCodeSocket = (io, socket) => {
  console.log('[Server] New code socket connection:', socket.id);

  // Request initial code
  socket.on('code:request', ({ roomId }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Received code:request for room:', roomId, '| actualRoomId:', actualRoomId);

      const code = roomCode.get(actualRoomId) || '';
      console.log('[Server] Sending initial code:', code);
      
      socket.emit('code:initial', { code });
    } catch (error) {
      console.error('[Server] Error in code:request:', error);
    }
  });

  // Handle code changes
  socket.on('code:change', (payload) => {
    try {
      console.log('[Server] Received code:change payload:', payload);
      console.log('[Server] Socket ID:', socket.id);
      console.log('[Server] Socket rooms:', Array.from(socket.rooms));
      
      if (!payload || !payload.roomId) {
        console.log('[Server] Invalid payload - missing roomId:', payload);
        return;
      }
      
      const roomId = payload.roomId;
      const code = payload.code;
      const actualRoomId = extractRoomId(roomId);
      
      console.log('[Server] Processing code:change for room:', payload.roomId, '| actualRoomId:', actualRoomId);
      
      if (typeof code !== 'string') {
        console.log('[Server] Invalid code type:', typeof payload.code);
        return;
      }
      
      // Store code for future clients
      roomCode.set(actualRoomId, code);
      console.log('[Server] Updated roomCode for room:', actualRoomId);
      
      // Check if socket is in room
      const room = io.sockets.adapter.rooms.get(actualRoomId);
      const memberCount = room ? room.size : 0;
      console.log('[Server] Room member count:', memberCount);
      console.log('[Server] Room members:', room ? Array.from(room) : []);
      
      // Join room if not in it
      if (!socket.rooms.has(actualRoomId)) {
        console.log('[Server] Socket not in room, joining now:', actualRoomId);
        socket.join(actualRoomId);
      }
      
      // Broadcast to all clients in the room except sender
      console.log('[Server] Broadcasting code:change to room:', actualRoomId);
      
      // Check if there are other users in the room
      const roomMembers = io.sockets.adapter.rooms.get(actualRoomId);
      if (roomMembers && roomMembers.size > 1) {
        for (const socketId of roomMembers) {
          if (socketId !== socket.id) {
            console.log(`[Server] Sending to socket: ${socketId}`);
            io.to(socketId).emit('code:change', { code });
          }
        }
      } else {
        console.log('[Server] No other members in room to broadcast to');
      }
      
      console.log('[Server] Broadcast complete');
    } catch (error) {
      console.error('[Server] Error handling code change:', error);
    }
  });

  // Handle cursor position updates
  socket.on('code:cursor', ({ roomId, cursor }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      socket.to(actualRoomId).emit('code:cursor', {
        userId: socket.userId,
        userName: socket.userName,
        cursor
      });
    } catch (error) {
      console.error('[Server] Error handling code:cursor:', error);
    }
  });

  // Handle selection updates
  socket.on('code:selection', ({ roomId, selection }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      socket.to(actualRoomId).emit('code:selection', {
        userId: socket.userId,
        userName: socket.userName,
        selection
      });
    } catch (error) {
      console.error('[Server] Error handling code:selection:', error);
    }
  });

  // Clean up when room is empty
  socket.on('room:leave', ({ roomId }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      const room = io.sockets.adapter.rooms.get(actualRoomId);
      if (!room || room.size === 0) {
        console.log('[Server] Room empty, cleaning up code state:', actualRoomId);
        roomCode.delete(actualRoomId);
      }
    } catch (error) {
      console.error('[Server] Error handling room:leave:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    // No special cleanup needed for code socket
    // Code state is preserved for the room even when all users leave
  });
};

module.exports = handleCodeSocket;
