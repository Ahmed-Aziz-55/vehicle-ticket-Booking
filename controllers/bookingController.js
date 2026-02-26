import Booking from "../models/booking.js";
import Trip from "../models/trip.js";
import User from "../models/user.js";
import { calculateFare } from "../utils/calculateFare.js";

// @desc    Create a new booking
// @route   POST /api/bookings
export const createBooking = async (req, res) => {
    try {
        const { tripId, seatNumber, passengerDetails, paymentMethod, bookingType } = req.body;
        
        // Find trip
        const trip = await Trip.findById(tripId).populate('vehicle');
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        // Check if trip is available for booking
        if (trip.status !== 'Scheduled') {
            return res.status(400).json({ message: 'Trip is not available for booking' });
        }
        
        // Check if seat is available
        const seatType = seatNumber.startsWith('F') ? 'front' : 'back';
        const availableSeats = trip.availableSeats[seatType];
        
        if (!availableSeats.includes(seatNumber)) {
            return res.status(400).json({ 
                message: 'Seat is not available. Please select another seat.' 
            });
        }
        
        // Check if seat is already booked
        const existingBooking = await Booking.findOne({
            trip: tripId,
            seatNumber,
            status: 'Active'
        });
        
        if (existingBooking) {
            return res.status(400).json({ message: 'Seat is already booked' });
        }
        
        // Calculate fare
        const fare = calculateFare(seatType, trip.capacityMode);
        
        // Create booking
        let passengerId = req.user._id;
        let passengerInfo = passengerDetails;
        
        // If on-spot booking by employee
        if (bookingType === 'OnSpot' && req.user.role === 'employee') {
            // Check if passenger exists or create new
            let passenger = await User.findOne({ phone: passengerDetails.phone });
            if (!passenger) {
                passenger = await User.create({
                    name: passengerDetails.name,
                    email: passengerDetails.email || `${passengerDetails.phone}@temp.com`,
                    password: Math.random().toString(36).slice(-8),
                    phone: passengerDetails.phone,
                    role: 'passenger'
                });
            }
            passengerId = passenger._id;
            passengerInfo = {
                name: passenger.name,
                phone: passenger.phone,
                email: passenger.email
            };
        }
        
        const booking = await Booking.create({
            trip: tripId,
            passenger: passengerId,
            passengerDetails: passengerInfo,
            seatNumber,
            seatType,
            fare,
            paymentStatus: bookingType === 'OnSpot' ? 'Paid' : 'Reserved',
            paymentMethod,
            bookingType,
            bookedBy: bookingType === 'OnSpot' ? req.user._id : null
        });
        
        // Update trip available seats
        trip.availableSeats[seatType] = trip.availableSeats[seatType].filter(
            seat => seat !== seatNumber
        );
        
        trip.bookedSeats.push({
            seatNumber,
            bookingId: booking._id
        });
        
        await trip.save();
        
        res.status(201).json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bookings for a user
// @route   GET /api/bookings/my-bookings
export const getUserBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ passenger: req.user._id })
            .populate({
                path: 'trip',
                populate: { path: 'vehicle', select: 'registrationNumber vehicleType' }
            })
            .sort('-createdAt');
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get booking by ID
// @route   GET /api/bookings/:id
export const getBookingById = async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id)
            .populate({
                path: 'trip',
                populate: [
                    { path: 'vehicle' },
                    { path: 'createdBy', select: 'name' }
                ]
            })
            .populate('passenger', 'name email phone')
            .populate('bookedBy', 'name');
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        
        // Check if user has permission to view this booking
        if (req.user.role === 'passenger' && booking.passenger._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update payment status
// @route   PUT /api/bookings/:id/payment
export const updatePaymentStatus = async (req, res) => {
    try {
        const { paymentStatus, paymentMethod } = req.body;
        
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        
        // Only employees and admins can update payment status
        if (!['employee', 'admin'].includes(req.user.role)) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        booking.paymentStatus = paymentStatus;
        if (paymentMethod) booking.paymentMethod = paymentMethod;
        if (paymentStatus === 'Paid') {
            booking.paymentDate = new Date();
        }
        
        await booking.save();
        
        res.json(booking);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
export const cancelBooking = async (req, res) => {
    try {
        const { cancellationReason } = req.body;
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        
        // Check if user has permission to cancel
        if (req.user.role === 'passenger' && booking.passenger.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // Check if booking can be cancelled
        if (booking.status !== 'Active') {
            return res.status(400).json({ message: 'Booking is already cancelled or completed' });
        }
        
        // Update booking status
        booking.status = 'Cancelled';
        booking.cancellationReason = cancellationReason;
        booking.cancelledAt = new Date();
        await booking.save();
        
        // Return seat to available seats
        const trip = await Trip.findById(booking.trip);
        if (trip) {
            trip.availableSeats[booking.seatType].push(booking.seatNumber);
            trip.availableSeats[booking.seatType].sort();
            
            // Remove from bookedSeats
            trip.bookedSeats = trip.bookedSeats.filter(
                seat => seat.bookingId.toString() !== booking._id.toString()
            );
            
            await trip.save();
        }
        
        res.json({ message: 'Booking cancelled successfully', booking });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all bookings (admin/employee)
// @route   GET /api/bookings
export const getAllBookings = async (req, res) => {
    try {
        const { startDate, endDate, status, paymentStatus } = req.query;
        let query = {};
        
        if (startDate && endDate) {
            query.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }
        
        if (status) query.status = status;
        if (paymentStatus) query.paymentStatus = paymentStatus;
        
        const bookings = await Booking.find(query)
            .populate({
                path: 'trip',
                populate: { path: 'vehicle' }
            })
            .populate('passenger', 'name email phone')
            .populate('bookedBy', 'name')
            .sort('-createdAt');
        
        res.json(bookings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};