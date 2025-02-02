import cloudinary from "../config/cloudinary.config.js";
import removeFile from "../utility/removeFile.js";

import prismaPostgres from "../config/prismaPostgres.config.js"; // PostgreSQL client
import prismaMongo from "../config/prismaMongo.config.js"; // MongoDB client

import { io } from "../app.js"; // Import Socket.IO instance

// Create Chat
export const createChat = async (req, res) => {
    try {
        const { participants = [], isGroup, name } = req.body;
        const userId = req.user.userId;
        const user = await prismaPostgres.user.findFirst({
            where: { id: userId },
        });
        
        participants.push(user.username);

        // For one-on-one chat, ensure that participants are two users
        if (!isGroup && participants.length !== 2) {
            return res.status(400).json({
                message: "One-on-one chat requires exactly two participants.",
            });
        }

        // Sort participants to ensure chat ID is unique and consistent (for one-on-one chat)
        if (!isGroup) {
            participants.sort();
        }

        // Generate a unique chat ID for one-on-one chat
        const chatId = isGroup ? name : `${participants[0]}-${participants[1]}`;

        console.log(prismaMongo);
        

        // Create a new chat in MongoDB
        const chat = await prismaMongo.chat.create({
            data: {
                chatId, // Save the unique chatId
                participants,
                isGroup,
                name: isGroup ? name : null,
                createdAt: new Date(),
            },
        });

        return res.status(201).json(chat);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to create chat." });
    }
};

// Retrieve Chats
export const retrieveChats = async (req, res) => {
    try {
        const { userId } = req.query;

        // Fetch chats that include the user
        const chats = await prismaMongo.chat.findMany({
            where: {
                participants: { has: userId },
            },
            orderBy: { updatedAt: "desc" },
        });

        return res.status(200).json(chats);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to fetch chats." });
    }
};

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { chatId, content, attachments } = req.body;
        const senderId = req.user.userId; //got this from authentication token

        const relation = await prismaPostgres.friendRelation.findFirst({
            where: {
                OR: [
                    { userId: senderId, friendId: chatId },
                    { userId: chatId, friendId: senderId },
                ],
                type: "BLOCKED",
            },
        });
        if (relation)
            return res.status(403).json({ message: "Sender is blocked." });

        const message = await prismaMongo.message.create({
            data: {
                chatId,
                senderId,
                content,
                attachments,
                timestamp: new Date(),
            },
        });

        // Broadcast the message to other participants
        io.to(chatId).emit("newMessage", message);

        return res.status(201).json(message);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to send message." });
    }
};

// Receive Messages
export const receiveMessages = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Fetch messages from MongoDB
        const messages = await prismaMongo.message.findMany({
            where: { chatId },
            orderBy: { timestamp: "asc" },
        });

        return res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to fetch messages." });
    }
};

// Mark as Read
export const markAsRead = async (req, res) => {
    try {
        const { messageId } = req.params;

        const updatedMessage = await prismaMongo.message.update({
            where: { id: messageId },
            data: { read: true },
        });

        // Emit a read receipt to the chat
        io.emit("messageRead", { messageId });

        return res.status(200).json({ message: "Message marked as read." });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to mark message as read." });
    }
};

// Edit Message
export const editMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { content } = req.body;

        // Update message in MongoDB
        const updatedMessage = await prismaMongo.message.update({
            where: { id: messageId },
            data: { content },
        });

        return res.status(200).json(updatedMessage);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to edit message." });
    }
};

// Delete Message
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        // Delete message from MongoDB
        await prismaMongo.message.delete({
            where: { id: messageId },
        });

        return res
            .status(200)
            .json({ message: "Message deleted successfully." });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to delete message." });
    }
};

// Upload Attachments
export const uploadAttachments = async (req, res) => {
    try {
        const { file } = req; // Assuming multer handles the file upload
        if (!file)
            return res.status(400).json({ message: "No file uploaded." });

        // Process the file (e.g., store in cloud storage or MongoDB GridFS)
        const attachmentUrl = `uploads/${file.filename}`; // Placeholder logic

        return res.status(201).json({ url: attachmentUrl });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to upload attachment." });
    }
};

// Pin/Unpin a Message
export const togglePinMessage = async (req, res) => {
    try {
        const { messageId } = req.params;

        // Toggle pin status in MongoDB
        const message = await prismaMongo.message.findUnique({
            where: { id: messageId },
        });

        if (!message)
            return res.status(404).json({ message: "Message not found." });

        const updatedMessage = await prismaMongo.message.update({
            where: { id: messageId },
            data: { pinned: !message.pinned },
        });

        return res.status(200).json(updatedMessage);
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to toggle pin status." });
    }
};

