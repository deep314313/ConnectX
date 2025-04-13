import React, { useState, useCallback } from 'react';
import { Wand2, Eye, EyeOff, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createRoomSocket, onRoomCreated, onRoomError, initializeSocket } from '../../services/socket';

const CreateRoomForm = () => {
  const [roomName, setRoomName] = useState('');
  const [passcode, setPasscode] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const setupSocketListeners = useCallback((socket) => {
    return new Promise((resolve) => {
      // Remove any existing listeners first
      onRoomCreated(() => {});
      onRoomError(() => {});

      // Set up new listeners
      onRoomCreated((room) => {
        console.log('Room created successfully:', room);
        setIsLoading(false);
        if (room && room.id) {
          navigate(`/room/${room.id}`);
        } else {
          setError('Invalid room data received');
        }
      });

      onRoomError((error) => {
        console.error('Room creation error:', error);
        setIsLoading(false);
        setError(error.message || 'Failed to create room');
      });

      // Give a small delay to ensure listeners are set up
      setTimeout(resolve, 100);
    });
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Get user from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      if (!user) {
        throw new Error('User not found. Please log in again.');
      }

      // Use user's ID as a temporary token for socket connection
      const tempToken = user.uid || user.id;
      if (!tempToken) {
        throw new Error('Invalid user data. Please log in again.');
      }

      // Initialize socket connection with user ID
      const socket = await initializeSocket(tempToken);
      
      // Wait for socket to be fully connected
      if (!socket.connected) {
        throw new Error('Failed to connect to server');
      }

      // Set up event listeners and wait for them to be ready
      await setupSocketListeners(socket);

      // Create room data
      const roomData = {
        name: roomName,
        passcode,
        creatorId: user.uid || user.id,
        creatorName: user.displayName || user.name || 'Anonymous'
      };

      console.log('Emitting room creation event with data:', roomData);
      
      // Emit create room event
      createRoomSocket(roomData);
    } catch (err) {
      console.error('Room creation error:', err);
      setError(err.message || 'Failed to connect to server');
      setIsLoading(false);
    }
  };

  const generateRandomRoomName = () => {
    const adjectives = [
      'Cosmic', 'Stellar', 'Galactic', 'Nebula', 'Solar',
      'Masti', 'Desi', 'Jugaad', 'Masala', 'Dhamaka',
      'Zabardast', 'Toofani', 'Bindaas', 'Chatpata', 'Jhakkas',
      'Cyber', 'Digital', 'Tech', 'Code', 'Mega'
    ];
    const nouns = [
      'Hub', 'Station', 'Port', 'Base', 'Nexus',
      'Adda', 'Dhaba', 'Chakkar', 'Mahal', 'Dukan',
      'Mehfil', 'Darbar', 'Haveli', 'Kutir', 'Bhavan',
      'Zone', 'Space', 'Spot', 'Point', 'Lab'
    ];
    const random = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const newName = `${random(adjectives)}${random(nouns)}${Math.floor(Math.random() * 1000)}`;
    setRoomName(newName);
  };

  const generatePasscode = () => {
    setPasscode(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
        Create New Room
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Room Name
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full bg-black/50 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary"
                placeholder="Enter room name"
                required
              />
            </div>
            <button
              type="button"
              onClick={generateRandomRoomName}
              className="px-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition-all flex items-center gap-2"
              title="Generate random room name"
            >
              <Wand2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Passcode
          </label>
          <div className="relative">
            <input
              type={showPasscode ? 'text' : 'password'}
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-black/50 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary pr-10"
              placeholder="Enter passcode"
              required
            />
            <button
              type="button"
              onClick={() => setShowPasscode(!showPasscode)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-500"
            >
              {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="button"
            onClick={generatePasscode}
            className="mt-2 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg transition-all text-sm"
          >
            Generate Passcode
          </button>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="animate-spin">⌛</span>
          ) : (
            <Plus className="w-4 h-4" />
          )}
          {isLoading ? 'Creating...' : 'Create Room'}
        </button>
      </form>
    </div>
  );
};

export default CreateRoomForm;
