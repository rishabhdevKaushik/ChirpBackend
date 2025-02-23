import prismaPostgres from "../config/prismaPostgres.config.js";
import Chat from "../models/chat.model.js";
import { getUsersByUsernames, populateChat } from "../utility/userUtils.js";
import { setChatRedis } from "../utility/redisCache.js";

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
            const populatedChat = await populateChat(
                chat,
                parseInt(req.user.userId)
            );
            return res.status(200).json(populatedChat);
        }

        // Create new chat if not found
        const chatData = {
            chatName: "sender",
            isGroup: false,
            users: [req.user.userId, user.id],
        };

        const createdChat = await Chat.create(chatData);
        const populatedChat = await populateChat(createdChat);
        await setChatRedis(populatedChat);

        return res.status(201).json(populatedChat);
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

        // Populate users for each chat using the existing utility function
        const populatedChats = await Promise.all(
            chats.map((chat) => populateChat(chat))
        );

        return res.status(200).json(populatedChats);
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

        // Add the current user's ID to the array
        userIds.push(parseInt(req.user.userId));

        const groupChat = await Chat.create({
            chatName: req.body.name,
            isGroup: true,
            users: userIds,
            groupAdmin: req.user.userId,
        });

        const populatedGroupChat = await populateChat(groupChat);

        return res.status(200).send({
            chat: populatedGroupChat,
            message: "Group chat created successfully",
        });
    } catch (error) {
        console.log(`Error while creating group chat: ${error}`);
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

        if (chat.groupAdmin !== req.user.userId || !chat.isGroup) {
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

        const populatedUpdatedChat = await populateChat(updatedChat);
        await setChatRedis(populatedUpdatedChat);

        return res.status(200).send(populatedUpdatedChat);
    } catch (error) {
        console.log(`Error while updating group chat: ${error}`);
        return res.status(500).json({ message: "Failed update group chat." });
    }
};

// Remove Users from Group Chat
export const removeUserFromGroupChat = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { usernameToRemove } = req.body;

        const chat = await Chat.findById(chatId);
        if (!chat) {
            return res.status(400).send({ message: "Chat not found" });
        }

        if (chat.groupAdmin !== req.user.userId) {
            return res.status(403).send({
                message: "You do not have permission to perform this action",
            });
        }

        const usersToRemove = await getUsersByUsernames([usernameToRemove]);
        if (usersToRemove.length === 0) {
            return res.status(400).send({ message: "User not found" });
        }

        const userIdsToRemove = usersToRemove.map((user) => user.id);

        chat.users = chat.users.filter(
            (userId) => !userIdsToRemove.includes(userId)
        );

        if (userIdsToRemove.includes(chat.groupAdmin)) {
            return res.status(400).send({
                message: "Admin cannot remove themselves from the group",
            });
        }

        const updatedChat = await chat.save({ new: true });
        // Populate the users in the updated chat
        const populatedChat = await populateChat(updatedChat);
        await setChatRedis(populatedChat);

        return res.status(200).json({
            message: "User removed successfully.",
            chat: populatedChat,
        });
    } catch (error) {
        console.log(`Error while removeing user from: ${error}`);
        return res
            .status(500)
            .json({ message: "Failed to remove user from the chat." });
    }
};
