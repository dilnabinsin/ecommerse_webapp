
const cloudinary = require('cloudinary').v2;


cloudinary.config({
  cloud_name: process.env.Cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret
});


const uploadToCloudinary = async (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { resource_type: "image" },
            (error, result) => {
                if (error) reject(error);
                else resolve(result.secure_url);
            }
        );
        stream.end(fileBuffer);
    });
};
module.exports = { cloudinary, uploadToCloudinary };
