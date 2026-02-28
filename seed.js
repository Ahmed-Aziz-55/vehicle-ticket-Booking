// api/seed.js  (Vercel serverless function)  OR  routes/seedRoute.js
// ─────────────────────────────────────────────────────────────────────────────
// TEMPORARY endpoint to create the first admin user.
// 
// HOW TO USE (two options):
//
// OPTION A — Vercel serverless (easiest):
//   1. Create file:  api/seed.js  in your backend project root
//   2. Deploy to Vercel (git push)
//   3. Visit:  https://vehicle-ticket-booking.vercel.app/api/seed?secret=SETUP_2024
//   4. Admin is created. THEN DELETE this file and redeploy.
//
// OPTION B — Express route (if running locally):
//   1. Add to your main index.js:
//        import seedRouter from './routes/seedRoute.js';
//        app.use('/api/seed', seedRouter);
//   2. Run backend locally: node index.js
//   3. Visit:  http://localhost:5000/api/seed?secret=SETUP_2024
//   4. Remove the route after use.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// ── Change these credentials before deploying ─────────────────────────────────
const ADMIN_EMAIL    = 'admin@transport.com';
const ADMIN_PASSWORD = 'Admin@123';
const ADMIN_PHONE    = '03001234567';
const ADMIN_NAME     = 'Admin';
const SECRET_KEY     = 'SETUP_2024';   // protect the endpoint
// ─────────────────────────────────────────────────────────────────────────────

// Connect to MongoDB once and reuse
let isConnected = false;
async function connectDB() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI);
  isConnected = true;
}

// Minimal inline schema (avoids import path issues in serverless)
const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone:    { type: String, required: true },
  role:     { type: String, enum: ['passenger', 'employee', 'admin'], default: 'passenger' },
  isActive: { type: Boolean, default: true },
  cnic:     { type: String },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ── Vercel serverless handler ─────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check secret key
  if (req.query.secret !== SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden. Provide ?secret=SETUP_2024' });
  }

  try {
    await connectDB();

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      // Promote to admin if not already
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        return res.json({
          success: true,
          message: 'Existing user promoted to admin',
          email: ADMIN_EMAIL,
          role: 'admin',
        });
      }
      return res.json({
        success: true,
        message: 'Admin already exists',
        email: ADMIN_EMAIL,
        role: existing.role,
      });
    }

    // Hash password manually (no pre-save hook in inline schema)
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

    const admin = await User.create({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: hashedPassword,
      phone:    ADMIN_PHONE,
      role:     'admin',
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: '✅ Admin created successfully!',
      credentials: {
        email:    ADMIN_EMAIL,
        password: ADMIN_PASSWORD,   // shown once — save this!
        role:     'admin',
      },
    });

  } catch (err) {
    console.error('Seed error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ── Express router version (for local dev) ────────────────────────────────────
import express from 'express';
export const seedRouter = express.Router();

seedRouter.get('/', async (req, res) => {
  if (req.query.secret !== SECRET_KEY) {
    return res.status(403).json({ message: 'Forbidden. Provide ?secret=SETUP_2024' });
  }

  try {
    await connectDB();

    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        return res.json({ success: true, message: 'Promoted to admin', email: ADMIN_EMAIL });
      }
      return res.json({ success: true, message: 'Admin already exists', email: ADMIN_EMAIL });
    }

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
    await User.create({
      name: ADMIN_NAME, email: ADMIN_EMAIL,
      password: hashedPassword, phone: ADMIN_PHONE,
      role: 'admin', isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: 'Admin created!',
      credentials: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});