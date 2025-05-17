const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
    index: true
  },
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimetype: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  uploadedBy: {
    userId: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    }
  },
  path: {
    type: String,
    required: true
  },
  // Cloudinary specific fields
  cloudinaryId: {
    type: String
  },
  cloudinaryUrl: {
    type: String
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient queries
fileSchema.index({ roomId: 1, uploadedAt: -1 });

module.exports = mongoose.model('File', fileSchema);
