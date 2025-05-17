/**
 * Helper function to decode JWT token and extract roomId
 * @param {string} jwtToken - The JWT token containing the roomId
 * @returns {string} The actual room ID (ObjectId)
 */
export function getActualRoomIdFromJWT(jwtToken) {
  try {
    if (!jwtToken || typeof jwtToken !== 'string' || !jwtToken.includes('.')) {
      return jwtToken;
    }
    
    const payload = JSON.parse(atob(jwtToken.split('.')[1]));
    return payload.roomId || jwtToken;
  } catch (err) {
    return jwtToken;
  }
} 