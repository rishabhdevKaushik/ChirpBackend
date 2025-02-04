import prismaPostgres from "../config/prismaPostgres.config.js"; // Prisma
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js"; //Mongodb

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { chatId, content } = req.body;
        const senderId = req.user.userId; //got this from authentication token

        if (!chatId || !content) {
            return res(400).send({ message: "Chat id or content is missing" });
        }

        // Fetch the chat details using chatId
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(400).json({ message: "Chat not found" });
        }

        // Extract user ID(s) from the chat
        const chatUserIds = chat.users; // This contains an array of user IDs

        // Assuming you want to check if the sender is blocked by any user in the chat
        const relation = await prismaPostgres.friend.findFirst({
            where: {
                senderId: { in: chatUserIds }, // Match any user in the chat
                receiverId: senderId, // The sender of the message
                status: "BLOCK",
            },
        });

        if (relation) {
            return res
                .status(403)
                .json({ message: "You are blocked by this user" });
        }

        var message = await Message.create({
            sender: req.user.userId,
            content,
            chat: chatId,
        });

        message = await message.populate("chat");

        // Update latest message in chat
        await Chat.findByIdAndUpdate(chatId, {
            latestMessage: message,
        });

        return res.status(201).json(message);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to send message." });
    }
};

// Get all message for chat
export const getMessagesOfChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Fetch messages from MongoDB
        const messages = await Message.find({
            chat: chatId,
        });

        return res.status(200).json(messages);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to fetch messages." });
    }
};

// Edit message
export const editMessage = async (req, res) => {
    try {
        const { content, messageId } = req.body;
        const senderId = req.user.userId; //got this from authentication token

        if (!messageId || !content) {
            return res(400).send({
                message: "Message id or content is missing",
            });
        }

        // Fetch the message details using messageId
        const message = await Message.findById(messageId);

        if (!message || message.sender !== senderId) {
            return res
                .status(400)
                .json({ message: "Could not perform this action" });
        }

        var updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            {
                content,
            },
            {
                new: true,
            }
        );

        updatedMessage = await updatedMessage.populate("chat");

        // Update latest message in chat
        await Chat.findByIdAndUpdate(updatedMessage.chat._id, {
            latestMessage: updatedMessage,
        });

        return res.status(201).json(updatedMessage);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to edit message." });
    }
};

// Delete message
export const deleteMessage = async (req, res) => {
    try {
        const { messageId } = req.params;
        const senderId = req.user.userId; //got this from authentication token

        if (!messageId) {
            return res(400).send({
                message: "Message id is missing",
            });
        }

        // Fetch the message details using messageId
        const message = await Message.findById(messageId);

        if (!message || message.sender !== senderId) {
            return res
                .status(400)
                .json({ message: "Could not perform this action" });
        }

        var deletedMessage = await Message.findByIdAndDelete(messageId);

        return res
            .status(201)
            .send({ message: "Message deleted successfully", deletedMessage });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to delete message." });
    }
};
