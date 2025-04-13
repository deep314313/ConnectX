const mongoose = require('mongoose');

const roomHistorySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  roomName: {
    type: String,
    required: true
  },
  passcode: {
    type: String,
    required: true
  },
  lastJoined: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient querying
roomHistorySchema.index({ userId: 1, lastJoined: -1 });

module.exports = mongoose.model('RoomHistory', roomHistorySchema); 