const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';

// Store whiteboard state for each room
const whiteboardStates = new Map();

// Helper function to get actual room ID from JWT
function getActualRoomId(roomId) {
  try {
    // First, check if it's a valid MongoDB ObjectId
    if (typeof roomId === 'string' && /^[0-9a-fA-F]{24}$/.test(roomId)) {
      // console.log('[Server] Whiteboard: roomId is already a valid ObjectId:', roomId);
      return roomId;
    }
    
    // Check if it looks like a JWT (has two periods)
    if (typeof roomId === 'string' && roomId.split('.').length === 3) {
      try {
        const decoded = jwt.verify(roomId, JWT_SECRET);
        // console.log('[Server] Whiteboard: Successfully decoded JWT. Payload:', decoded);
        
        if (decoded && decoded.roomId) {
          // console.log('[Server] Whiteboard: Using decoded roomId:', decoded.roomId);
          return decoded.roomId;
        }
      } catch (jwtError) {
        console.error('[Server] Whiteboard: JWT verification failed:', jwtError.message);
      }
    }
    
    // Fallback to original value
    // console.log('[Server] Whiteboard: Using roomId as is:', roomId);
    return roomId;
  } catch (err) {
    console.error('[Server] Whiteboard: Error in getActualRoomId:', err);
    return roomId;
  }
}

const handleWhiteboardSocket = (io, socket) => {
  // console.log('[Server] New whiteboard socket connection:', socket.id);

  // Handle join whiteboard room
  socket.on('whiteboard:join', ({ roomId }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      // console.log('[Server] Whiteboard: Client joining whiteboard for room:', actualRoomId);
      
      // Join socket to a whiteboard-specific room
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      socket.join(whiteboardRoom);
      // console.log('[Server] Whiteboard: Socket joined whiteboard room:', whiteboardRoom);
      
      // Initialize state for this room if not exist
      if (!whiteboardStates.has(actualRoomId)) {
        // console.log('[Server] Whiteboard: Initializing new whiteboard state for room:', actualRoomId);
        whiteboardStates.set(actualRoomId, {
          objects: [],
          version: 0
        });
      }
      
      // Emit initial state to the client
      const state = whiteboardStates.get(actualRoomId);
      socket.emit('whiteboard:init', { objects: state.objects, version: state.version });
      // console.log('[Server] Whiteboard: Sent initial state to client:', { 
      //   objectCount: state.objects.length, 
      //   version: state.version 
      // });
    } catch (error) {
      console.error('[Server] Whiteboard: Error joining whiteboard room:', error);
    }
  });

  // Handle canvas object added
  socket.on('canvas-object-added', ({ roomId, object }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      // console.log('[Server] Whiteboard: Object added in room:', actualRoomId);
      
      // Add unique ID if not present
      if (!object.id) {
        object.id = Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9);
      }
      
      // Update state
      const state = whiteboardStates.get(actualRoomId);
      if (state) {
        state.objects.push(object);
        state.version++;
        // console.log('[Server] Whiteboard: Updated state:', { 
        //   objectCount: state.objects.length, 
        //   version: state.version 
        // });
      }
      
      // Broadcast to others
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      // console.log('[Server] Whiteboard: Broadcasting object added to room:', whiteboardRoom);
      socket.to(whiteboardRoom).emit('canvas-object-added', { roomId: actualRoomId, object });
    } catch (error) {
      console.error('[Server] Whiteboard: Error handling canvas-object-added:', error);
    }
  });

  // Handle canvas object modified
  socket.on('canvas-object-modified', ({ roomId, objectId, modifications }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      // console.log('[Server] Whiteboard: Object modified in room:', actualRoomId, 'objectId:', objectId);
      
      // Update state
      const state = whiteboardStates.get(actualRoomId);
      if (state) {
        const index = state.objects.findIndex(obj => obj.id === objectId);
        if (index !== -1) {
          state.objects[index] = { ...state.objects[index], ...modifications };
          state.version++;
          // console.log('[Server] Whiteboard: Updated object in state at index:', index);
        }
      }
      
      // Broadcast to others
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      // console.log('[Server] Whiteboard: Broadcasting object modification to room:', whiteboardRoom);
      socket.to(whiteboardRoom).emit('canvas-object-modified', { 
        roomId: actualRoomId, 
        objectId, 
        modifications 
      });
    } catch (error) {
      console.error('[Server] Whiteboard: Error handling canvas-object-modified:', error);
    }
  });

  // Handle canvas object removed
  socket.on('canvas-object-removed', ({ roomId, objectId }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      // console.log('[Server] Whiteboard: Object removed in room:', actualRoomId, 'objectId:', objectId);
      
      // Update state
      const state = whiteboardStates.get(actualRoomId);
      if (state) {
        const index = state.objects.findIndex(obj => obj.id === objectId);
        if (index !== -1) {
          state.objects.splice(index, 1);
          state.version++;
          // console.log('[Server] Whiteboard: Removed object from state at index:', index);
        }
      }
      
      // Broadcast to others
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      // console.log('[Server] Whiteboard: Broadcasting object removal to room:', whiteboardRoom);
      socket.to(whiteboardRoom).emit('canvas-object-removed', { 
        roomId: actualRoomId, 
        objectId 
      });
    } catch (error) {
      console.error('[Server] Whiteboard: Error handling canvas-object-removed:', error);
    }
  });

  // Handle clear canvas
  socket.on('canvas-clear', ({ roomId }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      // console.log('[Server] Whiteboard: Canvas cleared in room:', actualRoomId);
      
      // Clear state
      const state = whiteboardStates.get(actualRoomId);
      if (state) {
        state.objects = [];
        state.version++;
        // console.log('[Server] Whiteboard: Cleared state, new version:', state.version);
      }
      
      // Broadcast to others
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      // console.log('[Server] Whiteboard: Broadcasting canvas clear to room:', whiteboardRoom);
      socket.to(whiteboardRoom).emit('canvas-clear', { 
        roomId: actualRoomId 
      });
    } catch (error) {
      console.error('[Server] Whiteboard: Error handling canvas-clear:', error);
    }
  });

  // Handle free drawing paths
  socket.on('canvas-path', ({ roomId, path }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      // No need to update state for intermediate drawing paths
      
      // Broadcast to others
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      socket.to(whiteboardRoom).emit('canvas-path', { 
        roomId: actualRoomId, 
        path 
      });
    } catch (error) {
      console.error('[Server] Whiteboard: Error handling canvas-path:', error);
    }
  });

  // Handle room leave or disconnect
  socket.on('whiteboard:leave', ({ roomId }) => {
    try {
      const actualRoomId = getActualRoomId(roomId);
      const whiteboardRoom = `whiteboard-${actualRoomId}`;
      socket.leave(whiteboardRoom);
      // console.log('[Server] Whiteboard: Socket left whiteboard room:', whiteboardRoom);
      
      // Check if room is empty, if so, clean up state
      const room = io.sockets.adapter.rooms.get(whiteboardRoom);
      if (!room || room.size === 0) {
        // Keep the state for a while (could implement cleanup after some time)
        // console.log('[Server] Whiteboard: Room empty, but keeping state for room:', actualRoomId);
      }
    } catch (error) {
      console.error('[Server] Whiteboard: Error handling whiteboard leave:', error);
    }
  });
};

module.exports = handleWhiteboardSocket;
