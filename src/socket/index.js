import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    socket.on('subscribe:barber', (barberId) => {
      if (!barberId) return;
      socket.join(`barber:${barberId}`);
    });

    socket.on('unsubscribe:barber', (barberId) => {
      if (!barberId) return;
      socket.leave(`barber:${barberId}`);
    });
  });

  return io;
};

export const getIO = () => io;

export const emitBarberUpdate = (barberId, payload = {}) => {
  if (!io || !barberId) return;
  io.to(`barber:${barberId}`).emit('barber:data-updated', {
    barberId: String(barberId),
    timestamp: Date.now(),
    ...payload,
  });
};
