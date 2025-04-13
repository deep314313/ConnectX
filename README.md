# ConnectX

A collaborative coding platform with real-time features including code editing, whiteboarding, video conferencing, and more.

## Features

- Real-time code collaboration
- Interactive whiteboard
- Video conferencing
- File sharing
- AI-powered assistance
- Chat functionality
- Room management

## Project Structure

```
connectx/
├── client/                 # React frontend
└── server/                 # Express backend
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   npm run install-all
   ```
3. Set up environment variables:
   - Create `.env` files in both client and server directories
   - Add necessary configuration (see example.env files)

4. Start the development servers:
   ```bash
   npm start
   ```

## Technologies Used

- Frontend: React, Tailwind CSS, Socket.io Client
- Backend: Node.js, Express, Socket.io, MongoDB
- Authentication: Firebase
- Real-time Features: WebRTC, Socket.io

## Contributing

Please read CONTRIBUTING.md for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the ISC License. 