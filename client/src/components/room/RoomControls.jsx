import React from 'react';
import { Settings, Link, MessageSquare, LogOut } from 'lucide-react';

function RoomControls({ roomName, isCreator, showChat, onToggleChat, onLeaveRoom }) {
  const handleCopyInviteLink = () => {
    // TODO: Implement invite link copying
    const inviteLink = `${window.location.origin}/join/${roomName}`;
    navigator.clipboard.writeText(inviteLink);
  };

  const handleOpenSettings = () => {
    // TODO: Implement settings modal
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-20 bg-black bg-opacity-50 backdrop-blur-sm border-b border-primary/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-red-500 to-primary-light bg-clip-text text-transparent">
              {roomName}
            </h1>
            <button
              onClick={handleCopyInviteLink}
              className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary text-sm rounded-lg hover:bg-primary/20 transition-colors"
            >
              <Link className="w-4 h-4" />
              Copy Invite Link
            </button>
          </div>
          <div className="flex items-center gap-4">
            {isCreator && (
              <button
                onClick={handleOpenSettings}
                className="p-2 text-gray-400 hover:text-primary transition-colors"
                title="Room Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onToggleChat}
              className={`p-2 transition-colors ${
                showChat ? 'text-primary' : 'text-gray-400 hover:text-primary'
              }`}
              title="Toggle Chat"
            >
              <MessageSquare className="w-5 h-5" />
            </button>
            <button
              onClick={onLeaveRoom}
              className="flex items-center gap-2 px-3 py-1.5 text-red-500 text-sm rounded-lg hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Leave Room
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default RoomControls;
