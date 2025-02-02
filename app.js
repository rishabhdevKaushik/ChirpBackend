import express from "express";
import "dotenv/config";
import userRouter from "./routes/user.routes.js";
import friendreqRouter from "./routes/friendreq.routes.js";
import messageRouter from "./routes/message.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";  // Import createServer from 'http'
import { Server } from "socket.io";  // Ensure Server is imported from socket.io

const PORT = process.env.PORTNUMBER;

const app = express();
app.use(express.json()); // To read JSON
app.use(cookieParser()); // To parse cookies

// Create HTTP server and Socket.IO instance
const httpServer = createServer(app);  // Now this works since createServer is imported
const io = new Server(httpServer, {
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
app.use("/api/message", messageRouter);
// Socket.IO connection handler
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

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
