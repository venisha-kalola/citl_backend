// const mongoose = require('mongoose');

// const eventSchema = new mongoose.Schema({
//   title: String,
//   description: String,
//   date: Date,
//   location: String,
//   attendees: Number,
//   image: String,
// });

// module.exports = mongoose.model('Event', eventSchema);

// const mongoose = require('mongoose');

// const eventSchema = new mongoose.Schema({
//   title: { type: String, required: true },
//   description: { type: String, required: true },
//   date: { type: Date, required: true },
//   location: { type: String, required: true },
//   attendees: { type: Number, default: 0 },
//   image: { type: String, required: true },
//   startTime: { type: String, required: true },
//   endTime: { type: String, required: true },
//   ticketType: { type: String, enum: ['free', 'ticketed'], required: true },
//   ticketName: { type: String },
//   ticketPrice: { type: Number },
// });

// module.exports = mongoose.model('Event', eventSchema);

const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  //date: { type: Date, required: true },
  location: { type: String, required: true },
  // attendees: { type: Number, default: 0 },
  // image: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  ticketType: { type: String, enum: ['free', 'ticketed'], required: true },
  ticketName: { type: String },
  ticketPrice: { type: Number },
  category: { type: String, required: true },
  eventType: { type: String, enum: ['single', 'recurring'], required: true },
  session: { type: String },
});

module.exports = mongoose.model('Event', eventSchema);