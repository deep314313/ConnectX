import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { handleGoogleLogin } from '../services/firebase';
import { toast } from 'react-toastify';
import axios from 'axios';
import { API_URL } from '../services/api';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

function LoginPage() {
  const navigate = useNavigate();
  const starsContainerRef = useRef(null);
  const [showGuestNames, setShowGuestNames] = useState(false);
  const [suggestedNames, setSuggestedNames] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch suggested names
  const fetchSuggestedNames = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API_URL}/auth/guest/suggest-names?count=5`);
      setSuggestedNames(response.data.suggestions);
      setSelectedName(''); // Clear selection when refreshing
    } catch (error) {
      console.error('Error fetching suggested names:', error);
      toast.error('Failed to fetch name suggestions');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const handleGuestAccess = async () => {
    if (!showGuestNames) {
      setShowGuestNames(true);
      setLoading(true);
      fetchSuggestedNames();
      return;
    }

    if (!selectedName) {
      toast.warn('Please select a name to continue');
      return;
    }

    try {
      // Check if name is still available
      const checkResponse = await axios.get(`${API_URL}/auth/guest/check-name?name=${selectedName}`);
      if (!checkResponse.data.isAvailable) {
        toast.error('This name is no longer available. Please choose another one.');
        await fetchSuggestedNames();
        return;
      }

      // Store guest info
      const guestInfo = {
        uid: `guest_${Date.now()}`,
        displayName: selectedName,
        isGuest: true
      };
      localStorage.setItem('guestId', guestInfo.uid);
      localStorage.setItem('user', JSON.stringify(guestInfo));

      // Show success message and redirect
      toast.success('Welcome! Redirecting to dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Error logging in as guest:', error);
      toast.error('Failed to log in. Please try again.');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await handleGoogleLogin();
      if (result && result.user) {
        // Remove guest data when logging in with Google
        localStorage.removeItem('guestRoomHistory');
        localStorage.removeItem('guestId');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error('Failed to log in with Google');
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
      {/* Cosmic Background */}
      <div ref={starsContainerRef} className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Stars and asteroids are added dynamically */}
        <div className="moon absolute right-20 top-20">
          <div className="absolute inset-0 rounded-full bg-gradient-to-b from-transparent to-black opacity-20"></div>
        </div>
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full space-y-8 p-8 bg-black bg-opacity-50 rounded-xl backdrop-blur-sm border border-primary/10">
          <div>
            <h2 className="text-center text-3xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
              Welcome to ConnectX
            </h2>
            <p className="mt-2 text-center text-gray-400">
              Choose how you want to continue
            </p>
          </div>

          <div className="space-y-4">
            {/* Google Login Button */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full bg-white text-gray-800 px-4 py-3 rounded-lg font-semibold transition-all hover:bg-gray-100 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </button>

            {/* Guest Access Section */}
            {showGuestNames ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Choose your guest name:</h3>
                  <button
                    onClick={fetchSuggestedNames}
                    disabled={refreshing}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Get new suggestions"
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-4">
                    <RefreshCw className="w-6 h-6 text-red-500 animate-spin" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {suggestedNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => setSelectedName(name)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                          selectedName === name
                            ? 'bg-red-500/10 border-red-500/50 text-red-500'
                            : 'bg-black/20 border-gray-700/50 text-gray-300 hover:bg-black/30'
                        }`}
                      >
                        <span className="font-medium">{name}</span>
                        {selectedName === name && <CheckCircle2 className="w-5 h-5" />}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleGuestAccess}
                  disabled={!selectedName}
                  className="w-full border-2 border-primary hover:bg-primary/10 text-white px-4 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue as Guest
                </button>
              </div>
            ) : (
              <button
                onClick={handleGuestAccess}
                className="w-full border-2 border-primary hover:bg-primary/10 text-white px-4 py-3 rounded-lg font-semibold transition-all"
              >
                Continue as Guest
              </button>
            )}
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/')}
              className="text-primary hover:text-primary-light text-sm font-medium"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
