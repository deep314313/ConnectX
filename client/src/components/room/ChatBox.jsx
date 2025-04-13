import React, { useState } from 'react';
import { Users, X, Maximize2, Minimize2, Share2 } from 'lucide-react';

function ChatBox({ show, messages, onClose }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    // TODO: Implement message sending
    setNewMessage('');
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full bg-black bg-opacity-50 backdrop-blur-sm border-l border-primary/10 transition-all ${
        show ? 'translate-x-0' : 'translate-x-full'
      } ${isExpanded ? 'w-96' : 'w-80'}`}
    >
      <div className="flex items-center justify-between p-4 border-b border-primary/10">
        <h2 className="text-lg font-semibold">Group Chat</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-primary transition-colors"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="h-[calc(100vh-8rem)] overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <span className="font-medium text-sm">{message.user}</span>
                <span className="text-xs text-gray-400 ml-2">{message.timestamp}</span>
              </div>
            </div>
            <p className="text-sm text-gray-300 ml-10">{message.text}</p>
          </div>
        ))}
      </div>
      <form
        onSubmit={handleSendMessage}
        className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary/10"
      >
        <div className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full bg-black bg-opacity-50 border border-primary/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-primary pr-10"
          />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary hover:text-primary-light transition-colors"
            title="Send Message"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export default ChatBox;
