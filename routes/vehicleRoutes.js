import express from "express";
import {
    createVehicle,
    getVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle
} from "../controllers/vehicleController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.route('/')
    .get(getVehicles)
    .post(protect, authorize('admin'), createVehicle);

router.route('/:id')
    .get(getVehicleById)
    .put(protect, authorize('admin'), updateVehicle)
    .delete(protect, authorize('admin'), deleteVehicle);

export default router;