const multer = require("multer");
const maxSize = 2 * 1024 * 1024;
const fs = require("fs");

const storeStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "storeProfile") {
      cb(null, "./resources/images/store/profile");
    } else if (file.fieldname === "storeDocument") {
      cb(null, "./resources/images/store/document");
    } else if (file.fieldname === "storeCover") {
      cb(null, "./resources/images/store/cover");
    }
  },

  filename: (req, file, cb) => {
    //cb(err,result)
    cb(
      null,
      `${Date.now()}${file.originalname.replace(/\s/g, "_")}`,
      function (err, result) {
        console.log(err, result);
        if (err) {
          fs.unlinkSync(req.file.path);
          throw err;
        }
      }
    );
  },
});
// const userProfileStorage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         cb(null, "./resources/images/user/profile");
//     },

//     filename: (req, file, cb) => { //cb(err,result)
//         cb(null, `${Date.now()}${file.originalname.replace(/\s/g, "_")}`, function (err, result) {
//             console.log(err, result);
//             if (err) {
//                 fs.unlinkSync(req.file.path);
//                 throw err;
//             }
//         });
//     }
// });

const userProfileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./resources/images/user/profile");
  },

  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${file.originalname.replace(/\s/g, "_")}`);
  },
});

const userdocumenttorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./resources/images/user/document");
  },

  filename: (req, file, cb) => {
    //cb(err,result)
    cb(
      null,
      `${Date.now()}${file.originalname.replace(/\s/g, "_")}`,
      function (err, result) {
        console.log(err, result);
        if (err) {
          fs.unlinkSync(req.file.path);
          throw err;
        }
      }
    );
  },
});
const productStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./resources/images/product");
  },

  filename: (req, file, cb) => {
    //cb(err,result)
    cb(
      null,
      `${Date.now()}${file.originalname.replace(/\s/g, "_")}`,
      function (err, result) {
        console.log(err, result);
        if (err) {
          fs.unlinkSync(req.file.path);
          throw err;
        }
      }
    );
  },
});

const excelFileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./resources/excelfiles");
  },
  filename: (req, file, cb) => {
    const filename = `${Date.now()}${file.originalname.replace(/\s/g, "_")}`;
    cb(null, filename);
  },
});

const filterFile = function (req, file, cb) {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/bmp",
    "image/webp",
    "image/tiff",
    "image/svg+xml",
    "image/vnd.microsoft.icon",
    "image/vnd.wap.wbmp",
    "image/webp",
    "image/x-icon",
    "image/x-portable-graymap",
    "image/x-portable-pixmap",
    "image/avif",
    "image/apng",
    "image/flif",
    "image/jfif",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.mimetype)) {
    const error = new Error("This image file format is not supported");
    error.code = "LIMIT_FILE_TYPES";
    return cb(error, false);
  }
  cb(null, true);
};

exports.uploadStoreFiles = multer({ storage: storeStorage });
exports.uploadUserProfileImage = multer({ storage: userProfileStorage });
exports.uploadUserDocumentImage = multer({ storage: userdocumenttorage });
exports.uploadProductImage = multer({ storage: productStorage });
exports.uploadExcelFile = multer({ storage: excelFileStorage });
