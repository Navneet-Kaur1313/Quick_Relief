const express = require('express');
const connectDB = require('./config/db');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

// Initialize Express
const app = express();

// Connect Database
connectDB();

// Initialize middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Define Routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/disasters', require('./routes/api/disasters'));
app.use('/api/resources', require('./routes/api/resources'));
app.use('/api/alerts', require('./routes/api/alerts'));
app.use('/api/reports', require('./routes/api/reports'));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Set up Socket.io connection
io.on('connection', (socket) => {
  console.log('New client connected');
  
  // Join specific disaster room for real-time updates
  socket.on('joinDisaster', (disasterId) => {
    socket.join(`disaster_${disasterId}`);
  });
  
  // Join role-based room for targeted alerts
  socket.on('joinRole', (role) => {
    socket.join(`role_${role}`);
  });
  
  // Handle location updates from rescue teams
  socket.on('updateLocation', (data) => {
    io.to(`disaster_${data.disasterId}`).emit('locationUpdated', data);
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
