import User from "../models/user.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// Generate JWT Token
export const generateToken = (id) => {
    return jwt.sign(
        { id },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
    );
};

// @desc    Register a new user
// @route   POST /api/auth/register
export const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, cnic, role } = req.body;

        // Validation
        if (!name || !email || !password || !phone) {
            return res.status(400).json({
                message: "Please provide all required fields: name, email, password, phone"
            });
        }

        // Email format validation
        const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: "Please provide a valid email" });
        }

        // Password strength validation
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }

        // ── FIX: Only check email uniqueness. 
        // The original code did: $or: [{ email }, { cnic: cnic || null }]
        // When cnic is not provided, cnic || null = null, so it matched every 
        // user in the DB that has no CNIC — causing "User already exists" for 
        // every registration after the first one.
        const emailExists = await User.findOne({ email: email.toLowerCase().trim() });
        if (emailExists) {
            return res.status(400).json({ message: "Email is already registered" });
        }

        // Only check CNIC uniqueness if a CNIC was actually provided
        if (cnic && cnic.trim() !== '') {
            const cnicExists = await User.findOne({ cnic: cnic.trim() });
            if (cnicExists) {
                return res.status(400).json({ message: "CNIC is already registered" });
            }
        }

        // Create user
        const user = await User.create({
            name,
            email: email.toLowerCase().trim(),
            password,
            phone,
            cnic: (cnic && cnic.trim() !== '') ? cnic.trim() : undefined,
            role: role || 'passenger'
        });

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

        res.status(201).json({
            success: true,
            data: {
                _id: user._id,
                id: user._id,         // include both for Flutter compatibility
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                token
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({
                success: false,
                message: messages[0] || 'Validation error',
                errors: messages
            });
        }

        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists`
            });
        }

        res.status(500).json({
            success: false,
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
                success: false,
                message: "Please provide email and password"
            });
        }

        // Find user — search by email case-insensitively
        const user = await User.findOne({ 
            email: email.toLowerCase().trim() 
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Check if account is active
        if (user.isActive === false) {
            return res.status(401).json({
                success: false,
                message: 'Account is deactivated. Please contact support.'
            });
        }

        // Compare password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const token = generateToken(user._id);

        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 30 * 24 * 60 * 60 * 1000,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/'
        });

        res.json({
            success: true,
            data: {
                _id: user._id,
                id: user._id,         // include both for Flutter compatibility
                name: user.name,
                email: user.email,
                role: user.role,      // 'passenger' | 'employee' | 'admin'
                phone: user.phone,
                token
            }
        });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
export const logoutUser = async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        path: '/'
    });
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
export const getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({
            success: true,
            data: {
                _id: user._id,
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};