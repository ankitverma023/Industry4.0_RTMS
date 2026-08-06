const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for the prototype
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  const db = require('./database/db');
  db.all("SELECT * FROM work_orders ORDER BY created_at ASC", [], (err, allOrders) => {
    if (!err) socket.emit('production_data', allOrders);
  });
});

app.use(cors());
app.use(express.json());

require('./database/db');
const authRoutes = require('./routes/authRoutes');
const alertRoutes = require('./routes/alertRoutes');
const machineRoutes = require('./routes/machineRoutes');
const userRoutes = require('./routes/userRoutes');
const productionRoutes = require('./routes/productionRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const maintenanceRoutes = require('./routes/maintenanceRoutes');

// Basic route
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend is running' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/users', userRoutes);
app.use('/api/production', productionRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/maintenance', maintenanceRoutes);

// Swagger Documentation
const swagger = require('./swagger');
app.use('/api-docs', swagger.serve, swagger.setup);

// Import and start simulation engine
const { startSimulation } = require('./simulationEngine');
startSimulation(io);

const PORT = process.env.PORT || 5002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger API Documentation available at: http://localhost:${PORT}/api-docs`);
});
