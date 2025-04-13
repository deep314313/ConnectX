import React, { useState, useEffect, useCallback } from 'react';
import { Wand2, Eye, EyeOff, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createRoom } from '../../services/roomService';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const CreateRoomForm = () => {
  const navigate = useNavigate();
  const [showPasscode, setShowPasscode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');
  const [newRoom, setNewRoom] = useState({
    name: '',
    passcode: ''
  });

  // Debounced room name check
  const checkRoomName = useCallback(async (name) => {
    if (!name) return;
    
    setIsChecking(true);
    setError('');
    
    try {
      const response = await axios.get(`${API_URL}/rooms/check/${name}`);
      if (!response.data.available) {
        setError('Room name already taken');
      }
    } catch (err) {
      console.error('Error checking room name:', err);
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Debounce room name check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (newRoom.name) {
        checkRoomName(newRoom.name);
      }
    }, 500); // Wait 500ms after last keystroke

    return () => clearTimeout(timer);
  }, [newRoom.name, checkRoomName]);

  const handleRoomNameChange = (e) => {
    const value = e.target.value;
    setNewRoom({ ...newRoom, name: value });
    setError(''); // Clear error when typing
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
    setNewRoom({ ...newRoom, name: newName });
    checkRoomName(newName);
  };

  const generatePasscode = () => {
    setNewRoom({
      ...newRoom,
      passcode: Math.random().toString(36).substring(2, 8).toUpperCase()
    });
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    
    // Don't submit if there's an error or if still checking
    if (error || isChecking) {
      return;
    }

    setIsLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user'));
      
      const roomData = {
        ...newRoom,
        creatorId: user.uid,
        creatorName: user.displayName
      };

      const response = await createRoom(roomData);
      navigate(`/room/session/${response.sessionToken}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
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
      <form onSubmit={handleCreateRoom} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Room Name
          </label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newRoom.name}
                onChange={handleRoomNameChange}
                className={`w-full bg-black/50 border ${error ? 'border-red-500' : 'border-red-500/30'} rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary`}
                placeholder="Enter room name"
                required
              />
              {isChecking && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  Checking...
                </span>
              )}
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
              value={newRoom.passcode}
              onChange={(e) => setNewRoom({ ...newRoom, passcode: e.target.value })}
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
