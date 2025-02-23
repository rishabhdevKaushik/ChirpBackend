import redis from "../config/redis.config.js";
import prismaPostgres from "../config/prismaPostgres.config.js";
import Chat from "../models/chat.model.js";
import Message from "../models/message.model.js";
import { populateChat, populateMessage } from "./userUtils.js";

const setRedis = async (key, value, ttl = 600) => {
    await redis.set(key, value, "EX", ttl);
};

const getRedis = async (key) => {
    return await redis.get(key);
};

// Message
export const setMessageRedis = async (message) => {
    setRedis(`message:${message._id}`, JSON.stringify(message));
};

export const getMessageRedis = async (messageId) => {
    const message = await getRedis(`message:${messageId}`);
    if (message) {
        return message;
    }

    const messageFromDB = await Message.findById(messageId);
    const populatedMessage = await populateMessage(messageFromDB);
    await setMessageRedis(populatedMessage);
    return populatedMessage;
};

// Chat
export const setChatRedis = async (chat) => {
    setRedis(`chat:${chat._id}`, JSON.stringify(chat));
};

export const getChatRedis = async (chatId) => {
    const chat = await getRedis(`chat:${chatId}`);
    if (chat) {
        return chat;
    }

    const chatFromDB = await Chat.findById(chatId);
    const populatedChat = await populateChat(chatFromDB);
    await setChatRedis(populatedChat);
    return populatedChat;
};

// User
export const setUserRedis = async (user) => {
    setRedis(`user:${user.id}`, JSON.stringify(user));
};

export const getUserRedis = async (userId) => {
    const user = await getRedis(`user:${userId}`);
    if (user) {
        return user;
    }

    const userFromDB = await prismaPostgres.user.findUnique({
        where: { id: userId },
    });
    await setUserRedis(userFromDB);
    return userFromDB;
};
