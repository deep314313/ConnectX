import { getActualRoomIdFromJWT } from '../utils/roomUtils';

// Store WebRTC connections with other peers
const peerConnections = new Map();
let localStream = null;
let socket = null;
let currentRoomId = null;
let currentUserData = null;
let roomPeers = new Map();

// Add a map to track peers we've locally muted
const locallyMutedPeers = new Set();

// Configuration for STUN/TURN servers
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Add free TURN servers for better connectivity through firewalls
    { 
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    { 
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10,
};

// Media constraints for better quality
const mediaConstraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 }
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true
  }
};

// Initialize the meeting
export const initializeMeeting = async (socketInstance, roomId, userData) => {
  console.log('[Meet] Initializing meeting with socket:', {
    socketId: socketInstance?.id,
    socketConnected: socketInstance?.connected,
    roomId,
    userData
  });
  
  if (!socketInstance) {
    console.error('[Meet] Socket instance is null or undefined');
    throw new Error('Socket not provided');
  }
  
  if (!socketInstance?.connected) {
    console.error('[Meet] Socket not connected');
    throw new Error('Socket not connected');
  }
  
  if (!roomId) {
    console.error('[Meet] Room ID not provided');
    throw new Error('Room ID not provided');
  }
  
  if (!userData) {
    console.error('[Meet] User data not provided');
    throw new Error('User data not provided');
  }
  
  socket = socketInstance;
  currentRoomId = roomId;
  currentUserData = userData;
  
  // Get local media stream with video and audio
  try {
    console.log('[Meet] Requesting media with constraints:', mediaConstraints);
    localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
    console.log('[Meet] Local stream obtained:', localStream.getTracks().map(t => ({ kind: t.kind, label: t.label })));
    
    // Join meeting room - silent extraction without logging
    let actualRoomId;
    try {
      if (roomId && roomId.split('.').length === 3) {
        const payload = JSON.parse(atob(roomId.split('.')[1]));
        actualRoomId = payload.roomId || roomId;
      } else {
        actualRoomId = roomId;
      }
    } catch (err) {
      actualRoomId = roomId;
    }
    
    // Clear roomPeers map for this room if it exists
    roomPeers.set(actualRoomId, new Map());
    
    socket.emit('meet:join', {
      roomId: actualRoomId,
      userData: {
        userId: userData.uid || userData.id,
        name: userData.displayName || userData.name
      }
    });
    
    // Set up socket event listeners
    setupSocketListeners();
    
    return localStream;
  } catch (error) {
    console.error('[Meet] Error getting user media:', error);
    throw error;
  }
};

