import React, { useState } from 'react';
import { Eye, EyeOff, Key } from 'lucide-react';

const JoinRoomForm = () => {
  const [showPasscode, setShowPasscode] = useState(false);
  const [joinRoom, setJoinRoom] = useState({
    name: '',
    passcode: ''
  });

  const handleJoinRoom = (e) => {
    e.preventDefault();
    // TODO: Implement room joining
    console.log('Joining room:', joinRoom);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
        Join Room
      </h2>
      <form onSubmit={handleJoinRoom} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Room Name
          </label>
          <input
            type="text"
            value={joinRoom.name}
            onChange={(e) => setJoinRoom({ ...joinRoom, name: e.target.value })}
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
              value={joinRoom.passcode}
              onChange={(e) => setJoinRoom({ ...joinRoom, passcode: e.target.value })}
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
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-lg transition-all duration-200 font-medium text-lg flex items-center justify-center gap-2"
        >
          <Key className="w-4 h-4" />
          Join Room
        </button>
      </form>
    </div>
  );
};

export default JoinRoomForm;
