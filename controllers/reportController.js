import DailyReport from "../models/dailyReport.js";
import Booking from "../models/booking.js";
import Trip from "../models/trip.js";

// @desc    Generate daily report
// @route   POST /api/reports/generate
export const generateDailyReport = async (req, res) => {
    try {
        const { date } = req.body;
        const reportDate = date ? new Date(date) : new Date();
        reportDate.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(reportDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        // Check if report already exists for this date
        let report = await DailyReport.findOne({ reportDate });
        
        // Get all bookings for the date
        const bookings = await Booking.find({
            createdAt: {
                $gte: reportDate,
                $lt: nextDay
            }
        }).populate('trip');
        
        // Calculate statistics
        const totalTickets = bookings.length;
        const totalRevenue = bookings.reduce((sum, booking) => sum + booking.fare, 0);
        const paidTickets = bookings.filter(b => b.paymentStatus === 'Paid').length;
        const reservedTickets = bookings.filter(b => b.paymentStatus === 'Reserved').length;
        const cancelledTickets = bookings.filter(b => b.status === 'Cancelled').length;
        const onlineBookings = bookings.filter(b => b.bookingType === 'Online').length;
        const onSpotBookings = bookings.filter(b => b.bookingType === 'OnSpot').length;
        
        // Group by trip
        const tripMap = new Map();
        bookings.forEach(booking => {
            if (booking.trip) {
                const tripId = booking.trip._id.toString();
                if (!tripMap.has(tripId)) {
                    tripMap.set(tripId, {
                        tripId: booking.trip._id,
                        route: `${booking.trip.route.from} to ${booking.trip.route.to}`,
                        ticketsSold: 0,
                        revenue: 0
                    });
                }
                const tripData = tripMap.get(tripId);
                tripData.ticketsSold++;
                tripData.revenue += booking.fare;
            }
        });
        
        const tripDetails = Array.from(tripMap.values());
        
        if (report) {
            // Update existing report
            report.totalTickets = totalTickets;
            report.totalRevenue = totalRevenue;
            report.paidTickets = paidTickets;
            report.reservedTickets = reservedTickets;
            report.cancelledTickets = cancelledTickets;
            report.onlineBookings = onlineBookings;
            report.onSpotBookings = onSpotBookings;
            report.tripDetails = tripDetails;
            report.generatedBy = req.user._id;
        } else {
            // Create new report
            report = await DailyReport.create({
                reportDate,
                totalTickets,
                totalRevenue,
                paidTickets,
                reservedTickets,
                cancelledTickets,
                onlineBookings,
                onSpotBookings,
                tripDetails,
                generatedBy: req.user._id
            });
        }
        
        await report.save();
        
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get reports by date range
// @route   GET /api/reports
export const getReports = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let query = {};
        
        if (startDate && endDate) {
            query.reportDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        const reports = await DailyReport.find(query)
            .populate('generatedBy', 'name')
            .sort('-reportDate');
        
        res.json(reports);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get report by date
// @route   GET /api/reports/:date
export const getReportByDate = async (req, res) => {
    try {
        const date = new Date(req.params.date);
        date.setHours(0, 0, 0, 0);
        
        const report = await DailyReport.findOne({ reportDate: date })
            .populate('generatedBy', 'name')
            .populate('tripDetails.tripId');
        
        if (!report) {
            return res.status(404).json({ message: 'Report not found for this date' });
        }
        
        res.json(report);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get revenue summary
// @route   GET /api/reports/summary
export const getRevenueSummary = async (req, res) => {
    try {
        const { period } = req.query; // daily, weekly, monthly
        
        let groupBy;
        let dateFormat;
        
        switch(period) {
            case 'weekly':
                groupBy = { $week: '$reportDate' };
                dateFormat = '%Y-%U';
                break;
            case 'monthly':
                groupBy = { $month: '$reportDate' };
                dateFormat = '%Y-%m';
                break;
            default: // daily
                groupBy = { $dayOfMonth: '$reportDate' };
                dateFormat = '%Y-%m-%d';
        }
        
        const summary = await DailyReport.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$reportDate' },
                        period: groupBy
                    },
                    totalRevenue: { $sum: '$totalRevenue' },
                    totalTickets: { $sum: '$totalTickets' },
                    paidTickets: { $sum: '$paidTickets' },
                    reservedTickets: { $sum: '$reservedTickets' },
                    avgTicketPrice: { $avg: { $divide: ['$totalRevenue', '$totalTickets'] } }
                }
            },
            { $sort: { '_id.year': -1, '_id.period': -1 } }
        ]);
        
        res.json(summary);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};