import React, { useState, useEffect, useRef } from 'react';
import { Users, X, Maximize2, Minimize2, Share2, Clock, ChevronUp } from 'lucide-react';
import { sendChatMessage, onChatMessage } from '../../services/socket';

function ChatBox({ show, messages = [], onClose, roomId, socket, currentUser }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Initialize with messages prop or empty array
  useEffect(() => {
    if (messages && messages.length > 0) {
      setChatMessages(messages);
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && !isLoading) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, isLoading]);

  // Handle chat history when joining a room
  useEffect(() => {
    if (!socket || !roomId) return;

    // console.log('[ChatBox] Joining chat room:', roomId);
    // Join the chat room with the same roomId used for other socket events
    socket.emit('join-chat', roomId);

    const handleChatHistory = (data) => {
      // console.log('[ChatBox] Received chat history:', data);
      if (data && Array.isArray(data.messages)) {
        setChatMessages(data.messages.map(msg => ({
          id: msg.id || msg._id,
          userId: msg.userId,
          user: msg.user || msg.userName,
          text: msg.text || msg.content,
          timestamp: msg.timestamp,
          isMe: msg.userId === currentUser?.uid
        })));
        setHasMoreMessages(data.messages.length >= 20);
      }
    };

    const handleMoreHistory = (data) => {
      // console.log('[ChatBox] Received more history:', data);
      if (data && Array.isArray(data.messages)) {
        setChatMessages(prev => [
          ...data.messages.map(msg => ({
            id: msg.id || msg._id,
            userId: msg.userId,
            user: msg.user || msg.userName,
            text: msg.text || msg.content,
            timestamp: msg.timestamp,
            isMe: msg.userId === currentUser?.uid
          })),
          ...prev
        ]);
        setHasMoreMessages(data.hasMore);
      }
      setIsLoading(false);
    };

    socket.on('chat:history', handleChatHistory);
    socket.on('chat:more-history', handleMoreHistory);
    socket.on('chat:error', (error) => {
      console.error('[ChatBox] Chat error:', error);
      setIsLoading(false);
    });

    return () => {
      socket.off('chat:history', handleChatHistory);
      socket.off('chat:more-history', handleMoreHistory);
      socket.off('chat:error');
    };
  }, [socket, roomId, currentUser?.uid]);

  // Listen for incoming messages from socket
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (data) => {
      if (data && data.message) {
        const isMine = data.message.userId === currentUser?.uid;
        const newMsg = {
          id: data.message.id,
          userId: data.message.userId,
          user: data.message.user,
          text: data.message.text,
          timestamp: data.message.timestamp,
          isMe: isMine
        };
        
        // Check if the message already exists to prevent duplicates
        setChatMessages(prev => {
          // For own messages, replace any temporary version
          if (isMine) {
            // Look for a temporary message with the same text
            const tempMessageIndex = prev.findIndex(msg => 
              msg.isSending && msg.isMe && msg.text === newMsg.text
            );
            
            // If found, replace it
            if (tempMessageIndex !== -1) {
              const updatedMessages = [...prev];
              updatedMessages[tempMessageIndex] = newMsg;
              return updatedMessages;
            }
          }
          
          // Check if message already exists (by id or same content from same user)
          const messageExists = prev.some(msg => 
            (msg.id === newMsg.id) || 
            (msg.userId === newMsg.userId && msg.text === newMsg.text && 
             Math.abs(new Date(msg.timestamp) - new Date(newMsg.timestamp)) < 5000)
          );
          
          // Only add if it doesn't exist
          return messageExists ? prev : [...prev, newMsg];
        });
      }
    };

    const handleDeletedMessage = (data) => {
      if (data && data.messageId) {
        setChatMessages(prev => prev.filter(msg => msg.id !== data.messageId));
      }
    };

    onChatMessage(handleNewMessage);
    socket.on('chat:deleted', handleDeletedMessage);

    return () => {
      // Cleanup will be handled by the socket service
      socket.off('chat:deleted', handleDeletedMessage);
    };
  }, [socket, currentUser]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !roomId) return;
    
    const messageData = {
      text: newMessage,
      user: currentUser?.displayName || 'You',
      userId: currentUser?.uid,
      timestamp: new Date().toISOString()
    };
    
    // Add message to local state immediately for UI responsiveness
    const tempId = `temp-${Date.now()}`;
    setChatMessages(prev => [...prev, {
      id: tempId,
      userId: currentUser?.uid,
      user: currentUser?.displayName || 'You',
      text: newMessage,
      timestamp: new Date().toISOString(),
      isMe: true,
      isSending: true
    }]);
    
    // Send message through socket
    sendChatMessage(roomId, messageData);
    
    // Clear input
    setNewMessage('');
  };

  // Load more messages
  const loadMoreMessages = () => {
    if (!socket || !roomId || isLoading || !hasMoreMessages) return;
    
    setIsLoading(true);
    
    const oldestMessage = chatMessages[0];
    if (oldestMessage && oldestMessage.timestamp) {
      // console.log('[ChatBox] Loading more messages before:', oldestMessage.timestamp);
      socket.emit('chat:load-more', { 
        roomId,
        before: oldestMessage.timestamp
      });
    } else {
      setIsLoading(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (err) {
      console.error('[ChatBox] Error formatting time:', err);
      return timestamp;
    }
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
      <div ref={messagesContainerRef} className="h-[calc(100vh-8rem)] overflow-y-auto p-4 space-y-4">
        {hasMoreMessages && (
          <div className="text-center">
            <button 
              onClick={loadMoreMessages}
              disabled={isLoading}
              className={`px-3 py-1 text-xs rounded-full ${
                isLoading ? 'bg-primary/20 text-gray-400' : 'bg-primary/30 hover:bg-primary/40 text-white'
              } transition-colors flex items-center justify-center mx-auto gap-1`}
            >
              {isLoading ? (
                <>
                  <Clock className="w-3 h-3 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <ChevronUp className="w-3 h-3" />
                  Load earlier messages
                </>
              )}
            </button>
          </div>
        )}
        
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-400 mt-10">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          chatMessages.map((message) => (
            <div 
              key={message.id} 
              className={`space-y-1 ${message.isMe ? 'ml-auto max-w-[90%] text-right' : ''}`}
            >
              <div className={`flex items-center gap-2 ${message.isMe ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full ${message.isMe ? 'bg-primary' : 'bg-primary/20'} flex items-center justify-center`}>
                  <Users className={`w-4 h-4 ${message.isMe ? 'text-black' : 'text-primary'}`} />
                </div>
                <div className={message.isMe ? 'text-right' : ''}>
                  <span className="font-medium text-sm">{message.isMe ? 'You' : message.user}</span>
                  <span className="text-xs text-gray-400 ml-2">{formatTime(message.timestamp)}</span>
                </div>
              </div>
              <p className={`text-sm ${message.isMe ? 'text-right mr-10 text-white' : 'text-gray-300 ml-10'} ${message.isSending ? 'opacity-70' : ''}`}>
                {message.text}
                {message.isSending && <span className="text-xs text-gray-400 ml-2">Sending...</span>}
              </p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
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
            disabled={!newMessage.trim() || !socket}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 ${
              !newMessage.trim() || !socket 
                ? 'text-gray-500 cursor-not-allowed' 
                : 'text-primary hover:text-primary-light cursor-pointer'
            } transition-colors`}
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