import React from 'react';
import { Copy, Trash2 } from 'lucide-react';

const CreatedRooms = () => {
  // Mock data - Replace with actual data from backend
  const createdRooms = [
    { id: 1, name: 'Frontend Team', passcode: '345678', active: true, participants: 4 },
    { id: 2, name: 'Backend Team', passcode: '901234', active: false, participants: 0 },
  ];

  const handleCopyPasscode = (passcode) => {
    navigator.clipboard.writeText(passcode);
    // TODO: Add toast notification
  };

  const handleDeleteRoom = (roomId) => {
    // TODO: Implement room deletion
    console.log('Deleting room:', roomId);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-black/30 backdrop-blur-md rounded-lg p-6 border border-red-500/30">
      <h2 className="text-2xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
        My Created Rooms
      </h2>
      <div className="space-y-4">
        {createdRooms.map((room) => (
          <div
            key={room.id}
            className="flex items-center justify-between p-4 bg-black/50 rounded-lg border border-red-500/20 hover:border-red-500/30 transition-colors"
          >
            <div>
              <h3 className="font-medium text-lg">{room.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={`w-2 h-2 rounded-full ${room.active ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-sm text-gray-400">
                  {room.active ? `${room.participants} participants active` : 'Room inactive'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleCopyPasscode(room.passcode)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Copy room passcode"
              >
                <Copy className="w-5 h-5" />
              </button>
              <button
                onClick={() => handleDeleteRoom(room.id)}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete room"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CreatedRooms;
