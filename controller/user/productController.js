const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const User = require("../../models/userSchema");
const Wishlist = require("../../models/wishlistSchema");

const productDetails1 = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category');
        const findCategory = product.category;

        const categoryOffer = findCategory ? findCategory.categoryOffer : 0;
        const productOffer = product.productOffer || 0;

        const totalOffer = categoryOffer + productOffer;

        // Fetching related products
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
        })
      
        .sort({ createdOn: -1 }).skip(0).limit(9);

        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id }
        }).limit(4);

        res.render("product-details", {
            page: 'product-details',
            user: userData,
            product: product,
            products: products,
            relatedProducts: relatedProducts,
            quantity: product.quantity,
            totalOffer: totalOffer,
            category: findCategory
        });

    } catch (error) {
        console.error("Error for fetching product details", error);
        res.redirect("/pageNotFound");
    }
}


const productDetails = async (req,res) => {

    try {

        const userId = req.session.user;
        const userData = await User.findById(userId);
        const productId = req.query.id;
        const product = await Product.findById(productId).populate('category')
        const findCategory = product.category;
        const categoryOffer = findCategory ?. categoryOffer || 0;
        const productOffer = product.productOffer ||0;

        const totalOffer = categoryOffer + productOffer;
        // let wishlistCount = 0;
        // if (userId) {
        //     const wishlist = await Wishlist.findOne({ userId: userId });
        //     wishlistCount = wishlist ? wishlist.items.length : 0;
        // }
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id.toString());

        const products = await Product.find({
            isBlocked: false,
            category: { $in: categoryIds },
            quantity: { $gt: 0 },
        })
        .populate('category') 
        .sort({ createdOn: -1 })
        .skip(0)
        
        .limit(9);

        const relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: product._id }
        }).limit(4);
        res.render("product-details",{page: 'product-details',
            user:userData,
            product:product,
            products: products,
            relatedProducts: relatedProducts,
            quantity:product.quantity,
            totalOffer:totalOffer,
            category:findCategory
        })


    } catch (error) {
        
        console.error("Error for fetching product details",error)
        res.redirect("/pageNotFound")
    }
}



module.exports = {
    productDetails
}
