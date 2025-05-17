const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const Room = require('../models/Room');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const compression = require('compression');
const { cloudinary, upload } = require('../config/cloudinary');

// Apply compression middleware
router.use(compression());

// Helper to extract room ID from JWT token if needed
const extractRoomId = (roomId) => {
  // First check if the roomId is a valid MongoDB ObjectId
  if (mongoose.Types.ObjectId.isValid(roomId)) {
    return roomId;
  }
  
  try {
    // Check if roomId is a JWT token by its structure (has 3 parts separated by periods)
    if (roomId.split('.').length === 3) {
      // Manually decode the JWT payload (middle part)
      const payload = JSON.parse(Buffer.from(roomId.split('.')[1], 'base64').toString());
      // console.log('Decoded JWT token payload:', payload);
      
      if (payload && payload.roomId) {
        if (mongoose.Types.ObjectId.isValid(payload.roomId)) {
          // console.log(`Extracted roomId ${payload.roomId} from JWT token`);
          return payload.roomId;
        } else {
          console.error('roomId in JWT token is not a valid ObjectId:', payload.roomId);
        }
      } else {
        console.error('JWT token payload does not contain roomId:', payload);
      }
    }
    
    // Also try the standard JWT verify method as fallback
    const decoded = jwt.verify(roomId, process.env.JWT_SECRET);
    // console.log('Decoded JWT token using verify:', decoded);
    
    if (decoded && decoded.roomId) {
      if (mongoose.Types.ObjectId.isValid(decoded.roomId)) {
        return decoded.roomId;
      } else {
        console.error('Decoded roomId is not a valid ObjectId:', decoded.roomId);
      }
    } else {
      console.error('JWT token did not contain roomId field:', decoded);
    }
  } catch (err) {
    console.log('Failed to extract roomId from token:', err.message);
  }
  
  // Return the original if we couldn't extract a valid roomId
  return roomId;
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'File API is working' });
});

// Upload a file
router.post('/:roomId/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Extract room ID from token if needed
    const actualRoomId = extractRoomId(req.params.roomId);
    
    // Final check that we have a valid room ID
    if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
      return res.status(400).json({ message: 'Invalid room ID format' });
    }

    // Check if room exists
    const room = await Room.findById(actualRoomId);
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Debug logging
    console.log('Cloudinary upload result:', req.file);
    
    // Extract file info correctly from Cloudinary response
    let cloudinaryId = null;
    let cloudinaryUrl = null;
    
    if (req.file.path && req.file.path.includes('cloudinary')) {
      // This is a Cloudinary response
      cloudinaryUrl = req.file.path;
      
      // Extract the public_id from the URL
      // The path typically looks like: https://res.cloudinary.com/cloud-name/image/upload/v1683112233/connectx/abcd1234.pdf
      try {
        const urlParts = req.file.path.split('/');
        // The public ID is typically the folder + filename (after v1234567890/)
        // Find the index of upload or version number part
        const versionIndex = urlParts.findIndex(part => part.startsWith('v') && /v\d+/.test(part));
        if (versionIndex >= 0 && versionIndex < urlParts.length - 1) {
          cloudinaryId = urlParts.slice(versionIndex + 1).join('/');
          console.log('Extracted Cloudinary ID:', cloudinaryId);
        }
      } catch (err) {
        console.error('Error extracting Cloudinary ID:', err);
      }
    }
    
    // Fallback to public_id if available
    if (!cloudinaryId && req.file.public_id) {
      cloudinaryId = req.file.public_id;
    }
    
    // Fallback to filename if public_id not available
    if (!cloudinaryId && req.file.filename) {
      cloudinaryId = req.file.filename;
    }
    
    // Create file record with Cloudinary data
    const file = new File({
      roomId: actualRoomId,
      filename: req.file.filename || req.file.originalname,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size || req.file.bytes || 0,
      uploadedBy: {
        userId: req.body.userId || 'anonymous',
        name: req.body.userName || 'Anonymous'
      },
      path: req.file.path,
      cloudinaryId: cloudinaryId,
      cloudinaryUrl: cloudinaryUrl || req.file.secure_url || req.file.path
    });

    await file.save();
    
    console.log('Saved file with Cloudinary info:', {
      cloudinaryId: file.cloudinaryId,
      cloudinaryUrl: file.cloudinaryUrl
    });

    // Return the file with URL information
    res.status(201).json({
      file: {
        id: file._id,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        url: file.cloudinaryUrl || file.path
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file', error: error.message });
  }
});

