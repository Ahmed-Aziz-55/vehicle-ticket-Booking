// scripts/createAdmin.js
// ─────────────────────────────────────────────────────────────────────────────
// ONE-TIME script to create an admin user directly in MongoDB.
// Run it ONCE from your backend project root:
//
//   node scripts/createAdmin.js
//
// Then DELETE or keep it — it will skip creation if the admin already exists.
// ─────────────────────────────────────────────────────────────────────────────

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config(); // loads your .env (MONGODB_URI, etc.)

// ── Admin credentials — change these before running ──────────────────────────
const ADMIN_NAME     = 'Admin';
const ADMIN_EMAIL    = 'admin@transport.com';
const ADMIN_PASSWORD = 'Admin@123';        // min 6 chars
const ADMIN_PHONE    = '03001234567';
// ─────────────────────────────────────────────────────────────────────────────

// Inline User schema so the script has no import path issues
const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    phone:    { type: String, required: true },
    role:     { type: String, enum: ['passenger', 'employee', 'admin'], default: 'passenger' },
    isActive: { type: Boolean, default: true },
    cnic:     { type: String },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createAdmin() {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      console.error('❌  MONGODB_URI not found in .env');
      process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('✅  Connected to MongoDB');

    // Check if admin already exists
    const existing = await User.findOne({ email: ADMIN_EMAIL });
    if (existing) {
      console.log(`ℹ️   Admin already exists: ${ADMIN_EMAIL}`);
      console.log(`     Role: ${existing.role}`);

      // If it exists but isn't admin, promote it
      if (existing.role !== 'admin') {
        existing.role = 'admin';
        await existing.save();
        console.log('✅  Role updated to admin');
      }

      await mongoose.disconnect();
      return;
    }

    // Create admin user
    const admin = new User({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,   // will be hashed by pre-save hook
      phone:    ADMIN_PHONE,
      role:     'admin',
      isActive: true,
    });

    await admin.save();

    console.log('');
    console.log('✅  Admin user created successfully!');
    console.log('─────────────────────────────────────');
    console.log(`   Email   : ${ADMIN_EMAIL}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role    : admin`);
    console.log('─────────────────────────────────────');
    console.log('   Use these credentials to log in from the app.');
    console.log('');

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌  Error:', err.message);
    process.exit(1);
  }
}

createAdmin();