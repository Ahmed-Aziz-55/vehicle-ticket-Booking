import express from "express";
import {
    createBooking,
    getUserBookings,
    getBookingById,
    updatePaymentStatus,
    cancelBooking,
    getAllBookings
} from "../controllers/bookingController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.route('/')
    .post(protect, createBooking)
    .get(protect, authorize('admin', 'employee'), getAllBookings);

router.get('/my-bookings', protect, getUserBookings);

router.route('/:id')
    .get(protect, getBookingById);

router.put('/:id/payment', protect, authorize('employee', 'admin'), updatePaymentStatus);
router.put('/:id/cancel', protect, cancelBooking);

export default router;