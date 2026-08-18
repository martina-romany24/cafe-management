const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const branchRoutes = require('./routes/branch.routes');
const productRoutes = require('./routes/product.routes');
const userRoutes = require('./routes/user.routes');
const orderRoutes = require('./routes/order.routes');
const reportRoutes = require('./routes/report.routes');
const tableRoutes = require('./routes/table.routes');
const notificationRoutes = require('./routes/notification.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');

function createApp() {
  const app = express();

  app.use(cors({ 
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175','https://cafe-management.martinaromany289.workers.dev'], 
    credentials: true 
  }));
  app.use(express.json());

  // Attach io to every request so controllers can emit events
  app.use((req, res, next) => {
    req.io = app.get('io');
    next();
  });

  app.get('/health', (req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/branches', branchRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/tables', tableRoutes);
  app.use('/api/notifications', notificationRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
