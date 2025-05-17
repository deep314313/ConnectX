const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret';
const mongoose = require('mongoose');

// Store active meet peers for each room
const roomPeers = new Map();

// Helper to extract room ID from JWT token if needed
const extractRoomId = (roomId) => {
  // First check if the roomId is a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(roomId)) {
    // console.log('[Server] Meet: roomId is already a valid ObjectId:', roomId);
    return roomId;
  }
  
  try {
    // Check if roomId is a JWT token
    if (roomId.split('.').length === 3) {
      const payload = JSON.parse(Buffer.from(roomId.split('.')[1], 'base64').toString());
      // console.log('[Server] Meet: Successfully decoded JWT. Payload:', decoded);
      
      if (payload && payload.roomId) {
        // console.log('[Server] Meet: Using decoded roomId:', decoded.roomId);
        return payload.roomId;
      }
    }
  } catch (err) {
    console.error('[Server] Meet: Error extracting roomId from JWT:', err.message);
  }
  
  // Return the original if we couldn't extract a valid roomId
  // console.log('[Server] Meet: Using roomId as is:', roomId);
  return roomId;
};

const handleMeetSocket = (io, socket) => {
  console.log('[Server] New meet socket connection:', socket.id);

  // Join a video meeting room
  socket.on('meet:join', ({ roomId, userData }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: User joining video room:', {
        socketId: socket.id,
        roomId: actualRoomId,
        userData
      });
      
      // Validate user data
      if (!userData || !userData.userId || !userData.name) {
        console.error('[Server] Meet: Invalid user data provided:', userData);
        socket.emit('meet:error', { message: 'Invalid user data' });
        return;
      }
      
      // Join socket to a meet-specific room
      const meetRoom = `meet-${actualRoomId}`;
      socket.join(meetRoom);
      
      // Initialize room peers if not exists
      if (!roomPeers.has(actualRoomId)) {
        roomPeers.set(actualRoomId, new Map());
      }

      // Add peer to room with complete user data
      const peers = roomPeers.get(actualRoomId);
      peers.set(socket.id, {
        socketId: socket.id,
        userId: userData.userId,
        name: userData.name,
        isAudioEnabled: true,
        isVideoEnabled: true
      });
      
      // Get existing peers to send to the new user
      const peersList = Array.from(peers.values());
      socket.emit('meet:peers', { peers: peersList });
      
      // Notify existing peers about the new peer with full user data
      socket.to(meetRoom).emit('meet:peer-joined', {
        peerId: socket.id,
        userData: {
          socketId: socket.id,
          userId: userData.userId,
          name: userData.name,
          isAudioEnabled: true,
          isVideoEnabled: true
        }
      });

      console.log('[Server] Meet: User joined room successfully, total peers:', peers.size);
      console.log('[Server] Meet: Room peers:', Array.from(peers.entries()));
    } catch (error) {
      console.error('[Server] Meet: Error joining video room:', error);
    }
  });

  // WebRTC Signaling
  
  // Handle SDP Offer - sending an offer to establish connection
  socket.on('meet:offer', ({ roomId, targetId, sdp }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: Received offer from', socket.id, 'for peer', targetId);
      
      // Forward the offer to the target peer
      io.to(targetId).emit('meet:offer', {
        peerId: socket.id,
        sdp
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling offer:', error);
    }
  });

  // Handle SDP Answer - responding to an offer
  socket.on('meet:answer', ({ roomId, targetId, sdp }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: Received answer from', socket.id, 'for peer', targetId);
      
      // Forward the answer to the target peer
      io.to(targetId).emit('meet:answer', {
        peerId: socket.id,
        sdp
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling answer:', error);
    }
  });

  // Handle ICE Candidate - for establishing direct connection
  socket.on('meet:ice-candidate', ({ roomId, targetId, candidate }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: Received ICE candidate from', socket.id, 'for peer', targetId);
      
      // Forward the ICE candidate to the target peer
      io.to(targetId).emit('meet:ice-candidate', {
        peerId: socket.id,
        candidate
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling ICE candidate:', error);
    }
  });

  // Media Control Events

  // Handle audio toggle
  socket.on('meet:toggle-audio', ({ roomId, enabled }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: Toggle audio for user', socket.id, 'to', enabled);
      
      // Update peer status
      const peers = roomPeers.get(actualRoomId);
      if (peers && peers.has(socket.id)) {
        const peerData = peers.get(socket.id);
        peerData.isAudioEnabled = enabled;
        peers.set(socket.id, peerData);
        
        console.log('[Server] Meet: Updated peer audio state:', peerData);
      }
      
      // Broadcast to all peers in the room
      const meetRoom = `meet-${actualRoomId}`;
      socket.to(meetRoom).emit('meet:peer-audio', {
        peerId: socket.id,
        enabled
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling audio toggle:', error);
    }
  });

  // Handle video toggle
  socket.on('meet:toggle-video', ({ roomId, enabled }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: Toggle video for user', socket.id, 'to', enabled);
      
      // Update peer status
      const peers = roomPeers.get(actualRoomId);
      if (peers && peers.has(socket.id)) {
        const peerData = peers.get(socket.id);
        peerData.isVideoEnabled = enabled;
        peers.set(socket.id, peerData);
        
        console.log('[Server] Meet: Updated peer video state:', peerData);
      }
      
      // Broadcast to all peers in the room
      const meetRoom = `meet-${actualRoomId}`;
      socket.to(meetRoom).emit('meet:peer-video', {
        peerId: socket.id,
        enabled
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling video toggle:', error);
    }
  });

  // Handle screen sharing
  socket.on('meet:share-screen', ({ roomId, enabled }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: Screen sharing for user', socket.id, 'set to', enabled);
      
      // Broadcast to all peers in the room
      const meetRoom = `meet-${actualRoomId}`;
      socket.to(meetRoom).emit('meet:peer-screen', {
        peerId: socket.id,
        enabled
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling screen sharing toggle:', error);
    }
  });

  // Handle audio toggle for others (new feature)
  socket.on('meet:toggle-other-audio', ({ roomId, targetId, enabled }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      console.log('[Server] Meet: User', socket.id, 'toggling audio for user', targetId, 'to', enabled);
      
      // Update peer status
      const peers = roomPeers.get(actualRoomId);
      if (peers && peers.has(targetId)) {
        const peerData = peers.get(targetId);
        peerData.isAudioEnabled = enabled;
        peers.set(targetId, peerData);
        
        console.log('[Server] Meet: Updated peer audio state:', peerData);
        
        // Notify the target peer that they've been muted/unmuted
        io.to(targetId).emit('meet:force-audio-state', {
          enabled,
          byPeerId: socket.id
        });
        
        // Broadcast to all other peers about this change
        const meetRoom = `meet-${actualRoomId}`;
        io.to(meetRoom).emit('meet:peer-audio', {
          peerId: targetId,
          enabled,
          byPeerId: socket.id
        });
      }
    } catch (error) {
      console.error('[Server] Meet: Error handling other audio toggle:', error);
    }
  });

  // Handle leaving meeting
  socket.on('meet:leave', ({ roomId }) => {
    try {
      const actualRoomId = extractRoomId(roomId);
      handleLeaveMeeting(socket, actualRoomId);
    } catch (error) {
      console.error('[Server] Meet: Error handling meeting leave:', error);
    }
  });

  // Also handle disconnect
  socket.on('disconnect', () => {
    try {
      // Find all rooms this socket is part of
      roomPeers.forEach((peers, roomId) => {
        if (peers.has(socket.id)) {
          handleLeaveMeeting(socket, roomId);
        }
      });
    } catch (error) {
      console.error('[Server] Meet: Error handling disconnect:', error);
    }
  });

  // Helper function to handle leaving a meeting
  function handleLeaveMeeting(socket, roomId) {
    console.log('[Server] Meet: User leaving meeting room:', socket.id, 'from room', roomId);
    
    // Remove peer from room
    const peers = roomPeers.get(roomId);
    if (peers) {
      peers.delete(socket.id);
      
      // If room is empty, cleanup
      if (peers.size === 0) {
        console.log('[Server] Meet: Room is empty, cleaning up:', roomId);
        roomPeers.delete(roomId);
      } else {
        // Notify other peers about this peer leaving
        const meetRoom = `meet-${roomId}`;
        socket.to(meetRoom).emit('meet:peer-left', {
          peerId: socket.id
        });
      }
    }
    
    // Leave socket room
    const meetRoom = `meet-${roomId}`;
    socket.leave(meetRoom);
  }
};

module.exports = handleMeetSocket;
