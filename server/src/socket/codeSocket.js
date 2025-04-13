// Store code state for each room
const roomCode = new Map();

const handleCodeSocket = (io, socket) => {
  // Handle initial code state request
  socket.on('code:request', ({ roomId }) => {
    const code = roomCode.get(roomId) || '';
    socket.emit('code:initial', { code });
  });

  // Handle code changes
  socket.on('code:change', ({ roomId, change }) => {
    // Update stored code
    roomCode.set(roomId, change.code);
    
    // Broadcast to others in room
    socket.to(roomId).emit('code:change', {
      userId: socket.userId,
      userName: socket.userName,
      change: change
    });
  });

  // Handle cursor position updates
  socket.on('code:cursor', ({ roomId, cursor }) => {
    socket.to(roomId).emit('code:cursor', {
      userId: socket.userId,
      userName: socket.userName,
      cursor
    });
  });

  // Handle selection updates
  socket.on('code:selection', ({ roomId, selection }) => {
    socket.to(roomId).emit('code:selection', {
      userId: socket.userId,
      userName: socket.userName,
      selection
    });
  });

  // Clean up when room is empty
  socket.on('room:leave', ({ roomId }) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room || room.size === 0) {
      roomCode.delete(roomId);
    }
  });
};

module.exports = handleCodeSocket;