// Set up all socket event listeners
const setupSocketListeners = () => {
  if (!socket) return;
  
  // Clean up any existing listeners
  socket.off('meet:peers');
  socket.off('meet:peer-joined');
  socket.off('meet:peer-left');
  socket.off('meet:offer');
  socket.off('meet:answer');
  socket.off('meet:ice-candidate');
  socket.off('meet:peer-audio');
  socket.off('meet:peer-video');
  socket.off('meet:peer-screen');
  
  // When receiving the list of existing peers in the room
  socket.on('meet:peers', ({ peers }) => {
    console.log('[Meet] Received peers list:', peers);
    
    // Store peers in room peers map - silent extraction without logging
    let actualRoomId;
    try {
      if (currentRoomId && currentRoomId.split('.').length === 3) {
        const payload = JSON.parse(atob(currentRoomId.split('.')[1]));
        actualRoomId = payload.roomId || currentRoomId;
      } else {
        actualRoomId = currentRoomId;
      }
    } catch (err) {
      actualRoomId = currentRoomId;
    }
    
    const roomPeerMap = roomPeers.get(actualRoomId) || new Map();
    
    // Add each peer to the map
    peers.forEach(peer => {
      if (peer.socketId !== socket.id) {
        roomPeerMap.set(peer.socketId, peer);
        createPeerConnection(peer.socketId);
        // As the newcomer, we initiate the connection
        createOffer(peer.socketId);
        
        // Emit event for UI
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('meet:peer-joined', {
            detail: {
              peerId: peer.socketId,
              userData: peer
            }
          }));
        }
      }
    });
    
    // Save updated map
    roomPeers.set(actualRoomId, roomPeerMap);
  });
  
  // When a new peer joins the room
  socket.on('meet:peer-joined', ({ peerId, userData }) => {
    console.log('[Meet] New peer joined:', peerId, userData);
    
    // Create peer connection for the new peer
    // The new peer will initiate the connection
    createPeerConnection(peerId);
    
    // Dispatch event with full user data
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meet:peer-joined', { 
        detail: { 
          peerId, 
          userData 
        } 
      }));
    }
  });
  
  // When a peer leaves the room
  socket.on('meet:peer-left', ({ peerId }) => {
    console.log('[Meet] Peer left:', peerId);
    
    // Close and remove the peer connection
    if (peerConnections.has(peerId)) {
      peerConnections.get(peerId).close();
      peerConnections.delete(peerId);
    }
    
    // Extract room ID silently without logging
    let actualRoomId = getActualRoomIdFromJWT(currentRoomId);
    
    const roomPeerMap = roomPeers.get(actualRoomId);
    if (roomPeerMap && roomPeerMap.has(peerId)) {
      const peerData = roomPeerMap.get(peerId);
      console.log('[Meet] Removing peer data:', peerData);
      roomPeerMap.delete(peerId);
    }
    
    // Notify that a peer has left
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meet:peer-disconnected', { detail: { peerId } }));
    }
  });
  
  // When receiving an SDP offer from a peer
  socket.on('meet:offer', async ({ peerId, sdp }) => {
    console.log('[Meet] Received offer from:', peerId);
    
    try {
      // Create peer connection if it doesn't exist
      if (!peerConnections.has(peerId)) {
        createPeerConnection(peerId);
      }
      
      const peerConnection = peerConnections.get(peerId);
      
      // Set the remote description to the received SDP offer
      await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      
      // Create an answer to the offer
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      // Send the answer back to the peer
      const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
      socket.emit('meet:answer', {
        roomId: actualRoomId,
        targetId: peerId,
        sdp: answer
      });
    } catch (error) {
      console.error('[Meet] Error handling offer:', error);
    }
  });
  
  // When receiving an SDP answer from a peer
  socket.on('meet:answer', async ({ peerId, sdp }) => {
    console.log('[Meet] Received answer from:', peerId);
    
    try {
      const peerConnection = peerConnections.get(peerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
      }
    } catch (error) {
      console.error('[Meet] Error handling answer:', error);
    }
  });
  
  // When receiving an ICE candidate from a peer
  socket.on('meet:ice-candidate', async ({ peerId, candidate }) => {
    console.log('[Meet] Received ICE candidate from:', peerId);
    
    try {
      const peerConnection = peerConnections.get(peerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('[Meet] Error handling ICE candidate:', error);
    }
  });
  
  // Handle media control events
  socket.on('meet:peer-audio', ({ peerId, enabled }) => {
    console.log('[Meet] Peer', peerId, 'audio', enabled ? 'enabled' : 'disabled');
    // Notify UI about peer audio change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meet:peer-audio-change', { 
        detail: { peerId, enabled } 
      }));
    }
  });
  
  socket.on('meet:peer-video', ({ peerId, enabled }) => {
    console.log('[Meet] Peer', peerId, 'video', enabled ? 'enabled' : 'disabled');
    // Notify UI about peer video change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meet:peer-video-change', { 
        detail: { peerId, enabled } 
      }));
    }
  });
  
  // When receiving `meet:peer-screen` event (screen sharing)
  socket.on('meet:peer-screen', ({ peerId, enabled }) => {
    console.log('[Meet] Peer', peerId, 'changed screen sharing state to:', enabled);
    
    // Dispatch event for UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meet:peer-screen-change', {
        detail: { peerId, enabled }
      }));
    }
  });

  // Add this after the setupSocketListeners function initialization
  socket.on('meet:force-audio-state', ({ enabled, byPeerId }) => {
    console.log('[Meet] Received forced audio state change to:', enabled, 'by peer:', byPeerId);
    
    // Get peer info if available
    const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
    const roomPeerMap = roomPeers.get(actualRoomId);
    const peerName = roomPeerMap?.get(byPeerId)?.name || 'Another user';
    
    // Force local audio state change
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        console.log('[Meet] Force changing audio track enabled state to:', enabled);
        track.enabled = enabled;
      });
      
      // Notify UI that we've been muted/unmuted by someone else
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('meet:forced-audio-change', { 
          detail: { 
            enabled, 
            byPeer: { id: byPeerId, name: peerName } 
          } 
        }));
      }
    }
  });
};

