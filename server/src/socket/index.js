const jwt = require('jsonwebtoken');
const Room = require('../models/Room');
const mongoose = require('mongoose');

// Store active room members
const rooms = new Map();

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
    console.log('User connected:', socket.id);

    // Handle room creation
    socket.on('room:create', async ({ roomData }) => {
      try {
        const { name, passcode, creatorId, creatorName } = roomData;
        
        console.log('Creating room with data:', roomData);

        // Check if room exists
        const existingRoom = await Room.findOne({ name });
        if (existingRoom) {
          socket.emit('room:error', { message: 'Room name already taken' });
          return;
        }

        // Create new room
        const room = new Room({
          name,
          passcode,
          creatorId,
          creatorName,
          members: [{
            userId: creatorId,
            name: creatorName,
            role: 'creator'
          }]
        });

        await room.save();
        console.log('Room saved successfully:', room._id);

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
    socket.on('room:join', async ({ roomId, user }) => {
      try {
        let actualRoomId;
        
        // Check if roomId is a JWT token
        try {
          const decoded = jwt.verify(roomId, process.env.JWT_SECRET);
          actualRoomId = decoded.roomId;
        } catch (err) {
          // If not a JWT, use the roomId directly
          actualRoomId = roomId;
        }

        // Validate roomId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
          socket.emit('room:error', { message: 'Invalid room ID' });
          return;
        }

        // Get room from database to check if it exists
        const room = await Room.findById(actualRoomId);
        if (!room) {
          socket.emit('room:error', { message: 'Room not found' });
          return;
        }

        // Join socket room
        socket.join(actualRoomId);

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
      } catch (error) {
        console.error('Error joining room:', error);
        socket.emit('room:error', { message: 'Failed to join room' });
      }
    });

    // Handle room leave
    socket.on('room:leave', async ({ roomId, user }) => {
      try {
        const roomMembers = rooms.get(roomId);
        if (roomMembers) {
          const member = roomMembers.get(socket.id);
          roomMembers.delete(socket.id);
          
          if (roomMembers.size === 0) {
            rooms.delete(roomId);
          } else {
            // Notify others
            socket.to(roomId).emit('member:leave', {
              id: socket.id,
              userId: user.uid
            });

            // Send updated members list
            const membersList = Array.from(roomMembers.values());
            io.to(roomId).emit('members:list', membersList);
          }
        }

        socket.leave(roomId);

        // Update room members in database
        await Room.findByIdAndUpdate(roomId, {
          $pull: {
            members: {
              userId: user.uid
            }
          }
        });
      } catch (error) {
        console.error('Error leaving room:', error);
      }
    });

    // Handle code changes
    socket.on('code:change', ({ roomId, change }) => {
      // Broadcast code changes to all members except sender
      socket.to(roomId).emit('code:change', change);
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);
      
      // Remove from all rooms
      rooms.forEach((members, roomId) => {
        if (members.has(socket.id)) {
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
        }
      });
    });
  });
};

module.exports = initializeSocket;
