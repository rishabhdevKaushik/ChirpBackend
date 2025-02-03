import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    accessChat,
    createGroupChat,
    fetchChats,
    removeUserFromGroupChat,
    updateGroupChat,
} from "../controllers/chat.controller.js";

const chatRouter = express.Router();

// Access Chats
chatRouter.post("/chats", authenticateToken, accessChat);

// Fetch Chats
chatRouter.get("/chats", authenticateToken, fetchChats);

// Create Group Chat
chatRouter.post("/group", authenticateToken, createGroupChat);

// Update Group Chat
chatRouter.put("/group", authenticateToken, updateGroupChat);

// Remove Users from Group Chat
chatRouter.delete(
    "/group/:chatId/",
    authenticateToken,
    removeUserFromGroupChat
);

export default chatRouter;
