import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    deleteMessage,
    editMessage,
    getMessagesOfChat,
    sendMessage,
} from "../controllers/message.controller.js";

const messageRouter = express.Router();

// Send message
messageRouter.post("/", authenticateToken, sendMessage);

// Get all messages for chat
messageRouter.get("/:chatId", authenticateToken, getMessagesOfChat);

// Edit message
messageRouter.put("/", authenticateToken, editMessage);

// Delete message
messageRouter.delete("/:messageId", authenticateToken, deleteMessage);

export default messageRouter;
