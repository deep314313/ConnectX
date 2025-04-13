const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

// Check room name availability
router.get('/check/:name', roomController.checkRoomName);

// Room routes
router.post('/create', roomController.createRoom);
router.post('/join', roomController.joinRoom);
router.get('/user/:userId', roomController.getUserRooms);
router.delete('/:roomId', roomController.deleteRoom);

// Room history routes
router.get('/history/:userId', roomController.getRoomHistory);
router.delete('/history/:userId', roomController.clearRoomHistory);

module.exports = router;
