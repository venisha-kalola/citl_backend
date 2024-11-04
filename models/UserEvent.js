const mongoose = require('mongoose');

const userEventSchema = new mongoose.Schema({
  //user: { type: mongoose.Schema.Types.ObjectId, ref: 'User',required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  eventTitle: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('UserEvent', userEventSchema);