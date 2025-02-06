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
    socket.on("setup", (userId) => {
        socket.join(userId);
        socket.emit("connected");
    });

    socket.on("join chat", (chatid) => {
        socket.join(chatid);
        socket.emit("connected");
    });


    socket.on("new message", async (newMessageRecieved) => {
        try {
            const message = await Message.findById(
                newMessageRecieved._id
            ).populate("chat");

            if (!message || !message.chat) {
                console.error("Message or chat not found");
                return;
            }

            message.chat.users.forEach((userid) => {
                if (!userid) return;
                // if (userid === message.sender) return;

                socket.to(userid).emit("message received", message);
            });
        } catch (error) {
            console.error("Error fetching message:", error);
        }
    });

    socket.on("typing", (chatid) => socket.in(chatid).emit("typing"));
    socket.on("stop typing", (chatid) => socket.in(chatid).emit("stop typing"));

    socket.on("disconnect", () => {});
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
