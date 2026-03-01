import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
    registrationNumber: {
        type: String,
        required: true,
        unique: true
    },
    vehicleType: {
        type: String,
        required: true,
        enum: ['bus', 'coaster', 'hiace']
    },
    totalSeats: {
        type: Number,
        required: true,
        min: 10,
        max: 50
    },
    seatConfiguration: {
        frontSeats: {
            count: Number,
            numbers: [String] // e.g., ['F1', 'F2', ...]
        },
        backSeats: {
            count: Number,
            numbers: [String] // e.g., ['B1', 'B2', ...]
        }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Generate seat numbers based on configuration
vehicleSchema.pre('save', function () {
    if (this.isModified('totalSeats')) {
        const frontCount = Math.ceil(this.totalSeats * 0.4); // 40% front seats
        const backCount = this.totalSeats - frontCount;

        this.seatConfiguration = {
            frontSeats: {
                count: frontCount,
                numbers: Array.from({ length: frontCount }, (_, i) => `F${i + 1}`)
            },
            backSeats: {
                count: backCount,
                numbers: Array.from({ length: backCount }, (_, i) => `B${i + 1}`)
            }
        };
    }
});

const Vehicle = mongoose.model('Vehicle', vehicleSchema);
export default Vehicle;