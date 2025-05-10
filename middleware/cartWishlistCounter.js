const User = require("../models/userSchema");
const Wishlist = require("../models/wishlistSchema");
const Cart = require("../models/cartSchema"); 

const cartWishlistCounter = async (req, res, next) => {
    try {
        if (req.session.user) {
            const user = await User.findById(req.session.user);
            if (!user) {
                res.locals.cartCount = 0;
                res.locals.wishlistCount = 0;
                return next();
            }

            
            const wishlist = await Wishlist.findOne({ userId: user._id });
            const cart = await Cart.findOne({ userId: user._id });

            res.locals.cartCount = cart ? cart.items.length : 0; 
            res.locals.wishlistCount = wishlist ? wishlist.products.length : 0; 
        } else {
            res.locals.cartCount = 0;
            res.locals.wishlistCount = 0;
        }
    } catch (error) {
        console.error("Error fetching cart/wishlist count:", error);
        res.locals.cartCount = 0;
        res.locals.wishlistCount = 0;
    }
    next();
};

module.exports = cartWishlistCounter;
