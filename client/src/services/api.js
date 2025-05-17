// Central API configuration file

// Use environment variables with fallbacks to hardcoded values
const API_URL = process.env.REACT_APP_API_URL ? `${process.env.REACT_APP_API_URL}/api` : 'https://connectx-4hgy.onrender.com/api';

// Base URL without /api suffix
const BASE_URL = process.env.REACT_APP_API_URL || 'https://connectx-4hgy.onrender.com';

// Export both constants
export { API_URL, BASE_URL };
