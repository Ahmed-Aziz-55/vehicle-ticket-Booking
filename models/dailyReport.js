import mongoose from "mongoose";

const dailyReportSchema = new mongoose.Schema({
    reportDate: {
        type: Date,
        required: true,
        unique: true
    },
    totalTickets: {
        type: Number,
        default: 0
    },
    totalRevenue: {
        type: Number,
        default: 0
    },
    paidTickets: {
        type: Number,
        default: 0
    },
    reservedTickets: {
        type: Number,
        default: 0
    },
    cancelledTickets: {
        type: Number,
        default: 0
    },
    onlineBookings: {
        type: Number,
        default: 0
    },
    onSpotBookings: {
        type: Number,
        default: 0
    },
    tripDetails: [{
        tripId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Trip'
        },
        route: String,
        ticketsSold: Number,
        revenue: Number
    }],
    generatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

const DailyReport = mongoose.model('DailyReport', dailyReportSchema);
export default DailyReport;