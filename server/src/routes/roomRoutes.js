const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');
const rateLimit = require('express-rate-limit');

// Rate limiter for join attempts - more lenient now
const joinRoomLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit
  message: { message: 'Too many join attempts, please try again later' },
  skipFailedRequests: true // Don't count failed attempts
});

// Check room name availability
router.get('/check/:name', roomController.checkRoomName);

// Room routes
router.post('/create', roomController.createRoom);
router.post('/join', joinRoomLimiter, roomController.joinRoom);
router.get('/user/:userId', roomController.getUserRooms);
router.delete('/:roomId', roomController.deleteRoom);

// Room history routes
router.get('/history/:userId', roomController.getRoomHistory);
router.delete('/history/:userId', roomController.clearRoomHistory);

module.exports = router;
