const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const eventRoutes = require("./models/EventRoutes")
const User = require("./models/User");
const UserEvent = require("./models/UserEvent"); // Add this import at the top
const http = require('http'); // Import the 'http' module
const socketio = require('socket.io');



const app = express();
const server = http.createServer(app); // Create the HTTP server

// Initialize Socket.IO *before* any other middleware that might consume the request body
const io = socketio(server, { // Pass server to socketio
  cors: {
    origin: "http://localhost:5173", // Your client URL
    methods: ["GET", "POST"],
    credentials: true
  }
});

app.use(express.json());
app.use(cookieParser());

const accessTokenSecret = "jiqwuexhuqxmujiqxr8q38q2m8u9x9x34quxrt6ytf";
const refreshTokenSecret = "jiqwuexhuqxmujiqxr8q38q2m8u9x9x34quxrt6ytt";
let refreshTokens = [];
const allowedOrigins = ['http://localhost:5173']; // Add your frontend URL

// CORS configuration
// const corsOptions = {
//     origin: allowedOrigins,
//     credentials: true, // Allow credentials (like cookies)
// };
// //Apply CORS middleware
// app.use(cors(corsOptions));

// app.use(cors({
//   origin: 'http://localhost:5173', // Your frontend URL
//   credentials: true,
//   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Type', 'Authorization']
}));


// Middleware
app.use(express.json());
app.use(cookieParser());

// Debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  next();
});

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
      return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, accessTokenSecret, (err, user) => {
      if (err) {
          return res.status(403).json({ error: "Invalid token" });
      }
      req.user = user;
      next();
  });
};

// New endpoint to get current user
app.get("/api/users/current", authenticateToken, async (req, res) => {
  try {
      const user = await User.findById(req.user.userId).select('-password');
      if (!user) {
          return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
  } catch (error) {
      res.status(500).json({ error: "Error fetching user data" });
  }
});


mongoose.connect('mongodb+srv://venishakalola:KaD65RLvTAbm6IYh@cluster0.8uujn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0')
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
    });

// mongoose.connect('mongodb://localhost/bonvoyage')
// .then(() => {
//     console.log('Connected to MongoDB');
// })
// .catch((error) => {
//     console.error('Error connecting to MongoDB:', error);
// });    
// Get current authenticated user

app.post("/api/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error signing up" });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const accessToken = jwt.sign({ userId: user._id }, accessTokenSecret, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user._id }, refreshTokenSecret, { expiresIn: '7d' });
    refreshTokens.push(refreshToken);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: false, // Set to true in production (over HTTPS)
      sameSite: 'Lax',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production (over HTTPS)
      sameSite: 'Lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({ accessToken, refreshToken });
  } catch (error) {
    res.status(500).json({ error: "Error logging in" });
  }
});



app.post("/api/token", (req, res) => {
  const { token } = req.body;
  if (!token) {
    return res.sendStatus(401);
  }
  if (!refreshTokens.includes(token)) {
    return res.sendStatus(403);
  }
  jwt.verify(token, refreshTokenSecret, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    const accessToken = jwt.sign({ userId: user.userId }, accessTokenSecret, { expiresIn: '1h' });
    res.json({ accessToken });
  });
});

app.post("/api/logout", (req, res) => {
  const { token } = req.body;
  refreshTokens = refreshTokens.filter(t => t !== token);
  res.sendStatus(204);
});



app.use(cors());

// mongoose.connect('mongodb://localhost/bonvoyage', {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Query:', req.query);
  console.log('Params:', req.params);
  console.log('Body:', req.body);
  next();
});

app.use('/api/events', eventRoutes);


// Update the registered events endpoint

app.get("/api/users/:userId/registered-events", authenticateToken, async (req, res) => {
  try {

      // Add CORS headers explicitly for this route if needed
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    // Find the user first
    const user = await User.findById(req.params.userId);
    if (!user) {
      console.log('User not found for ID:', req.params.userId);
      return res.status(404).json({ error: "User not found" });
    }
    console.log('Found user:', user.email);

    // Find UserEvents by email (since that's how they're stored)
    const userEvents = await UserEvent.find({ email: user.email })
      .populate('event')  // This will populate the full event details
      .sort({ joinedAt: -1 });

    console.log('Found userEvents:', userEvents);

    // Transform the data to match the expected format
    const events = userEvents.map(userEvent => {
      // If the event reference exists and was populated
      if (userEvent.event) {
        return {
          ...userEvent.event.toObject(),
          registeredAt: userEvent.joinedAt,
          registrationId: userEvent._id, // Including the UserEvent ID for reference
          registrantName: userEvent.name,
          registrantPhone: userEvent.phone
        };
      } else {
        // Fallback if event reference is missing
        return {
          title: userEvent.eventTitle,
          registeredAt: userEvent.joinedAt,
          registrationId: userEvent._id,
          registrantName: userEvent.name,
          registrantPhone: userEvent.phone,
          _id: userEvent.event // Original event ID
        };
      }
    });

    console.log('Formatted events:', events);
    res.json(events);
  } catch (error) {
    console.error('Error in /registered-events:', error);
    res.status(500).json({ error: "Error fetching registered events", details: error.message });
  }
});

