import multer from "multer";

const storage = multer.memoryStorage();

export default multer({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
    },
});