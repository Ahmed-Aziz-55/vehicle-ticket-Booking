import express from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getProfile
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = express.Router();

// PUBLIC ROUTES - No authentication needed
router.post('/register', asyncHandler(registerUser));
router.post('/login', asyncHandler(loginUser));
router.post('/logout', asyncHandler(logoutUser));

// PROTECTED ROUTE - Need authentication
router.get('/profile', protect, asyncHandler(getProfile));

export default router;