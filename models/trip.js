import mongoose from "mongoose";

const tripSchema = new mongoose.Schema({
    route: {
        from: {
            type: String,
            required: true
        },
        to: {
            type: String,
            required: true
        },
        distance: Number // in km
    },
    vehicle: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    driver: {
        name: String,
        phone: String
    },
    departureDate: {
        type: Date,
        required: true
    },
    departureTime: {
        type: String,
        required: true
    },
    arrivalTime: {
        type: String,
        required: true
    },
    capacityMode: {
        type: String,
        enum: ['Normal', 'Rush'],
        default: 'Normal'
    },
    baseFare: {
        front: {
            type: Number,
            default: 1100
        },
        back: {
            type: Number,
            default: 1000
        }
    },
    availableSeats: {
        front: [String],
        back: [String]
    },
    bookedSeats: [{
        seatNumber: String,
        bookingId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking'
        }
    }],
    status: {
        type: String,
        enum: ['Scheduled', 'InProgress', 'Completed', 'Cancelled'],
        default: 'Scheduled'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    cancellationReason: String,
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancelledAt: Date
}, {
    timestamps: true
});

// Initialize available seats before saving
tripSchema.pre('save', async function(next) {
    if (this.isNew) {
        const vehicle = await mongoose.model('Vehicle').findById(this.vehicle);
        if (vehicle) {
            this.availableSeats = {
                front: [...vehicle.seatConfiguration.frontSeats.numbers],
                back: [...vehicle.seatConfiguration.backSeats.numbers]
            };
        }
    }
    next();
});

const Trip = mongoose.model('Trip', tripSchema);
export default Trip;