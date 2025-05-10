
const sharp = require("sharp");
const { uploadBanner } = require("../../helpers/multer")
const {cloudinary,uploadToCloudinary} = require('../../config/cloudinary');
const Banner=require('../../models/bannerSchema');
const path=require('path')
const fs= require('fs')
//const upload = multer({ storage });
const HTTP_STATUS=require('../../config/httpStatusCode')
//const {cloudinary,uploadToCloudinary} =require('../../config/cloudinaryConfig')


const getBanner=async(req,res)=>{
    try{
        const findBanner = await Banner.find({})
        res.status(HTTP_STATUS.OK).render('banner', { page: "banner", data: findBanner });
    }catch(error){
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect('/pageerror');
    }
}
//--------------------------------------
const getAddBannerPage = async(req,res)=>{
    try{
        res.status(HTTP_STATUS.OK).render('addBanner');
    }catch(error){
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect('/pageerror');
    }
}
//---------------------------------


const deleteBanner = async (req, res) => {
    try {
        const id = req.query.id; 
        if (!id) {
           
            return res.status(HTTP_STATUS.BAD_REQUEST).redirect('banner');
        }

        const result = await Banner.deleteOne({ _id: id });
        if (result.deletedCount === 0) {
            console.warn("⚠️ No banner found with this ID.");
        } else {
            console.log("Banner deleted successfully:", result);
        }

        res.status(HTTP_STATUS.OK).redirect('banner');
    } catch (error) {
        console.error("Error deleting banner:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect('/pageerror');
    }
};




//---------------------------------

const addBanner = async (req, res) => {
    try {
        const data = req.body;
        const image = req.file;

        if (!image) {
            return res.status(HTTP_STATUS.BAD_REQUEST).render("addBanner", { error: "Please upload an image!" });
        }

        // Upload to Cloudinary using the buffer
        const imageUrl = await uploadToCloudinary(image.buffer);

        const newBanner = new Banner({
            image: imageUrl,
            title: data.bannerName,
            description: data.description,
            startDate: new Date(data.startDate + "T00:00:00"),
            endDate: new Date(data.endDate + "T00:00:00"),
        });

        await newBanner.save();

        return res.status(HTTP_STATUS.CREATED).redirect('/admin/banner');
    } catch (error) {
        console.error("🔥 Error adding banner:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("addBanner", {
            error: error.message || "Failed to save image!"
        });
    }
};

module.exports={
    getBanner,
    getAddBannerPage,
    addBanner,
    deleteBanner
}
