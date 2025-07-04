// Central API configuration file

// Use environment variables with fallbacks to hardcoded values
//const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://connectx-4hgy.onrender.com/api';

// // Base URL without /api suffix
//const BASE_URL = process.env.REACT_APP_API_URL || 'https://connectx-4hgy.onrender.com';
const API_URL = 'http://localhost:5000/api';
const BASE_URL = 'http://localhost:5000';
// Export both constants
export { API_URL, BASE_URL };
