const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let _io;

function initSocket(httpServer) {
  _io = new Server(httpServer, {
    cors: {
      origin: (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()),
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Authenticate every socket connection with JWT
  _io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('No token'));
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  _io.on('connection', (socket) => {
    const { id: userId, role, name } = socket.data.user;
    logger.info(`Socket connected: ${name} (${role}) — ${socket.id}`);

    // Join a room per role so we can target broadcasts
    socket.join(`role:${role}`);
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${name} — ${socket.id}`);
    });
  });

  logger.info('Socket.io initialized');
  return _io;
}

/**
 * Emit an event to all connected clients.
 * @param {string} event  e.g. 'order:updated', 'filament:updated'
 * @param {any}    data
 */
function broadcast(event, data) {
  if (!_io) return;
  _io.emit(event, data);
}

/**
 * Emit to a specific role room only.
 */
function broadcastToRole(role, event, data) {
  if (!_io) return;
  _io.to(`role:${role}`).emit(event, data);
}

/**
 * Emit to a specific user socket.
 */
function broadcastToUser(userId, event, data) {
  if (!_io) return;
  _io.to(`user:${userId}`).emit(event, data);
}

function getIo() { return _io; }

module.exports = { initSocket, broadcast, broadcastToRole, broadcastToUser, getIo };
