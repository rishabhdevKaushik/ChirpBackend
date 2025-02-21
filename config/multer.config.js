import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create the storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const filePath = path.join(__dirname, "../tmp/uploads"); // __dirname does not work in ES6
        fs.mkdirSync(filePath, { recursive: true });
        cb(null, filePath);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    },
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

        if (!allowedTypes.includes(file.mimetype)) {
            return cb(new Error("File type not allowed"));
        }
        cb(null, true);
    },
});

export default upload;
