import cloudinary from "../config/cloudinary.config.js";
import removeFile from "../utility/removeFile.js";
import { io } from "../app.js"; // Import Socket.IO instance

import prismaPostgres from "../config/prismaPostgres.config.js"; // PostgreSQL client

// For MongoDB
import Chat from "../models/chat.model.js";
import { getUsersByUsernames } from "../utility/userUtils.js";

// Access Chat - creates new if doesn't exist or returns previous
export const accessChat = async (req, res) => {
    try {
        const { username } = req.body;

        if (!username) {
            return res.status(400).json({ message: "Username is required" });
        }

        // Look up the user by username in PostgreSQL
        const user = await prismaPostgres.user.findUnique({
            where: { username },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the chat already exists in MongoDB
        let chat = await Chat.findOne({
            isGroup: false,
            users: { $all: [req.user.userId, user.id] },
        }).populate("latestMessage");

        if (chat) {
            return res.status(200).json(chat);
        }

        // Create new chat if not found
        const chatData = {
            chatName: "sender",
            isGroup: false,
            users: [req.user.userId, user.id],
        };

        const createdChat = await Chat.create(chatData);

        return res.status(201).json(createdChat);
    } catch (error) {
        console.error("Error accessing chat:", error);
        return res.status(500).json({ message: "Failed to access chat" });
    }
};

// Fetch Chats
export const fetchChats = async (req, res) => {
    try {
        // Fetch chats where the current user is a participant
        const chats = await Chat.find({
            users: { $elemMatch: { $eq: req.user.userId } },
        }).populate("latestMessage");

        if (!chats || chats.length === 0) {
            return res.status(200).json({ message: "No chats found." });
        }

        // Extract unique user IDs from chats
        const userIds = [
            ...new Set(chats.flatMap((chat) => chat.users)), // Flatten and remove duplicates
        ];

        // Fetch user details from PostgreSQL
        const usersFromPostgres = await prismaPostgres.user.findMany({
            where: { id: { in: userIds } },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatarUrl: true, // Include only necessary fields
            },
        });

        // Convert user list to a map for quick lookup
        const userMap = new Map(usersFromPostgres.map((u) => [u.id, u]));

        // Remove unnecessary fields from chat response
        const sanitizedChats = chats.map((chat) => ({
            _id: chat._id,
            chatName: chat.chatName,
            isGroup: chat.isGroup,
            users: chat.users.map((userId) => userMap.get(userId) || userId),
            latestMessage: chat.latestMessage,
        }));

        return res.status(200).json(sanitizedChats);
    } catch (error) {
        console.error("Error fetching chats:", error);
        return res.status(500).json({ message: "Failed to fetch chats." });
    }
};

// Create Group Chat
export const createGroupChat = async (req, res) => {
    try {
        if (!req.body.usernames || !req.body.name) {
            return res
                .status(400)
                .send({ message: "Participants Or name of group is missing" });
        }

        var usernames = req.body.usernames;

        // If less than 2 users
        if (usernames.length < 2) {
            return res.status(400).send({
                message: "More than 2 users are required to start a group chat",
            });
        }

        // Fetch user details using the utility function
        var users = await getUsersByUsernames(usernames);

        // Convert the list of users to an array of user IDs
        var userIds = users.map((user) => user.id);

        // Add the current user’s ID to the array
        userIds.push(req.user.userId);

        const groupChat = await Chat.create({
            chatName: req.body.name,
            isGroup: true,
            users: userIds,
            groupAdmin: req.user.userId,
        });

        return res.status(200).send(groupChat);
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ message: "Could not create Group chat." });
    }
};

// Update Group Chat
export const updateGroupChat = async (req, res) => {
    try {
        const { chatId, newChatName, usernamesToAdd } = req.body;

        // Fetch chat by ID
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(400).send({ message: "Chat not found" });
        }

        if (chat.groupAdmin !== req.user.userId) {
            return res.status(403).send({
                message: "You do not have permission to perform this action",
            });
        }
        let updateData = {};

        // If newChatName is provided, update chat name
        if (newChatName) {
            updateData.chatName = newChatName;
        }

        // If usernamesToAdd is provided, fetch their user IDs and add them to the chat
        if (usernamesToAdd && usernamesToAdd.length > 0) {
            const usersToAdd = await getUsersByUsernames(usernamesToAdd);
            const userIdsToAdd = usersToAdd.map((user) => user.id);

            // Avoid duplicates by merging arrays with Set
            updateData.users = [...new Set([...chat.users, ...userIdsToAdd])];
        }

        // Update the chat with the new data
        const updatedChat = await Chat.findByIdAndUpdate(chat._id, updateData, {
            new: true,
        });

        if (!updatedChat) {
            return res
                .status(400)
                .send({ message: "Could not update group chat" });
        }

        return res.status(200).send(updatedChat);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed update group chat." });
    }
};

// Remove Users from Group Chat
export const removeUserFromGroupChat = async (req, res) => {
    try {
        const { chatId } = req.params; // Extract chatId from URL params
        const { usernameToRemove } = req.body; // Get username to remove from the request body

        // Fetch the group chat by ID
        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(400).send({ message: "Chat not found" });
        }

        // Check if the user is the group admin
        if (chat.groupAdmin.toString() !== req.user.userId.toString()) {
            return res.status(403).send({
                message: "You do not have permission to perform this action",
            });
        }

        // Fetch the user(s) to remove based on the username
        const usersToRemove = await getUsersByUsernames([usernameToRemove]); // You can handle multiple usernames as well
        if (usersToRemove.length === 0) {
            return res.status(400).send({ message: "User not found" });
        }

        const userIdsToRemove = usersToRemove.map((user) => user.id);

        // Remove the user from the chat's users list
        chat.users = chat.users.filter(
            (userId) => !userIdsToRemove.includes(userId)
        );

        // Prevent admin from removing themselves
        if (userIdsToRemove.includes(chat.groupAdmin)) {
            return res.status(400).send({
                message: "Admin cannot remove themselves from the group",
            });
        }

        // Save the updated chat
        const updatedChat = await chat.save({ new: true });

        return res.status(200).json({
            message: "User removed successfully.",
            chat: updatedChat,
        });
    } catch (error) {
        console.log(error);
        return res
            .status(500)
            .json({ message: "Failed to remove user from the chat." });
    }
};
