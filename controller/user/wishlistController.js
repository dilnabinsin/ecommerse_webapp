const User = require("../../models/userSchema")
const Wishlist = require("../../models/wishlistSchema")
const Product = require("../../models/productSchema")
const HTTP_STATUS=require('../../config/httpStatusCode')
const Cart = require('../../models/cartSchema')

const mongoose = require('mongoose');
const mongodb = require("mongodb");


const loadWishlist = async (req,res) => {
    try {
        
        const userId = req.session.user;
        const user = await User.findById(userId);
        const products = await Product.find({_id:{$in:user.wishlist}}).populate('category');

        res.render("wishlist",{page:"wishlist",
            user,
            wishlist:products,

        })

        

    } catch (error) {

        console.error('Error:',error)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
    }
}

const addToWishlist = async (req, res) => {
    try {
        

        const productId = req.body.productId;
        const userId = req.session.user;

        if (!productId || !userId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                status: false,
                message: "Invalid request data"
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({
                status: false,
                message: "User not found"
            });
        }

        // Ensure wishlist is an array before modifying
        if (!Array.isArray(user.wishlist)) {
            user.wishlist = [];
        }

        if (user.wishlist.includes(productId)) {
            return res.status(HTTP_STATUS.OK).json({
                status: false,
                message: "Product already in Wishlist"
            });
        }

        user.wishlist.push(productId);
        await user.save();

        return res.status(HTTP_STATUS.OK).json({
            status: true,
            message: "Product added to Wishlist"
        });

    } catch (error) {
        console.error("Error in addToWishlist:", error);
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            status: false,
            message: "Server error"
        });
    }
};

const removeProduct = async (req,res) => {
    try {

        const productId = req.query.productId;
        const userId = req.session.user;
        const user = await User.findById(userId);
        const index = user.wishlist.indexOf(productId);
        user.wishlist.splice(index,1);

        await user.save();

        return res.redirect("/wishlist")
        
    } catch (error) {

        console.error(error);
        return res.status(500).json({status:false,message:"Server Error"})
        
    }
}




module.exports = {
    loadWishlist,
    addToWishlist,
    removeProduct,



}