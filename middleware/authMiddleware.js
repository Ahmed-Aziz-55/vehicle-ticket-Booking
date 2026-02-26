import jwt from "jsonwebtoken";
import User from "../models/user.js";

export const protect = async (req, res, next) => {
    console.log('🛡️ Auth middleware checking...');
    
    try {
        let token;
        
        // Check for token in cookies
        if (req.cookies.token) {
            token = req.cookies.token;
            console.log('✅ Token found in cookies');
        } 
        // Check for token in Authorization header
        else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
            console.log('✅ Token found in headers');
        }
        
        // If no token found
        if (!token) {
            console.log('❌ No token found');
            return res.status(401).json({ 
                success: false,
                message: 'Not authorized, no token' 
            });
        }
        
        // Verify token
        console.log('🔑 Verifying token...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ Token verified for user ID:', decoded.id);
        
        // Get user from token
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
            console.log('❌ User not found for ID:', decoded.id);
            return res.status(401).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        // Check if user is active
        if (!user.isActive) {
            console.log('❌ User account is deactivated:', user.email);
            return res.status(401).json({ 
                success: false,
                message: 'Account is deactivated. Please contact admin.' 
            });
        }
        
        // Attach user to request object
        req.user = user;
        console.log('✅ User authenticated:', user.email);
        next();
        
    } catch (error) {
        console.error("❌ Auth middleware error:", error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false,
                message: 'Invalid token' 
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false,
                message: 'Token expired' 
            });
        }
        
        return res.status(401).json({ 
            success: false,
            message: 'Not authorized' 
        });
    }
};