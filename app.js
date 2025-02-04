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

const PORT = process.env.PORTNUMBER;

connectDB(); // Connecting to mongoDB server for messages
const app = express();
app.use(express.json()); // To read JSON
app.use(cookieParser()); // To parse cookies

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app); // Now this works since createServer is imported
const io = new Server(httpServer, {
    pingTimeout: 60000, // Ends connection after 60s of no requests
    cors: {
        origin: "http://localhost:3000",
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
    console.log("A user connected:", socket.id);

    socket.on("setup", (userData) => {
        socket.join(userData.id);
        socket.emit("connected");
    });

    socket.on("join chat", (room) => {
        socket.join(room);
        console.log(`User joined room: ${room}`);
    });

    socket.on("new message", (newMessageRecieved) => {
        var chat = newMessageRecieved.chat;

        chat.users.forEach((user) => {
            if (user.id == newMessageRecieved.sender.id) {
                return;
            }

            socket.in(user.id).emit("message recieved", newMessageRecieved);
        });
    });

    socket.on("typing", (room) => socket.in(room).emit("typing"));
    socket.on("stop typing", (room) => socket.in(room).emit("stop typing"));
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

// Start the server
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export { io };

// // Start server without socket io
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });
