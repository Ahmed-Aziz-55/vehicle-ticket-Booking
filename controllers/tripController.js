import Trip from "../models/trip.js";
import Vehicle from "../models/vehicle.js";
import Booking from "../models/booking.js";

// @desc    Create a new trip
// @route   POST /api/trips
export const createTrip = async (req, res) => {
    try {
        const {
            route,
            vehicle,
            driver,
            departureDate,
            departureTime,
            arrivalTime,
            capacityMode
        } = req.body;
        
        // Check if vehicle exists
        const vehicleExists = await Vehicle.findById(vehicle);
        if (!vehicleExists) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        // Check for overlapping trips with same vehicle
        const existingTrip = await Trip.findOne({
            vehicle,
            departureDate,
            status: { $ne: 'Cancelled' }
        });
        
        if (existingTrip) {
            return res.status(400).json({ 
                message: 'Vehicle already has a trip scheduled on this date' 
            });
        }
        
        const trip = await Trip.create({
            route,
            vehicle,
            driver,
            departureDate,
            departureTime,
            arrivalTime,
            capacityMode,
            createdBy: req.user._id
        });
        
        res.status(201).json(trip);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all trips
// @route   GET /api/trips
export const getTrips = async (req, res) => {
    try {
        const { from, to, date } = req.query;
        let query = {};
        
        if (from && to) {
            query['route.from'] = from;
            query['route.to'] = to;
        }
        
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            
            query.departureDate = {
                $gte: startDate,
                $lte: endDate
            };
        }
        
        query.status = 'Scheduled';
        
        const trips = await Trip.find(query)
            .populate('vehicle', 'registrationNumber vehicleType totalSeats')
            .populate('createdBy', 'name')
            .sort({ departureDate: 1, departureTime: 1 });
        
        res.json(trips);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get trip by ID
// @route   GET /api/trips/:id
export const getTripById = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id)
            .populate('vehicle')
            .populate('createdBy', 'name');
        
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        // Get available seats
        const availableSeats = {
            front: trip.availableSeats.front,
            back: trip.availableSeats.back
        };
        
        res.json({ trip, availableSeats });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update trip
// @route   PUT /api/trips/:id
export const updateTrip = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        // Only allow updates if trip is scheduled
        if (trip.status !== 'Scheduled') {
            return res.status(400).json({ 
                message: 'Cannot update trip that is not in scheduled status' 
            });
        }
        
        const updatedTrip = await Trip.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        res.json(updatedTrip);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Cancel trip
// @route   PUT /api/trips/:id/cancel
export const cancelTrip = async (req, res) => {
    try {
        const { cancellationReason } = req.body;
        const trip = await Trip.findById(req.params.id);
        
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        // Check if trip can be cancelled
        if (trip.status === 'Completed' || trip.status === 'Cancelled') {
            return res.status(400).json({ 
                message: `Trip is already ${trip.status.toLowerCase()}` 
            });
        }
        
        // Cancel all active bookings for this trip
        await Booking.updateMany(
            { trip: trip._id, status: 'Active' },
            {
                status: 'Cancelled',
                cancellationReason: `Trip cancelled: ${cancellationReason}`,
                cancelledAt: new Date()
            }
        );
        
        // Update trip status
        trip.status = 'Cancelled';
        trip.cancellationReason = cancellationReason;
        trip.cancelledBy = req.user._id;
        trip.cancelledAt = new Date();
        await trip.save();
        
        res.json({ message: 'Trip cancelled successfully', trip });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get available seats for a trip
// @route   GET /api/trips/:id/seats
export const getAvailableSeats = async (req, res) => {
    try {
        const trip = await Trip.findById(req.params.id);
        
        if (!trip) {
            return res.status(404).json({ message: 'Trip not found' });
        }
        
        res.json({
            front: trip.availableSeats.front,
            back: trip.availableSeats.back
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};