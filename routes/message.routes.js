import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    addReaction,
    addUserToGroupChat,
    createChat,
    deleteMessage,
    editMessage,
    getUnreadMessageCount,
    leaveChat,
    markAsRead,
    receiveMessages,
    removeReaction,
    removeUserFromGroupChat,
    retrieveChats,
    searchMessages,
    sendMessage,
    togglePinMessage,
    typingIndicator,
    uploadAttachments,
} from "../controllers/message.controller.js";

const messageRouter = express.Router();

// Create Chats
messageRouter.post("/chats", authenticateToken, createChat);

// Retrieve Chats
messageRouter.get("/chats", authenticateToken, retrieveChats);

// Fetch Unread Message Count
messageRouter.get("/unread", authenticateToken, getUnreadMessageCount);

// Send message
messageRouter.post("/send", authenticateToken, sendMessage);

// Mark as read
messageRouter.put("/:messageId/read", authenticateToken, markAsRead);

// Edit message
messageRouter.put("/:messageId", authenticateToken, editMessage);

// Delete message
messageRouter.delete("/:messageId", authenticateToken, deleteMessage);

// Typing Indicator
messageRouter.put("/:chatId/typing", authenticateToken, typingIndicator);

// Pin/Unpin a Message
messageRouter.put("/:messageId/pin", authenticateToken, togglePinMessage);

// Search Messages
messageRouter.get("/search", authenticateToken, searchMessages);

// Leave Chat (For Group Chats)
messageRouter.delete("/:chatId/leave", authenticateToken, leaveChat);

// Add Users to Group Chat
messageRouter.post(
    "/:chatId/participants",
    authenticateToken,
    addUserToGroupChat
);

// Remove Users from Group Chat
messageRouter.delete(
    "/:chatId/participants",
    authenticateToken,
    removeUserFromGroupChat
);

// Add reaction to Message
messageRouter.post("/:messageId/react", authenticateToken, addReaction);

// Remove reaction to Message
messageRouter.delete(
    "/:messageId/react/:reactionId",
    authenticateToken,
    removeReaction
);

// Upload attachments
messageRouter.post("/upload", authenticateToken, uploadAttachments);

// Receive message
messageRouter.get("/:chatId", authenticateToken, receiveMessages);

export default messageRouter;
