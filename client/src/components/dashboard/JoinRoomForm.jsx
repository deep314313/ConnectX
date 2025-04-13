import React, { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { joinRoom } from '../../services/roomService';

const JoinRoomForm = () => {
  const navigate = useNavigate();
  const [showPasscode, setShowPasscode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinRoomData, setJoinRoomData] = useState({
    name: '',
    passcode: ''
  });

  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await joinRoom(joinRoomData.name, joinRoomData.passcode);
      
      // Store room data in localStorage
      localStorage.setItem('currentRoom', JSON.stringify({
        name: joinRoomData.name,
        sessionToken: response.sessionToken
      }));
      
      // Navigate to room using session token
      navigate(`/room/session/${response.sessionToken}`);
    } catch (err) {
      setError(err.message || 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
        Join Room
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleJoinRoom} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Room Name
          </label>
          <input
            type="text"
            value={joinRoomData.name}
            onChange={(e) => setJoinRoomData({ ...joinRoomData, name: e.target.value })}
            className="w-full bg-black/50 border border-red-500/30 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-primary"
            placeholder="Enter room name"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Passcode
          </label>
          <div className="relative">
            <input
              type={showPasscode ? 'text' : 'password'}
              value={joinRoomData.passcode}
              onChange={(e) => setJoinRoomData({ ...joinRoomData, passcode: e.target.value })}
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
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium text-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="animate-spin">⌛</span>
          ) : (
            <Key className="w-4 h-4" />
          )}
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
      </form>
    </div>
  );
};

export default JoinRoomForm;
