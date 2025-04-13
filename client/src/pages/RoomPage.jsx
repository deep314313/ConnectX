import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  Code2,
  PenTool,
  Video,
  Files,
  Settings,
  LogOut,
  Link as LinkIcon,
  MessageSquare,
  Trash2,
  Bot,
  Copy
} from 'lucide-react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import room components
import ChatBox from '../components/room/ChatBox';
import CodeEditor from '../components/room/CodeEditor';
import Whiteboard from '../components/room/Whiteboard';
import VideoMeet from '../components/room/VideoMeet';
import MembersList from '../components/room/MembersList';
import FileUpload from '../components/room/FileUpload';
import AIAssistant from '../components/room/AIAssistant';
import RoomControls from '../components/room/RoomControls';

// Import socket service
import {
  initializeSocket,
  joinRoomSocket,
  leaveRoomSocket,
  onMemberJoin,
  onMemberLeave,
  onMembersList,
  disconnectSocket,
  onRoomError
} from '../services/socket';

function RoomPage() {
  const { sessionToken } = useParams();
  const navigate = useNavigate();
  const starsContainerRef = useRef(null);
  const [activeFeature, setActiveFeature] = useState('members');
  const [showChat, setShowChat] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [members, setMembers] = useState([]);
  const [socket, setSocket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const [roomName, setRoomName] = useState('');
  const socketRef = useRef(null);
  const userRef = useRef(null);

  // Stars background effect
  useEffect(() => {
    if (!starsContainerRef.current) return;

    const container = starsContainerRef.current;
    const starCount = 200;
    const asteroidCount = 30;

    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.width = `${Math.random() * 3}px`;
      star.style.height = star.style.width;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 3}s`;
      container.appendChild(star);
    }

    for (let i = 0; i < asteroidCount; i++) {
      const asteroid = document.createElement('div');
      asteroid.className = 'asteroid';
      asteroid.style.left = `${Math.random() * 100}%`;
      asteroid.style.top = `${Math.random() * 100}%`;
      const animations = ['moveAsteroid1', 'moveAsteroid2', 'moveAsteroid3', 'moveAsteroid4'];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      const duration = 20 + Math.random() * 30;
      const delay = Math.random() * 15;
      asteroid.style.animation = `${randomAnimation} ${duration}s linear ${delay}s infinite`;
      container.appendChild(asteroid);
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

  // Socket connection and room management
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user || !sessionToken) {
      navigate('/dashboard');
      return;
    }

    // Get room data from localStorage
    const roomData = JSON.parse(localStorage.getItem('currentRoom'));
    if (roomData && roomData.name) {
      setRoomName(roomData.name);
      setLoading(false); // Set loading to false once we have the room name
    }

    userRef.current = {
      uid: user.uid || user.id || `guest_${user.name || 'user'}`,
      displayName: user.displayName || user.name || 'Guest',
      isGuest: !user.token
    };

    let mounted = true;

    const connectToRoom = async () => {
      try {
        const socketInstance = await initializeSocket(sessionToken);
        if (!mounted) return;
        
        socketRef.current = socketInstance;
        setSocket(socketInstance);

        // Listen for room info updates
        socketInstance.on('room:info', (data) => {
          if (mounted && data && data.name) {
            setRoomName(data.name);
            // Store room data in localStorage
            localStorage.setItem('currentRoom', JSON.stringify({
              ...data,
              sessionToken // Store session token with room data
            }));
          }
        });

        setMembers([{
          id: userRef.current.uid,
          name: userRef.current.displayName,
          isOnline: true,
          isGuest: userRef.current.isGuest,
          isCreator: false
        }]);

        onMemberJoin((data) => {
          if (!mounted) return;
          if (data && data.member) {
            setMembers(prevMembers => {
              const memberExists = prevMembers.find(m => m.id === data.member.id);
              if (memberExists) {
                return prevMembers.map(m => m.id === data.member.id ? { ...m, ...data.member } : m);
              }
              return [...prevMembers, data.member];
            });
          }
        });

        onMemberLeave((data) => {
          if (!mounted) return;
          if (data && data.memberId) {
            setMembers(prevMembers => prevMembers.filter(m => m.id !== data.memberId));
          }
        });

        onMembersList((data) => {
          if (!mounted) return;
          if (data && Array.isArray(data.members)) {
            const updatedMembers = data.members.map(member => ({
              id: member.userId || member.id,
              name: member.name || member.displayName || 'Guest',
              isOnline: true,
              isGuest: member.role !== 'creator',
              isCreator: member.role === 'creator' || member.isCreator
            }));

            const selfIncluded = updatedMembers.some(m => m.id === userRef.current.uid);
            if (!selfIncluded) {
              updatedMembers.unshift({
                id: userRef.current.uid,
                name: userRef.current.displayName,
                isOnline: true,
                isGuest: userRef.current.isGuest,
                isCreator: false
              });
            }

            setMembers(updatedMembers);
            setLoading(false);
          }
        });

        onRoomError((error) => {
          console.error('Room error:', error);
          setError(error.message);
          setLoading(false);
        });

        const joined = joinRoomSocket(sessionToken, userRef.current);
        
        if (!joined) {
          throw new Error('Failed to join room');
        }

        setLoading(false);

      } catch (err) {
        console.error('Socket connection error:', err);
        if (mounted) {
          setError('Failed to connect to room. Please try again.');
          setLoading(false);
        }
      }
    };

    connectToRoom();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.off('room:info');
        leaveRoomSocket(sessionToken, userRef.current);
        disconnectSocket();
        socketRef.current = null;
      }
      // Only clear room data when actually leaving the room (handled in navigation)
      onMemberJoin(() => {});
      onMemberLeave(() => {});
      onMembersList(() => {});
      onRoomError(() => {});
    };
  }, [sessionToken, navigate]);

  // Handle leaving room and cleanup
  const handleLeaveRoom = () => {
    // Clear room data when actually leaving
    localStorage.removeItem('currentRoom');
    navigate('/dashboard');
  };

  const handleCopyRoomName = () => {
    if (!roomName) return;
    
    navigator.clipboard.writeText(roomName).then(() => {
      toast.success('Room name copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    }).catch(() => {
      toast.error('Failed to copy room name', {
        position: "top-right",
        autoClose: 2000,
      });
    });
  };

  const FeatureTab = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveFeature(id)}
      className={`flex items-center gap-3 w-full px-4 py-3 transition-all ${
        activeFeature === id
          ? 'bg-primary text-white'
          : 'text-gray-400 hover:text-primary hover:bg-primary/10'
      } rounded-lg`}
    >
      <Icon className="w-5 h-5" />
      <span>{label}</span>
    </button>
  );

  const renderMainContent = () => {
    switch (activeFeature) {
      case 'members':
        return <MembersList participants={members} currentUser={userRef.current} />;
      case 'code':
        return <CodeEditor roomId={sessionToken} socket={socket} />;
      case 'whiteboard':
        return <Whiteboard roomId={sessionToken} socket={socket} />;
      case 'meet':
        return <VideoMeet participants={members} currentUser={userRef.current} socket={socket} />;
      case 'files':
        return <FileUpload roomId={sessionToken} socket={socket} currentUser={userRef.current} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-primary animate-pulse">Loading room...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
      
      {/* Cosmic Background */}
      <div ref={starsContainerRef} className="fixed inset-0 pointer-events-none">
        {/* Stars and asteroids are added dynamically */}
      </div>

      {/* Room Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-black/50 backdrop-blur-sm border-b border-primary/10 flex items-center justify-between px-6 z-30">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary">
            Room Name: {roomName || 'Loading...'}
          </h1>
          {roomName && (
            <button
              onClick={handleCopyRoomName}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors"
            >
              <Copy size={16} />
              <span>Copy Room Name</span>
            </button>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-md transition-colors ${
              showChat ? 'bg-primary/20 text-primary' : 'text-primary/60 hover:text-primary hover:bg-primary/10'
            }`}
          >
            <MessageSquare size={20} />
          </button>
          <button
            onClick={handleLeaveRoom}
            className="p-2 text-primary/60 hover:text-primary transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-64px)] pt-16 relative">
        {/* Left Sidebar */}
        <div className="w-64 min-w-[256px] bg-black/50 backdrop-blur-sm border-r border-primary/10 relative z-10">
          <div className="p-4 space-y-2">
            <FeatureTab id="members" icon={Users} label={`Members (${members.length})`} />
            <FeatureTab id="code" icon={Code2} label="Code Editor" />
            <FeatureTab id="whiteboard" icon={PenTool} label="Whiteboard" />
            <FeatureTab id="meet" icon={Video} label="Meet" />
            <FeatureTab id="files" icon={Files} label="Files" />
          </div>
          {userRef.current && !userRef.current.isGuest && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this room?')) {
                  // TODO: Implement room deletion
                  navigate('/dashboard');
                }
              }}
              className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete Room
            </button>
          )}
        </div>

        {/* Main Content Wrapper */}
        <div className={`flex-1 relative transition-all duration-300 ${showChat ? 'mr-[320px]' : ''}`}>
          {/* Main Content Area */}
          <div className="absolute inset-0 overflow-auto">
            <div className="h-full w-full p-4 bg-black">
              {renderMainContent()}
            </div>
          </div>
        </div>

        {/* Chat Panel */}
        <div
          className={`fixed top-16 right-0 w-[320px] h-[calc(100vh-144px)] bg-black border-l border-primary/10 transform transition-transform duration-300 ease-in-out z-20 ${
            showChat ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="absolute inset-0 bg-black/95" />
          <div className="relative z-10 h-full">
            <ChatBox
              show={showChat}
              messages={messages}
              onClose={() => setShowChat(false)}
              roomId={sessionToken}
              socket={socket}
              currentUser={userRef.current}
            />
          </div>
        </div>

        {/* AI Assistant Button */}
        <button 
          onClick={() => setShowAI(!showAI)}
          className="fixed bottom-6 right-6 w-12 h-12 bg-primary text-black rounded-full flex items-center justify-center hover:bg-primary-light transition-colors shadow-lg z-50"
        >
          <Bot size={24} />
        </button>

        {/* AI Assistant Panel */}
        {showAI && (
          <div className="fixed right-6 bottom-24 w-[320px] h-[520px] bg-black/90 border border-primary/20 rounded-lg overflow-hidden shadow-xl backdrop-blur-md z-50">
            <AIAssistant 
              show={showAI}
              onClose={() => setShowAI(false)}
              roomId={sessionToken}
              socket={socket}
              currentUser={userRef.current}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default RoomPage;
