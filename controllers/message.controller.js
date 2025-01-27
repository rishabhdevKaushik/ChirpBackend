import { PrismaClient } from "@prisma/client";
import cloudinary from "../config/cloudinary.config.js";
import removeFile from "../utility/removeFile.js";

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET_KEY;
const JWT_REFRESH = process.env.JWT_REFRESH_KEY;

// Send message
export const sendMessage = async (req, res) => {
    try {
        const { text, receiverId } = req.body;
        const filePath = req.file ? req.file.path : null;
        const senderId = req.user.userId; //got this from authentication token

        // Uploading image to cloudinary
        const uploadResult = filePath
            ? await cloudinary.uploader
                  .upload(filePath, {
                      folder: "file",
                      resource_type: "image",
                  })
                  .catch((error) => {
                      console.log(error);
                  })
            : undefined;

        const message = await prisma.message.create({
            data: {
                message: text,
                senderId: senderId,
                receiverId: parseInt(receiverId),
                fileUrl: filePath ? uploadResult.secure_url : undefined,
            },
        });

        if (filePath) {
            removeFile(filePath);
        }

        if (message) {
            return res.status(201).json({ message });
        }
    } catch (error) {
        console.log(`Error while sending message\n${error}`);
        res.status(501).json({ status: "Message not sent" });
    }
};

// Receive message
export const receiveMessages = async (req, res) => {
    try {
        const receiverId = req.user.userId; //got this from authentication token

        const messages = await prisma.message.findMany({
            where: { receiverId: receiverId },
            select: {
                senderId: true,
                message: true,
                fileUrl: true,

                // receiverId: true, // Receiver is person checking requests
            },
        });

        return res.status(200).json({
            messages,
        });
    } catch (error) {
        console.log(`Error while listing pending requests \n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get all message
export const seeAllMessages = async (req, res) => {
    try {
        const senderId = req.user.userId; // sender is person who is checking messages

        const messages = await prisma.message.findMany({
            where: { OR: [{ receiverId: senderId }, { senderId: senderId }] },
            select: {
                // sender: true,
                senderId: true,
                message: true,
                fileUrl: true,
                receiverId: true,
            },
        });

        return res.status(200).json({
            messages,
        });
    } catch (error) {
        console.log(`Error while listing pending requests \n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Update message
export const updateMessage = async (req, res) => {
    const { newText, messageId } = req.body;
    try {
        const filePath = req.file ? req.file.path : null;

        const newUploadResult = filePath
            ? await cloudinary.uploader
                  .upload(filePath, {
                      folder: "file",
                      resource_type: "image",
                  })
                  .catch((error) => {
                      console.log(error);
                  })
            : undefined;

        const updatedMessage = await prisma.message.update({
            where: {
                id: parseInt(messageId),
            },
            data: {
                message: newText,
                fileUrl: filePath ? newUploadResult.secure_url : undefined,
            },
        });
        if (filePath) {
            removeFile(filePath);
        }

        if (updatedMessage) {
            return res.status(200).json({
                message: "Message updated successfully",
                updatedMessage,
            });
        }
    } catch (error) {
        console.log(`Error while Updating message\n${error}`);
        res.status(501).json({ status: "message not updated" });
    }
};

// Delete message
export const deleteMessage = async (req, res) => {
    const { messageId } = req.body;
    try {
        const deletedMessage = await prisma.message.delete({
            where: {
                id: parseInt(messageId),
            },
        });

        if (deletedMessage) {
            return res.status(200).json({
                message: "Message deleted successfully",
            });
        }
    } catch (error) {
        console.log(`Error while deleting message\n${error}`);
        res.status(501).json({ status: "Message not deleted" });
    }
};
