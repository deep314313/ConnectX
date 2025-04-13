import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Plus, Users, History, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

// Import components
import CreateRoomForm from '../components/dashboard/CreateRoomForm';
import JoinRoomForm from '../components/dashboard/JoinRoomForm';
import RoomHistory from '../components/dashboard/RoomHistory';
import CreatedRooms from '../components/dashboard/CreatedRooms';

function DashboardPage() {
  const navigate = useNavigate();
  const starsContainerRef = useRef(null);
  const [activeTab, setActiveTab] = useState('join');
  
  // Check authentication status
  const isGuest = Boolean(localStorage.getItem('guestId'));
  const googleUser = JSON.parse(localStorage.getItem('user'));
  const isAuthenticated = isGuest || Boolean(googleUser);
  
  // Set username based on auth type
  const username = isGuest 
    ? `Guest_${localStorage.getItem('guestId').slice(-6)}`
    : googleUser?.displayName || 'User';

  // Authentication check
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // Tab management for guest users
  useEffect(() => {
    if (isGuest && (activeTab === 'create' || activeTab === 'myRooms')) {
      setActiveTab('join');
    }
  }, [isGuest, activeTab]);

  // Stars and asteroids background effect
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

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('guestId');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // If not authenticated, don't render the dashboard
  if (!isAuthenticated) {
    return null;
  }

  const TabButton = ({ id, icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-lg transition-all ${
        activeTab === id 
          ? 'bg-white/10 text-white' 
          : 'text-gray-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'create':
        return !isGuest ? <CreateRoomForm /> : null;
      case 'join':
        return <JoinRoomForm />;
      case 'history':
        return <RoomHistory />;
      case 'myRooms':
        return !isGuest ? <CreatedRooms /> : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Cosmic background */}
      <div ref={starsContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/5 via-black to-black" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-20 bg-black/50 backdrop-blur-sm border-b border-primary/10">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent hover:opacity-80 transition-opacity"
            >
              ConnectX Dashboard
            </motion.button>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-primary">{username}</span>
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-primary transition-colors"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 py-8 pt-24">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {!isGuest && (
            <TabButton
              id="create"
              icon={<Plus className="w-5 h-5" />}
              label="Create Room"
            />
          )}
          <TabButton
            id="join"
            icon={<Users className="w-5 h-5" />}
            label="Join Room"
          />
          <TabButton
            id="history"
            icon={<History className="w-5 h-5" />}
            label="Recent Rooms"
          />
          {!isGuest && (
            <TabButton
              id="myRooms"
              icon={<Settings className="w-5 h-5" />}
              label="My Rooms"
            />
          )}
        </div>

        {/* Content Area */}
        <div className="bg-black/50 rounded-xl p-8 backdrop-blur-sm border border-white/10">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
