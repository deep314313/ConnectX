const Room = require('../models/Room');
const RoomHistory = require('../models/RoomHistory');
const jwt = require('jsonwebtoken');

// Generate session token
const generateSessionToken = (roomId, userId, role) => {
  return jwt.sign(
    { roomId, userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { name, passcode, creatorId, creatorName } = req.body;

    // Check if room name already exists
    const existingRoom = await Room.findOne({ name });
    if (existingRoom) {
      return res.status(400).json({ 
        message: 'Room name already taken',
        creator: existingRoom.creatorName 
      });
    }

    // Create new room
    const room = new Room({
      name,
      passcode,
      creatorId,
      creatorName,
      members: [{
        userId: creatorId,
        name: creatorName,
        role: 'creator'
      }]
    });

    await room.save();

    // Add to room history
    await RoomHistory.create({
      userId: creatorId,
      roomId: room._id,
      roomName: room.name,
      passcode: room.passcode
    });

    // Generate session token
    const sessionToken = generateSessionToken(room._id, creatorId, 'creator');

    res.status(201).json({
      message: 'Room created successfully',
      sessionToken,
      room: {
        id: room._id,
        name: room.name,
        creatorName: room.creatorName
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ message: 'Error creating room' });
  }
};

// Join a room
exports.joinRoom = async (req, res) => {
  try {
    const { name, passcode } = req.body;
    const userId = req.body.userId || `guest_${Date.now()}`;
    const userName = req.body.userName || `Guest_${Date.now().toString().slice(-6)}`;

    // Find and validate room
    const room = await Room.findOne({ name });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.passcode !== passcode) {
      return res.status(401).json({ message: 'Invalid passcode' });
    }

    // Check if user is already a member
    const existingMember = room.members.find(m => m.userId === userId);
    if (!existingMember) {
      room.members.push({
        userId,
        name: userName,
        role: 'member'
      });
      await room.save();
    }

    // Add or update room history
    await RoomHistory.findOneAndUpdate(
      { userId, roomId: room._id },
      {
        userId,
        roomId: room._id,
        roomName: room.name,
        passcode: room.passcode,
        lastJoined: new Date()
      },
      { upsert: true }
    );

    // Generate session token
    const sessionToken = generateSessionToken(room._id, userId, 'member');

    res.json({
      message: 'Joined room successfully',
      sessionToken,
      room: {
        id: room._id,
        name: room.name,
        creatorName: room.creatorName
      }
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({ message: 'Error joining room' });
  }
};

// Get user's room history
exports.getRoomHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const history = await RoomHistory.find({ userId })
      .sort({ lastJoined: -1 })
      .limit(5);

    res.json(history);
  } catch (error) {
    console.error('Error fetching room history:', error);
    res.status(500).json({ message: 'Error fetching room history' });
  }
};

// Clear user's room history
exports.clearRoomHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    await RoomHistory.deleteMany({ userId });
    res.json({ message: 'Room history cleared successfully' });
  } catch (error) {
    console.error('Error clearing room history:', error);
    res.status(500).json({ message: 'Error clearing room history' });
  }
};

// Get rooms created by user
exports.getUserRooms = async (req, res) => {
  try {
    const { userId } = req.params;
    const rooms = await Room.find({ creatorId: userId });
    
    res.json(rooms.map(room => ({
      id: room._id,
      name: room.name,
      passcode: room.passcode,
      creatorName: room.creatorName,
      memberCount: room.members.length,
      createdAt: room.createdAt
    })));
  } catch (error) {
    console.error('Error fetching user rooms:', error);
    res.status(500).json({ message: 'Error fetching rooms' });
  }
};

// Delete a room
exports.deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { userId } = req.body;

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    if (room.creatorId !== userId) {
      return res.status(403).json({ message: 'Not authorized to delete this room' });
    }

    await Room.findByIdAndDelete(roomId);
    // Also delete from history
    await RoomHistory.deleteMany({ roomId });
    
    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({ message: 'Error deleting room' });
  }
};

// Check if room name is available
exports.checkRoomName = async (req, res) => {
  try {
    const { name } = req.params;
    const existingRoom = await Room.findOne({ name });
    
    if (existingRoom) {
      return res.status(200).json({ 
        available: false,
        message: 'Room name already taken'
      });
    }

    res.status(200).json({ 
      available: true,
      message: 'Room name is available'
    });
  } catch (error) {
    console.error('Error checking room name:', error);
    res.status(500).json({ message: 'Error checking room name' });
  }
};
