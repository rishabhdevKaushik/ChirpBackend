import express from "express";
import "dotenv/config";
import userRouter from "./routes/user.routes.js";
import friendreqRouter from "./routes/friendreq.routes.js";
import messageRouter from "./routes/message.routes.js";
import cors from "cors";
import cookieParser from "cookie-parser";

const PORT = process.env.PORTNUMBER || 4000;

const app = express();
app.use(express.json()); // To read JSON
app.use(cors({ origin: 'http://localhost:3000' })); // To accept requests from other ports
app.use(cookieParser()); // To parser cookies

// Routes
app.use("/api/user", userRouter);
app.use("/api/friendreq", friendreqRouter);
app.use("/api/message", messageRouter);

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
