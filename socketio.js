import { Server } from "socket.io";
import { getMessageRedis } from "./utility/redisCache.js";

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

        socket.on("newMessage", async (newMessageId) => {
            try {
                // Fetch the message from the database
                const message = await getMessageRedis(newMessageId);

                // Emit the message to all users in the chat
                message.chat.users.forEach((userid) => {
                    if (
                        !userid ||
                        userid.toString() === message.sender.toString()
                    ) {
                        return; // Skip if no userId or if it's the sender
                    }
                    userid = userid.toString();
                    // Emit the message to the user
                    socket.to(userid).emit("messageReceived", message);
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
