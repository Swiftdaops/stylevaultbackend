// server.js
import 'dotenv/config';
import http from 'http';

import connectDB from './src/config/db.js';
import app from './src/app.js';
import { initSocket } from './src/socket/index.js';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  const server = http.createServer(app);
  initSocket(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});