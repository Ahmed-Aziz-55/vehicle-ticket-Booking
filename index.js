import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { connectDB } from "./config/connectDB.js";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import tripRoutes from "./routes/tripRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js";

dotenv.config();

const app = express();

// ============================================
// GLOBAL ERROR HANDLERS (Must be at the top)
// ============================================
process.on('uncaughtException', (error) => {
  console.error('💥 UNCAUGHT EXCEPTION:', error);
  console.error('Exception origin:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 UNHANDLED REJECTION:', reason);
  console.error('Promise:', promise);
});

// ============================================
// DATABASE CONNECTION (Serverless Optimized)
// ============================================
// For local development - connect immediately
if (process.env.NODE_ENV !== 'production') {
  connectDB()
    .then(() => console.log('✅ Local DB connected'))
    .catch(err => console.error('❌ Local DB error:', err.message));
}

// Middleware to ensure DB connection for each request (for Vercel)
app.use((req, res, next) => {

  const connectDatabase = async () => {
    try {

      if (req.path === '/' || req.path === '/api/health') {
        return next();
      }

      if (mongoose.connection.readyState !== 1) {
        console.log('⏳ Connecting DB...');
        await connectDB();
      }

      next();

    } catch (error) {
      console.error('DB middleware error:', error);
      res.status(500).json({
        message: "Database connection failed"
      });
    }
  };

  connectDatabase();
});

// ============================================
// MIDDLEWARES
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// CORS Configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
  })
);

// Request logging middleware (optional)
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});
// ============================================
// DEBUGGING ROUTES - Add these temporarily
// ============================================
app.get('/api/debug', (req, res) => {
    res.json({ 
        message: 'Debug endpoint working',
        time: new Date().toISOString(),
        env: process.env.NODE_ENV
    });
});

app.post('/api/debug/post', (req, res) => {
    console.log('Debug POST body:', req.body);
    res.json({ 
        message: 'Debug POST working',
        received: req.body 
    });
});

// ============================================
// ROUTES
// ============================================

// Health check route (no DB required)
app.get("/api/health", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const states = {
      0: '❌ disconnected',
      1: '✅ connected',
      2: '⏳ connecting',
      3: '⏳ disconnecting'
    };
    
    res.json({
      status: "healthy",
      server: "running",
      database: states[dbState] || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: "unhealthy", 
      error: error.message 
    });
  }
});

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Bus Reservation System API",
    version: "1.0.0",
    status: "operational",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      trips: "/api/trips",
      bookings: "/api/bookings",
      reports: "/api/reports",
      vehicles: "/api/vehicles"
    },
    documentation: "Use Postman to test the API endpoints"
  });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/vehicles", vehicleRoutes);

// ============================================
// ERROR HANDLING MIDDLEWARES
// ============================================

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    path: req.path,
    method: req.method,
    availableRoutes: [
      "/",
      "/api/health",
      "/api/auth",
      "/api/trips",
      "/api/bookings",
      "/api/reports",
      "/api/vehicles"
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err);
  console.error('Stack:', err.stack);
  
  // Handle specific MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    return res.status(500).json({ 
      message: "Database error occurred",
      error: process.env.NODE_ENV === 'production' ? null : err.message 
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ 
      message: "Validation error", 
      errors: err.errors 
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: "Invalid token" });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: "Token expired" });
  }
  
  // Default error response
  res.status(err.status || 500).json({ 
    message: err.message || "Something went wrong!",
    error: process.env.NODE_ENV === 'production' ? null : {
      message: err.message,
      stack: err.stack
    }
  });
});

// ============================================
// EXPORT FOR VERCEL
// ============================================
export default app;

// ============================================
// LOCAL DEVELOPMENT SERVER
// ============================================
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 4000;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Test: http://localhost:${PORT}`);
    console.log(`💊 Health: http://localhost:${PORT}/api/health`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received, closing server...');
    server.close(() => {
      console.log('🛑 Server closed');
      mongoose.connection.close(false, () => {
        console.log('📦 MongoDB connection closed');
        process.exit(0);
      });
    });
  });
}