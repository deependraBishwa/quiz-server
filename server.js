const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;
// Enable CORS for cross-origin communication
app.use(cors());

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all origins for now
        methods: ["GET", "POST"]
    }
});

// Store connected users and their socket IDs
const users = {};

// Serve the list of connected users via an HTTP endpoint
app.get("/users", (req, res) => {
    res.json(Object.keys(users)); // Return only user IDs
});

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Listen for user registration (e.g., when they log in)
    socket.on("register", (userId) => {
        users[userId] = socket.id; // Map user ID to their socket ID
        console.log(`User registered: ${userId}`);
        
        // Broadcast the updated list of users to all clients
        io.emit("user_list", Object.keys(users));
    });

    // Listen for private messages
    socket.on("private_message", (data) => {
        const { senderId, recipientId, message } = data;

        // Find recipient's socket ID
        const recipientSocketId = users[recipientId];

        if (recipientSocketId) {
            // Send message to the recipient
            io.to(recipientSocketId).emit("receive_private_message", {
                senderId,
                message,
            });
        } else {
            console.log(`Recipient ${recipientId} is not online.`);
        }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
        // Remove disconnected user from the users list
        for (const userId in users) {
            if (users[userId] === socket.id) {
                delete users[userId];
                console.log(`User disconnected: ${userId}`);
                
                // Broadcast the updated list of users
                io.emit("user_list", Object.keys(users));
                break;
            }
        }
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});