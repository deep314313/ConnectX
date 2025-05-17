import { io } from 'socket.io-client';
import { BASE_URL } from './api';

let socket = null;
let connectionAttempts = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const initializeSocket = (sessionToken) => {
  return new Promise((resolve, reject) => {
    try {
      if (socket?.connected) {
        // console.log('[Socket] Already connected, reusing connection');
        resolve(socket);
        return;
      }

      if (socket) {
        // console.log('[Socket] Cleaning up existing socket');
        socket.removeAllListeners();
        socket.close();
        socket = null;
      }

      // console.log(`[Socket] Connecting to server: ${BASE_URL}`);
      // console.log('[Socket] Creating new connection with token:', sessionToken);
      
      socket = io(BASE_URL, {
        auth: { token: sessionToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RETRIES,
        reconnectionDelay: RETRY_DELAY,
        timeout: 10000,
        forceNew: true
      });

      socket.on('connect', () => {
        // console.log('[Socket] Connected successfully with ID:', socket.id);
        // console.log('[Socket] Socket state:', {
        //   connected: socket.connected,
        //   id: socket.id,
        //   rooms: Array.from(socket.rooms || [])
        // });
        
        connectionAttempts = 0;
        resolve(socket);
      });

      socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        connectionAttempts++;
        if (connectionAttempts >= MAX_RETRIES) {
          console.error('[Socket] Max connection attempts reached');
          reject(new Error('Failed to connect after maximum retries'));
          socket.close();
          socket = null;
        }
      });

      socket.on('disconnect', (reason) => {
        // console.log('[Socket] Disconnected:', reason);
        if (reason === 'io server disconnect') {
          socket.connect();
        }
      });

      socket.on('error', (error) => {
        console.error('[Socket] Error:', error);
      });

      // Debug event listeners
      // socket.onAny((event, ...args) => {
      //   console.log('[Socket] Event received:', event, args);
      // });

    } catch (err) {
      console.error('[Socket] Initialization error:', err);
      reject(err);
    }
  });
};

// Room member events
export const joinRoomSocket = (roomId, user) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot join room - socket not connected');
    return false;
  }
  
  const userData = {
    uid: user.uid,
    displayName: user.displayName,
    isGuest: user.isGuest
  };

  // console.log('[Socket] Joining room:', { roomId, user: userData });
  // console.log('[Socket] Current socket state:', {
  //   connected: socket.connected,
  //   id: socket.id,
  //   rooms: Array.from(socket.rooms || [])
  // });

  socket.emit('room:join', { roomId, user: userData }, (response) => {
    // console.log('[Socket] Room join response:', response);
  });

  return true;
};

export const leaveRoomSocket = (roomId, user) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot leave room - socket not connected');
    return false;
  }

  const userData = {
    uid: user.uid,
    displayName: user.displayName,
    isGuest: user.isGuest
  };

  // console.log('[Socket] Emitting room:leave', { roomId, user: userData });
  socket.emit('room:leave', { roomId, user: userData });
  return true;
};

export const onMemberJoin = (callback) => {
  if (!socket) {
    console.error('[Socket] Cannot listen for member join - socket not initialized');
    return;
  }

  socket.off('member:join').on('member:join', (memberData) => {
    // console.log('[Socket] Received member:join event:', memberData);
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
    console.error('[Socket] Cannot listen for member leave - socket not initialized');
    return;
  }

  socket.off('member:leave').on('member:leave', (data) => {
    // console.log('[Socket] Received member:leave event:', data);
    if (data) {
      callback({
        memberId: data.userId || data.id
      });
    }
  });
};

export const onMembersList = (callback) => {
  if (!socket) {
    console.error('[Socket] Cannot listen for members list - socket not initialized');
    return;
  }

  socket.off('members:list').on('members:list', (membersList) => {
    // console.log('[Socket] Received members:list event:', membersList);
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
  if (!socket?.connected) {
    console.error('[Socket] Cannot request code state - socket not connected');
    return false;
  }
  // console.log('[Socket] Requesting code state for room:', roomId);
  socket.emit('code:request', { roomId });
  return true;
};

export const onInitialCode = (callback) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot listen for initial code - socket not connected');
    return false;
  }
  // console.log('[Socket] Setting up initial code listener');
  socket.off('code:initial');
  socket.on('code:initial', (data) => {
    // console.log('[Socket] Received initial code event:', data);
    callback(data);
  });
  return true;
};

export const emitCodeChange = (roomId, code) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot emit code change - socket not connected');
    return false;
  }
  
  // console.log('[Socket] Emitting code change:', { 
  //   roomId, 
  //   codeLength: code?.length || 0,
  //   socketId: socket.id,
  //   socketConnected: socket.connected,
  //   socketRooms: Array.from(socket.rooms || [])
  // });
  
  // Add a timestamp to help identify latest changes
  const payload = { roomId, code, timestamp: Date.now() };
  
  try {
    socket.emit('code:change', payload, (error, response) => {
      if (error) {
        console.error('[Socket] Error emitting code change:', error);
      } else {
        // console.log('[Socket] Code change emitted successfully:', response);
      }
    });
    return true;
  } catch (err) {
    console.error('[Socket] Exception emitting code change:', err);
    return false;
  }
};