// Typing Indicator
export const typingIndicator = async (req, res) => {
    try {
        const { chatId, userId, typing } = req.body;

        // Emit typing status to participants in the chat
        io.to(chatId).emit("typingIndicator", { userId, typing });

        return res.status(200).json({
            message: `User ${userId} is ${
                typing ? "typing..." : "not typing"
            }.`,
        });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to update typing indicator." });
    }
};

// Fetch Unread Message Count
export const getUnreadMessageCount = async (req, res) => {
    try {
        const { userId } = req.query;

        // Fetch unread messages for the user
        const unreadCount = await prismaMongo.message.count({
            where: { recipientId: userId, read: false },
        });

        return res.status(200).json({ unreadCount });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to fetch unread messages." });
    }
};

// Search Messages
export const searchMessages = async (req, res) => {
    try {
        const { chatId, query } = req.query;

        // Search messages within a chat in MongoDB
        const messages = await prismaMongo.message.findMany({
            where: {
                chatId,
                content: { contains: query, mode: "insensitive" },
            },
            orderBy: { timestamp: "desc" },
        });

        return res.status(200).json(messages);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to search messages." });
    }
};

// Leave Chat (Group Chats)
export const leaveChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        const chat = await prismaMongo.chat.findUnique({
            where: { id: chatId },
        });

        if (!chat) return res.status(404).json({ message: "Chat not found." });

        const updatedChat = await prismaMongo.chat.update({
            where: { id: chatId },
            data: {
                participants: {
                    set: chat.participants.filter(
                        (participant) => participant !== userId
                    ),
                },
            },
        });

        // Notify participants about the user leaving
        io.to(chatId).emit("userLeft", { chatId, userId });

        return res.status(200).json({
            message: "Left the chat successfully.",
            chat: updatedChat,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to leave the chat." });
    }
};

// Add Users to Group Chat
export const addUserToGroupChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userIds } = req.body;

        // Add users to participants in MongoDB
        const chat = await prismaMongo.chat.findUnique({
            where: { id: chatId },
        });

        if (!chat) return res.status(404).json({ message: "Chat not found." });

        const updatedChat = await prismaMongo.chat.update({
            where: { id: chatId },
            data: {
                participants: {
                    set: [...new Set([...chat.participants, ...userIds])], // Ensure no duplicates
                },
            },
        });

        return res
            .status(200)
            .json({ message: "Users added successfully.", chat: updatedChat });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to add users to the chat." });
    }
};

// Remove Users from Group Chat
export const removeUserFromGroupChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { userId } = req.body;

        // Remove user from participants in MongoDB
        const chat = await prismaMongo.chat.findUnique({
            where: { id: chatId },
        });

        if (!chat) return res.status(404).json({ message: "Chat not found." });

        const updatedChat = await prismaMongo.chat.update({
            where: { id: chatId },
            data: {
                participants: {
                    set: chat.participants.filter(
                        (participant) => participant !== userId
                    ),
                },
            },
        });

        return res
            .status(200)
            .json({ message: "User removed successfully.", chat: updatedChat });
    } catch (error) {
        console.error(error);
        return res
            .status(500)
            .json({ message: "Failed to remove user from the chat." });
    }
};

// React to Message
export const addReaction = async (req, res) => {
    try {
        const { messageId } = req.params;
        const { userId, reaction } = req.body;

        const updatedMessage = await prismaMongo.message.update({
            where: { id: messageId },
            data: {
                reactions: {
                    push: { userId, reaction },
                },
            },
        });

        // Broadcast reaction to participants
        io.emit("reactionAdded", { messageId, userId, reaction });

        return res.status(200).json(updatedMessage);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to add reaction." });
    }
};

// Remove Reaction
export const removeReaction = async (req, res) => {
    try {
        const { messageId, reactionId } = req.params;

        const message = await prismaMongo.message.findUnique({
            where: { id: messageId },
        });

        if (!message)
            return res.status(404).json({ message: "Message not found." });

        const updatedMessage = await prismaMongo.message.update({
            where: { id: messageId },
            data: {
                reactions: {
                    set: message.reactions.filter(
                        (reaction) => reaction.id !== reactionId
                    ),
                },
            },
        });

        // Broadcast reaction removal
        io.emit("reactionRemoved", { messageId, reactionId });

        return res.status(200).json(updatedMessage);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Failed to remove reaction." });
    }
};
