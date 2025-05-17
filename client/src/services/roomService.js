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
    // Get user info from localStorage if available
    const user = JSON.parse(localStorage.getItem('user'));
    const userId = user?.uid || null;
    const userName = user?.displayName || null;

    const response = await axios.post(`${API_URL}/rooms/join`, {
      name: roomName,  // Changed from roomName to name
      passcode,
      userId,
      userName
    });
    
    // Response includes sessionToken for secure room access
    return response.data;
  } catch (error) {
    throw error.response?.data || error.message;
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