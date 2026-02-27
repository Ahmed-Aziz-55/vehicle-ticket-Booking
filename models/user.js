// models/user.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  cnic: { type: String },
  role: { type: String, default: 'passenger' },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// 🔑 Pre-save middleware for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err); // pass error to mongoose
  }
});

const User = mongoose.model('User', userSchema);
export default User;