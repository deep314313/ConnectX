const ChatMessage = require('../models/ChatMessage');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const redisClient = require('../utils/redisClient');

console.log('ChatSocket module loaded!'); // New log

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

// Helper function to get messages from Redis
async function getMessagesFromRedis(roomId) {
  console.log('\n=== REDIS GET MESSAGES ===');
  console.log(`Attempting to get messages from Redis for room: ${roomId}`);
  try {
    const cachedMessages = await redisClient.lRange(`room:${roomId}:messages`, 0, -1);
    console.log(`✅ Found ${cachedMessages.length} messages in Redis cache`);
    return cachedMessages.map(msg => JSON.parse(msg));
  } catch (error) {
    console.error('❌ Redis get messages error:', error);
    return [];
  }
}

// Helper function to save message to Redis
async function saveMessageToRedis(roomId, messageData) {
  console.log('\n=== REDIS SAVE MESSAGE ===');
  console.log(`Attempting to save message to Redis for room: ${roomId}`);
  try {
    await redisClient.lPush(`room:${roomId}:messages`, JSON.stringify(messageData));
    const currentSize = await redisClient.lLen(`room:${roomId}:messages`);
    console.log(`✅ Message saved to Redis. Current cache size: ${currentSize}`);
    
    // Trim if needed
    if (currentSize > MAX_CACHE_SIZE) {
      await redisClient.lTrim(`room:${roomId}:messages`, 0, MAX_CACHE_SIZE - 1);
      console.log(`✂️ Cache trimmed to ${MAX_CACHE_SIZE} messages`);
    }
  } catch (error) {
    console.error('❌ Redis save message error:', error);
  }
}

// Helper function to delete message from Redis
async function deleteMessageFromRedis(roomId, messageId) {
  try {
    let messages = await redisClient.lRange(`room:${roomId}:messages`, 0, -1);
    const originalLength = messages.length;
    messages = messages.filter(msg => JSON.parse(msg).id !== messageId);
    await redisClient.del(`room:${roomId}:messages`);
    if (messages.length) {
      await redisClient.rPush(`room:${roomId}:messages`, ...messages);
    }
    console.log(`[Redis Cache] Deleted message ${messageId} from room ${roomId}. Messages before: ${originalLength}, after: ${messages.length}`);
  } catch (error) {
    console.error('[Redis Cache] Error deleting message from Redis:', error);
  }
}

const handleChatSocket = (io, socket) => {
  console.log(`\n👤 New socket connection: ${socket.id}`);

  // Handle joining chat room
  socket.on('join-chat', async (roomId) => {
    console.log('\n=== USER JOINING CHAT ===');
    console.log(`Socket ${socket.id} joining room ${roomId}`);
    
    try {
      const actualRoomId = extractRoomId(roomId);
      
      // Join the socket room for this chat
      socket.join(`chat-${actualRoomId}`);
      console.log(`Socket ${socket.id} joined room chat-${actualRoomId}`);
      
      // Try Redis first
      let messages = await getMessagesFromRedis(actualRoomId);
      
      if (!messages || messages.length === 0) {
        console.log('🔄 No Redis cache found, fetching from MongoDB...');
        const recentMessages = await ChatMessage.find({ 
          roomId: actualRoomId,
          isDeleted: false 
        })
        .sort({ timestamp: -1 })
        .limit(50)
        .lean();
        
        messages = recentMessages.reverse();
        console.log(`📥 Loaded ${messages.length} messages from MongoDB`);
        
        // Save to Redis
        for (const msg of messages) {
          await saveMessageToRedis(actualRoomId, msg);
        }
      }
      
      socket.emit('chat:history', { messages });
      console.log(`✅ Sent ${messages.length} messages to client`);
      
    } catch (error) {
      console.error('❌ Error in join-chat:', error);
      socket.emit('chat:error', { message: 'Failed to join chat room' });
    }
  });

  // Handle new message
  socket.on('chat:send', async ({ roomId, message }) => {
    console.log('\n=== NEW MESSAGE RECEIVED ===');
    console.log(`From socket ${socket.id} in room ${roomId}`);
    
    try {
      const actualRoomId = extractRoomId(roomId);
      const messageData = {
        roomId: actualRoomId,
        userId: message.userId || socket.userId,
        userName: message.user || socket.userName || 'Unknown User',
        text: message.text || '',
        timestamp: new Date()
      };
      
      // Save to MongoDB
      const chatMessage = new ChatMessage(messageData);
      await chatMessage.save();
      messageData.id = chatMessage._id.toString();
      
      // Save to Redis
      await saveMessageToRedis(actualRoomId, messageData);
      
      // Broadcast
      io.to(`chat-${actualRoomId}`).emit('chat:message', { 
        message: {
          id: messageData.id,
          userId: messageData.userId,
          user: messageData.userName,
          text: messageData.text,
          timestamp: messageData.timestamp.toISOString()
        }
      });
      
      console.log('✅ Message processed and broadcast successfully');
      
    } catch (error) {
      console.error('❌ Error in chat:send:', error);
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
      
      // Remove from Redis
      await deleteMessageFromRedis(actualRoomId, messageId);
      
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