// Create a new WebRTC peer connection
const createPeerConnection = (peerId) => {
  try {
    // If an existing connection exists, close it first
    if (peerConnections.has(peerId)) {
      console.log('[Meet] Closing existing peer connection for:', peerId);
      const oldConnection = peerConnections.get(peerId);
      oldConnection.close();
      peerConnections.delete(peerId);
    }
    
    // Create new connection
    console.log('[Meet] Creating new peer connection for:', peerId, 'with ice servers:', iceServers);
    const peerConnection = new RTCPeerConnection(iceServers);
    
    // Add all tracks from local stream
    if (localStream) {
      console.log('[Meet] Adding local tracks to peer connection for:', peerId);
      
      localStream.getTracks().forEach(track => {
        console.log('[Meet] Adding track to peer connection:', track.kind, track.label, 'enabled:', track.enabled);
        try {
          peerConnection.addTrack(track, localStream);
        } catch (err) {
          console.error('[Meet] Error adding track to peer connection:', err);
        }
      });
    } else {
      console.warn('[Meet] No local stream to add to peer connection for:', peerId);
    }
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const candidateInfo = event.candidate.candidate.substring(0, 50) + '...';
        console.log('[Meet] New ICE candidate for peer', peerId, ':', candidateInfo);
        
        const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
        socket.emit('meet:ice-candidate', {
          roomId: actualRoomId,
          targetId: peerId,
          candidate: event.candidate
        });
      } else {
        console.log('[Meet] All ICE candidates gathered for peer:', peerId);
      }
    };
    
    // Log ICE gathering state changes
    peerConnection.onicegatheringstatechange = () => {
      console.log('[Meet] ICE gathering state changed for peer', peerId, ':', peerConnection.iceGatheringState);
    };
    
    // Log ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log('[Meet] ICE connection state changed for peer', peerId, ':', peerConnection.iceConnectionState);
      
      // Handle disconnections
      if (peerConnection.iceConnectionState === 'disconnected' || 
          peerConnection.iceConnectionState === 'failed') {
        console.log('[Meet] ICE connection failed or disconnected, attempting to restart ICE');
        try {
          peerConnection.restartIce();
        } catch (err) {
          console.error('[Meet] Error restarting ICE:', err);
        }
      }
    };
    
    // Log connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('[Meet] Connection state changed for peer', peerId, ':', peerConnection.connectionState);
    };
    
    // Handle track arrival from remote peer
    peerConnection.ontrack = (event) => {
      console.log('[Meet] Received remote track from:', peerId, 'kind:', event.track.kind, 'label:', event.track.label);
      
      // Find the peer data from our peers map
      const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
      const roomPeerMap = roomPeers.get(actualRoomId);
      const peerData = roomPeerMap?.get(peerId);
      
      console.log('[Meet] Peer data for remote track:', peerData);
      
      // Log info about the stream
      const streamInfo = {
        id: event.streams[0].id,
        active: event.streams[0].active,
        trackCount: event.streams[0].getTracks().length
      };
      console.log('[Meet] Stream info:', streamInfo);
      
      // If audio track and we've locally muted this peer, mute this track
      event.streams[0].getTracks().forEach(track => {
        console.log('[Meet] Remote track info:', track.kind, track.label, 'enabled:', track.enabled);
        
        // If it's an audio track and we've locally muted this peer, disable it just for us
        if (track.kind === 'audio' && locallyMutedPeers.has(peerId)) {
          console.log('[Meet] Locally muting audio track for peer:', peerId);
          track.enabled = false;
        } else {
          track.enabled = true;
        }
      });
      
      // Notify the UI that we have a new stream to display
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('meet:remote-track', { 
          detail: { 
            peerId, 
            stream: event.streams[0],
            userData: peerData || { name: currentUserData?.name || 'Unknown User' }
          } 
        }));
      }
    };
    
    // Store the connection
    peerConnections.set(peerId, peerConnection);
    return peerConnection;
  } catch (error) {
    console.error('[Meet] Error creating peer connection:', error);
    throw error;
  }
};

