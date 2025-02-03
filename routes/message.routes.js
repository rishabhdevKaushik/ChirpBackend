import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    getMessagesOfChat,
    sendMessage,
} from "../controllers/message.controller.js";

const messageRouter = express.Router();

// Send message
messageRouter.post("/", authenticateToken, sendMessage);

// Get all messages for chat
messageRouter.get("/:chatId", authenticateToken, getMessagesOfChat);

export default messageRouter;
