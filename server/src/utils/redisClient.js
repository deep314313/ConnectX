require('dotenv').config();
const redis = require('redis');

console.log('Attempting to connect to Redis with URL:', process.env.REDIS_URL);

const redisClient = redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      console.log(`Retrying Redis connection... Attempt ${retries}`);
      return Math.min(retries * 100, 3000);
    }
  }
});

redisClient.on('error', (err) => {
  console.error('Redis Client Error:', err);
  console.log('Current REDIS_URL:', process.env.REDIS_URL);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connected!');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready!');
});

(async () => {
  try {
    await redisClient.connect();
    console.log('Connected to Redis Cloud!');
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
  }
})();

module.exports = redisClient; 