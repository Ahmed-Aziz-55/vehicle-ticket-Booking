// notifications.routes.js
const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');

// Get all notifications for admin
router.get('/admin', async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get notifications for specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      userId: req.params.userId 
    }).sort({ createdAt: -1 });
    res.json({ success: true, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create notification
router.post('/', async (req, res) => {
  try {
    const notification = new Notification(req.body);
    await notification.save();
    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.put('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all as read
router.put('/mark-all-read', async (req, res) => {
  try {
    await Notification.updateMany(
      { isRead: false },
      { isRead: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Confirm booking
router.put('/bookings/:id/confirm', async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { 
        status: 'confirmed',
        paymentStatus: 'Paid',
        confirmedAt: new Date()
      },
      { new: true }
    );
    res.json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});