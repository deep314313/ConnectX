import axios from 'axios';
import { API_URL } from './api';

// Create a new room
export const createRoom = async (roomData) => {
  try {
    const response = await axios.post(`${API_URL}/rooms/create`, roomData);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Join a room
export const joinRoom = async (roomName, passcode) => {
  try {
    // Get user info from localStorage
    const user = JSON.parse(localStorage.getItem('user'));
    let guestId = localStorage.getItem('guestId');
    
    // Generate and store guest ID if not exists
    if (!user && !guestId) {
      guestId = `guest_${Date.now()}`;
      localStorage.setItem('guestId', guestId);
    }

    const userId = user?.uid || guestId;
    const userName = user?.displayName || `Guest_${Date.now().toString().slice(-6)}`;

    const response = await axios.post(`${API_URL}/rooms/join`, {
      name: roomName,
      passcode,
      userId,
      userName
    });

    // If guest user, update local history
    if (!user) {
      try {
        // Get existing history
        let guestHistory = [];
        try {
          guestHistory = JSON.parse(localStorage.getItem('guestRoomHistory') || '[]');
        } catch (e) {
          console.error('Error parsing guest history:', e);
          guestHistory = [];
        }

        // Remove existing entry if present
        guestHistory = guestHistory.filter(room => room.name !== roomName);

        // Add new entry at the start
        guestHistory.unshift({
          _id: Date.now().toString(),
          name: roomName,
          lastJoined: new Date().toISOString(),
          creatorName: response.data.room.creatorName
        });

        // Keep only last 5 rooms
        if (guestHistory.length > 5) {
          guestHistory = guestHistory.slice(0, 5);
        }

        // Save back to localStorage
        localStorage.setItem('guestRoomHistory', JSON.stringify(guestHistory));
        console.log('Updated guest history:', guestHistory);

      } catch (storageError) {
        console.error('Error updating guest history:', storageError);
        // Don't throw error - allow join to succeed even if history fails
      }
    }

    return response.data;
  } catch (error) {
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Failed to join room. Please try again.');
  }
};

// Get rooms created by user
export const getUserRooms = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/rooms/user/${userId}`);
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Delete a room
export const deleteRoom = async (roomId) => {
  try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (!user) throw new Error('User not authenticated');

    await axios.delete(`${API_URL}/rooms/${roomId}`, {
      data: { userId: user.uid }
    });
  } catch (error) {
    throw error.response?.data || error.message;
  }
};

// Clear guest session
export const clearGuestSession = () => {
  localStorage.removeItem('guestId');
}; 