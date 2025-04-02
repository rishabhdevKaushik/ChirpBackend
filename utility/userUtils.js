import prismaPostgres from "../config/prismaPostgres.config.js";
import Message from "../models/message.model.js";

// Get multiple users from username array
export const getUsersByUsernames = async (usernames) => {
    try {
        const users = await prismaPostgres.user.findMany({
            where: { username: { in: usernames } },
        });

        if (users.length !== usernames.length) {
            throw new Error("Some users not found.");
        }

        return users; // Returns array of user objects
    } catch (error) {
        console.log("Error fetching users:", error);
    }
};

// Get single user by username
export const getUserByUsername = async (username) => {
    try {
        const user = await prismaPostgres.user.findUnique({
            where: { username },
        });

        if (!user) {
            throw new Error("User not found");
        }

        return user;
    } catch (error) {
        console.log(`Error fetching user ${username}:`, error);
    }
};

// Populate chat with users
export const populateChat = async (chat) => {
    try {
        const chatObj = chat.toObject ? chat.toObject() : chat;
        const userIds = [...new Set(chatObj.users)];

        const users = await prismaPostgres.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatarUrl: true,
            },
        });

        // Create a map for quick user lookup with default values for missing users
        const userMap = new Map(users.map((user) => [user.id, user]));

        // Replace user IDs with user objects or default values if user not found
        chatObj.users = chatObj.users.map(
            (userId) =>
                userMap.get(userId) || {
                    id: userId,
                    email: "chirp.user@email.com",
                    username: "chirpuser",
                    name: "Chirp User",
                    avatarUrl: null,
                }
        );

        return chatObj;
    } catch (error) {
        console.log(`Error populating chat with users: ${error}`);
    }
};

// Populate message with sender, chat and chat.users
export const populateMessage = async (message) => {
    try {
        const user = await prismaPostgres.user.findUnique({
            where: { id: message.sender },
            select: {
                id: true,
                username: true,
                email: true,
                name: true,
                avatarUrl: true,
            },
        });

        // First populate the chat
        const populatedMessage = await Message.findById(message._id)
            .populate("chat")
            .lean();

        // Now populate the users in the chat
        const chatObj = await populateChat(populatedMessage.chat);
        populatedMessage.chat = chatObj;

        // Add the sender's user information
        populatedMessage.sender = user;
        

        return populatedMessage;
    } catch (error) {
        console.log(`Error populating message with sender, chat and users: ${error}`);
    }
};
