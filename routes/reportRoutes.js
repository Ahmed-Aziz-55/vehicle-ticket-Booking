import express from "express";
import {
    generateDailyReport,
    getReports,
    getReportByDate,
    getRevenueSummary
} from "../controllers/reportController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.use(protect, authorize('admin', 'employee'));

router.post('/generate', generateDailyReport);
router.get('/', getReports);
router.get('/summary', getRevenueSummary);
router.get('/:date', getReportByDate);

export default router;