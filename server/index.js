const http = require('http');
const {Server} = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const Redis = require('ioredis');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const walletRoutes = require('./routes/walletRoutes');
const assetRoutes = require('./routes/assetRoutes');
const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'FracEx API running' });
});

app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/assets', assetRoutes);

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }, // tighten this later once the client exists
});

const pubClient = new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
const subClient = pubClient.duplicate();
io.adapter(createAdapter(pubClient, subClient));
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    socket.userId = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', (socket) => {
  if (socket.userId) {
    socket.join(socket.userId);
    console.log(`User ${socket.userId} connected via socket`);
  }

  socket.on('disconnect', () => {
    if (socket.userId) {
      console.log(`User ${socket.userId} disconnected`);
    }
  });
});

// Change your existing app.listen(...) to:
httpServer.listen(process.env.PORT, () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

