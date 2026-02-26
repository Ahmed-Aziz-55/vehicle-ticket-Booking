import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {  // 👈 SIRF req, res do parameter
    try {
        const { name, email, password, phone, cnic, role } = req.body;
        
        // Validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({ 
                message: "Please provide all required fields: name, email, password, phone" 
            });
        }
        
        // Check if user exists
        const userExists = await User.findOne({ 
            $or: [{ email }, { cnic: cnic || null }] 
        });
        
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
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
            sameSite: 'lax'
        });
        
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            token
        });
        
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ 
            message: error.message || "Registration failed" 
        });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
export const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                message: "Please provide email and password" 
            });
        }
        
        // Check for user
        const user = await User.findOne({ email }).select('+password');
        
        if (user && (await user.comparePassword(password))) {
            const token = generateToken(user._id);
            
            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 30 * 24 * 60 * 60 * 1000,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax'
            });
            
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                token
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logoutUser = async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0)
    });
    res.json({ message: 'Logged out successfully' });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};