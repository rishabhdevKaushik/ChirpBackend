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
            return res.status(404).send({ message: "Username required" });
        }
        // Look up the user by username
        const user = await prismaPostgres.user.findUnique({
            where: {
                username: username,
            },
        });
        // If the user doesn't exist
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Does chat exist
        let isChat = await Chat.find({
            isGroup: false,
            users: { $all: [req.user.userId, user.id] },
        }).populate("latestMessage");

        if (isChat.length > 0) {
            return res.status(200).send(isChat[0]);
        } else {
            var chatData = {
                chatName: "sender",
                isGroup: false,
                users: [req.user.userId, user.id],
            };

            const createdChat = await Chat.create(chatData);

            return res.status(200).send(createdChat);
        }
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Failed to create chat." });
    }
};

// Fetch Chats
export const fetchChats = async (req, res) => {
    try {
        const chats = await Chat.find({
            users: { $elemMatch: { $eq: req.user.userId } },
        }).populate("latestMessage");

        return res.status(200).json(chats);
    } catch (error) {
        console.log(error);
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
            return res
                .status(403)
                .send({
                    message:
                        "You do not have permission to perform this action",
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
            return res
                .status(400)
                .send({
                    message: "Admin cannot remove themselves from the group",
                });
        }

        // Save the updated chat
        const updatedChat = await chat.save({new: true});

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
