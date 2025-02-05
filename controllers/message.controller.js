import prismaPostgres from "../config/prismaPostgres.config.js"; // Prisma
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js"; //Mongodb

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { chatId, content } = req.body;
        const senderId = req.user.userId; // Got this from authentication token

        if (!chatId || !content) {
            return res
                .status(400)
                .json({ message: "Chat id or content is missing" });
        }

        // Fetch the chat details using chatId
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(400).json({ message: "Chat not found" });
        }

        // Extract user ID(s) from the chat
        const chatUserIds = chat.users; // This contains an array of user IDs

        // Check if sender is blocked by any user in the chat
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

        // Fetch sender details from PostgreSQL
        const sender = await prismaPostgres.user.findUnique({
            where: { id: senderId },
            select: { id: true, username: true, email: true, avatarUrl: true },
        });

        // Create a new message in MongoDB
        var message = await Message.create({
            sender: senderId,
            content,
            chat: chatId,
        });

        // Populate chat details
        message = await message.populate("chat");

        // Update latest message in chat
        await Chat.findByIdAndUpdate(chatId, { latestMessage: message });

        // Remove unnecessary fields before sending the response
        const filteredMessage = {
            _id: message._id,
            sender: sender, // Attach sender details instead of just senderId
            content: message.content,
            chat: message.chat._id,
        };

        return res.status(201).json(filteredMessage);
    } catch (error) {
        console.log(`Error while sending message: ${error}`);
        return res.status(500).json({ message: "Failed to send message." });
    }
};

// Get all message for chat
export const getMessagesOfChat = async (req, res) => {
    try {
        const { chatId } = req.params;

        // Fetch messages from MongoDB
        const messages = await Message.find({ chat: chatId });

        // Extract unique sender IDs
        const senderIds = [...new Set(messages.map((msg) => msg.sender))];

        // Fetch user details from PostgreSQL
        const users = await prismaPostgres.user.findMany({
            where: { id: { in: senderIds } },
            select: { id: true, username: true, email: true, avatarUrl: true },
        });

        // Create a map for quick lookup
        const userMap = Object.fromEntries(
            users.map((user) => [user.id, user])
        );

        // Attach user details to messages and remove unwanted fields
        const populatedMessages = messages.map(({ _doc }) => ({
            _id: _doc._id,
            sender: userMap[_doc.sender] || _doc.sender, // Replace sender ID with user details
            content: _doc.content,
            chat: _doc.chat,
        }));

        return res.status(200).json(populatedMessages);
    } catch (error) {
        console.log(`Error while fetching messages: ${error}`);
        return res.status(500).json({ message: "Failed to fetch messages." });
    }
};

// Edit message
export const editMessage = async (req, res) => {
    try {
        const { content, messageId } = req.body;
        const senderId = req.user.userId; // Got this from authentication token

        if (!messageId || !content) {
            return res.status(400).json({
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

        // Update the message content
        var updatedMessage = await Message.findByIdAndUpdate(
            messageId,
            { content },
            { new: true }
        );

        // Populate chat details
        updatedMessage = await updatedMessage.populate("chat");

        // Fetch sender details from PostgreSQL
        const sender = await prismaPostgres.user.findUnique({
            where: { id: senderId },
            select: { id: true, username: true, email: true, avatarUrl: true },
        });

        // Update latest message in chat if applicable
        await Chat.findByIdAndUpdate(updatedMessage.chat._id, {
            latestMessage: updatedMessage,
        });

        // Remove unnecessary fields before sending the response
        const filteredMessage = {
            _id: updatedMessage._id,
            sender: sender, // Attach sender details instead of just senderId
            content: updatedMessage.content,
            chat: updatedMessage.chat._id,
        };

        return res.status(201).json(filteredMessage);
    } catch (error) {
        console.log(`Error while editing message: ${error}`);
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
        console.log(`Error while deleting message: ${error}`);
        return res.status(500).json({ message: "Failed to delete message." });
    }
};
