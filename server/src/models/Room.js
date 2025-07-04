const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const roomSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  passcode: {
    type: String,
    required: true,
    select: false // Don't include password in queries by default
  },
  creatorId: {
    type: String,
    required: true
  },
  creatorName: {
    type: String,
    required: true
  },
  members: [{
    userId: String,
    name: String,
    role: {
      type: String,
      enum: ['creator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
roomSchema.pre('save', async function(next) {
  if (this.isModified('passcode')) {
    this.passcode = await bcrypt.hash(this.passcode, 10);
  }
  next();
});

// Method to compare passcode
roomSchema.methods.comparePasscode = async function(candidatePasscode) {
  const room = await this.constructor.findById(this._id).select('+passcode');
  return bcrypt.compare(candidatePasscode, room.passcode);
};

module.exports = mongoose.model('Room', roomSchema);