// Create and send an offer to a peer
const createOffer = async (peerId) => {
  try {
    const peerConnection = peerConnections.get(peerId);
    if (!peerConnection) return;
    
    console.log('[Meet] Creating offer for peer:', peerId);
    
    // Create an offer with reliability options
    const offer = await peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      voiceActivityDetection: true
    });
    
    console.log('[Meet] Offer created for peer:', peerId);
    await peerConnection.setLocalDescription(offer);
    console.log('[Meet] Local description set for peer:', peerId);
    
    // Send the offer to the peer
    const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
    socket.emit('meet:offer', {
      roomId: actualRoomId,
      targetId: peerId,
      sdp: offer
    });
    
    console.log('[Meet] Offer sent to peer:', peerId);
  } catch (error) {
    console.error('[Meet] Error creating offer:', error);
  }
};

// Toggle audio on/off
export const toggleAudio = (enabled) => {
  try {
    if (!localStream) {
      console.error('[Meet] Cannot toggle audio: No local stream available');
      return false;
    }
    
    console.log('[Meet] Toggling audio to:', enabled);
    
    // Apply to all audio tracks
    const audioTracks = localStream.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[Meet] No audio tracks found in local stream');
    }
    
    audioTracks.forEach(track => {
      console.log('[Meet] Setting audio track enabled:', enabled, 'for track:', track.label);
      track.enabled = enabled;
    });
    
    // Also ensure all senders have updated tracks
    peerConnections.forEach((pc, pcId) => {
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'audio') {
          console.log('[Meet] Updating audio sender track enabled state for peer:', pcId);
          sender.track.enabled = enabled;
        }
      });
    });
    
    // Notify other peers if socket is connected
    if (socket?.connected && currentRoomId) {
      const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
      console.log('[Meet] Emitting audio toggle event to room:', actualRoomId);
      socket.emit('meet:toggle-audio', {
        roomId: actualRoomId,
        enabled
      });
    } else {
      console.warn('[Meet] Could not notify peers about audio change - socket not connected');
    }
    
    console.log('[Meet] Audio toggled successfully:', enabled);
    return true;
  } catch (error) {
    console.error('[Meet] Error toggling audio:', error);
    return false;
  }
};

// Toggle video on/off
export const toggleVideo = (enabled) => {
  try {
    if (!localStream) {
      console.error('[Meet] Cannot toggle video: No local stream available');
      return false;
    }
    
    console.log('[Meet] Toggling video to:', enabled);
    
    // Apply to all video tracks
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length === 0) {
      console.warn('[Meet] No video tracks found in local stream');
    }
    
    videoTracks.forEach(track => {
      console.log('[Meet] Setting video track enabled:', enabled, 'for track:', track.label);
      track.enabled = enabled;
    });
    
    // Also ensure all senders have updated tracks
    peerConnections.forEach((pc, pcId) => {
      pc.getSenders().forEach(sender => {
        if (sender.track && sender.track.kind === 'video') {
          console.log('[Meet] Updating video sender track enabled state for peer:', pcId);
          sender.track.enabled = enabled;
        }
      });
    });
    
    // Notify other peers if socket is connected
    if (socket?.connected && currentRoomId) {
      const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
      console.log('[Meet] Emitting video toggle event to room:', actualRoomId);
      socket.emit('meet:toggle-video', {
        roomId: actualRoomId,
        enabled
      });
    } else {
      console.warn('[Meet] Could not notify peers about video change - socket not connected');
    }
    
    console.log('[Meet] Video toggled successfully:', enabled);
    return true;
  } catch (error) {
    console.error('[Meet] Error toggling video:', error);
    return false;
  }
};

