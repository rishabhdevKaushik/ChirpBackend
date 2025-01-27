import fs from "fs";
import path from "path";

const removeFile = (filePath) => {
    fs.unlink(filePath, (err) => {
        if (err) {
            console.error("File not deleted");
        } else {
            console.log("File was deleted");
        }
    });
};

export default removeFile;
