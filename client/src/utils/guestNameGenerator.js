const adjectives = [
  'Swift', 'Bright', 'Clever', 'Dynamic', 'Epic', 'Fancy', 'Gentle', 'Happy',
  'Iconic', 'Jolly', 'Kind', 'Lively', 'Mighty', 'Noble', 'Optimal', 'Peaceful',
  'Quick', 'Radiant', 'Smart', 'Trendy', 'Unique', 'Vibrant', 'Wise', 'Zealous'
];

const nouns = [
  'Panda', 'Tiger', 'Eagle', 'Dolphin', 'Phoenix', 'Dragon', 'Lion', 'Wolf',
  'Falcon', 'Hawk', 'Jaguar', 'Koala', 'Lynx', 'Owl', 'Penguin', 'Rabbit',
  'Shark', 'Turtle', 'Unicorn', 'Whale', 'Zebra', 'Bear', 'Fox', 'Deer'
];

// Generate a random number between min and max (inclusive)
const getRandomNumber = (min, max) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Get a random item from an array
const getRandomItem = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generate a unique guest name
export const generateGuestName = () => {
  const adjective = getRandomItem(adjectives);
  const noun = getRandomItem(nouns);
  const number = getRandomNumber(1, 999);
  
  return `${adjective}${noun}${number}`;
};

// Generate multiple unique guest names
export const generateUniqueGuestNames = (count = 5) => {
  const names = new Set();
  
  while (names.size < count) {
    names.add(generateGuestName());
  }
  
  return Array.from(names);
}; 