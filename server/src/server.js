const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const initializeSocket = require('./socket');
const path = require('path');
const fs = require('fs');

// Import routes
const roomRoutes = require('./routes/roomRoutes');
const fileRoutes = require('./routes/fileRoutes');

// Load environment variables
dotenv.config();

// Ensure uploads directory exists
const setupUploadsDirectory = () => {
  try {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      console.log('Creating uploads directory...');
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Test write permissions
    const testFilePath = path.join(uploadDir, 'test.txt');
    fs.writeFileSync(testFilePath, 'Test write permissions');
    fs.unlinkSync(testFilePath);
    
    console.log('Uploads directory setup complete and writable');
  } catch (error) {
    console.error('Error setting up uploads directory:', error);
    throw error;
  }
};

// Initialize Express app
const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://connectx-client.vercel.app', 'https://connectx-client.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());

// Initialize Socket.io
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'https://connectx-client.vercel.app', 'https://connectx-client.netlify.app'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Connect to MongoDB and initialize socket
const startServer = async () => {
  try {
    // Setup uploads directory
    setupUploadsDirectory();
    
    // Connect to MongoDB
    await connectDB();
    console.log('MongoDB connected successfully');

    // Initialize socket handlers
    initializeSocket(io);
    console.log('Socket.io handlers initialized');

    // Routes
    app.get('/', (req, res) => {
      res.json({ message: 'ConnectX Server is running' });
    });

    // API routes
    app.use('/api/rooms', roomRoutes);
    app.use('/api/files', fileRoutes);

    // Simple OPTIONS response for preflight requests
    app.options('*', (req, res) => {
      res.status(200).end();
    });

    // Uploads directory for static file access
    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error(err.stack);
      res.status(500).json({ message: 'Something went wrong!' });
    });

    // Force use of port 5000 only
    const PORT = 5000;
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer(); 