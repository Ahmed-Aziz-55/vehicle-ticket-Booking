import express from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getProfile
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// PUBLIC ROUTES - No authentication needed
router.post('/register', registerUser);        // ✅ registerUser(req, res)
router.post('/login', loginUser);              // ✅ loginUser(req, res)
router.post('/logout', logoutUser);            // ✅ logoutUser(req, res)

// PROTECTED ROUTE - Need authentication
router.get('/profile', protect, getProfile);   // ✅ protect middleware then getProfile

export default router;