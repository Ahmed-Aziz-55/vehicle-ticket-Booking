import mongoose from "mongoose";

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    console.log("✅ Using cached MongoDB connection");
    return cached.conn;
  }

  if (!cached.promise) {
    console.log("⏳ Connecting to MongoDB...");
    
    // ✅ ONLY use supported options
    const opts = {
      serverSelectionTimeoutMS: 30000, // Keep this
      socketTimeoutMS: 45000,          // Keep this
      // ❌ REMOVE these lines completely:
      // bufferCommands: false,
      // bufferMaxEntries: 0,
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    };

    cached.promise = mongoose.connect(process.env.MONGO_URI, opts)
      .then((mongoose) => {
        console.log("✅ MongoDB connected successfully");
        return mongoose;
      })
      .catch((error) => {
        console.error("❌ MongoDB connection error:", error.message);
        cached.promise = null;
        throw error;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    throw error;
  }
};