app.get("/api/events/:eventId/members", authenticateToken, async (req, res) => {
  try {
    const eventId = req.params.eventId;
    
    // Set CORS headers explicitly for this route
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173');
    
    const members = await UserEvent.find({ event: eventId })
      .select('name email joinedAt')
      .lean();
    
    console.log('Found members:', members);
    res.json(members);
  } catch (error) {
    console.error('Error fetching event members:', error);
    res.status(500).json({ 
      error: "Error fetching event members",
      details: error.message 
    });
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('joinRoom', (eventId) => {
    socket.join(eventId);
    console.log(`User ${socket.id} joined room ${eventId}`);
    socket.to(eventId).emit('userJoined', socket.id); // Notify others of join


    socket.on('chatMessage', (message) => {
      console.log('Received message:', message);
       // Broadcast to everyone in the room, including the sender
      io.to(eventId).emit('message', {  // Use io.to() to broadcast
        user: socket.id, 
        text: message, 
        timestamp: new Date() 
      });
    });

    socket.on('disconnect', () => {
        socket.to(eventId).emit('userLeft', socket.id); // Notify others of leave
    }); // Handle disconnect within the room context
  });

  socket.on('leaveRoom', (eventId) => {
    socket.leave(eventId);
    socket.to(eventId).emit('userLeft', socket.id);
  });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));




// app.get("/api/users/:userId/registered-events", authenticateToken, async (req, res) => {
//   try {
//     // First get the user's email since we store registrations by email
//     const user = await User.findById(req.params.userId).select('email');
//     if (!user) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // Find all events this user has registered for using their email
//     const userEvents = await UserEvent.find({ email: user.email })
//       .populate({
//         path: 'event',
//         select: 'title description location startTime endTime ticketType ticketPrice category'
//       })
//       .sort({ joinedAt: -1 });

//     // Transform the data to match the expected format in the frontend
//     const events = userEvents
//       .filter(ue => ue.event) // Filter out any registrations where event might be null
//       .map(ue => ({
//         _id: ue.event._id,
//         title: ue.event.title,
//         description: ue.event.description,
//         location: ue.event.location,
//         startTime: ue.event.startTime,
//         endTime: ue.event.endTime,
//         ticketType: ue.event.ticketType,
//         ticketPrice: ue.event.ticketPrice,
//         category: ue.event.category,
//         registeredAt: ue.joinedAt,
//         registrantName: ue.name,
//         registrantPhone: ue.phone
//       }));

//     res.json(events);
//   } catch (error) {
//     console.error('Error fetching registered events:', error);
//     res.status(500).json({ 
//       error: "Error fetching registered events", 
//       details: error.message 
//     });
//   }
// });

// //Update the event registration endpoint to properly save the user reference
// app.post("/api/events/:eventId/register", async (req, res) => {
//   try {
//     const { name, email, phone } = req.body;
//     const eventId = req.params.eventId;

//     // First check if this email is already registered for this event
//     const existingRegistration = await UserEvent.findOne({
//       email: email,
//       event: eventId
//     });

//     if (existingRegistration) {
//       return res.status(400).json({
//         error: "You have already registered for this event"
//       });
//     }

//     // Get the event details
//     const event = await Event.findById(eventId);
//     if (!event) {
//       return res.status(404).json({ error: "Event not found" });
//     }

//     // Create new registration
//     const userEvent = new UserEvent({
//       name,
//       email,
//       phone,
//       event: eventId,
//       eventTitle: event.title,
//       joinedAt: new Date()
//     });

//     await userEvent.save();

//     res.status(201).json({
//       message: "Successfully registered for the event",
//       registration: userEvent
//     });
//   } catch (error) {
//     console.error('Error registering for event:', error);
//     res.status(500).json({
//       error: "Failed to register for the event",
//       details: error.message
//     });
//   }
// });