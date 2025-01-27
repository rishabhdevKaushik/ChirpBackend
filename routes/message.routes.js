import express from "express";
import upload from "../config/multer.config.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    deleteMessage,
    receiveMessages,
    seeAllMessages,
    sendMessage,
    updateMessage,
} from "../controllers/message.controller.js";

const messageRouter = express.Router();

// Send message
messageRouter.post(
    "/sendtouser",
    [authenticateToken, upload.single("file")],
    sendMessage
    
);

// Receive message
messageRouter.post("/receive", authenticateToken, receiveMessages);

// See all message
messageRouter.post("/seeall", authenticateToken, seeAllMessages);

// Update message
messageRouter.post(
    "/update",
    [authenticateToken, upload.single("file")],
    updateMessage
);

// Delete message
messageRouter.post("/delete", authenticateToken, deleteMessage);

export default messageRouter;
