const express =require("express")
const router =express.Router()
const userController =require("../controller/user/userController")
const passport = require("passport")
const profileController =require("../controller/user/profileController")
const productController =require("../controller/user/productController")
const wishlistController =require("../controller/user/wishlistController")
const cartController =require("../controller/user/cartController")
const checkoutController = require("../controller/user/checkoutController")
const orderController = require("../controller/user/orderController")
const couponController = require("../controller/user/couponController")
const walletController = require("../controller/user/walletController")
const staticController = require("../controller/user/staticController")
const { userAuth,addCartWishlist,checkUserAuthWish,ajaxAuth,validateCancelRequest } = require('../middleware/auth');
const {resetPasswordMiddleware,blockLoggedInUsers, checkBlockedUser,checkLoggedIn,forgotPassLogout} = require("../middleware/profileAuth")
const multer = require("multer")


const path = require('path');
const { storage, fileFilter,checkFileType } =require("../helpers/multer")


const { uploadprofileimage } = require('../helpers/multer');

//const { storage, fileFilter } = require('../helpers/multer');  
const upload = multer({ storage, fileFilter });  

router.get('/error500',userController.load500ErrorPage);
router.get("/pageNotFound",userController.pageNotFound)
router.get("/",userController.loadHomePage)
router.get("/signup",userController.loadSignup)
router.post("/signup",userController.signup)
 router.get('/verify-otp', userController.loadVerifyOtp);
 router.post('/verify-otp', userController.verifyOtp);
 router.post('/resend-otp',userController.resendOtp)


 router.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
//  router.get('/auth/google/callback', passport.authenticate('google', 
//     { failureRedirect: '/signup' }), (req, res) => {
//     res.redirect('/');
// });

router.get('/auth/google/callback', passport.authenticate('google',
     { failureRedirect: '/signup' }), async (req, res) => {
    try {
        req.session.user = req.user._id;
        res.redirect('/');
    } catch (error) {
        console.log("Google login error:", error);
        res.redirect('/signup');
    }
});

 router.get('/login',userController.loadLogin)
 router.post("/login",userController.login)

 router.get('/logout', userController.logout);

//forgotpassword pageloading //profilemanagement
router.get("/forgot-password",blockLoggedInUsers,profileController.getForgotPassPage)
router.post("/forgot-email-valid",blockLoggedInUsers,profileController.forgotEmailValid)
router.post("/verify-passForgot-otp",blockLoggedInUsers,profileController.verifyForgotPassOtp)

router.post("/resend-forgot-otp",blockLoggedInUsers,profileController.resendOtp);
router.get("/reset-password",resetPasswordMiddleware,profileController.getResetPassPage)
router.post("/reset-password",resetPasswordMiddleware,profileController.postNewPassword);
//profilemanaagement
router.get("/userProfile",userAuth,profileController.userProfile);

router.get("/change-email",userAuth,profileController.changeEmail)
router.post("/change-email",userAuth,profileController.changeEmailValid)
router.post("/verify-email-otp",userAuth,profileController.verifyEmailOtp)
router.post("/update-email",userAuth,profileController.updateEmail)
router.post('/update-profile',  profileController.updateProfile);
//router.post('/remove-profile-image', profileController.removeProfileImage);

//userprofile-changepassword
router.post("/change-password", userAuth, profileController.changePassword)
router.get("/forgot-password-logout",forgotPassLogout,profileController.getForgotPassPage)

//userprofile-addressmanagement
router.get("/address",userAuth,profileController.loadAddressPage)
router.get("/addAddress",userAuth,profileController.addAddress)
router.post("/addAddress",userAuth,profileController.postAddAddress)
router.get("/editAddress",userAuth,profileController.editAddress);
router.post("/editAddress",userAuth,profileController.postEditAddress)
router.get("/deleteAddress",userAuth,profileController.deleteAddress)


//home page loding
router.get('/', userController.loadHomePage);
router.get("/shop",userController.loadShoppingPage);
router.get("/filter",userController.filterProduct);
router.get("/productDetails",productController.productDetails);

//router.get('/search', userController.searchProducts);
// wishlist management


router.get("/wishlist",userAuth,wishlistController.loadWishlist)
router.post("/addToWishlist",ajaxAuth,wishlistController.addToWishlist)
router.get("/removeProduct",userAuth,wishlistController.removeProduct)
//router.get("/api/wishlist/count", wishlistController.getWishlistCount);

// Cart Management
router.get("/cart", userAuth, cartController.getCartPage);
router.post("/addToCart", ajaxAuth, cartController.addToCart);
router.post("/changeQuantity", userAuth, cartController.changeQuantity);
router.get("/deleteItem", userAuth, cartController.deleteProduct);
router.get('/cart-wishlist-count', userAuth,cartController.getCartWishlistCount);

router.get("/checkout",userAuth,checkoutController.loadCheckoutPage)
router.get("/addAddressCheckout",userAuth,checkoutController.addAddressCheckout)
router.post("/addAddressCheckout",userAuth,checkoutController.postAddAddressCheckout)

// Order Management
router.post("/placeOrder", userAuth, orderController.placeOrder);
router.get("/orders", userAuth, orderController.getOrders);
router.get("/order-details", userAuth, orderController.loadOrderDetails);
router.post('/create-razorpay-order', userAuth, orderController.createRazorpayOrder);
router.post('/verify-payment', userAuth, orderController.verifyPayment);
router.get('/check-stock',userAuth, checkoutController.checkStock);
router.get("/download-invoice", userAuth, orderController.generateInvoice);

// New routes for order cancellation and returns
router.post("/orders/cancel", userAuth, orderController.cancelOrder);
//router.post('/cancel/cancel', userAuth,validateCancelRequest, orderController.cancelOrder);
router.post("/orders/return", userAuth, upload.array('images', 3), orderController.requestReturn);
router.post("/orders/cancel-return", userAuth, orderController.cancelReturnRequest);


//wallet
router.get('/wallet',userAuth, walletController.loadWallet);
router.post('/wallet/create-razorpay-order', userAuth, walletController.createRazorpayOrder);
router.post('/wallet/verify-payment', userAuth, walletController.verifyPayment);
router.post('/wallet/withdraw-money', userAuth, walletController.withdrawMoney);
router.post('/place-wallet-order', userAuth, orderController.placeWalletOrder);
//COUPONS
router.get("/mycoupons",userAuth,couponController.loadCoupons)
router.post("/apply-coupon", userAuth, checkoutController.applyCoupon);

router.get("/contact",staticController.loadContact)
router.get("/about",staticController.loadAbout)

module.exports = router;