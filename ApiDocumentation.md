# API Documentation

Do note that responses are only for when the request is successful. For failed requests, the response will be a JSON object with a message key.

## Authentication

All protected routes require a Bearer token in the Authorization header

## User Management

### Sign Up

-   **Endpoint**: `POST /api/users/signup`
-   **Content-Type**: `multipart/form-data`
-   **Body**:
    ```json
    {
        "email": "string",
        "name": "string",
        "username": "string",
        "password": "string",
        "confirmPassword": "string",
        "avatar": "file (optional) Type: image/jpeg, image/png, image/jpg, image/webp"
    }
    ```
-   **Response**:
    ```json
    {
        "message": "User created. Please verify the OTP sent to your email."
    }
    ```

### Verify OTP

-   **Endpoint**: `POST /api/users/verifyotp`
-   **Body**:
    ```json
    {
        "otp": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "message": "OTP verified",
        "token": {
            "accessToken": "string",
            "refreshToken": "string"
        }
    }
    ```

### Login

-   **Endpoint**: `POST /api/users/login`
-   **Body**:
    ```json
    {
        "identifier": "string (email or username)",
        "password": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "token": {
            "accessToken": "string",
            "refreshToken": "string"
        },
        "currentUser": {
            "id": "number",
            "email": "string",
            "username": "string",
            "name": "string",
            "avatarUrl": "string"
        }
    }
    ```

### Logout

-   **Endpoint**: `POST /api/users/logout`
-   **Body**:
    ```json
    {
        "refreshToken": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "message": "Logged out successfully",
        "token": {
            "accessToken": "Login again to get the token",
            "refreshToken": "Login again to get the token"
        }
    }
    ```

### Update User

-   **Endpoint**: `PUT /api/users`
-   **Content-Type**: `multipart/form-data`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
        "password": "string (current password)",
        "newName": "string (optional)",
        "newUsername": "string (optional)",
        "newEmail": "string (optional)",
        "newPassword": "string (optional)",
        "confirmNewPassword": "string (if newPassword provided)",
        "avatar": "file (optional) Type: image/jpeg, image/png, image/jpg, image/webp"
    }
    ```
-   **Response**:
    ```json
    {
        "message": "User updated successfully",
        "updatedUser": {
            "id": "number",
            "email": "string",
            "username": "string",
            "name": "string",
            "avatarUrl": "string"
        }
    }
    ```

### Delete User

-   **Endpoint**: `DELETE /api/users`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
        "password": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "status": "User deleted successfully"
    }
    ```

### Refresh Access Token

-   **Endpoint**: `POST /api/users/refresh-token`
-   **Body**:
    ```json
    {
        "refreshToken": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "message": "Access token refreshed successfully",
        "accessToken": "string"
    }
    ```

### Find User

-   **Endpoint**: `GET /api/users/:username`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
        "username": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "message": "User found",
        "user": {
            "id": "number",
            "email": "string",
            "username": "string",
            "name": "string",
            "avatarUrl": "string"
        }
    }
    ```

## Friend Management

### Send Friend Request

-   **Endpoint**: `POST /api/friends/:username`
-   **Protected**: Yes
-   **Response**:
    ```json
    {
        "message": "Friend request sent",
        "newFriend": {
            "senderId": "number",
            "receiverId": "number",
            "status": "PENDING"
        }
    }
    ```

### Update Friend Request

-   **Endpoint**: `PUT /api/friends/:username`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
      "status": "ACCEPT" | "REJECT"
    }
    ```
-   **Response**:
    ```json
    {
        "success": "Friend request ACCEPTED/REJECTED",
        "updatedRelation": {
            "senderId": "number",
            "receiverId": "number",
            "status": "string"
        }
    }
    ```

### Block/Unblock User

-   **Block**: `POST /api/friends/block/:username`
-   **Unblock**: `DELETE /api/friends/block/:username`
-   **Protected**: Yes
-   **Response**:
    ```json
    {
        "success": "Successfully BLOCKED/UNBLOCKED this person"
    }
    ```

### List Friends/Blocked/Pending

