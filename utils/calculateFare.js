export const calculateFare = (seatType, capacityMode = 'Normal') => {
    const baseFares = {
        front: 1100,
        back: 1000
    };
    
    let fare = baseFares[seatType];
    
    // Apply rush hour multiplier if needed
    if (capacityMode === 'Rush') {
        fare = Math.round(fare * 1.2); // 20% increase during rush hours
    }
    
    return fare;
};