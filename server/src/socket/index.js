const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const mongoose = require('mongoose');
const handleCodeSocket = require('./codeSocket');
const handleWhiteboardSocket = require('./whiteboardSocket');
const handleMeetSocket = require('./meetSocket');
const handleChatSocket = require('./chatSocket');
const { Server } = require('socket.io');

// Store active room members
const rooms = new Map();

// Helper function to extract roomId from JWT token
const extractRoomId = (roomId) => {
  try {
    // Check if roomId is a JWT token by its structure (has 3 parts separated by periods)
    if (roomId.split('.').length === 3) {
      try {
        // Manually decode the JWT payload (middle part)
        const payload = JSON.parse(Buffer.from(roomId.split('.')[1], 'base64').toString());
        if (payload && payload.roomId && mongoose.Types.ObjectId.isValid(payload.roomId)) {
          // console.log('[Server] Manually extracted roomId from JWT payload:', payload.roomId);
          return payload.roomId;
        }
      } catch (decodeError) {
        // console.log('[Server] Manual JWT decode failed:', decodeError.message);
      }

      // Also try the standard JWT verify method
      try {
        const decoded = jwt.verify(roomId, process.env.JWT_SECRET);
        if (decoded && decoded.roomId && mongoose.Types.ObjectId.isValid(decoded.roomId)) {
          // console.log('[Server] Extracted roomId using JWT verify:', decoded.roomId);
          return decoded.roomId;
        } else {
          // console.log('[Server] JWT token did not contain roomId:', decoded);
        }
      } catch (tokenError) {
        // console.log('[Server] JWT extraction error:', tokenError.message);
      }
    }
  } catch (tokenError) {
    // console.log('[Server] JWT extraction error:', tokenError.message);
  }
  
  // Return original if not a JWT token or extraction failed
  return roomId;
};

