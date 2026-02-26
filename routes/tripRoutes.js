import express from "express";
import {
    createTrip,
    getTrips,
    getTripById,
    updateTrip,
    cancelTrip,
    getAvailableSeats
} from "../controllers/tripController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.route('/')
    .get(getTrips)
    .post(protect, authorize('admin', 'employee'), createTrip);

router.get('/:id/seats', getAvailableSeats);

router.route('/:id')
    .get(getTripById)
    .put(protect, authorize('admin', 'employee'), updateTrip);

router.put('/:id/cancel', protect, authorize('admin', 'employee'), cancelTrip);

export default router;