import express from "express";
import "dotenv/config";
import cors from "cors";
// import cookieParser from "cookie-parser";
import { createServer } from "http";
import connectDB from "./config/mongo.config.js";
import userRouter from "./routes/user.routes.js";
import friendreqRouter from "./routes/friendreq.routes.js";
import chatRouter from "./routes/chat.routes.js";
import messageRouter from "./routes/message.routes.js";
// Cleanup tasks
import "./utility/tokenCleanup.js";
import "./utility/removeUnverifiedUsers.js";

const PORT = process.env.PORTNUMBER;

connectDB(); // Connect to MongoDB

const app = express();
app.use(express.json());
// app.use(cookieParser());
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");
app.use(
    cors({
        origin: allowedOrigins,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
    })
);

// Routes
app.use("/api/user", userRouter);
app.use("/api/friendreq", friendreqRouter);
app.use("/api/chat", chatRouter);
app.use("/api/message", messageRouter);

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.IO in a separate file
import initSocketIO from "./socketio.js";
const io = initSocketIO(httpServer);

// Make io instance available throughout the app
app.set("io", io);

httpServer.listen(PORT, () => {
    // console.log(`Server is running on port ${PORT}`);
});

export { io };
