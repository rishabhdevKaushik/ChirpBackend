import { Server } from "socket.io";
import Message from "./models/message.model.js";
import prismaPostgres from "./config/prismaPostgres.config.js";

export default function initSocketIO(httpServer) {
    const io = new Server(httpServer, {
        pingTimeout: 60000, // disconnect after 60s of inactivity
        cors: {
            origin: "*",
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE"],
        },
    });

    io.on("connection", (socket) => {
        // console.log("New client connected");

        socket.on("setup", (userId) => {
            socket.join(userId);
            socket.emit("connected");
        });

        socket.on("join chat", (chatId) => {
            socket.join(chatId);
            socket.emit("connected");
        });

        socket.on("newMessage", async (newMessageReceived) => {
            try {
                // Fetch the message from the database
                const message = await Message.findById(newMessageReceived._id);
    
                // Populate chat details
                await message.populate("chat");
    
                // Check if the message and chat exist
                if (!message || !message.chat) {
                    console.error("Message or chat not found");
                    return;
                }
    
                // Get sender details
                const sender = await prismaPostgres.user.findUnique({
                    where: { id: message.sender },
                    select: {
                        id: true,
                        username: true,
                        email: true,
                        avatarUrl: true,
                    },
                });
    
                // Construct the filtered message
                const filteredMessage = {
                    _id: message._id,
                    sender: sender, // Attach sender details instead of just senderId
                    content: message.content,
                    chat: message.chat,
                };
    
                // Emit the message to all users in the chat
                message.chat.users.forEach((userid) => {
                    if (!userid || userid.toString() === message.sender.toString()){
                        return; // Skip if no userId or if it's the sender
                    }
                    userid = userid.toString();
                    // Emit the message to the user
                    socket.to(userid).emit("messageReceived", filteredMessage);
                });
            } catch (error) {
                console.error("Error fetching message:", error);
            }
        });

        // Handle typing events
        socket.on("typing", (chatId) => {
            socket.in(chatId).emit("typing");
        });

        socket.on("stopTyping", (chatId) => {
            socket.in(chatId).emit("stopTyping");
        });

        socket.on("disconnect", () => {
            // console.log("Client disconnected");
        });
    });

    return io;
}
