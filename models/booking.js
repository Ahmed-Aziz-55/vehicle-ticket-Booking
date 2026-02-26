import mongoose from "mongoose";
import { generateTicketId } from "../utils/generateTicketId.js";

const bookingSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        unique: true
    },
    trip: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trip',
        required: true
    },
    passenger: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    passengerDetails: {
        name: String,
        phone: String,
        email: String
    },
    seatNumber: {
        type: String,
        required: true
    },
    seatType: {
        type: String,
        enum: ['front', 'back'],
        required: true
    },
    fare: {
        type: Number,
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['Reserved', 'Paid'],
        default: 'Reserved'
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Card', 'Online'],
        default: 'Cash'
    },
    paymentDate: Date,
    bookingType: {
        type: String,
        enum: ['Online', 'OnSpot'],
        default: 'Online'
    },
    bookedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User' // Employee who made on-spot booking
    },
    status: {
        type: String,
        enum: ['Active', 'Cancelled', 'Completed'],
        default: 'Active'
    },
    cancellationReason: String,
    cancelledAt: Date
}, {
    timestamps: true
});

// Generate ticket ID before saving
bookingSchema.pre('save', async function(next) {
    if (this.isNew && !this.ticketId) {
        this.ticketId = await generateTicketId();
    }
    next();
});

const Booking = mongoose.model('Booking', bookingSchema);
export default Booking;