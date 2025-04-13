import { io } from 'socket.io-client';

let socket = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const initializeSocket = (sessionToken) => {
  return new Promise((resolve, reject) => {
    try {
      if (socket?.connected) {
        console.log('Socket already connected, reusing existing connection');
        resolve(socket);
        return;
      }

      if (socket) {
        console.log('Cleaning up existing socket before new connection');
        socket.removeAllListeners();
        socket.close();
        socket = null;
      }

      console.log('Creating new socket connection...');
      socket = io('http://localhost:5000', {
        auth: { token: sessionToken },
        transports: ['polling', 'websocket'], // Start with polling, then upgrade to websocket
        reconnection: true,
        reconnectionAttempts: MAX_RETRIES,
        reconnectionDelay: RETRY_DELAY,
        timeout: 10000,
        forceNew: true
      });

      socket.on('connect', () => {
        console.log('Connected to room server with socket ID:', socket.id);
        connectionAttempts = 0;
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        connectionAttempts++;
        if (connectionAttempts >= MAX_RETRIES) {
          console.error('Max connection attempts reached');
          reject(new Error('Failed to connect after maximum retries'));
          socket.close();
          socket = null;
        }
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          socket.connect();
        }
      });

      socket.on('error', (error) => {
        console.error('Socket error:', error);
        reject(error);
      });

      // Debug event listeners
      socket.onAny((event, ...args) => {
        console.log('Socket event received:', event, args);
      });

    } catch (err) {
      console.error('Socket initialization error:', err);
      reject(err);
    }
  });
};

// Room member events
export const joinRoomSocket = (roomId, user) => {
  if (!socket?.connected) {
    console.error('Socket not initialized or not connected');
    return false;
  }
  
  const userData = {
    uid: user.uid,
    displayName: user.displayName,
    isGuest: user.isGuest
  };

  console.log('Emitting room:join', { roomId, user: userData });
  socket.emit('room:join', { roomId, user: userData });
  return true;
};

export const leaveRoomSocket = (roomId, user) => {
  if (!socket?.connected) {
    console.error('Socket not initialized or not connected');
    return false;
  }

  const userData = {
    uid: user.uid,
    displayName: user.displayName,
    isGuest: user.isGuest
  };

  console.log('Emitting room:leave', { roomId, user: userData });
  socket.emit('room:leave', { roomId, user: userData });
  return true;
};

export const onMemberJoin = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.off('member:join').on('member:join', (memberData) => {
    console.log('Received member:join event:', memberData);
    if (memberData) {
      callback({
        member: {
          id: memberData.userId || memberData.uid,
          name: memberData.name || memberData.displayName || 'Guest',
          isOnline: true,
          isGuest: memberData.role !== 'creator',
          isCreator: memberData.role === 'creator' || memberData.isCreator
        }
      });
    }
  });
};

export const onMemberLeave = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.off('member:leave').on('member:leave', (data) => {
    console.log('Received member:leave event:', data);
    if (data) {
      callback({
        memberId: data.userId || data.id
      });
    }
  });
};

export const onMembersList = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.off('members:list').on('members:list', (membersList) => {
    console.log('Received members:list event:', membersList);
    if (Array.isArray(membersList)) {
      callback({
        members: membersList.map(member => ({
          id: member.userId || member.uid,
          name: member.name || member.displayName || 'Guest',
          isOnline: true,
          isGuest: member.role !== 'creator',
          isCreator: member.role === 'creator' || member.isCreator
        }))
      });
    }
  });
};

// Code editor events
export const requestCodeState = (roomId) => {
  if (!socket) return;
  socket.emit('code:request', { roomId });
};

export const onInitialCode = (callback) => {
  if (!socket) return;
  socket.off('code:initial');
  socket.on('code:initial', callback);
};

export const emitCodeChange = (roomId, change) => {
  if (!socket) return;
  socket.emit('code:change', { roomId, change });
};

export const onCodeChange = (callback) => {
  if (!socket) return;
  socket.off('code:change');
  socket.on('code:change', callback);
};

export const emitCursorPosition = (roomId, cursor) => {
  if (!socket) return;
  socket.emit('code:cursor', { roomId, cursor });
};

export const onCursorUpdate = (callback) => {
  if (!socket) return;
  socket.off('code:cursor');
  socket.on('code:cursor', callback);
};

export const emitSelection = (roomId, selection) => {
  if (!socket) return;
  socket.emit('code:selection', { roomId, selection });
};

export const onSelectionUpdate = (callback) => {
  if (!socket) return;
  socket.off('code:selection');
  socket.on('code:selection', callback);
};

// Room creation and persistence events
export const createRoomSocket = (roomData) => {
  if (!socket?.connected) {
    console.error('Socket not initialized or not connected');
    return;
  }
  console.log('Emitting room:create event with data:', roomData);
  socket.emit('room:create', { roomData });
};

export const onRoomCreated = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  socket.off('room:created');
  socket.on('room:created', (room) => {
    console.log('Room created successfully:', room);
    callback(room);
  });
};

export const onRoomError = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }
  socket.off('room:error');
  socket.on('room:error', (error) => {
    console.error('Room creation error:', error);
    callback(error);
  });
};

export const requestRoomInfo = (roomId) => {
  if (!socket?.connected) {
    console.error('Socket not initialized or not connected');
    return false;
  }
  
  console.log('Requesting room info for:', roomId);
  socket.emit('room:info:request', { roomId });
  return true;
};

export const onRoomInfo = (callback) => {
  if (!socket) {
    console.error('Socket not initialized');
    return;
  }

  socket.off('room:info').on('room:info', (data) => {
    console.log('Received room:info event:', data);
    if (data) {
      callback(data);
    }
  });
};

// Cleanup
export const disconnectSocket = () => {
  if (socket) {
    console.log('Disconnecting socket...');
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
};
