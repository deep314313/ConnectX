import React from 'react';
import { Users } from 'lucide-react';

function MembersList({ participants }) {
  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
        Room Members
      </h2>
      <div className="space-y-4">
        {participants.map((participant) => (
          <div
            key={participant.id}
            className="flex items-center justify-between p-4 bg-black bg-opacity-30 rounded-lg border border-primary/5 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">
                  {participant.name}
                  {participant.isCreator && (
                    <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                      Creator
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      participant.isOnline ? 'bg-green-500' : 'bg-gray-500'
                    }`}
                  />
                  <span className="text-sm text-gray-400">
                    {participant.isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MembersList;
