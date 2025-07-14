const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Import all models to ensure they're registered BEFORE routes
const User = require('./models/User');
const Schedule = require('./models/Schedule');
const SwapRequest = require('./models/SwapRequest');
const Notification = require('./models/Notification');

// Import optional models if they exist
let Project, Task, TimeEntry;
try {
  Project = require('./models/Project');
  console.log('Project model loaded');
} catch (err) {
  console.log('Project model not found, skipping...');
}

try {
  Task = require('./models/Task');
  console.log('Task model loaded');
} catch (err) {
  console.log('Task model not found, skipping...');
}

try {
  TimeEntry = require('./models/TimeEntry');
  console.log('TimeEntry model loaded');
} catch (err) {
  console.log('TimeEntry model not found, skipping...');
}

// Enhanced CORS configuration for VPN network access
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost',
      'http://127.0.0.1',
      'http://10.212.247.198:3000',
      'http://10.212.247.198',
      'http://10.212.243.37:3000',
      'http://10.212.243.37',
      // Add support for any IP in your VPN subnet
      /^http:\/\/10\.212\.247\.\d{1,3}:3000$/,
      /^http:\/\/10\.212\.247\.\d{1,3}$/,
      /^http:\/\/10\.212\.243\.\d{1,3}:3000$/,
      /^http:\/\/10\.212\.243\.\d{1,3}$/
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return allowedOrigin === origin;
      } else if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(origin);
      }
      return false;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all for development - change to false for production
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'Cache-Control', 'X-Access-Token', 'x-auth-token'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Enhanced Health check endpoint - MUST BE BEFORE OTHER ROUTES
app.get('/api/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    memory: process.memoryUsage(),
    version: process.version,
    host: req.get('host'),
    origin: req.get('origin'),
    discord: {
      serviceAvailable: false,
      botReady: false
    },
    models: {
      User: !!User,
      Schedule: !!Schedule,
      SwapRequest: !!SwapRequest,
      Notification: !!Notification,
      Project: !!Project,
      Task: !!Task,
      TimeEntry: !!TimeEntry
    }
  };
  
  // Check Discord service status
  try {
    const discordService = require('./services/discordService');
    healthCheck.discord.serviceAvailable = true;
    healthCheck.discord.botReady = discordService.isReady || false;
  } catch (error) {
    healthCheck.discord.serviceAvailable = false;
  }
  
  // Check if database is connected
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      ...healthCheck,
      status: 'unhealthy',
      error: 'Database not connected'
    });
  }
  
  res.status(200).json(healthCheck);
});

// Simple health check for Docker
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Database connection with better error handling
mongoose.connect(process.env.MONGODB_URI || 'mongodb://admin:adminpassword@mongodb:27017/team-planner?authSource=admin')
.then(() => {
  console.log('MongoDB connected successfully');
  console.log('Database URI:', process.env.MONGODB_URI ? 'Environment variable' : 'Default');
  console.log('Registered models:', Object.keys(mongoose.models));
  
  // Initialize Discord service after database is ready
  console.log('Initializing Discord service...');
  try {
    const discordService = require('./services/discordService');
    console.log('Discord service initialized');
  } catch (error) {
    console.log('Discord service not available:', error.message);
  }
})
.catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('MongoDB reconnected');
});

// Routes - Load AFTER models are imported
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');

// Add optional routes if they exist
let taskRoutes, projectRoutes, timesheetRoutes, discordRoutes;

try {
  taskRoutes = require('./routes/tasks');
  app.use('/api/tasks', taskRoutes);
  console.log('Tasks routes loaded');
} catch (err) {
  console.log('Tasks routes not found, skipping...');
}

try {
  projectRoutes = require('./routes/projects');
  app.use('/api/projects', projectRoutes);
  console.log('Projects routes loaded');
} catch (err) {
  console.log('Projects routes not found, skipping...');
}

try {
  timesheetRoutes = require('./routes/timesheet');
  app.use('/api/timesheet', timesheetRoutes);
  console.log('Timesheet routes loaded');
} catch (err) {
  console.log('Timesheet routes not found, skipping...');
}

// Discord routes with proper error handling
try {
  discordRoutes = require('./routes/discord');
  app.use('/api/discord', discordRoutes);
  console.log('Discord routes loaded');
} catch (err) {
  console.log('Discord routes not found, creating fallback routes...');
  
  // Create fallback Discord routes if file doesn't exist
  const express = require('express');
  const router = express.Router();
  const auth = require('./middleware/auth');
  
  router.post('/link', auth, (req, res) => {
    res.status(503).json({ 
      success: false,
      message: 'Discord integration not fully configured. Please check Discord service setup.' 
    });
  });
  
  router.delete('/unlink', auth, (req, res) => {
    res.status(503).json({ 
      success: false,
      message: 'Discord integration not fully configured. Please check Discord service setup.' 
    });
  });
  
  router.post('/test-notification', auth, (req, res) => {
    res.status(503).json({ 
      success: false,
      message: 'Discord integration not fully configured. Please check Discord service setup.' 
    });
  });
  
  app.use('/api/discord', router);
  console.log('Fallback Discord routes created');
}

// Core routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err.stack);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      success: false,
      message: 'Validation error', 
      errors: Object.values(err.errors).map(e => e.message) 
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({ 
      success: false,
      message: 'Invalid ID format' 
    });
  }
  
  if (err.name === 'MissingSchemaError') {
    console.error('Missing Schema Error - Model not registered:', err.message);
    return res.status(500).json({ 
      success: false,
      message: 'Database schema error' 
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({ 
      success: false,
      message: 'Duplicate field value' 
    });
  }
  
  // JWT specific errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large. Maximum size is 5MB.'
    });
  }
  
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Handle 404 routes
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: `Route ${req.originalUrl} not found` 
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Close Discord service if available
  try {
    const discordService = require('./services/discordService');
    if (discordService.destroy) {
      discordService.destroy();
    }
  } catch (error) {
    console.log('Discord service cleanup skipped:', error.message);
  }
  
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  
  // Close Discord service if available
  try {
    const discordService = require('./services/discordService');
    if (discordService.destroy) {
      discordService.destroy();
    }
  } catch (error) {
    console.log('Discord service cleanup skipped:', error.message);
  }
  
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check available at: http://localhost:${PORT}/api/health`);
  console.log(`External access: http://10.212.247.198:${PORT}/api/health`);
  console.log('Models registered:', Object.keys(mongoose.models));
  
  // Log Discord service status
  try {
    const discordService = require('./services/discordService');
    console.log('Discord service status:', discordService.isReady ? 'Ready' : 'Initializing');
  } catch (error) {
    console.log('Discord service status: Not available');
  }
});
