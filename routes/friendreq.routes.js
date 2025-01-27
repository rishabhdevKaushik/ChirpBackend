import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import {
    blockUser,
    listBlocked,
    listFriends,
    listPendingRequests,
    sendFriendRequest,
    unblockUser,
    updateFriendStatus,
} from "../controllers/friendreq.controller.js";

const friendreqRouter = express.Router();

// Send friend req
friendreqRouter.post("/:username", authenticateToken, sendFriendRequest);

// Update friend req
friendreqRouter.put("/:username", authenticateToken, updateFriendStatus);

// Block user
friendreqRouter.post("/block/:username", authenticateToken, blockUser);

// Unblock user
friendreqRouter.delete("/block/:username", authenticateToken, unblockUser);

// List blocked
friendreqRouter.get("/list/blocked", authenticateToken, listBlocked);

// List pending requests
friendreqRouter.get("/list/pending", authenticateToken, listPendingRequests);

// List friends
friendreqRouter.get("/list/friends", authenticateToken, listFriends);

export default friendreqRouter;