export const onCodeChange = (callback) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot listen for code changes - socket not connected');
    return false;
  }
  
  // console.log('[Socket] Setting up code change listener with socket ID:', socket.id);
  
  // Remove any existing listeners to prevent duplicates
  socket.off('code:change');
  
  socket.on('code:change', (data) => {
    // console.log('[Socket] Received code change event:', {
    //   dataLength: data?.code?.length || 0,
    //   socketId: socket.id,
    //   socketConnected: socket.connected,
    //   socketRooms: Array.from(socket.rooms || [])
    // });
    
    if (!data || typeof data.code !== 'string') {
      console.error('[Socket] Invalid code change data received:', data);
      return;
    }
    
    callback(data);
  });
  
  return true;
};

export const emitCursorPosition = (roomId, cursor) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot emit cursor position - socket not connected');
    return false;
  }
  
  try {
    socket.emit('code:cursor', { roomId, cursor });
    return true;
  } catch (err) {
    console.error('[Socket] Exception emitting cursor position:', err);
    return false;
  }
};

export const onCursorUpdate = (callback) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot listen for cursor updates - socket not connected');
    return false;
  }
  
  socket.off('code:cursor');
  socket.on('code:cursor', callback);
  return true;
};

export const emitSelection = (roomId, selection) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot emit selection - socket not connected');
    return false;
  }
  
  try {
    socket.emit('code:selection', { roomId, selection });
    return true;
  } catch (err) {
    console.error('[Socket] Exception emitting selection:', err);
    return false;
  }
};

export const onSelectionUpdate = (callback) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot listen for selection updates - socket not connected');
    return false;
  }
  
  socket.off('code:selection');
  socket.on('code:selection', callback);
  return true;
};

// Room creation and persistence events
export const createRoomSocket = (roomData) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot create room - socket not connected');
    return false;
  }
  
  // Simplify the data structure completely
  const formattedData = {
    name: roomData.name,
    passcode: roomData.passcode,
    creatorId: roomData.creatorId || roomData.creator?.uid,
    creatorName: roomData.creatorName || roomData.creator?.displayName,
    language: roomData.language || 'javascript',
    mode: roomData.mode || 'collaborative',
    isPrivate: roomData.isPrivate || false,
    code: roomData.code || `// Welcome to ConnectX Code Editor
// Start coding here...

function greet() {
  console.log("Hello, world!");
}

greet();`
  };
  
  console.log('[Socket] Sending simplified room data:', formattedData);
  
  try {
    // Wrap formattedData in a roomData object as server expects { roomData: {...} }
    socket.emit('room:create', { roomData: formattedData }, (response) => {
      if (response && response.error) {
        console.error('[Socket] Room creation error response:', response.error);
      } else if (response && response.success) {
        console.log('[Socket] Room creation success response:', response);
      }
    });
    return true;
  } catch (err) {
    console.error('[Socket] Exception creating room:', err);
    return false;
  }
};

export const onRoomCreated = (callback) => {
  if (!socket) {
    console.error('[Socket] Cannot listen for room created - socket not initialized');
    return false;
  }
  socket.off('room:created');
  socket.on('room:created', (room) => {
    // console.log('[Socket] Room created successfully:', room);
    callback(room);
  });
  return true;
};

export const onRoomError = (callback) => {
  if (!socket) {
    console.error('[Socket] Cannot listen for room error - socket not initialized');
    return false;
  }
  socket.off('room:error');
  socket.on('room:error', (error) => {
    console.error('[Socket] Room error received:', error);
    callback(error);
  });
  return true;
};

export const requestRoomInfo = (roomId) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot request room info - socket not connected');
    return false;
  }
  
  // console.log('[Socket] Requesting room info for:', roomId);
  try {
    socket.emit('room:info:request', { roomId });
    return true;
  } catch (err) {
    console.error('[Socket] Exception requesting room info:', err);
    return false;
  }
};

export const onRoomInfo = (callback) => {
  if (!socket) {
    console.error('[Socket] Cannot listen for room info - socket not initialized');
    return false;
  }

  socket.off('room:info').on('room:info', (data) => {
    // console.log('[Socket] Received room:info event:', data);
    if (data) {
      callback(data);
    }
  });
  return true;
};

// Chat events
export const sendChatMessage = (roomId, message) => {
  if (!socket?.connected) {
    console.error('[Socket] Cannot send chat message - socket not connected');
    return false;
  }
  
  // console.log('[Socket] Sending chat message:', { roomId, message });
  socket.emit('chat:send', { roomId, message });
  return true;
};

export const onChatMessage = (callback) => {
  if (!socket) {
    console.error('[Socket] Cannot listen for chat messages - socket not initialized');
    return;
  }

  socket.off('chat:message').on('chat:message', (data) => {
    // console.log('[Socket] Received chat:message event:', data);
    callback(data);
  });
};

// Cleanup
export const disconnectSocket = () => {
  if (socket) {
    // console.log('[Socket] Disconnecting...');
    try {
      socket.removeAllListeners();
      socket.disconnect();
    } catch (err) {
      console.error('[Socket] Error during disconnect:', err);
    } finally {
      socket = null;
    }
    return true;
  }
  return false;
};
