const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const guestSessionSchema = new mongoose.Schema({
  guestId: {
    type: String,
    required: true,
    index: true
  },
  rooms: [{
    roomId: mongoose.Schema.Types.ObjectId,
    roomName: String,
    passcode: {
      type: String,
      set: function(passcode) {
        if (passcode && !passcode.startsWith('$2')) {
          return bcrypt.hashSync(passcode, 10);
        }
        return passcode;
      }
    },
    creatorName: String,
    joinedAt: Date
  }],
  lastActive: {
    type: Date,
    default: Date.now
  }
});

// Auto-delete sessions older than 24 hours
guestSessionSchema.index({ lastActive: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('GuestSession', guestSessionSchema); 