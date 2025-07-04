const GuestSession = require('../models/GuestSession');

// Check if guest name is available
exports.checkGuestName = async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }

    // Check in active guest sessions
    const existingGuest = await GuestSession.findOne({
      userName: name,
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Within last 24 hours
    });

    res.json({ isAvailable: !existingGuest });
  } catch (error) {
    console.error('Error checking guest name:', error);
    res.status(500).json({ message: 'Error checking guest name' });
  }
};

// Get suggested guest names
exports.getSuggestedGuestNames = async (req, res) => {
  try {
    const count = 3; // Fixed to 3 suggestions
    const adjectives = [
      // Colors
      'Azure', 'Crimson', 'Golden', 'Indigo', 'Jade', 'Mystic', 'Onyx', 'Pearl', 'Ruby', 'Silver',
      // Personality
      'Brave', 'Clever', 'Daring', 'Epic', 'Fierce', 'Gentle', 'Happy', 'Iconic', 'Jolly', 'Kind',
      // Nature
      'Arctic', 'Cosmic', 'Desert', 'Forest', 'Glacier', 'Harbor', 'Island', 'Jungle', 'Lunar', 'Marine',
      // Quality
      'Noble', 'Optimal', 'Prime', 'Quick', 'Radiant', 'Silent', 'Swift', 'Trendy', 'Unique', 'Vivid',
      // Elements
      'Blaze', 'Cloud', 'Dawn', 'Echo', 'Frost', 'Glow', 'Haze', 'Ice', 'Nova', 'Storm'
    ];

    const nouns = [
      // Mammals
      'Panda', 'Tiger', 'Lion', 'Wolf', 'Fox', 'Bear', 'Lynx', 'Deer', 'Koala', 'Jaguar',
      // Birds
      'Eagle', 'Falcon', 'Hawk', 'Owl', 'Phoenix', 'Raven', 'Swan', 'Crane', 'Dove', 'Heron',
      // Sea Life
      'Dolphin', 'Shark', 'Whale', 'Coral', 'Orca', 'Seal', 'Ray', 'Shell', 'Star', 'Tide',
      // Mythical
      'Dragon', 'Griffin', 'Hydra', 'Kirin', 'Sphinx', 'Titan', 'Unicorn', 'Wyrm', 'Yeti', 'Zeus',
      // Space
      'Comet', 'Galaxy', 'Nebula', 'Orbit', 'Pulsar', 'Quasar', 'Star', 'Venus', 'Vega', 'Moon'
    ];

    const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];
    const getRandomNumber = () => Math.floor(Math.random() * 9999) + 1; // Increased to 4 digits

    const suggestions = new Set();
    const maxAttempts = count * 3; // Try 3x more combinations to ensure we get enough unique names
    let attempts = 0;

    while (suggestions.size < count && attempts < maxAttempts) {
      const name = `${getRandomItem(adjectives)}${getRandomItem(nouns)}${String(getRandomNumber()).padStart(4, '0')}`;
      
      // Check if name is available before adding to suggestions
      const exists = await GuestSession.findOne({
        userName: name,
        lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      if (!exists) {
        suggestions.add(name);
      }
      attempts++;
    }

    res.json({ 
      suggestions: Array.from(suggestions),
      count: suggestions.size
    });
  } catch (error) {
    console.error('Error generating guest names:', error);
    res.status(500).json({ message: 'Error generating guest names' });
  }
};

// Create or update guest session
exports.createGuestSession = async (req, res) => {
  try {
    const { guestId, userName } = req.body;

    if (!guestId || !userName) {
      return res.status(400).json({ message: 'Guest ID and username are required' });
    }

    // Check if name is still available
    const existingName = await GuestSession.findOne({
      userName,
      lastActive: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      guestId: { $ne: guestId } // Exclude current guest's session
    });

    if (existingName) {
      return res.status(409).json({ message: 'This name is no longer available' });
    }

    // Create or update session
    const session = await GuestSession.findOneAndUpdate(
      { guestId },
      { 
        guestId,
        userName,
        lastActive: new Date()
      },
      { upsert: true, new: true }
    );

    res.json({ 
      success: true,
      session: {
        guestId: session.guestId,
        userName: session.userName,
        lastActive: session.lastActive
      }
    });
  } catch (error) {
    console.error('Error creating guest session:', error);
    res.status(500).json({ message: 'Error creating guest session' });
  }
};
