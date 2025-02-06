import express from "express";
import "dotenv/config";
import userRouter from "./routes/user.routes.js";
import friendreqRouter from "./routes/friendreq.routes.js";
import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/message.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http"; // Import createServer from 'http'
import { Server } from "socket.io"; // Ensure Server is imported from socket.io
import connectDB from "./config/mongo.config.js";
import "./utility/tokenCleanup.js"; // Cleaning up revoked or expired tokens
import Message from "./models/message.model.js";

const PORT = process.env.PORTNUMBER;

connectDB(); // Connecting to mongoDB server for messages
const app = express();
app.use(express.json()); // To read JSON
app.use(cookieParser()); // To parse cookies
app.use(
    cors({
        origin: "*",
        credentials: true, // Allow credentials like cookies
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app); // Now this works since createServer is imported
const io = new Server(httpServer, {
    pingTimeout: 60000, // Ends connection after 60s of no requests
    cors: {
        origin: "*",
        credentials: true, // Allow credentials like cookies
        methods: ["GET", "POST", "PUT", "DELETE"],
    },
});

// Middleware to pass Socket.IO instance to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use("/api/user", userRouter);
app.use("/api/friendreq", friendreqRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);

// Socket.IO connection handler
io.on("connection", (socket) => {
    // When a user sets up their socket connection with their userId
    socket.on("setup", (userId) => {
        socket.join(userId); // Join the userId room
        
        socket.emit("connected"); // Emit a connected event back to the client
    });

    // When a user joins a chat
    socket.on("join chat", (chatid) => {
        socket.join(chatid); // Join the chat room
        socket.emit("connected"); // Emit a connected event back to the client
    });

    // When a new message is received
    socket.on("new message", async (newMessageReceived) => {
        try {
            // Fetch the message from the database
            const message = await Message.findById(newMessageReceived._id).populate("chat");

            // Check if the message and chat exist
            if (!message || !message.chat) {
                console.error("Message or chat not found");
                return;
            }

            // Emit the message to all users in the chat
            message.chat.users.forEach((userid) => {
                // if (!userid || userid.toString() === message.sender.toString()) return; // Skip if no userId or if it's the sender
                
                // Emit the message to the user
                socket.to(userid).emit("message received", message);
            });
        } catch (error) {
            console.error("Error fetching message:", error);
        }
    });

    // Handle typing events
    socket.on("typing", (chatid) => {
        socket.in(chatid).emit("typing"); // Emit typing event to the chat room
    });

    socket.on("stop typing", (chatid) => {
        socket.in(chatid).emit("stop typing"); // Emit stop typing event to the chat room
    });

    // Handle disconnection
    socket.on("disconnect", () => {
        console.log("User  disconnected");
    });
});

// Start the server
httpServer.listen(PORT, () => {
    // console.log(`Server is running on port ${PORT}`);
});

export { io };

// // Start server without socket io
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
