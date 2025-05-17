import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Camera, CameraOff, Share2, Monitor, Users, Phone, PhoneOff,
  VolumeX, Volume2, UserX, Volume
} from 'lucide-react';
import { 
  initializeMeeting, toggleAudio, toggleVideo, toggleScreenShare, leaveMeeting,
  toggleLocalMute, toggleOtherAudio
} from '../../services/meetService';
import { toast } from 'react-toastify';

function VideoMeet({ socket, roomId, user }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [peers, setPeers] = useState(new Map());
  const [mutedByPeer, setMutedByPeer] = useState(null);
  const [locallyMutedPeers, setLocallyMutedPeers] = useState(new Set());
  const [expandedPeerId, setExpandedPeerId] = useState(null);
  
  const localVideoRef = useRef(null);
  const localStream = useRef(null);
  const remoteStreams = useRef(new Map());
  const mediaState = useRef(new Map());
  
  // Initialize meeting when component mounts
  useEffect(() => {
    console.log('[VideoMeet Debug] Props received:', { 
      socketConnected: socket?.connected, 
      socketId: socket?.id, 
      roomId, 
      user 
    });
    
    if (!socket?.connected || !roomId || !user) {
      console.error('[VideoMeet Error] Missing required props:', { 
        socketMissing: !socket, 
        socketConnected: socket?.connected,
        roomIdMissing: !roomId, 
        userMissing: !user 
      });
      setError('Missing required connection information');
      setIsLoading(false);
      return;
    }
    
    console.log('[VideoMeet] Initializing with roomId:', roomId);
    
    const startMeeting = async () => {
      try {
        setIsLoading(true);
        // Initialize meeting and get local stream
        const stream = await initializeMeeting(socket, roomId, user);
        localStream.current = stream;
        
        // Display local stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('[VideoMeet] Failed to initialize meeting:', err);
        setError(err.message || 'Failed to start video meeting');
        setIsLoading(false);
      }
    };
    
    startMeeting();
    
    // Setup event listeners for peer updates
    const handlePeerJoined = (event) => {
      const { peerId, userData } = event.detail;
      console.log('[VideoMeet] Peer joined:', peerId, userData);
      
      // Add to peers list with full user data
      setPeers(prevPeers => {
        const newPeers = new Map(prevPeers);
        newPeers.set(peerId, {
          id: peerId,
          userId: userData.userId,
          name: userData.name || `User ${peerId.substring(0, 5)}`
        });
        return newPeers;
      });
      
      // Initialize media state for this peer
      mediaState.current.set(peerId, {
        isAudioEnabled: true,
        isVideoEnabled: true,
        isScreenSharing: false
      });
    };
    
    const handlePeerLeft = (event) => {
      const { peerId } = event.detail;
      console.log('[VideoMeet] Peer left:', peerId);
      
      // Remove from peers list
      setPeers(prevPeers => {
        const newPeers = new Map(prevPeers);
        newPeers.delete(peerId);
        return newPeers;
      });
      
      // Clean up remote stream if any
      if (remoteStreams.current.has(peerId)) {
        remoteStreams.current.delete(peerId);
      }
      
      // Clean up media state
      mediaState.current.delete(peerId);
    };
    
    const handleRemoteTrack = (event) => {
      const { peerId, stream, userData } = event.detail;
      console.log('[VideoMeet] Remote track received from:', peerId, userData);
      
      // Store remote stream
      remoteStreams.current.set(peerId, stream);
      
      // Add event listeners to handle track enabling/disabling
      stream.getTracks().forEach(track => {
        track.onended = () => {
          console.log('[VideoMeet] Remote track ended:', track.kind);
        };
        
        track.onmute = () => {
          console.log('[VideoMeet] Remote track muted:', track.kind);
        };
        
        track.onunmute = () => {
          console.log('[VideoMeet] Remote track unmuted:', track.kind);
        };
      });
      
      // Ensure peer exists in state (will trigger re-render)
      setPeers(prevPeers => {
        const newPeers = new Map(prevPeers);
        if (!newPeers.has(peerId)) {
          // Use userData from event if available, otherwise fallback to basic info
          newPeers.set(peerId, { 
            id: peerId, 
            userId: userData?.userId || peerId,
            name: userData?.name || `User ${peerId.substring(0, 5)}` 
          });
        } else {
          // Update existing peer data with stream info
          const existingPeer = newPeers.get(peerId);
          newPeers.set(peerId, {
            ...existingPeer,
            hasStream: true
          });
        }
        return newPeers;
      });
      
      // Force re-render for video to display
      setTimeout(() => {
        setPeers(prevPeers => new Map(prevPeers));
      }, 500);
    };
    
    const handlePeerAudioChange = (event) => {
      const { peerId, enabled } = event.detail;
      console.log('[VideoMeet] Peer audio change:', peerId, enabled);
      
      // Update media state
      if (mediaState.current.has(peerId)) {
        const state = mediaState.current.get(peerId);
        state.isAudioEnabled = enabled;
        mediaState.current.set(peerId, state);
        
        // Force re-render
        setPeers(prevPeers => new Map(prevPeers));
      }
    };
    
    const handlePeerVideoChange = (event) => {
      const { peerId, enabled } = event.detail;
      console.log('[VideoMeet] Peer video change:', peerId, enabled);
      
      // Update media state
      if (mediaState.current.has(peerId)) {
        const state = mediaState.current.get(peerId);
        state.isVideoEnabled = enabled;
        mediaState.current.set(peerId, state);
        
        // Force re-render
        setPeers(prevPeers => new Map(prevPeers));
      }
    };
    
    const handlePeerScreenChange = (event) => {
      const { peerId, enabled } = event.detail;
      console.log('[VideoMeet] Peer screen share change:', peerId, enabled);
      
      // Update media state
      if (mediaState.current.has(peerId)) {
        const state = mediaState.current.get(peerId);
        state.isScreenSharing = enabled;
        mediaState.current.set(peerId, state);
        
        // Force re-render
        setPeers(prevPeers => new Map(prevPeers));
      }
    };
    
    const handleForcedAudioChange = (event) => {
      const { enabled, byPeer } = event.detail;
      console.log('[VideoMeet] Received forced audio change:', enabled, 'by:', byPeer);
      
      // Update local mute state
      setIsMuted(!enabled);
      
      // Show toast notification
      const action = enabled ? 'unmuted' : 'muted';
      toast.info(`You've been ${action} by ${byPeer.name}`, {
        position: "top-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Briefly show who muted you
      setMutedByPeer(byPeer);
      setTimeout(() => {
        setMutedByPeer(null);
      }, 3000);
    };

    const handleLocalMuteChange = (event) => {
      const { peerId, muted } = event.detail;
      console.log('[VideoMeet] Local mute change:', peerId, muted);
      
      // Update local state to reflect UI changes
      setLocallyMutedPeers(prev => {
        const newSet = new Set(prev);
        if (muted) {
          newSet.add(peerId);
        } else {
          newSet.delete(peerId);
        }
        return newSet;
      });
    };
    
    // Register event listeners
    window.addEventListener('meet:peer-joined', handlePeerJoined);
    window.addEventListener('meet:peer-disconnected', handlePeerLeft);
    window.addEventListener('meet:remote-track', handleRemoteTrack);
    window.addEventListener('meet:peer-audio-change', handlePeerAudioChange);
    window.addEventListener('meet:peer-video-change', handlePeerVideoChange);
    window.addEventListener('meet:peer-screen-change', handlePeerScreenChange);
    window.addEventListener('meet:forced-audio-change', handleForcedAudioChange);
    window.addEventListener('meet:local-mute-change', handleLocalMuteChange);
    
    // Clean up
    return () => {
      leaveMeeting();
      
      window.removeEventListener('meet:peer-joined', handlePeerJoined);
      window.removeEventListener('meet:peer-disconnected', handlePeerLeft);
      window.removeEventListener('meet:remote-track', handleRemoteTrack);
      window.removeEventListener('meet:peer-audio-change', handlePeerAudioChange);
      window.removeEventListener('meet:peer-video-change', handlePeerVideoChange);
      window.removeEventListener('meet:peer-screen-change', handlePeerScreenChange);
      window.removeEventListener('meet:forced-audio-change', handleForcedAudioChange);
      window.removeEventListener('meet:local-mute-change', handleLocalMuteChange);
    };
  }, [socket, roomId, user]);

  // Handle mute/unmute
  const handleToggleAudio = () => {
    try {
      console.log('[VideoMeet] Toggling audio from', isMuted, 'to', !isMuted);
      const newState = !isMuted;
      const success = toggleAudio(!newState);
      
      if (success) {
        setIsMuted(newState);
        console.log('[VideoMeet] Audio toggled successfully to', !newState);
      } else {
        console.error('[VideoMeet] Failed to toggle audio');
      }
    } catch (err) {
      console.error('[VideoMeet] Error in handleToggleAudio:', err);
    }
  };

  // Handle camera toggle
  const handleToggleVideo = () => {
    try {
      console.log('[VideoMeet] Toggling video from', isCameraOff, 'to', !isCameraOff);
      const newState = !isCameraOff;
      const success = toggleVideo(!newState);
      
      if (success) {
        setIsCameraOff(newState);
        console.log('[VideoMeet] Video toggled successfully to', !newState);
      } else {
        console.error('[VideoMeet] Failed to toggle video');
      }
    } catch (err) {
      console.error('[VideoMeet] Error in handleToggleVideo:', err);
    }
  };

  // Handle screen sharing
  const handleToggleScreenShare = async () => {
    try {
      console.log('[VideoMeet] Toggling screen sharing from', isScreenSharing, 'to', !isScreenSharing);
      const newState = !isScreenSharing;
      const success = await toggleScreenShare(newState);
      
      if (success) {
        setIsScreenSharing(newState);
        console.log('[VideoMeet] Screen sharing toggled successfully to', newState);
      } else {
        console.error('[VideoMeet] Failed to toggle screen sharing');
      }
    } catch (err) {
      console.error('[VideoMeet] Error in handleToggleScreenShare:', err);
    }
  };

  // Get grid layout class based on number of participants
  const getGridClass = () => {
    const totalParticipants = 1 + peers.size; // Local + remote
    if (totalParticipants <= 1) return 'grid-cols-1';
    if (totalParticipants <= 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-2 md:grid-cols-3';
    return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
  };

  // Function to attach stream to video element
  const attachStreamToVideo = (videoRef, stream) => {
    if (!videoRef || !stream) return;
    
    try {
      // Only update if it's a different stream
      if (videoRef.srcObject !== stream) {
        console.log('[VideoMeet] Attaching stream to video element');
        videoRef.srcObject = stream;
        
        // Make sure video plays
        videoRef.play().catch(err => {
          console.error('[VideoMeet] Error playing video:', err);
        });
      }
    } catch (err) {
      console.error('[VideoMeet] Error attaching stream to video:', err);
    }
  };

  // Use ref callback for remote video elements
  const handleVideoRef = (peerId, el) => {
    if (!el) return;
    
    const peerStream = remoteStreams.current.get(peerId);
    if (peerStream) {
      console.log('[VideoMeet] Setting stream for peer using ref callback:', peerId);
      
      // Check if stream is already attached
      if (el.srcObject !== peerStream) {
        el.srcObject = peerStream;
        
        // Force play and handle errors
        el.play().catch(err => {
          console.error('[VideoMeet] Error playing video:', err);
          // Try one more time with a delay
          setTimeout(() => {
            el.play().catch(err2 => {
              console.error('[VideoMeet] Error playing video after retry:', err2);
            });
          }, 1000);
        });
      }
      
      // Set proper object-fit based on whether this is screen sharing
      const isScreenSharing = mediaState.current.get(peerId)?.isScreenSharing;
      el.style.objectFit = isScreenSharing ? 'contain' : 'cover';
      
      // For screen sharing, ensure video is visible even if video track is disabled
      if (isScreenSharing) {
        el.style.display = 'block';
      }
    }
  };

  // Add this new function to handle muting/unmuting others
  const handleToggleOtherAudio = (peerId, currentlyEnabled) => {
    console.log('[VideoMeet] Toggling other audio for peer:', peerId, 'to:', !currentlyEnabled);
    
    // Toggle other peer's audio (opposite of current state)
    const success = toggleOtherAudio(peerId, !currentlyEnabled);
    
    if (success) {
      // Update local media state for UI
      if (mediaState.current.has(peerId)) {
        const state = mediaState.current.get(peerId);
        state.isAudioEnabled = !currentlyEnabled;
        mediaState.current.set(peerId, state);
        
        // Force re-render
        setPeers(prevPeers => new Map(prevPeers));
      }
      
      // Show toast
      const action = currentlyEnabled ? 'muted' : 'unmuted';
      const peerName = peers.get(peerId)?.name || `User ${peerId.substring(0, 5)}`;
      toast.success(`You ${action} ${peerName}`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const handleToggleLocalMute = (peerId) => {
    const isCurrentlyMuted = locallyMutedPeers.has(peerId);
    console.log('[VideoMeet] Toggling local mute for peer:', peerId, 'currently muted:', isCurrentlyMuted);
    
    // Toggle local mute status
    const shouldMute = !isCurrentlyMuted;
    const success = toggleLocalMute(peerId, shouldMute);
    
    if (success) {
      // UI already updated via the event listener
      
      // Show toast notification
      const action = shouldMute ? 'muted' : 'unmuted';
      const peerName = peers.get(peerId)?.name || `User ${peerId.substring(0, 5)}`;
      toast.success(`You've locally ${action} ${peerName}. Only you can${shouldMute ? "'t" : ""} hear them.`, {
        position: "top-right",
        autoClose: 3000,
      });
    }
  };

  // Handle expanding/minimizing a screen share
  const toggleExpandVideo = (peerId) => {
    if (expandedPeerId === peerId) {
      // Collapse currently expanded video
      setExpandedPeerId(null);
    } else {
      // Expand this video
      setExpandedPeerId(peerId);
    }
  };

  // Add an improved logging function 
  useEffect(() => {
    // Advanced debug when peer state changes to help track screen sharing issues
    console.log('[VideoMeet] Current peer states:');
    peers.forEach((peer, peerId) => {
      const peerStream = remoteStreams.current.get(peerId);
      const peerState = mediaState.current.get(peerId);
      console.log('[VideoMeet] Peer:', peerId, {
        name: peer.name,
        hasStream: !!peerStream,
        streamTracks: peerStream ? peerStream.getTracks().map(t => ({ kind: t.kind, enabled: t.enabled })) : [],
        mediaState: peerState
      });
    });
  }, [peers]);

  // If error, show error message
  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
            Video Meeting
          </h2>
        </div>
        <div className="bg-red-500/10 text-red-500 p-4 rounded-lg">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // If loading, show loading message
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
            Video Meeting
          </h2>
        </div>
        <div className="flex items-center justify-center h-64 bg-black bg-opacity-30 rounded-lg border border-primary/10">
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-gray-400">Setting up your meeting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Video Meeting
          {expandedPeerId && (
            <span className="ml-4 text-sm font-normal text-green-400">
              Viewing expanded screen - click minimize to return to grid view
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleAudio}
            className={`p-2 rounded-lg transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-500'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={handleToggleVideo}
            className={`p-2 rounded-lg transition-colors ${
              isCameraOff
                ? 'bg-red-500/20 text-red-500'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? (
              <CameraOff className="w-5 h-5" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleToggleScreenShare}
            className={`p-2 rounded-lg transition-colors ${
              isScreenSharing
                ? 'bg-primary/20 text-primary'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
            title={isScreenSharing ? 'Stop Sharing' : 'Share Screen'}
          >
            {isScreenSharing ? (
              <Monitor className="w-5 h-5" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={leaveMeeting}
            className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 transition-colors"
            title="Leave Meeting"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <div className={expandedPeerId ? "grid grid-cols-1 gap-4" : `grid ${getGridClass()} gap-4`}>
        {/* Local video - always show in normal size if another peer is expanded */}
        <div className={`aspect-video bg-black bg-opacity-30 rounded-lg border ${expandedPeerId ? 'border-gray-800 max-h-36' : 'border-primary/10'} relative overflow-hidden ${
          expandedPeerId ? 'col-span-1 mb-2' : ''
        }`}>
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isCameraOff ? 'hidden' : ''}`}
          />
          {isCameraOff && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-medium">{user?.displayName || user?.name || 'You'}</span>
                {/* Add notification when muted by peer */}
                {mutedByPeer && (
                  <span className="text-xs text-red-400 block animate-pulse">
                    Muted by {mutedByPeer.name}
                  </span>
                )}
                <div className="flex items-center gap-2">
                  {isMuted && (
                    <MicOff className="w-3 h-3 text-red-500" />
                  )}
                  {isScreenSharing && (
                    <Monitor className="w-3 h-3 text-green-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Remote videos - ensure autoPlay and proper ref handling */}
        {Array.from(peers.entries()).map(([peerId, peerData]) => {
          const peerStream = remoteStreams.current.get(peerId);
          const peerMediaState = mediaState.current.get(peerId) || {
            isAudioEnabled: true,
            isVideoEnabled: true,
            isScreenSharing: false
          };
          
          const isExpanded = expandedPeerId === peerId;
          const shouldShowExpanded = expandedPeerId === null || isExpanded;
          
          if (!shouldShowExpanded) return null; // Don't render other peers when one is expanded
          
          // console.log('[VideoMeet] Rendering peer:', peerId, peerData.name, 'Stream:', !!peerStream, 'Screen sharing:', peerMediaState.isScreenSharing);
          
          return (
            <div
              key={peerId}
              className={`aspect-video bg-black bg-opacity-30 rounded-lg ${
                isExpanded ? 'border-green-500 border-2 shadow-lg shadow-green-500/20' : 'border border-primary/10'
              } relative overflow-hidden ${
                isExpanded ? 'col-span-full' : ''
              }`}
            >
              {!peerStream && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-pulse w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-10 h-10 text-primary" />
                  </div>
                </div>
              )}
              {peerStream && !peerMediaState.isVideoEnabled && !peerMediaState.isScreenSharing && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-10 h-10 text-primary" />
                  </div>
                </div>
              )}
              {peerStream && (
                <video
                  key={`video-${peerId}-${peerMediaState.isScreenSharing ? 'screen' : 'cam'}-${Date.now()}`}
                  ref={(el) => handleVideoRef(peerId, el)}
                  autoPlay
                  playsInline
                  controls={false}
                  muted={locallyMutedPeers.has(peerId)}
                  className={`w-full h-full ${peerMediaState.isScreenSharing ? 'object-contain' : 'object-cover'} ${
                    !peerMediaState.isVideoEnabled && !peerMediaState.isScreenSharing ? 'hidden' : ''
                  }`}
                  onLoadedMetadata={() => {/* console.log('[VideoMeet] Video loaded metadata for peer:', peerId, 'screen:', peerMediaState.isScreenSharing) */}}
                  onLoadedData={() => {/* console.log('[VideoMeet] Video loaded data for peer:', peerId, 'screen:', peerMediaState.isScreenSharing) */}}
                  onPlay={() => {/* console.log('[VideoMeet] Video started playing for peer:', peerId, 'screen:', peerMediaState.isScreenSharing) */}}
                  onError={(e) => console.error('[VideoMeet] Video error for peer:', peerId, 'screen:', peerMediaState.isScreenSharing, e)}
                />
              )}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{peerData.name || `User ${peerId.substring(0, 5)}`}</span>
                        {peerMediaState.isScreenSharing && (
                          <span className="text-xs text-green-400 ml-2 flex items-center">
                            <Monitor className="w-3 h-3 mr-1" /> Sharing screen
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Add expand/minimize button for screen sharing */}
                        {peerMediaState.isScreenSharing && (
                          <button
                            onClick={() => toggleExpandVideo(peerId)}
                            className="p-1 rounded-full bg-gray-500/10 text-gray-300 hover:bg-gray-500/20"
                            title={isExpanded ? "Minimize" : "Expand screen"}
                          >
                            {isExpanded ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="4 14 10 14 10 20"></polyline>
                                <polyline points="20 10 14 10 14 4"></polyline>
                                <line x1="14" y1="10" x2="21" y2="3"></line>
                                <line x1="3" y1="21" x2="10" y2="14"></line>
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <polyline points="9 21 3 21 3 15"></polyline>
                                <line x1="21" y1="3" x2="14" y2="10"></line>
                                <line x1="3" y1="21" x2="10" y2="14"></line>
                              </svg>
                            )}
                          </button>
                        )}
                        
                        {/* Local mute button */}
                        <button
                          onClick={() => handleToggleLocalMute(peerId)}
                          className={`p-1 rounded-full transition-colors ${
                            locallyMutedPeers.has(peerId)
                              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                              : 'bg-gray-500/10 text-gray-300 hover:bg-gray-500/20'
                          }`}
                          title={locallyMutedPeers.has(peerId) ? 'Unmute for me' : 'Mute for me only'}
                        >
                          {locallyMutedPeers.has(peerId) ? (
                            <VolumeX className="w-4 h-4" />
                          ) : (
                            <Volume className="w-4 h-4" />
                          )}
                        </button>
                        
                        {/* Global mute button */}
                        <button
                          onClick={() => handleToggleOtherAudio(peerId, peerMediaState.isAudioEnabled)}
                          className={`p-1 rounded-full transition-colors ${
                            !peerMediaState.isAudioEnabled 
                              ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' 
                              : 'bg-gray-500/10 text-gray-300 hover:bg-gray-500/20'
                          }`}
                          title={peerMediaState.isAudioEnabled ? 'Mute for everyone' : 'Unmute for everyone'}
                        >
                          {peerMediaState.isAudioEnabled ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <UserX className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!peerMediaState.isAudioEnabled && (
                        <MicOff className="w-3 h-3 text-red-500" />
                      )}
                      {peerMediaState.isScreenSharing && (
                        <Monitor className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VideoMeet;
