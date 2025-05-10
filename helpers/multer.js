
// const multer = require('multer');
// const path = require('path');

// const fs = require('fs');
// const uploadDir = 'public/uploads/';
// if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Configure multer
// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {
//         cb(null, 'public/uploads/');

//     },
//     filename: function (req, file, cb) {
//         cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
// })
// function checkFileType(file, cb) {
//     const filetypes = /jpeg|jpg|png/;
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
//     const mimetype = filetypes.test(file.mimetype);

//     if (mimetype && extname) {
//         return cb(null, true);
//     } else {
//         cb('Error: Images Only!');
//     }
// }
// const upload = multer({
//     storage: storage
   
// }).fields([
//     { name: 'image1', maxCount: 1 },
//     { name: 'image2', maxCount: 1 },
//     { name: 'image3', maxCount: 1 },
//     { name: 'image4', maxCount: 1 }
// ]);
// const uploadBanner = multer({ storage: storage }).single('image1');

// const uploadprofileimage = multer({ 
//     dest: 'public/uploads/temp/',
//     limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
// });
// module.exports = { upload,uploadBanner ,uploadprofileimage };
//new 
const multer = require('multer');

const storage = multer.memoryStorage(); 

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png'||file.mimetype === 'image/webp') {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

module.exports = upload;
