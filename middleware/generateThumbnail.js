// const multer = require('multer');
// const sharp = require('sharp');
// const fs = require('fs').promises; // Use promises-based fs methods
// const path = require('path');

// const generateThumbnail = async (filePath, thumbnailPath, width, height) => {
//     try {
//         await sharp(filePath)
//             .resize(width, height)
//             .toFile(thumbnailPath);
//         console.log(`Thumbnail created at ${thumbnailPath}`);
//     } catch (error) {
//         console.error(`Error creating thumbnail: ${error.message}`);
//         throw error; // Propagate error to be handled in middleware
//     }
// };

// const generateThumbnailMiddleware = async (req, res, next) => {
//     if (!req.file) {
//         return next(new Error("Please add file"));
//     }

//     const filePath = req.file.path;
//     const thumbnailDir = path.join(path.dirname(filePath), 'thumbnails');
//     const thumbnailFilename = `${path.basename(filePath, path.extname(filePath))}_thumbnail${path.extname(filePath)}`;
//     const thumbnailPath = path.join(thumbnailDir, thumbnailFilename);

//     try {
//         // Ensure thumbnails directory exists
//         await fs.mkdir(thumbnailDir, { recursive: true });

//         // Generate the thumbnail
//         await generateThumbnail(filePath, thumbnailPath, 200, 200);

//         // Add thumbnail info to request object
//         req.file.thumbnail = {
//             path: thumbnailPath,
//             filename: thumbnailFilename
//         };

//         next();
//     } catch (err) {
//         console.error(`Middleware error: ${err.message}`);
//         // Ensure cleanup of partially created thumbnail
//         try {
//             if (req.file?.path) {
//                 await fs.unlink(req.file.path);
//             }
//             if (req.file?.thumbnail?.path) {
//                 await fs.unlink(req.file.thumbnail.path);
//                 await fs.rm(path.dirname(req.file.thumbnail.path), { recursive: true, force: true });
//             }
//         } catch (cleanupError) {
//             console.error(`Cleanup error: ${cleanupError.message}`);
//         }
//         next(err);
//     }
// };

// module.exports = { generateThumbnailMiddleware };
