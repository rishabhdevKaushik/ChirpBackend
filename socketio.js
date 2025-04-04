import { Server } from "socket.io";
import { getMessageRedis } from "./utility/redisCache.js";

export default function initSocketIO(httpServer) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(",");

    const io = new Server(httpServer, {
        pingTimeout: 60000, // disconnect after 60s of inactivity
        cors: {
            origin: allowedOrigins,
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
            // console.log("Joined chat: ",chatId);
            
            socket.join(chatId);
            socket.emit("connected");
        });

        // Moved to send message controller
        // socket.on("newMessage", async (newMessageId) => {
        //     try {
        //         console.log(typeof(newMessageId));
                
        //         // Fetch the message from the database
        //         let message = await getMessageRedis(newMessageId);
        //         message = JSON.parse(message);

        //         // Emit the message to all users in the chat
        //         message.chat.users.forEach((user) => {
        //             const userId = user.id;
        //             if (
        //                 !userId ||
        //                 userId.toString() === message.sender.id.toString()
        //             ) {
        //                 return; // Skip if no user id or if it's the sender
        //             }
                    
        //             socket
        //                 .to(userId.toString())
        //                 .emit("messageReceived", message);
        //         });
        //     } catch (error) {
        //         console.error("Error fetching message:", error);
        //     }
        // });

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
