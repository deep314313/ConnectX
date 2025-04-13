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
  Link,
  MessageSquare,
  Trash2,
} from 'lucide-react';

// Import room components
import ChatBox from '../components/room/ChatBox';
import CodeEditor from '../components/room/CodeEditor';
import Whiteboard from '../components/room/Whiteboard';
import VideoMeet from '../components/room/VideoMeet';
import MembersList from '../components/room/MembersList';
import FileUpload from '../components/room/FileUpload';
import AIAssistant from '../components/room/AIAssistant';
import RoomControls from '../components/room/RoomControls';

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const starsContainerRef = useRef(null);
  const [activeFeature, setActiveFeature] = useState('members');
  const [showChat, setShowChat] = useState(true);
  const [isCreator] = useState(true); // TODO: Replace with actual check

  // Mock data - Replace with actual data
  const roomData = {
    name: 'Project Alpha',
    participants: [
      { id: 1, name: 'John Doe', isOnline: true, isCreator: true },
      { id: 2, name: 'Jane Smith', isOnline: true },
      { id: 3, name: 'Mike Johnson', isOnline: false },
    ],
    messages: [
      { id: 1, user: 'John Doe', text: 'Hello team!', timestamp: '10:30 AM' },
      { id: 2, user: 'Jane Smith', text: 'Hi John!', timestamp: '10:31 AM' },
    ],
    files: [
      { id: 1, name: 'document.pdf', type: 'pdf', size: '2.5MB', uploadedBy: 'John Doe' },
      { id: 2, name: 'image.png', type: 'image', size: '1.8MB', uploadedBy: 'Jane Smith' },
    ],
  };

  useEffect(() => {
    if (!starsContainerRef.current) return;

    // Create stars and asteroids
    const container = starsContainerRef.current;
    const starCount = 100;
    const asteroidCount = 20;

    // Clear any existing elements
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    // Create stars
    for (let i = 0; i < starCount; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.width = `${Math.random() * 3}px`;
      star.style.height = star.style.width;
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 2}s`;
      container.appendChild(star);
    }

    // Create asteroids
    for (let i = 0; i < asteroidCount; i++) {
      const asteroid = document.createElement('div');
      asteroid.className = 'asteroid';
      asteroid.style.left = `${Math.random() * 100}%`;
      asteroid.style.top = `${Math.random() * 100}%`;
      const animations = ['moveAsteroid1', 'moveAsteroid2', 'moveAsteroid3', 'moveAsteroid4'];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      const duration = 15 + Math.random() * 20;
      const delay = Math.random() * 10;
      asteroid.style.animation = `${randomAnimation} ${duration}s linear ${delay}s infinite`;
      container.appendChild(asteroid);
    }

    return () => {
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
    };
  }, []);

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
        return <MembersList participants={roomData.participants} />;
      case 'code':
        return <CodeEditor />;
      case 'whiteboard':
        return <Whiteboard />;
      case 'meet':
        return <VideoMeet participants={roomData.participants} />;
      case 'files':
        return <FileUpload files={roomData.files} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Cosmic Background */}
      <div ref={starsContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Stars and asteroids are added dynamically */}
      </div>

      {/* Room Header */}
      <RoomControls
        roomName={roomData.name}
        isCreator={isCreator}
        showChat={showChat}
        onToggleChat={() => setShowChat(!showChat)}
        onLeaveRoom={() => navigate('/dashboard')}
      />

      <div className="flex h-[calc(100vh-64px)] pt-16 relative">
        {/* Left Sidebar - Fixed width, no shrinking */}
        <div className="w-64 min-w-[256px] bg-black/50 backdrop-blur-sm border-r border-primary/10 relative z-10">
          <div className="p-4 space-y-2">
            <FeatureTab id="members" icon={Users} label="Members" />
            <FeatureTab id="code" icon={Code2} label="Code Editor" />
            <FeatureTab id="whiteboard" icon={PenTool} label="Whiteboard" />
            <FeatureTab id="meet" icon={Video} label="Meet" />
            <FeatureTab id="files" icon={Files} label="Files" />
          </div>
          {isCreator && (
            <button
              onClick={() => {/* Delete room */}}
              className="absolute bottom-4 left-4 right-4 flex items-center justify-center gap-2 px-4 py-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-5 h-5" />
              Delete Room
            </button>
          )}
        </div>

        {/* Main Content Wrapper - This will handle the margin for chat */}
        <div className={`flex-1 relative transition-all duration-300 ${showChat ? 'mr-[320px]' : ''}`}>
          {/* Main Content Area - Full height and width of available space */}
          <div className="absolute inset-0 overflow-auto">
            <div className="h-full w-full p-4 bg-black">
              {renderMainContent()}
            </div>
          </div>
        </div>

        {/* Chat Panel - Higher z-index and proper backdrop */}
        <div
          className={`fixed top-16 right-0 w-[320px] h-[calc(100vh-144px)] bg-black border-l border-primary/10 transform transition-transform duration-300 ease-in-out z-20 ${
            showChat ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="absolute inset-0 bg-black/95" />
          <div className="relative z-10 h-full">
            <ChatBox
              show={showChat}
              messages={roomData.messages}
              onClose={() => setShowChat(false)}
            />
          </div>
        </div>

        {/* AI Assistant - Highest z-index */}
        <div className="fixed bottom-0 right-0 left-0 h-20 z-30">
          <AIAssistant />
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
