const express = require('express');
const router = express.Router();

// Get event messages
router.get('/events/:eventId/messages', async (req, res) => {
  try {
    const messages = await EventMessage.find({ event: req.params.eventId })
      .sort({ createdAt: 1 })
      .populate('userId', 'name');
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Send a message
router.post('/events/:eventId/messages', async (req, res) => {
  try {
    const { userId, message } = req.body;
    const user = await User.findById(userId);
    
    const newMessage = new EventMessage({
      event: req.params.eventId,
      userId,
      userName: user.name,
      message
    });

    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (error) {
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Check if user is event creator
router.get('/events/:eventId/creator', async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    const isCreator = event.createdBy.toString() === req.user._id.toString();
    res.json({ isCreator });
  } catch (error) {
    res.status(500).json({ message: 'Error checking event creator' });
  }
});

module.exports = router;