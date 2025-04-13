import React, { useEffect, useRef } from 'react';
import { Code2, Users, Video, MessageSquare, Share2, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

function HomePage() {
  const starsContainerRef = useRef(null);
  const navigate = useNavigate();

  // Check authentication status
  const isGuest = Boolean(localStorage.getItem('guestId'));
  const googleUser = JSON.parse(localStorage.getItem('user'));
  const isAuthenticated = isGuest || Boolean(googleUser);

  const generateGuestId = () => {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `guest_${timestamp}_${randomStr}`;
  };

  const handleGuestAccess = () => {
    const guestId = generateGuestId();
    localStorage.setItem('guestId', guestId);
    navigate('/dashboard');
  };

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
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

    // Create asteroids with improved animations
    for (let i = 0; i < asteroidCount; i++) {
      const asteroid = document.createElement('div');
      asteroid.className = 'asteroid';
      
      // Random starting position
      asteroid.style.left = `${Math.random() * 100}%`;
      asteroid.style.top = `${Math.random() * 100}%`;
      
      // Random animation
      const animations = ['moveAsteroid1', 'moveAsteroid2', 'moveAsteroid3', 'moveAsteroid4'];
      const randomAnimation = animations[Math.floor(Math.random() * animations.length)];
      
      // Random duration and delay
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-secondary-dark to-black text-white overflow-hidden">
      <Navbar />
      {/* Cosmic Background */}
      <div ref={starsContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Stars and asteroids are added dynamically */}
        <div className="moon absolute right-20 top-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black opacity-20"></div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/10"></div>
        <div className="container mx-auto px-4 py-20 relative">
          <div className="text-center mb-16 pt-16">
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
              ConnectX
            </h1>
            <p className="text-xl text-gray-300 mb-8">
              Real-time collaboration platform for teams who want to build faster, together.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button 
                onClick={handleGetStarted}
                className="w-64 sm:w-auto bg-primary hover:bg-primary-dark text-white px-8 py-3 rounded-lg font-semibold transition-all"
              >
                {isAuthenticated ? 'Go to Dashboard' : 'Get Started'}
              </button>
              {!isAuthenticated && (
                <button 
                  onClick={handleGuestAccess}
                  className="w-64 sm:w-auto border-2 border-primary hover:bg-primary/10 text-white px-8 py-3 rounded-lg font-semibold transition-all"
                >
                  Continue as Guest
                </button>
              )}
            </div>
            {!isAuthenticated && (
              <p className="mt-4 text-sm text-gray-400">
                Guest access generates a unique ID for temporary collaboration
              </p>
            )}
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-20">
            <FeatureCard
              icon={<Code2 className="w-8 h-8 text-primary" />}
              title="Real-time Code Editor"
              description="Collaborative coding with syntax highlighting and live updates."
            />
            <FeatureCard
              icon={<Users className="w-8 h-8 text-primary-light" />}
              title="Interactive Whiteboard"
              description="Visual collaboration with real-time drawing and diagramming tools."
            />
            <FeatureCard
              icon={<Video className="w-8 h-8 text-primary" />}
              title="Video Conferencing"
              description="Crystal-clear video calls with screen sharing capabilities."
            />
            <FeatureCard
              icon={<MessageSquare className="w-8 h-8 text-primary-light" />}
              title="Group Chat"
              description="Instant messaging with emoji support and file sharing."
            />
            <FeatureCard
              icon={<Share2 className="w-8 h-8 text-primary" />}
              title="File Sharing"
              description="Seamless file uploads and downloads for your team."
            />
            <FeatureCard
              icon={<Bot className="w-8 h-8 text-primary-light" />}
              title="AI Assistant"
              description="Smart coding companion to help with code suggestions, debugging, and best practices."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black bg-opacity-50 py-12 mt-20 relative">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-xl font-bold mb-4">ConnectX</h3>
              <p className="text-gray-400">
                Building the future of remote collaboration.
              </p>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="/about" className="hover:text-primary">About</a></li>
                <li><a href="/features" className="hover:text-primary">Features</a></li>
                <li><a href="/login" className="hover:text-primary">Login</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-bold mb-4">Contact</h3>
              <ul className="space-y-2 text-gray-400">
                <li>support@connectx.com</li>
                <li>+1 (555) 123-4567</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 ConnectX. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="bg-black bg-opacity-50 p-6 rounded-xl hover:bg-opacity-70 transition-all backdrop-blur-sm border border-primary/10">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

export default HomePage;