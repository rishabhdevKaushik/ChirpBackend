import prismaPostgres from "../config/prismaPostgres.config.js";

// Send friend request
export const sendFriendRequest = async (req, res) => {
    try {
        const { username } = req.params;
        const senderId = req.user.userId; //got this from authentication token

        // Validate that the username is provided
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
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
        const receiverId = user.id;

        // Check for existing relation
        const existingRelation = await prismaPostgres.friend.findFirst({
            where: {
                OR: [
                    {
                        // We will get this property from @@unique
                        senderId: parseInt(senderId),
                        receiverId: parseInt(receiverId),
                    },
                    {
                        senderId: parseInt(receiverId),
                        receiverId: parseInt(senderId),
                    },
                ],
            },
        });
        if (existingRelation) {
            return res.status(400).json({ status: "Could not send request" });
        }

        const newFriend = await prismaPostgres.friend.create({
            data: {
                senderId,
                receiverId,
                // status: "PENDING",
            },
        });
        return res
            .status(200)
            .json({ message: "Friend request sent", newFriend });
    } catch (error) {
        console.log(`Error while sending friend request\n${error}`);
        res.status(500).json({ Error: "Internal server error" });
    }
};

// Update friend request
export const updateFriendStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const { username } = req.params;

        // Validate that the username is provided
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
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

        const sender = req.user.userId;
        const receiver = user.id;

        // Check for existing relation
        const existingRelation = await prismaPostgres.friend.findFirst({
            where: {
                OR: [
                    {
                        senderId: parseInt(sender),
                        receiverId: parseInt(receiver),
                    },
                    {
                        senderId: parseInt(receiver),
                        receiverId: parseInt(sender),
                    },
                ],
            },
        });
        if (!existingRelation || existingRelation.status !== "PENDING") {
            return res.status(400).json({ status: "Could not update request" });
        }
        if (!["ACCEPT", "REJECT"].includes(status)) {
            return res
                .status(400)
                .json({ message: `You must send ACCEPT or REJECT as status` });
        }

        let updatedRelation;
        if (
            existingRelation.senderId === sender &&
            existingRelation.receiverId === receiver
        ) {
            // The relation is sender -> receiver, we can update this relation
            updatedRelation = await prismaPostgres.friend.update({
                where: {
                    senderId_receiverId: {
                        senderId: sender,
                        receiverId: receiver,
                    },
                },
                data: { status: status },
            });
        } else if (
            existingRelation.senderId === receiver &&
            existingRelation.receiverId === sender
        ) {
            // The relation is receiver -> sender, we can update this relation
            updatedRelation = await prismaPostgres.friend.update({
                where: {
                    senderId_receiverId: {
                        senderId: receiver,
                        receiverId: sender,
                    },
                },
                data: { status: status },
            });
        }

        return res.status(200).json({
            success: `Friend request ${status}ED`,
            updatedRelation,
        });
    } catch (error) {
        console.log(`Error while updating friend request\n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Block user
export const blockUser = async (req, res) => {
    try {
        const senderId = req.user.userId; //got this from authentication token
        const { username } = req.params;

        // Validate that the username is provided
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
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
        const receiverId = user.id;

        // Check for existing relation
        const existingRelation = await prismaPostgres.friend.findUnique({
            where: {
                senderId_receiverId: {
                    senderId: senderId,
                    receiverId: receiverId,
                },
            },
        });

        let updatedRelation;
        if (existingRelation) {
            // The relation is sender -> receiver, we can update this relation
            updatedRelation = await prismaPostgres.friend.update({
                where: {
                    senderId_receiverId: {
                        senderId: senderId,
                        receiverId: receiverId,
                    },
                },
                data: { status: "BLOCK" },
            });
        } else {
            updatedRelation = await prismaPostgres.friend.create({
                data: {
                    senderId,
                    receiverId,
                    status: "BLOCK",
                },
            });
        }

        // Check if other user has sent req
        const reqToDelete = await prismaPostgres.friend.findUnique({
            where: {
                senderId_receiverId: {
                    senderId: receiverId,
                    receiverId: senderId,
                },
            },
        });

        // Delete if other user has sent req
        if (reqToDelete) {
            const deleteedRequestByOtherUser =
                await prismaPostgres.friend.delete({
                    where: {
                        id: reqToDelete.id, // Delete by the unique ID of the existing relation
                    },
                });
        }

        return res.status(200).json({
            success: `Successfully BLOCKED this person`,
            updatedRelation,
        });
    } catch (error) {
        console.log(`Error while Blocking user\n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Unblock user
export const unblockUser = async (req, res) => {
    try {
        const senderId = req.user.userId; // Get senderId from the authentication token
        const { username } = req.params;

        // Validate that the username is provided
        if (!username) {
            return res.status(400).json({ message: "Username is required" });
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
        const receiverId = user.id;

        // Check for existing relation
        const existingRelation = await prismaPostgres.friend.findFirst({
            where: {
                senderId: senderId,
                receiverId: receiverId,
                status: "BLOCK", // Ensure the status is "BLOCK"
            },
        });

        if (!existingRelation) {
            return res
                .status(400)
                .json({ message: "Could not perform this action" });
        }

        // Delete the block relationship
        const updatedRelation = await prismaPostgres.friend.delete({
            where: {
                id: existingRelation.id, // Delete by the unique ID of the existing relation
            },
        });

        if (updatedRelation) {
            return res.status(200).json({
                success: `Successfully Unblocked this person`,
            });
        }
    } catch (error) {
        console.log(`Error while Unblocking user\n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// List blocked users
export const listBlocked = async (req, res) => {
    try {
        const senderId = req.user.userId; // Get the senderId from the authentication token

        const blockedUsers = await prismaPostgres.friend.findMany({
            where: { senderId: senderId, status: "BLOCK" },
            select: {
                receiver: {
                    select: {
                        email: true,
                        username: true,
                        name: true,
                    },
                },
            },
        });

        return res.status(200).json({
            blockedUsers: blockedUsers.map((block) => block.receiver), // Send the receiver's data (blocked user)
        });
    } catch (error) {
        console.log(`Error while listing blocked users\n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// List pending users
export const listPendingRequests = async (req, res) => {
    try {
        const senderId = req.user.userId; //got this from authentication token

        const pendingRequests = await prismaPostgres.friend.findMany({
            where: { receiverId: senderId, status: "PENDING" },
            select: {
                // senderId: true,
                sender: {
                    select: {
                        name: true,
                        username: true,
                        email: true,
                    },
                },
                // receiverId: true, // Receiver is person checking requests
            },
        });

        return res.status(200).json({
            pendingRequests,
        });
    } catch (error) {
        console.log(`Error while listing pending requests \n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};

// List friends
export const listFriends = async (req, res) => {
    try {
        const userId = req.user.userId; // Extracted from authentication token

        const friends = await prismaPostgres.friend.findMany({
            where: {
                OR: [
                    { senderId: userId, status: "ACCEPT" },
                    { receiverId: userId, status: "ACCEPT" },
                ],
            },
            include: {
                sender: {
                    // Assuming 'sender' is a relation to the User model
                    select: {
                        id: true,
                        name: true,
                        username: true, // Include fields you need
                    },
                },
                receiver: {
                    // Assuming 'receiver' is a relation to the User model
                    select: {
                        id: true,
                        name: true,
                        username: true, // Include fields you need
                    },
                },
            },
        });

        // Frontend
        // Transform the data for better client-side use
        const formattedFriends = friends.map((friend) => {
            if (friend.senderId === userId) {
                // If the current user is the sender, include receiver info
                return {
                    id: friend.receiver.id,
                    name: friend.receiver.name,
                    username: friend.receiver.username,
                };
            } else {
                // If the current user is the receiver, include sender info
                return {
                    id: friend.sender.id,
                    name: friend.sender.name,
                    username: friend.sender.username,
                };
            }
        });

        return res.status(200).json({
            friends: formattedFriends,
        });
    } catch (error) {
        console.log(`Error while listing friends \n${error}`);
        res.status(500).json({ message: "Internal server error" });
    }
};
