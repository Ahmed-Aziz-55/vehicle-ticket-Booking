import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters']
    },
    role: {
        type: String,
        enum: ['passenger', 'employee', 'admin'],
        default: 'passenger'
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true
    },
    cnic: {
        type: String,
        sparse: true,
        unique: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    
    try {
        console.log('🔐 Hashing password for user:', this.email);
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        console.log('✅ Password hashed successfully');
    } catch (error) {
        console.error('❌ Password hashing error:', error);
        throw error;
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(password) {
    try {
        console.log('🔍 Comparing password for user:', this.email);
        const isMatch = await bcrypt.compare(password, this.password);
        console.log('✅ Password match result:', isMatch);
        return isMatch;
    } catch (error) {
        console.error('❌ Password comparison error:', error);
        throw error;
    }
};

const User = mongoose.model('User', userSchema);
export default User;