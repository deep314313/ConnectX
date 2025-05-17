const ChatMessage = require('../models/ChatMessage');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

// Cache for recent messages to reduce database load
const roomMessagesCache = new Map();
const MAX_CACHE_SIZE = 100; // Maximum number of messages to keep in memory per room

// Helper function to extract actual roomId from a JWT token or use as is
const extractRoomId = (roomId) => {
  // First check if roomId is a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(roomId)) {
    return roomId;
  }
  
  try {
    // Check if roomId is a JWT token
    const decoded = jwt.verify(roomId, process.env.JWT_SECRET);
    // console.log('[Chat] Decoded JWT roomId:', decoded.roomId);
    return decoded.roomId;
  } catch (err) {
    // Not a valid JWT or no JWT_SECRET, use as is
    // console.log('[Chat] Using roomId as is:', roomId);
    return roomId;
  }
};

const handleChatSocket = (io, socket) => {
  // Handle joining chat room
  socket.on('join-chat', async (roomId) => {
    try {
      console.log(`[Chat] User ${socket.id} joining chat for room ${roomId}`);
      
      // Extract actual roomId from JWT if needed
      const actualRoomId = extractRoomId(roomId);
      
      // Validate roomId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
        console.error('[Chat] Invalid room ID:', actualRoomId);
        socket.emit('chat:error', { message: 'Invalid room ID' });
        return;
      }
      
      const chatRoom = `chat-${actualRoomId}`;
      socket.join(chatRoom);
      
      // Initialize room messages cache if not exists
      if (!roomMessagesCache.has(actualRoomId)) {
        roomMessagesCache.set(actualRoomId, []);
        
        // Load recent messages from database
        const recentMessages = await ChatMessage.find({ 
          roomId: actualRoomId,
          isDeleted: false 
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
        
        // Store in cache (in chronological order)
        roomMessagesCache.set(actualRoomId, recentMessages.reverse());
        
        console.log(`[Chat] Loaded ${recentMessages.length} messages from database for room ${actualRoomId}`);
      }
      
      // Send existing messages to the joining user
      const messages = roomMessagesCache.get(actualRoomId) || [];
      socket.emit('chat:history', { messages });
      
      console.log(`[Chat] Sent ${messages.length} messages history to user ${socket.id}`);
    } catch (error) {
      console.error('[Chat] Error joining chat room:', error);
      socket.emit('chat:error', { message: 'Failed to join chat room' });
    }
  });

  // Handle new message
  socket.on('chat:send', async ({ roomId, message }) => {
    try {
      console.log(`[Chat] New message from user ${socket.id} for room ${roomId}`);
      
      // Extract actual roomId from JWT if needed
      const actualRoomId = extractRoomId(roomId);
      
      // Validate roomId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
        console.error('[Chat] Invalid room ID for message:', actualRoomId);
        socket.emit('chat:error', { message: 'Invalid room ID' });
        return;
      }
      
      const chatRoom = `chat-${actualRoomId}`;
      
      // Create message data
      const messageData = {
        roomId: actualRoomId,
        userId: message.userId || socket.userId,
        userName: message.user || socket.userName || 'Unknown User',
        text: message.text || '',
        timestamp: new Date()
      };
      
      // Save message to database
      const chatMessage = new ChatMessage(messageData);
      await chatMessage.save();
      
      // Add ID from database to message data
      messageData.id = chatMessage._id.toString();
      
      // Update cache
      const messagesCache = roomMessagesCache.get(actualRoomId) || [];
      messagesCache.push(messageData);
      
      // Trim cache if it gets too large
      if (messagesCache.length > MAX_CACHE_SIZE) {
        messagesCache.splice(0, messagesCache.length - MAX_CACHE_SIZE);
      }
      
      roomMessagesCache.set(actualRoomId, messagesCache);
      
      // Format message for clients
      const formattedMessage = {
        id: messageData.id,
        userId: messageData.userId,
        user: messageData.userName,
        text: messageData.text,
        timestamp: messageData.timestamp.toISOString()
      };
      
      // Broadcast to all users in the room including sender
      io.to(chatRoom).emit('chat:message', { message: formattedMessage });
      
      console.log(`[Chat] Message broadcast to room ${actualRoomId}`);
    } catch (error) {
      console.error('[Chat] Error sending message:', error);
      socket.emit('chat:error', { message: 'Failed to send message' });
    }
  });

  // Handle message deletion
  socket.on('chat:delete', async ({ roomId, messageId }) => {
    try {
      console.log(`[Chat] Delete message request for message ${messageId} in room ${roomId}`);
      
      // Extract actual roomId from JWT if needed
      const actualRoomId = extractRoomId(roomId);
      
      // Validate roomId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(actualRoomId) || !mongoose.Types.ObjectId.isValid(messageId)) {
        console.error('[Chat] Invalid ID for message deletion:', { roomId: actualRoomId, messageId });
        socket.emit('chat:error', { message: 'Invalid IDs' });
        return;
      }
      
      // Soft delete in database
      await ChatMessage.findByIdAndUpdate(messageId, { isDeleted: true });
      
      // Update cache
      const messagesCache = roomMessagesCache.get(actualRoomId) || [];
      const updatedCache = messagesCache.filter(msg => msg.id !== messageId);
      roomMessagesCache.set(actualRoomId, updatedCache);
      
      // Broadcast deletion to all users in the room
      io.to(`chat-${actualRoomId}`).emit('chat:deleted', { messageId });
      
      console.log(`[Chat] Message ${messageId} deleted and broadcast to room ${actualRoomId}`);
    } catch (error) {
      console.error('[Chat] Error deleting message:', error);
      socket.emit('chat:error', { message: 'Failed to delete message' });
    }
  });

  // Get more message history
  socket.on('chat:load-more', async ({ roomId, before }) => {
    try {
      console.log(`[Chat] Load more messages request for room ${roomId} before ${before}`);
      
      // Extract actual roomId from JWT if needed
      const actualRoomId = extractRoomId(roomId);
      
      // Validate roomId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
        console.error('[Chat] Invalid room ID for loading messages:', actualRoomId);
        socket.emit('chat:error', { message: 'Invalid room ID' });
        return;
      }
      
      // Convert to Date object if string
      const beforeDate = before ? new Date(before) : new Date();
      
      // Find older messages
      const olderMessages = await ChatMessage.find({
        roomId: actualRoomId,
        isDeleted: false,
        timestamp: { $lt: beforeDate }
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean();
      
      // Format messages for client
      const formattedMessages = olderMessages.map(msg => ({
        id: msg._id.toString(),
        userId: msg.userId,
        user: msg.userName,
        text: msg.text,
        timestamp: msg.timestamp.toISOString()
      }));
      
      // Send to requesting client only
      socket.emit('chat:more-history', { 
        messages: formattedMessages.reverse(),
        hasMore: formattedMessages.length === 20
      });
      
      console.log(`[Chat] Sent ${formattedMessages.length} more messages to user ${socket.id}`);
    } catch (error) {
      console.error('[Chat] Error loading more messages:', error);
      socket.emit('chat:error', { message: 'Failed to load more messages' });
    }
  });

  // Clean up when room is empty
  socket.on('room:leave', ({ roomId }) => {
    if (!roomId) return;
    
    console.log(`[Chat] User ${socket.id} leaving chat for room ${roomId}`);
    
    // Extract actual roomId from JWT if needed
    const actualRoomId = extractRoomId(roomId);
    
    const chatRoom = `chat-${actualRoomId}`;
    socket.leave(chatRoom);
    
    // Check if room is empty (keep cache for a while in case someone rejoins)
    const room = io.sockets.adapter.rooms.get(chatRoom);
    if (!room || room.size === 0) {
      console.log(`[Chat] Room ${actualRoomId} is empty, will clear cache soon`);
      
      // Set a timeout to clear cache after some time if no one rejoins
      setTimeout(() => {
        const roomStillEmpty = !io.sockets.adapter.rooms.get(chatRoom);
        if (roomStillEmpty) {
          console.log(`[Chat] Clearing cache for inactive room ${actualRoomId}`);
          roomMessagesCache.delete(actualRoomId);
        }
      }, 30 * 60 * 1000); // 30 minutes
    }
  });
};

module.exports = handleChatSocket;