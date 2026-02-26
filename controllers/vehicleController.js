import Vehicle from "../models/vehicle.js";

// @desc    Create a new vehicle
// @route   POST /api/vehicles
export const createVehicle = async (req, res) => {
    try {
        const { registrationNumber, vehicleType, totalSeats } = req.body;
        
        const vehicleExists = await Vehicle.findOne({ registrationNumber });
        if (vehicleExists) {
            return res.status(400).json({ message: 'Vehicle already exists' });
        }
        
        const vehicle = await Vehicle.create({
            registrationNumber,
            vehicleType,
            totalSeats
        });
        
        res.status(201).json(vehicle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all vehicles
// @route   GET /api/vehicles
export const getVehicles = async (req, res) => {
    try {
        const vehicles = await Vehicle.find({ isActive: true });
        res.json(vehicles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get vehicle by ID
// @route   GET /api/vehicles/:id
export const getVehicleById = async (req, res) => {
    try {
        const vehicle = await Vehicle.findById(req.params.id);
        
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
export const updateVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        res.json(vehicle);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete vehicle (soft delete)
// @route   DELETE /api/vehicles/:id
export const deleteVehicle = async (req, res) => {
    try {
        const vehicle = await Vehicle.findByIdAndUpdate(
            req.params.id,
            { isActive: false },
            { new: true }
        );
        
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }
        
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};