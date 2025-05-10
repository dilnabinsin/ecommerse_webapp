const express=require("express")
const router = express.Router();
const {userAuth,adminAuth} =require("../middleware/auth")
const adminController = require('../controller/admin/adminController');
const customerController =require("../controller/admin/customerController")
const categoryController =require("../controller/admin/categoryController")
const productController =require("../controller/admin/productController")
const bannerController = require("../controller/admin/bannerController");
const orderController = require("../controller/admin/orderController");
const inventorymanagementController =require("../controller/admin/inventorymanagementController")
const couponController = require('../controller/admin/couponController');
const salesController = require('../controller/admin/salesController');
const transactionController = require('../controller/admin/transactionController');
const multer =require("multer")
const path = require('path');
//const { storage, fileFilter,checkFileType } =require("../helpers/multer")

//const upload = multer();
//const { uploadBanner } = require('../helpers/multer');

const { storage, fileFilter } = require('../helpers/multer');  
const upload = multer({ storage, fileFilter });  




//adminmanagement
router.get("/pageerror",adminController.pageError)
router.get("/login",adminController.loadLogin)
router.post("/login",adminController.login)

router.get("/dashboard",adminAuth,adminController.loadDashboard)

router.get("/logout",adminController.logout)

//customermanagement
router.get("/users",adminAuth,customerController.customerInfo)
router.get("/blockCustomer",adminAuth, customerController.customerBlocked);
router.get("/unblockCustomer",adminAuth, customerController.customerUnblocked);
//Category management (Add, Edit and Delete (soft delete))

router.get("/category",adminAuth,categoryController.categoryInfo)
router.post("/addCategory",adminAuth,categoryController.addCategory)
router.post("/addCategoryOffer",adminAuth,categoryController.addCategoryOffer)
router.post("/removeCategoryOffer",adminAuth,categoryController.removeCategoryOffer)
router.get("/listCategory",adminAuth,categoryController.getListCategory)
router.get("/unlistCategory",adminAuth,categoryController.getunListCategory)
router.post('/category/toggle-status/:id',adminAuth,categoryController.toggleCategoryStatus);
router.get("/editcategory/:id", adminAuth, categoryController.getEditCategory);
router.post('/editCategory/:id', adminAuth, categoryController.editCategory);
router.post("/editCategoryOffer", adminAuth, categoryController.editCategoryOffer)
router.delete("/deleteCategory/:id", adminAuth, categoryController.deleteCategory)

//Product management(add, edit & delete(soft delete) products).
router.get("/addProducts", adminAuth, productController.getProductAddPage);


router.get("/addProducts", adminAuth, productController.getProductAddPage);
// router.post("/saveImage", adminAuth, upload.single('image'), productController.saveImage);
// router.post("/addProducts", adminAuth, upload.fields([
//     { name: 'image1', maxCount: 1 },
//     { name: 'image2', maxCount: 1 },
//     { name: 'image3', maxCount: 1 },
//     { name: 'image4', maxCount: 1 }
// ]), productController.addProducts);
router.post('/addProducts', upload.array('images'), productController.addProducts);
router.get("/products",adminAuth,productController.getAllProducts);
router.post("/addProductOffer",adminAuth,productController.addProductOffer);
router.post("/removeProductOffer",adminAuth,productController.removeProductOffer);

router.get("/blockProduct",adminAuth,productController.blockProduct);
router.get("/unblockProduct",adminAuth,productController.unblockProduct);
router.get("/editProduct",adminAuth,productController.getEditProduct)
// router.post("/editProduct/:id", adminAuth, upload.fields([
//     { name: 'image1', maxCount: 1 },
//     { name: 'image2', maxCount: 1 },
//     { name: 'image3', maxCount: 1 },
//     { name: 'image4', maxCount: 1 }
// ]), productController.editProduct);

router.post('/editProduct/:id', adminAuth, upload.array('images'), productController.editProduct);
router.post("/deleteImage",adminAuth,productController.deleteSingleImage)

router.get('/deleteProduct',adminAuth,productController.deleteProduct);


router.get('/banner',adminAuth,bannerController.getBanner)
router.get('/addBanner',adminAuth,bannerController.getAddBannerPage)
//router.post('/addBanner', adminAuth,uploadBanner, bannerController.addBanner);

router.post('/addBanner', upload.single('images1'), bannerController.addBanner);

router.get('/deleteBanner',adminAuth,bannerController.deleteBanner)


 //// Order Management Routes
router.get('/orders', adminAuth, orderController.getOrders);
router.get('/orders/:id', adminAuth, orderController.getOrderDetails);
router.post('/orders/update-status', adminAuth, orderController.updateOrderStatus);
router.post('/orders/handle-return', adminAuth, orderController.handleReturnRequest);
router.post('/orders/update-return-status', adminAuth, orderController.updateReturnStatus);
router.post('/orders/cancel', adminAuth, orderController.cancelOrder);

//inventry management
router.get('/inventory', inventorymanagementController.getInventoryPage);
router.post('/inventory/update', inventorymanagementController.updateInventoryData);
//coupon 
router.get("/coupon",adminAuth,couponController.loadCoupon)
 router.post("/createCoupon",adminAuth,couponController.createCoupon)
 router.get("/editCoupon",adminAuth,couponController.editCoupon)
 router.post("/updateCoupon",adminAuth,couponController.updateCoupon)
 router.get("/deletecoupon",adminAuth,couponController.deleteCoupon)



 // Sales Management
 router.get('/sales', adminAuth, salesController.loadSalesPage);
 router.get('/sales/report', adminAuth, salesController.loadSalesPage);
 router.get("/api/sales-data", adminAuth, adminController.getSalesData)

router.get("/api/top-selling", adminAuth, adminController.getTopSelling)




// Transaction Management Routes
router.get("/transactions", adminAuth, transactionController.getAllTransactions)
router.get("/transactions/:transactionId", adminAuth, transactionController.getTransactionDetails)
router.post("/transactions/create", adminAuth, transactionController.createManualTransaction)
router.get("/transactions/stats", adminAuth, transactionController.getTransactionStats)

module.exports = router;