// Toggle screen sharing
export const toggleScreenShare = async (enabled) => {
  try {
    if (!socket?.connected) return false;
    
    if (enabled) {
      // Get screen share stream
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      
      // Replace video track on all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      
      peerConnections.forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });
      
      // Save screen stream to stop later
      window.screenStream = screenStream;
      
      // Add stop handler
      videoTrack.onended = () => {
        toggleScreenShare(false);
      };
    } else {
      // Stop screen sharing, restore camera video
      if (window.screenStream) {
        window.screenStream.getTracks().forEach(track => track.stop());
        window.screenStream = null;
      }
      
      // Restore camera video track
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
          peerConnections.forEach(pc => {
            const sender = pc.getSenders().find(s => 
              s.track && s.track.kind === 'video'
            );
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          });
        }
      }
    }
    
    // Notify other peers
    const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
    socket.emit('meet:share-screen', {
      roomId: actualRoomId,
      enabled
    });
    
    console.log('[Meet] Screen sharing toggled:', enabled);
    return true;
  } catch (error) {
    console.error('[Meet] Error toggling screen sharing:', error);
    return false;
  }
};

// Leave the meeting
export const leaveMeeting = () => {
  try {
    // Stop all media tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    
    // Stop screen sharing
    if (window.screenStream) {
      window.screenStream.getTracks().forEach(track => track.stop());
      window.screenStream = null;
    }
    
    // Close all peer connections
    peerConnections.forEach(pc => pc.close());
    peerConnections.clear();
    
    // Leave the room
    if (socket?.connected && currentRoomId) {
      const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
      socket.emit('meet:leave', { roomId: actualRoomId });
    }
    
    // console.log('[Meet] Left meeting');
    return true;
  } catch (error) {
    console.error('[Meet] Error leaving meeting:', error);
    return false;
  }
};

// Replace toggleOtherAudio with a function for local muting
export const toggleLocalMute = (peerId, shouldMute) => {
  try {
    console.log('[Meet] Locally muting peer:', peerId, shouldMute);
    
    // Add or remove peer from locally muted set
    if (shouldMute) {
      locallyMutedPeers.add(peerId);
    } else {
      locallyMutedPeers.delete(peerId);
    }
    
    // Find the peer connection and update audio tracks
    const peerConnection = peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.getReceivers().forEach(receiver => {
        if (receiver.track && receiver.track.kind === 'audio') {
          console.log('[Meet] Setting local audio track enabled:', !shouldMute);
          receiver.track.enabled = !shouldMute;
        }
      });
    }
    
    // Also find the stream in remoteStreams and update it
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('meet:local-mute-change', { 
        detail: { 
          peerId,
          muted: shouldMute
        } 
      }));
    }
    
    console.log('[Meet] Local mute status updated for peer:', peerId);
    return true;
  } catch (error) {
    console.error('[Meet] Error toggling local mute:', error);
    return false;
  }
};

// We'll keep the original function too for global server-side muting
export const toggleOtherAudio = (peerId, enabled) => {
  try {
    if (!socket?.connected || !currentRoomId) {
      console.error('[Meet] Cannot toggle other audio: Not connected to a meeting');
      return false;
    }
    
    console.log('[Meet] Toggling audio for peer', peerId, 'to:', enabled);
    
    // Send request to server
    const actualRoomId = getActualRoomIdFromJWT(currentRoomId);
    socket.emit('meet:toggle-other-audio', {
      roomId: actualRoomId,
      targetId: peerId,
      enabled
    });
    
    console.log('[Meet] Sent request to toggle other audio');
    return true;
  } catch (error) {
    console.error('[Meet] Error toggling other audio:', error);
    return false;
  }
}; 