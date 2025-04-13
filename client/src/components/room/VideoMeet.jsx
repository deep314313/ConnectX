import React, { useState } from 'react';
import { Users, Mic, MicOff, Camera, CameraOff, Share2 } from 'lucide-react';

function VideoMeet({ participants }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
          Video Meeting
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg transition-colors ${
              isMuted
                ? 'bg-red-500/20 text-red-500'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setIsCameraOff(!isCameraOff)}
            className={`p-2 rounded-lg transition-colors ${
              isCameraOff
                ? 'bg-red-500/20 text-red-500'
                : 'text-gray-400 hover:text-primary hover:bg-primary/10'
            }`}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCameraOff ? (
              <CameraOff className="w-5 h-5" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>
          <button
            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            title="Share Screen"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="aspect-video bg-black bg-opacity-30 rounded-lg border border-primary/10 relative overflow-hidden group"
          >
            {/* Video placeholder */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-10 h-10 text-primary" />
              </div>
            </div>
            {/* Participant info overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1">
                  <span className="text-sm font-medium">{participant.name}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        participant.isOnline ? 'bg-green-500' : 'bg-gray-500'
                      }`}
                    />
                    <span className="text-xs text-gray-400">
                      {participant.isOnline ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default VideoMeet;