const initializeSocket = (io) => {
  // Socket authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      // For now, just use the token as userId
      socket.userId = token;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    // console.log('User connected:', socket.id);

    // IMPORTANT: Initialize code socket handlers
    handleCodeSocket(io, socket);
    
    // IMPORTANT: Initialize whiteboard socket handlers
    handleWhiteboardSocket(io, socket);

    // IMPORTANT: Initialize video meeting socket handlers
    handleMeetSocket(io, socket);

    // IMPORTANT: Initialize chat socket handlers
    handleChatSocket(io, socket);

    // Handle room creation
    socket.on('room:create', async ({ roomData }) => {
      try {
        // console.log('Creating room with data:', roomData);
        
        const room = new Room({
          name: roomData.name,
          language: roomData.language || 'javascript',
          mode: roomData.mode || 'collaborative',
          creator: {
            uid: roomData.creator.uid,
            displayName: roomData.creator.displayName
          },
          isPrivate: !!roomData.isPrivate,
          code: roomData.code || codeTemplates.getTemplate(roomData.language || 'javascript'),
          members: [{
            userId: roomData.creator.uid,
            name: roomData.creator.displayName,
            role: 'creator',
            online: true
          }],
          expiresAt: new Date(Date.now() + (24 * 60 * 60 * 1000)) // 24 hours from now
        });

        await room.save();
        // console.log('Room saved successfully:', room._id);

        // Initialize room in memory
        rooms.set(room._id.toString(), new Map());

        // Join socket room
        socket.join(room._id.toString());

        // Emit success event
        socket.emit('room:created', {
          id: room._id.toString(),
          name: room.name,
          creatorName: room.creatorName
        });

      } catch (error) {
        console.error('Error creating room:', error);
        socket.emit('room:error', { message: 'Failed to create room' });
      }
    });

    // Handle room join
    socket.on('room:join', async ({ roomId, user }, callback) => {
      try {
        // console.log('[Server] Room join request:', { roomId, user, socketId: socket.id });
        
        // Extract actual roomId if it's a JWT token
        const actualRoomId = extractRoomId(roomId);
        // console.log('[Server] Using roomId for join:', actualRoomId);

        // Validate roomId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
          // console.error('[Server] Invalid room ID:', actualRoomId);
          socket.emit('room:error', { message: 'Invalid room ID' });
          if (callback) callback({ error: 'Invalid room ID' });
          return;
        }

        // Get room from database to check if it exists
        const room = await Room.findById(actualRoomId);
        if (!room) {
          // console.error('[Server] Room not found:', actualRoomId);
          socket.emit('room:error', { message: 'Room not found' });
          if (callback) callback({ error: 'Room not found' });
          return;
        }

        // Join socket room
        // console.log('[Server] Joining socket to room:', actualRoomId);
        await socket.join(actualRoomId);
        // console.log('[Server] Socket rooms after join:', Array.from(socket.rooms));

        // Initialize room members if not exists
        if (!rooms.has(actualRoomId)) {
          rooms.set(actualRoomId, new Map());
        }

        const isCreator = room.creatorId === user.uid;

        // Add member to room
        const roomMembers = rooms.get(actualRoomId);
        const memberData = {
          id: socket.id,
          userId: user.uid,
          name: user.displayName || user.name,
          role: isCreator ? 'creator' : 'member',
          isOnline: true,
          isCreator: isCreator
        };
        roomMembers.set(socket.id, memberData);

        // Notify others in room
        socket.to(actualRoomId).emit('member:join', memberData);

        // Send current members list to the new member
        const membersList = Array.from(roomMembers.values());
        socket.emit('members:list', membersList);

        // Update room members in database
        await Room.findByIdAndUpdate(actualRoomId, {
          $addToSet: {
            members: {
              userId: user.uid,
              name: user.displayName || user.name,
              role: isCreator ? 'creator' : 'member'
            }
          }
        });

        // Broadcast updated members list to all clients in room
        io.to(actualRoomId).emit('members:list', membersList);

        // Send join confirmation
        // console.log('[Server] Sending room join confirmation');
        socket.emit('room:joined', { 
          roomId: actualRoomId,
          members: membersList
        });

        if (callback) callback({ success: true, roomId: actualRoomId });

      } catch (error) {
        console.error('[Server] Error joining room:', error);
        socket.emit('room:error', { message: 'Failed to join room' });
        if (callback) callback({ error: 'Failed to join room' });
      }
    });

    // Handle room leave
    socket.on('room:leave', async ({ roomId, user }) => {
      try {
        // console.log('[Server] Room leave request:', { roomId, user });
        
        // Extract actual roomId if it's a JWT token
        const actualRoomId = extractRoomId(roomId);
        // console.log('[Server] Using roomId for leave:', actualRoomId);
        
        // Validate ObjectId
        if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
          // console.error('[Server] Invalid room ID for leave operation:', actualRoomId);
          socket.emit('room:error', { message: 'Invalid room ID' });
          return;
        }

        const roomMembers = rooms.get(actualRoomId);
        if (roomMembers) {
          const member = roomMembers.get(socket.id);
          roomMembers.delete(socket.id);
          
          if (roomMembers.size === 0) {
            rooms.delete(actualRoomId);
          } else {
            // Notify others
            socket.to(actualRoomId).emit('member:leave', {
              id: socket.id,
              userId: user.uid
            });

            // Send updated members list
            const membersList = Array.from(roomMembers.values());
            io.to(actualRoomId).emit('members:list', membersList);
          }
        }

        socket.leave(actualRoomId);

        // Update room members in database
        await Room.findByIdAndUpdate(actualRoomId, {
          $pull: {
            members: {
              userId: user.uid
            }
          }
        });
      } catch (error) {
        console.error('Error leaving room:', error);
        socket.emit('room:error', { message: 'Failed to leave room' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      // console.log('User disconnected:', socket.id);
      
      // Remove from all rooms
      for (const [roomId, members] of rooms.entries()) {
        if (members.has(socket.id)) {
          // console.log(`[Server] Removing disconnected user from room ${roomId}`);
          const member = members.get(socket.id);
          members.delete(socket.id);
          
          if (members.size === 0) {
            rooms.delete(roomId);
          } else {
            // Notify room members
            socket.to(roomId).emit('member:leave', {
              id: socket.id,
              userId: member.userId
            });

            // Send updated members list
            const membersList = Array.from(members.values());
            io.to(roomId).emit('members:list', membersList);
          }
          
          // Also update the database - make sure we use valid ObjectId
          // Because roomId might be a JWT token in memory, extract the actual ID
          try {
            const actualRoomId = extractRoomId(roomId);
            if (mongoose.Types.ObjectId.isValid(actualRoomId) && member && member.userId) {
              try {
                await Room.findByIdAndUpdate(actualRoomId, {
                  $pull: {
                    members: {
                      userId: member.userId
                    }
                  }
                });
                // console.log(`[Server] Updated database for room ${actualRoomId} on disconnect`);
              } catch (dbError) {
                console.error('[Server] Error updating room members on disconnect:', dbError);
              }
            } else {
              // console.log(`[Server] Skipping database update, invalid room ID: ${actualRoomId}`);
            }
          } catch (error) {
            console.error('[Server] Error processing roomId on disconnect:', error);
          }
        }
      }
    });
  });
};

module.exports = initializeSocket;
