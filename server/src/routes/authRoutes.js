const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Guest name routes
router.get('/guest/check-name', authController.checkGuestName);
router.get('/guest/suggest-names', authController.getSuggestedGuestNames);
router.post('/guest/session', authController.createGuestSession);

module.exports = router;
