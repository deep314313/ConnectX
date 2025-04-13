import React from 'react';
import { Copy, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RoomHistory = () => {
  const navigate = useNavigate();

  // Mock data - Replace with actual data from backend
  const recentRooms = [
    { id: 1, name: 'Team Alpha', passcode: '123456', lastJoined: '2024-03-10' },
    { id: 2, name: 'Project Beta', passcode: '789012', lastJoined: '2024-03-09' },
  ];

  const handleCopyPasscode = (passcode) => {
    navigator.clipboard.writeText(passcode);
    // TODO: Add toast notification
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Recent Rooms
        </h2>
        <button
          onClick={() => console.log('Clear history')}
          className="text-sm text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          <Trash2 className="w-4 h-4" />
          Clear History
        </button>
      </div>
      <div className="space-y-4">
        {recentRooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors"
          >
            <div>
              <h3 className="font-medium text-lg">{room.name}</h3>
              <p className="text-sm text-gray-400">Last joined: {room.lastJoined}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCopyPasscode(room.passcode)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Copy Passcode"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate(`/room/${room.id}`)}
                className="px-6 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 text-sm rounded-lg transition-colors font-medium"
              >
                Join Again
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RoomHistory;
