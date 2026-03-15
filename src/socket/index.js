import { Server } from 'socket.io';

let io;

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || 'https://stylevault.site';

function extractHostnameFromOrigin(value) {
  try {
    return new URL(String(value || '').trim()).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isSocketOriginAllowed(origin) {
  // allow non-browser or same-origin (no origin)
  if (!origin) return true;
  const hostname = extractHostnameFromOrigin(origin);
  if (!hostname) return true;

  function getBaseDomain(hostname) {
    if (!hostname) return '';
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
      return hostname;
    }
    const parts = hostname.split('.');
    if (parts.length <= 2) return hostname;
    return parts.slice(-2).join('.');
  }

  const rawRootHost = extractHostnameFromOrigin(DEFAULT_FRONTEND_URL) || 'stylevault.site';
  const rootHost = getBaseDomain(rawRootHost);
  const rootHostRegex = new RegExp(`(^|\\.)${rootHost.replace(/\\./g, '\\\\.')}$`, 'i');

  if (rootHostRegex.test(hostname)) return true;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
  if (hostname.endsWith('.localhost')) return true;

  return false;
}

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        try {
          if (isSocketOriginAllowed(origin)) return callback(null, true);
        } catch (err) {}
        return callback(new Error('Not allowed by CORS'));
      },
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

    socket.on('subscribe:hair-specialist', (hairSpecialistId) => {
      if (!hairSpecialistId) return;
      socket.join(`hair-specialist:${hairSpecialistId}`);
    });

    socket.on('unsubscribe:hair-specialist', (hairSpecialistId) => {
      if (!hairSpecialistId) return;
      socket.leave(`hair-specialist:${hairSpecialistId}`);
    });

    socket.on('subscribe:nail-technician', (nailTechnicianId) => {
      if (!nailTechnicianId) return;
      socket.join(`nail-technician:${nailTechnicianId}`);
    });

    socket.on('unsubscribe:nail-technician', (nailTechnicianId) => {
      if (!nailTechnicianId) return;
      socket.leave(`nail-technician:${nailTechnicianId}`);
    });

    socket.on('subscribe:lash-technician', (lashTechnicianId) => {
      if (!lashTechnicianId) return;
      socket.join(`lash-technician:${lashTechnicianId}`);
    });

    socket.on('unsubscribe:lash-technician', (lashTechnicianId) => {
      if (!lashTechnicianId) return;
      socket.leave(`lash-technician:${lashTechnicianId}`);
    });

    socket.on('subscribe:makeup-artist', (makeupArtistId) => {
      if (!makeupArtistId) return;
      socket.join(`makeup-artist:${makeupArtistId}`);
    });

    socket.on('unsubscribe:makeup-artist', (makeupArtistId) => {
      if (!makeupArtistId) return;
      socket.leave(`makeup-artist:${makeupArtistId}`);
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

export const emitHairSpecialistUpdate = (hairSpecialistId, payload = {}) => {
  if (!io || !hairSpecialistId) return;
  io.to(`hair-specialist:${hairSpecialistId}`).emit('hair-specialist:data-updated', {
    hairSpecialistId: String(hairSpecialistId),
    timestamp: Date.now(),
    ...payload,
  });
};

export const emitNailTechnicianUpdate = (nailTechnicianId, payload = {}) => {
  if (!io || !nailTechnicianId) return;
  io.to(`nail-technician:${nailTechnicianId}`).emit('nail-technician:data-updated', {
    nailTechnicianId: String(nailTechnicianId),
    timestamp: Date.now(),
    ...payload,
  });
};

export const emitLashTechnicianUpdate = (lashTechnicianId, payload = {}) => {
  if (!io || !lashTechnicianId) return;
  io.to(`lash-technician:${lashTechnicianId}`).emit('lash-technician:data-updated', {
    lashTechnicianId: String(lashTechnicianId),
    timestamp: Date.now(),
    ...payload,
  });
};

export const emitMakeupArtistUpdate = (makeupArtistId, payload = {}) => {
  if (!io || !makeupArtistId) return;
  io.to(`makeup-artist:${makeupArtistId}`).emit('makeup-artist:data-updated', {
    makeupArtistId: String(makeupArtistId),
    timestamp: Date.now(),
    ...payload,
  });
};