-   **Friends**: `GET /api/friends/list/friends`
-   **Blocked**: `GET /api/friends/list/blocked`
-   **Pending**: `GET /api/friends/list/pending`
-   **Protected**: Yes
-   **Response Example (Friends)**:
    ```json
    {
        "friends": [
            {
                "name": "string",
                "email": "string",
                "username": "string",
                "avatarUrl": "string"
            }
        ]
    }
    ```

## Chat Management

### Access Chat

-   **Endpoint**: `POST /api/chats/chats`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
        "username": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "_id": "string",
        "chatName": "string",
        "isGroup": false, // This is only for single user chat
        "users": ["user_ids"],
        "latestMessage": "message_object"
    }
    ```

### Fetch Chats

-   **Endpoint**: `GET /api/chats/chats`
-   **Protected**: Yes
-   **Response**:
    ```json
    [
        {
            "_id": "string",
            "chatName": "string",
            "isGroup": "boolean",
            "users": [
                {
                    "id": "number",
                    "email": "string",
                    "username": "string",
                    "name": "string",
                    "avatarUrl": "string"
                }
            ],
            "latestMessage": "message_object"
        }
    ]
    ```

### Group Chat Operations

-   **Create**: `POST /api/chats/group`
-   **Update**: `PUT /api/chats/group`
-   **Remove User**: `DELETE /api/chats/group/:chatId`
-   **Protected**: Yes
-   **Body (Create)**:
    ```json
    {
        "name": "string",
        "usernames": ["string"]
    }
    ```
-   **Body (Update)**:
    ```json
    {
      "chatId": "string",
      "newChatName": "string" (optional),
      "usernamesToAdd": ["string"] (optional)
    }
    ```
-   **Body (Remove User)**:
    ```json
    {
        "usernameToRemove": "string"
    }
    ```

## Message Management

### Send Message

-   **Endpoint**: `POST /api/messages`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
        "chatId": "string",
        "content": "string"
    }
    ```
-   **Response**:
    ```json
    {
        "_id": "string",
        "sender": {
            "id": "number",
            "username": "string",
            "email": "string",
            "avatarUrl": "string"
        },
        "content": "string",
        "chat": "string"
    }
    ```

### Get Messages

-   **Endpoint**: `GET /api/messages/:chatId`
-   **Protected**: Yes
-   **Response**:
    ```json
    [
        {
            "_id": "string",
            "sender": {
                "id": "number",
                "username": "string",
                "email": "string",
                "avatarUrl": "string"
            },
            "content": "string",
            "chat": "string"
        }
    ]
    ```

### Edit Message

-   **Endpoint**: `PUT /api/messages`
-   **Protected**: Yes
-   **Body**:
    ```json
    {
        "messageId": "string",
        "content": "string"
    }
    ```

### Delete Message

-   **Endpoint**: `DELETE /api/messages/:messageId`
-   **Protected**: Yes
-   **Response**:
    ```json
    {
        "message": "Message deleted successfully"
    }
    ```

## Socket IO Events

### Connection Setup

-   **Event**: `setup`
-   **Emit from Client**:
    ```javascript
    socket.emit("setup", userId);
    ```
-   **Response to Client**:
    ```javascript
    socket.emit("connected");
    ```
-   **Description**: Initializes the socket connection for a user and joins their personal room.

### Join Chat Room

-   **Event**: `join chat`
-   **Emit from Client**:
    ```javascript
    socket.emit("join chat", chatId);
    ```
-   **Response to Client**:
    ```javascript
    socket.emit("connected");
    ```
-   **Description**: Joins a specific chat room to receive messages.

### New Message

-   **Event**: `newMessage`
-   **Emit from Client**:
    ```javascript
    socket.emit("newMessage", messageId);
    ```
-   **Broadcast to Recipients**:
    ```javascript
    socket.emit("messageReceived", messageObject);
    ```
-   **Description**: Notifies all users in a chat about a new message. The message object contains sender, content, and chat details.

### Typing Indicators

-   **Typing Start**:

    -   **Event**: `typing`
    -   **Emit from Client**:
        ```javascript
        socket.emit("typing", chatId);
        ```
    -   **Broadcast**: Other users in the chat receive the `typing` event

-   **Typing Stop**:
    -   **Event**: `stopTyping`
    -   **Emit from Client**:
        ```javascript
        socket.emit("stopTyping", chatId);
        ```
    -   **Broadcast**: Other users in the chat receive the `stopTyping` event