// Get all files for a room
router.get('/:roomId', async (req, res) => {
  try {
    // Extract the actual room ID from the JWT token if needed
    const actualRoomId = extractRoomId(req.params.roomId);
    console.log(`Getting files for room: ${actualRoomId}`);
    
    // Check if roomId is valid
    if (!mongoose.Types.ObjectId.isValid(actualRoomId)) {
      return res.status(400).json({ message: 'Invalid room ID' });
    }

    // Find all non-deleted files for this room
    const files = await File.find({
      roomId: actualRoomId,
      isDeleted: false
    }).sort({ uploadedAt: -1 });

    // Format response to exclude sensitive info
    const formattedFiles = files.map(file => {
      // Ensure we have a valid URL - prefer cloudinaryUrl, but fallback to path or downloadUrl
      const fileUrl = file.cloudinaryUrl || 
                      (file.path && file.path.startsWith('http') ? file.path : null) ||
                      `/api/files/${actualRoomId}/download/${file._id}`;
      
      // Log the URL for debugging
      console.log(`File ${file._id} URL: ${fileUrl}`);
      
      return {
        id: file._id,
        originalName: file.originalName,
        mimetype: file.mimetype,
        size: file.size,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        url: fileUrl,
        cloudinaryId: file.cloudinaryId
      };
    });

    res.json({ files: formattedFiles });
  } catch (error) {
    console.error('Error getting files:', error);
    res.status(500).json({ message: 'Error getting files', error: error.message });
  }
});

// Download a file - Uses direct download approach for PDFs
router.get('/:roomId/download/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    // Extract the actual room ID from the JWT token if needed
    const actualRoomId = extractRoomId(req.params.roomId);
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(actualRoomId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Find the file
    const file = await File.findOne({
      _id: fileId,
      roomId: actualRoomId,
      isDeleted: false
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    console.log(`Downloading file: ${file.originalName}`);

    // For PDF files, handle it specially to force download
    if (file.mimetype === 'application/pdf' && file.cloudinaryUrl) {
      // This is a two-step process: fetch the file, then send it as an attachment
      const axios = require('axios');
      
      try {
        // Get the file from Cloudinary
        const response = await axios({
          method: 'GET',
          url: file.cloudinaryUrl,
          responseType: 'arraybuffer' // Important for binary data like PDFs
        });
        
        // Set Content-Type and Content-Disposition headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
        
        // Send the file data
        return res.send(Buffer.from(response.data));
      } catch (error) {
        console.error('Error fetching PDF from Cloudinary:', error);
        // Fall back to regular redirect if this fails
      }
    }
    
    // For non-PDFs, use regular redirect
    if (file.cloudinaryUrl) {
      console.log(`Redirecting to: ${file.cloudinaryUrl}`);
      return res.redirect(file.cloudinaryUrl);
    } else if (file.path && fs.existsSync(file.path)) {
      console.log(`Serving local file: ${file.path}`);
      return res.download(file.path, file.originalName);
    } else {
      return res.status(404).json({ message: 'File content not available' });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Error downloading file', error: error.message });
  }
});

// Delete a file (soft delete)
router.delete('/:roomId/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    // Extract the actual room ID from the JWT token if needed
    const actualRoomId = extractRoomId(req.params.roomId);
    
    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(actualRoomId) || !mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ message: 'Invalid ID format' });
    }

    // Find the file
    const file = await File.findOne({
      _id: fileId,
      roomId: actualRoomId,
      isDeleted: false
    });

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    // Mark as deleted
    file.isDeleted = true;
    await file.save();

    // Also delete from Cloudinary if we have an ID
    if (file.cloudinaryId) {
      try {
        await cloudinary.uploader.destroy(file.cloudinaryId);
        console.log(`Deleted file from Cloudinary: ${file.cloudinaryId}`);
      } catch (cloudinaryError) {
        console.error('Error deleting from Cloudinary:', cloudinaryError);
        // Continue anyway since we've marked it as deleted in our DB
      }
    }

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file', error: error.message });
  }
});

module.exports = router;
