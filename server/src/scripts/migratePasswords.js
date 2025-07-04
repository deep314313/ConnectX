const mongoose = require('mongoose');
const Room = require('../models/Room');
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all rooms with passwords
    const rooms = await Room.find().select('+passcode');
    console.log(`Found ${rooms.length} rooms to migrate`);

    // Update each room's password
    for (const room of rooms) {
      const hashedPasscode = await bcrypt.hash(room.passcode, 10);
      await Room.findByIdAndUpdate(room._id, { passcode: hashedPasscode });
      console.log(`Migrated room: ${room.name}`);
    }

    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migratePasswords(); 