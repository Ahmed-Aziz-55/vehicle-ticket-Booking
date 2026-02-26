import User from "../models/user.js";
import jwt from "jsonwebtoken";

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
    console.log('📝 Register endpoint hit with body:', req.body);
    
    try {
        const { name, email, password, phone, cnic, role } = req.body;
        
        // Validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ 
                success: false,
                message: "Please provide all required fields: name, email, password, phone" 
            });
        }
        
        // Email format validation
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ 
                success: false,
                message: "Please provide a valid email" 
            });
        }
        
        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                message: "Password must be at least 6 characters" 
            });
        }
        
        // Check if user exists
        const userExists = await User.findOne({ 
            $or: [{ email }, { cnic: cnic || null }] 
        });
        
        if (userExists) {
            return res.status(400).json({ 
                success: false,
                message: 'User already exists' 
            });
        }
        
        // Create user
        const user = await User.create({
            name,
            email,
            password,
            phone,
            cnic: cnic || undefined,
            role: role || 'passenger'
        });
        
        // Generate token
        const token = generateToken(user._id);
        
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        
        // Send response
        return res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                token
            }
        });
        
    } catch (error) {
        console.error("❌ Registration error:", error);
        
        // Handle mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ 
                success: false,
                message: 'Validation error', 
                errors: messages 
            });
        }
        
        // Handle duplicate key error
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({ 
                success: false,
                message: `${field} already exists` 
            });
        }
        
        return res.status(500).json({ 
            success: false,
            message: error.message || "Registration failed" 
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
    console.log('🔐 Login endpoint hit with body:', req.body);
    
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                message: "Please provide email and password" 
            });
        }
        
        // Check for user
        const user = await User.findOne({ email }).select('+password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }
        
        // Check password
        const isPasswordMatch = await user.comparePassword(password);
        if (!isPasswordMatch) {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid email or password' 
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            return res.status(401).json({ 
                success: false,
                message: 'Account is deactivated. Please contact admin.' 
            });
        }
        
        // Generate token
        const token = generateToken(user._id);
        
        // Set cookie
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });
        
        // Send response
        return res.json({
            success: true,
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                token
            }
        });
        
    } catch (error) {
        console.error("❌ Login error:", error);
        return res.status(500).json({ 
            success: false,
            message: error.message || "Login failed" 
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logoutUser = async (req, res) => {
    console.log('🚪 Logout endpoint hit');
    
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/'
    });
    
    return res.json({ 
        success: true,
        message: 'Logged out successfully' 
    });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
export const getProfile = async (req, res) => {
    console.log('👤 Profile endpoint hit for user:', req.user?._id);
    
    try {
        const user = await User.findById(req.user._id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        return res.json({
            success: true,
            data: user
        });
        
    } catch (error) {
        console.error("❌ Profile error:", error);
        return res.status(500).json({ 
            success: false,
            message: error.message 
        });
    }
};