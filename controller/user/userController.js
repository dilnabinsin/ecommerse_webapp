const User =require("../../models/userSchema")
const nodemailer = require('nodemailer');
const bcrypt =require("bcrypt")
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Banner = require("../../models/bannerSchema")
const Wishlist = require("../../models/wishlistSchema")
const mongoose = require('mongoose');
const dotenv = require('dotenv').config();


load500ErrorPage = (req, res) => {
    try {
        res.status(500).render('error-500'); // Make sure '500' template exists
    } catch (err) {
        console.error('Failed to render 500 page:', err);
        res.status(500).send('Internal Server Error');
    }
};



const pageNotFound =async(req,res)=>{
try{
    
    res.render("page-404")

}
catch(error){
    res.redirect("/page-404")

}



}

const loadHomePage1 = async (req, res) => {
    try {
        const user = req.session.user;
        const cartCount = user ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const wishlistCount = user ? user.wishlist.length : 0;
        // Fetch categories from the database
        const category = await Category.find({ isListed: true });
        console.log('Fetched Categories:', category); // Debugging line
        // Fetch products based on the categories
        let productData = await Product.find({
            isBlocked: false,
            category: { $in: category.map(category => category._id) },
            quantity: { $gt: 0 },
        }).populate('category'); // Populate category details if needed

        // Sort products by creation date and limit to 12
        productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        productData = productData.slice(0, 12);
        const mostSellingProducts = await Product.find({
            isBlocked: false,
            quantity: { $gt: 0 }
          })
            .sort({ soldCount: -1 }) // Top sellers
            .limit(8);


            const mostSellingByCategory = {};
    for (const cat of category) {
      const topProducts = await Product.find({
        category: cat._id,
        isBlocked: false,
        quantity: { $gt: 0 }
      })
        .sort({ soldCount: -1 }) // Highest sold first
        .limit(4); // Top 3 per category

      mostSellingByCategory[cat.name] = topProducts;
    }
  // Fetch banners from the database
  const banners = await Banner.find({}); // Fetch all banners
  console.log('Fetched Banners:', banners); // Debugging line



        // Render the template with data
        if (user) {
            const userData = await User.findOne({ _id: user });
            wishlistCount = userData ? userData.wishlist.length : 0;
            res.render('home', {page:"home",wishlistCount: wishlistCount, 
                user: userData, 
                products: productData, 
                category: category ,// Ensure categories is passed here
                banners: banners,
                mostSellingProducts,
                mostSellingByCategory
            });
        } else {
            res.render('home', { page: 'home',
                products: productData, 
                category: category, // Ensure categories is passed here
                banners: banners,
                mostSellingProducts,
                mostSellingByCategory,
                cartCount,
            wishlistCount
            });
        }
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).send('Server Error');
    }
};
const loadHomePage = async (req, res) => {
    try {
      const userId = req.session.user;
      const user = userId ? await User.findById(userId) : null;
  
      const cartCount = user && user.cart ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
      const wishlistCount = user && user.wishlist ? user.wishlist.length : 0;
  
      const category = await Category.find({ isListed: true });
      let productData = await Product.find({
        isBlocked: false,
        category: { $in: category.map(category => category._id) },
        quantity: { $gt: 0 },
      }).populate('category');
  
      productData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      productData = productData.slice(0, 12);
  
      const mostSellingProducts = await Product.find({
        isBlocked: false,
        quantity: { $gt: 0 }
      })
        .sort({ soldCount: -1 })
        .limit(8);
  
      const mostSellingByCategory = {};
      for (const cat of category) {
        const topProducts = await Product.find({
          category: cat._id,
          isBlocked: false,
          quantity: { $gt: 0 }
        })
          .sort({ soldCount: -1 })
          .limit(4);
  
        mostSellingByCategory[cat.name] = topProducts;
      }
  
      const banners = await Banner.find({});
      res.render('home', {
        page: 'home',
        user,
        products: productData,
        category,
        banners,
        mostSellingProducts,
        mostSellingByCategory,
        cartCount,
        wishlistCount
      });
    } catch (error) {
      console.error('Error loading home page:', error);
      res.status(500).send('Server Error');
    }
  };
// .......................................
const loadSignup1= async(req,res)=>{

try{
    
    return res.render("signup")
}
catch(error){
    console.log("Home Page not Loading:",error)
    res.status(500).send("Server Error")
    
}

}





const loadSignup = async (req, res) => {
  try {
    const userId = req.session.user;

    if (userId) {
      // Redirect authenticated users to home
      return res.redirect('/');
    }

    // For unauthenticated users, render signup page with defaults
    const cartCount = 0; // Default for unauthenticated users
    const wishlistCount = 0; // Default for unauthenticated users

    res.render('signup', {
      page: 'signup', // Added to fix page is not defined
      user: null, // No user for unauthenticated
      cartCount,
      wishlistCount,
      email: req.query.email || '', // Form persistence
      message: req.query.error || '' // Error message
    });
  } catch (error) {
    console.error('Error loading signup page:', error);
    res.redirect('/pageNotFound');
  }
};


// .......................................



const loadVerifyOtp = async (req, res) => {
    try {
        return res.render("verify-otp");
    } catch (error) {
        console.error("Error loading OTP verification page:", error);
        res.status(500).send("Server Error");
    }
};

const resendOtp = async (req, res) => {
    try {
        // Check if session data exists
        if (!req.session.userData) {
            return res.status(400).json({ success: false, message: "Session data not found. Please try again." });
        }

        const { email } = req.session.userData;

        // Generate a new OTP
        const otp = generateOTP();

        // Update session with new OTP and timestamp
        req.session.userOtp = {
            otp: otp,
            timestamp: Date.now(), // Store the current timestamp
        };

        // Send the new OTP via email
        const emailSent = await sendVerificationEmail(email, otp);

        if (emailSent) {
            console.log("Resend OTP:", otp);
            res.status(200).json({ success: true, message: "OTP resent successfully." });
        } else {
            res.status(500).json({ success: false, message: "Failed to resend OTP. Please try again." });
        }
    } catch (error) {
        console.error("Error resending OTP:", error);
        res.status(500).json({ success: false, message: "Internal Server Error. Please try again." });
    }
};
const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);

        return passwordHash;

    } catch (error) {
        
    }
}

const verifyOtp = async (req, res) => {
    try {
        const { otp } = req.body;
console.log(otp)
        // Check if session OTP data exists
        if (!req.session.userOtp || !req.session.userData) {
            return res.status(400).json({ success: false, message: "OTP session data not found. Please try again." });
        }

        const sessionOtp = req.session.userOtp.otp; // Access the OTP from session
        const otpTimestamp = req.session.userOtp.timestamp; // Access the timestamp from session

        // Check if OTP has expired (1 minute expiry)
        if (Date.now() - otpTimestamp > 1 * 60 * 1000) {
            return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
        }

        // Validate the OTP
        if (otp !== sessionOtp) {
            return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
        }

        // OTP is valid, proceed with user creation
        const user = req.session.userData;
        const passwordHash = await securePassword(user.password);

        const newUser = new User({
            name: user.name,
            email: user.email,
            phone: user.phone,
            password: passwordHash,
            googleId: user.googleId || "" // Handle googleId
        });

        await newUser.save();

        // Clear session data after successful verification
        req.session.userOtp = null;
        req.session.userData = null;

        // Set the user session for login
        req.session.user = newUser._id;

        // Return success response
        res.json({ success: true, redirectUrl: "/login" });
    } catch (error) {
        console.error("Error verifying OTP:", error);

        // Handle duplicate key error (e.g., email already exists)
        // if (error.code === 11000) {
        //     return res.status(400).json({ success: false, message: "User with this email already exists." });
        // }

        // Handle other errors
        res.status(500).json({ success: false, message: "Server Error. Please try again." });
    }
};

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendVerificationEmail(email,otp){
    try{
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD
            }
        })

        const info = await transporter.sendMail({
            from: process.env.NODEMAILER_EMAIL,
            to: email,
            subject: 'OTP for Verification',
            text: `Your OTP is ${otp}`,
            html: `<b>Your OTP is ${otp}</b>`
        })

        return info.accepted.length > 0



    } catch (error) {
        console.error("Error for sending email",error)
        return false
    }
}



const signup = async (req, res) => {
    try {
        const { name, email, phone, password, cPassword } = req.body;

        // Validate input
        if (password !== cPassword) {
            return res.render("signup", { message: "Passwords do not match." });
        }

        // Check if user already exists
        const findUser = await User.findOne({ email });
        if (findUser) {
            return res.render("signup", { message: "User already exists." });
        }

        // Generate OTP
        const otp = generateOTP();

        // Send OTP via email
        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.render("signup", { message: "Failed to send OTP. Please try again." });
        }

        // Store OTP and user data in session
        req.session.userOtp = {
            otp: otp,
            timestamp: Date.now(), // Store the current timestamp
        };
        req.session.userData = { name, email, phone, password };

        // Render the OTP verification page
        res.render("verify-otp");
        console.log("OTP Sent:", otp);
    } catch (error) {
        console.error("Signup error:", error);
        res.redirect("/page-404");
    }
};


const loadLogin1 =async (req,res)=>{

try{

    if(!req.session.user){
        return res.render("login")

    }
    else{
       res.redirect("/")
    }
}
catch(error){
    console.log('login page not found');
    res.redirect("/pagenotfound")

}

}
const loadLogin = async (req, res) => {
    try {
      const userId = req.session.user;
      
      if (userId) {
        // If user is authenticated, redirect to home
        return res.redirect('/');
      }
  
      // For unauthenticated users, render login page with defaults
      const cartCount = 0; // Default for unauthenticated users
      const wishlistCount = 0; // Default for unauthenticated users
  
      res.render('login', {
        page: 'login', // Added to fix page is not defined
        user: null, // No user for unauthenticated
        cartCount,
        wishlistCount,
        email: req.query.email || '', // Form persistence
        message: req.query.error || '' // Error message
      });
    } catch (error) {
      console.error('Error loading login page:', error);
      res.redirect('/pageNotFound');
    }
  };
const login = async (req, res) => {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.render("login", {
          message: "Email and password are required",
          email
        });
      }
  
      const findUser = await User.findOne({ isAdmin: 0, email });
  
      if (!findUser) {
        return res.render("login", {
          message: "User not found",
          email
        });
      }
  
      if (findUser.isBlocked) {
        return res.render("login", {
          message: "User is blocked by admin",
          email
        });
      }
  
      const passwordMatch = await bcrypt.compare(password, findUser.password);
      if (!passwordMatch) {
        return res.render("login", {page:"login",
          message: "Incorrect Password",
          email: email
        });
      }
  
      req.session.user = findUser._id;
      res.redirect("/");
    } catch (error) {
      console.error("Login Error:", error);
      res.render("login", {page:"login",
        message: "Login failed, please try again later",
        email: req.body.email || ""
      });
    }
  };
  
const login1 =async (req,res)=>{
    try{
        const {email,password}=req.body;
        const findUser =await User.findOne({isAdmin:0,email:email})
        if(!findUser){
            return res.render("login",{message:"user not found"})

        }
        if(findUser.isBlocked){
            return res.render("login",{message:"user is blocked by admin"})
        }
        const passwordMatch = await bcrypt.compare(password,findUser.password)
        if(!passwordMatch){
            return res.render("login",{message:"Incorrect Password"})
        }
        req.session.user =findUser._id;
        res.redirect("/")

    }
    catch(error){
        console.error("login Error")
        res.render("login",{message:"login failed,please try agin later"})

    }
}

// ............................................................
const logout =async(req,res)=>{
    try {
        if (req.session.user) {
            delete req.session.user; //  Remove only user session
        }
        res.redirect('/login'); // Redirect user to login page
    } catch (error) {
        console.log('Logout Error', error);
        res.redirect('/pagenotfound');
    }
};

//..........................................................................................

const loadShoppingPage1 = async (req, res) => {
    try {
        // Get user data if authenticated
        const user = req.session.user;
        const cartCount = user ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
        const wishlistCount = user ? user.wishlist.length : 0;
       const categoryId = req.query.category || ''; 
        const userData = user ? await User.findOne({ _id: user }) : null;
       
       
        const {price , page = 1, search = '' } = req.query;
        //const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        let priceRange ;
        if (price) {
            priceRange  = price; 
        }
        // Build query object
        let query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        // Add search functionality
        if (search) {
            query.productName = { $regex: search, $options: 'i' };
        }
        if (categoryId) {
            query.category = categoryId;
        }
        // Get categories and ensure they're listed
        const categories = await Category.find({ isListed: true });
        const categoryIds = categories.map(category => category._id);
        query.category = { $in: categoryIds };
       
        // Determine sort order
        let sort = {};
        switch (req.query.sort) {
            case 'popularity':
                sort = { popularity: -1 };
                break;
            case 'price_asc':
                sort = { salePrice: 1 };
                break;
            case 'price_desc':
                sort = { salePrice: -1 };
                break;
            case 'rating':
                sort = { averageRating: -1 };
                break;
            case 'featured':
                sort = { featured: -1 };
                break;
            case 'new':
                sort = { createdAt: -1 };
                break;
            case 'name_asc':
                sort = { productName: 1 };
                break;
            case 'name_desc':
                sort = { productName: -1 };
                break;
            default:
                sort = { createdAt: -1 }; // Default sort by newest
        }

        // Get category counts using aggregation
        const categoriesWithCounts = await Category.aggregate([
            {
                $match: { isListed: true }
            },
            {
                $lookup: {
                    from: 'products',
                    let: { categoryId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$category', '$$categoryId'] },
                                        { $eq: ['$isBlocked', false] },
                                        { $gt: ['$quantity', 0] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: 'products'
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    productCount: { $size: '$products' }
                }
            }
        ]);

        // Fetch products with pagination and sorting
        const products = await Product.find(query)
        .populate('category', 'name')
            .sort(sort)
            .skip(skip)
            .limit(limit);

        // Get total number of products for pagination
        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Render shop page with all necessary data
        res.render("shop", {page: 'shop',
            user: userData,
          
            products: products,
            category: categoriesWithCounts,
            totalProducts: totalProducts,
            currentPage: page,
            totalPages: totalPages,
            search: search,
            sort: req.query.sort,
            selectedCategory: categoryId,
            req: req,
            priceRange,
            cartCount,
            wishlistCount
        });

    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.status(500).redirect("/pageNotFound");
    }
};

const loadShoppingPage = async (req, res) => {
    try {
      // Get user data if authenticated
      const userId = req.session.user;
      const user = userId ? await User.findById(userId) : null;
  
      // Calculate cartCount and wishlistCount safely
      const cartCount = user && user.cart ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
      const wishlistCount = user && user.wishlist ? user.wishlist.length : 0;
  
      // Query parameters
      const { price, page = 1, search = '' } = req.query;
      const categoryId = req.query.category || '';
      const limit = 9;
      const skip = (parseInt(page) - 1) * limit;
  
      // Build query object
      let query = {
        isBlocked: false,
        quantity: { $gt: 0 }
      };
  
      // Add search functionality
      if (search) {
        query.productName = { $regex: search, $options: 'i' };
      }
  
      // Add category filter (validate categoryId)
      if (categoryId && mongoose.Types.ObjectId.isValid(categoryId)) {
        query.category = categoryId;
      }
  
      // Add price filter
      if (price) {
        const [minPrice, maxPrice] = price.split('-').map(Number);
        if (!isNaN(minPrice) && !isNaN(maxPrice)) {
          query.salePrice = { $gte: minPrice, $lte: maxPrice };
        }
      }
  
      // Get categories and ensure they're listed
      const categories = await Category.find({ isListed: true });
      const categoryIds = categories.map(category => category._id);
      if (!categoryId) {
        query.category = { $in: categoryIds }; // Apply category filter only if no specific category is selected
      }
  
      // Determine sort order
      let sort = {};
      switch (req.query.sort) {
        case 'popularity':
          sort = { popularity: -1 };
          break;
        case 'price_asc':
          sort = { salePrice: 1 };
          break;
        case 'price_desc':
          sort = { salePrice: -1 };
          break;
        case 'rating':
          sort = { averageRating: -1 };
          break;
        case 'featured':
          sort = { featured: -1 };
          break;
        case 'new':
          sort = { createdAt: -1 };
          break;
        case 'name_asc':
          sort = { productName: 1 };
          break;
        case 'name_desc':
          sort = { productName: -1 };
          break;
        default:
          sort = { createdAt: -1 };
      }
  
      // Get category counts using aggregation
      const categoriesWithCounts = await Category.aggregate([
        { $match: { isListed: true } },
        {
          $lookup: {
            from: 'products',
            let: { categoryId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$category', '$$categoryId'] },
                      { $eq: ['$isBlocked', false] },
                      { $gt: ['$quantity', 0] }
                    ]
                  }
                }
              }
            ],
            as: 'products'
          }
        },
        {
          $project: {
            _id: 1,
            name: 1,
            productCount: { $size: '$products' }
          }
        }
      ]);
  
      // Fetch products with pagination and sorting
      const products = await Product.find(query)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit);
  
      // Get total number of products for pagination
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / limit);
  
      // Render shop page with all necessary data
      res.render('shop', {
        page: 'shop',
        user,
        products,
        category: categoriesWithCounts,
        totalProducts,
        currentPage: parseInt(page),
        totalPages,
        search,
        sort: req.query.sort || 'new',
        selectedCategory: categoryId,
        req,
        priceRange: price || '',
        cartCount,
        wishlistCount
      });
    } catch (error) {
      console.error('Error loading shopping page:', error);
      res.redirect('/pageNotFound');
    }
  };



const searchProducts1 = async (req, res) => {
    try {
        const user = req.session.user;
        const userData = await User.findOne({ _id: user });

        // Get query parameters
        const search = req.query.search || ''; // Search term
        const sort = req.query.sort || ''; // Sort parameter
        const categoryId = req.query.category || ''; // Category filter

        // Fetch categories for the sidebar
        const categories = await Category.find({ isListed: true });

        // Fetch product count for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const count = await Product.countDocuments({
                    category: category._id,
                    isBlocked: false,
                    quantity: { $gt: 0 },
                });
                return { _id: category._id, name: category.name, productCount: count };
            })
        );

        // Build the query object
        let query = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        // Add search functionality
        if (search) {
            query.$or = [
                { productName: { $regex: search, $options: 'i' } }, // Case-insensitive search
                { description: { $regex: search, $options: 'i' } }, // Search in description
            ];
        }

        // Add category filter
        if (categoryId) {
            query.category = categoryId;
        }

        // Fetch products based on the query
        let products = await Product.find(query);

        // Apply sorting
        if (sort === 'price_asc') {
            products.sort((a, b) => a.salePrice - b.salePrice);
        } else if (sort === 'price_desc') {
            products.sort((a, b) => b.salePrice - a.salePrice);
        } else if (sort === 'name_asc') {
            products.sort((a, b) => a.productName.localeCompare(b.productName));
        } else if (sort === 'name_desc') {
            products.sort((a, b) => b.productName.localeCompare(a.productName));
        }

        // Pagination logic
        const page = parseInt(req.query.page) || 1;
        const limit = 9;
        const skip = (page - 1) * limit;
        const totalProducts = products.length;
        const totalPages = Math.ceil(totalProducts / limit);
        const paginatedProducts = products.slice(skip, skip + limit);

      
        res.render('shop', {
            page: 'shop',
            user: userData,
            products: paginatedProducts,
            category: categoriesWithCounts,
            totalProducts: totalProducts,
            currentPage: page,
            // wishlistCount: wishlistCount,
             totalPages: totalPages,
            search: search, // Pass the search query to the view
            sort: sort, // Pass the sort parameter to the view
            selectedCategory: categoryId, // Pass the selected category to the view
            req: req,
        });
    } catch (error) {
        console.error('Error searching products:', error);
        res.redirect('/pageNotFound');
    }
};


const filterProduct = async (req, res) => {
    try {
        const userId = req.session.user;
        const userData = userId ? await User.findById(userId) : null;

        // Extract query parameters
        const {
            search = '',
            sort = '',
            category = '',
            priceRange = '',
            page = 1
        } = req.query;

        const currentPage = parseInt(page) || 1;
        const limit = 9;
        const skip = (currentPage - 1) * limit;

        // Build query object
        const query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };

        if (search.trim()) {
            query.$or = [
                { productName: { $regex: search.trim(), $options: 'i' } },
                { description: { $regex: search.trim(), $options: 'i' } },
            ];
        }

        if (category && mongoose.Types.ObjectId.isValid(category)) {
            query.category = new mongoose.Types.ObjectId(category);
        }
        if (priceRange) {
            switch (priceRange) {
                case '1500':
                    query.salePrice = { $lte: 1500 };
                    break;
                case '2500':
                    query.salePrice = { $gte: 1501, $lte: 2500 };
                    break;
                case '4000':
                    query.salePrice = { $gte: 2501, $lte: 4000 };
                    break;
                case 'above4000':
                    query.salePrice = { $gt: 4000 };
                    break;
            }
        }

        // Set sort options
        let sortOption = { createdAt: -1 }; // Default: newest
        if (sort === 'price_asc') sortOption = { salePrice: 1 };
        else if (sort === 'price_desc') sortOption = { salePrice: -1 };
        else if (sort === 'name_asc') sortOption = { productName: 1 };
        else if (sort === 'name_desc') sortOption = { productName: -1 };

        // Fetch filtered, sorted, paginated products
        const products = await Product.find(query)
            .populate('category', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalProducts = await Product.countDocuments(query);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch categories with product counts
        const categories = await Category.find({ isListed: true }).lean();
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => ({
                _id: cat._id,
                name: cat.name,
                productCount: await Product.countDocuments({
                    category: cat._id,
                    isBlocked: false,
                    quantity: { $gt: 0 }
                }),
            }))
        );

        // Track search history
        if (userData && search.trim()) {
            userData.searchHistory.push({
                category: category || null,
                searchedOn: new Date(),
                query: search.trim(),
            });
            await userData.save();
        }

        // Render result
        res.render('shop', {
            page: 'shop',
            user: userData,
            products,
            category: categoriesWithCounts,
            currentPage,
            totalPages,
            totalProducts,
            sort,
            priceRange,
            selectedCategory: category,
            search,
            noProductsMessage: products.length === 0 ? 'No products found for your filter' : ''
        });

    } catch (error) {
        console.error('Error in searchAndFilterProducts:', error);
        res.redirect('/pageNotFound');
    }
};




const filterProduct123 = async (req, res) => {
    try {
      const user = req.session.user;
      const category = req.query.category;
      const priceRange = req.query.price;
      const sortBy = req.query.sort || "";
      const searchQuery = req.query.query ? req.query.query.trim() : "";
      const page = parseInt(req.query.page) || 1;
      const itemsPerPage = 12;
  
      // Fetch categories
      const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
      const validCategoryIds = categories.map(cat => cat._id.toString());
  
      // Build query
      const query = {
        isBlocked: false,
        quantity: { $gt: 0 },
        category: { $in: validCategoryIds }
      };
  
      // Category filter
      if (category && validCategoryIds.includes(category)) {
        query.category = category;
      }
  
      // Price filter
      if (priceRange) {
        const priceFilters = {
          "1500": { $lt: 1500 },
          "2500": { $lt: 2500 },
          "4000": { $lt: 4000 },
          "above4000": { $gt: 4000 }
        };
        if (priceFilters[priceRange]) {
          query.salePrice = priceFilters[price];
        }
      }
  
      // Search filter
      if (searchQuery) {
        query.$or = [
          { productName: { $regex: searchQuery, $options: "i" } },
          { description: { $regex: searchQuery, $options: "i" } }
        ];
  
        const matchedCategory = await Category.findOne({
          name: { $regex: searchQuery, $options: "i" },
          isListed: true,
          isDeleted: false
        }).lean();
  
        if (matchedCategory) {
          query.$or.push({ category: matchedCategory._id });
        }
      }
  
      // Sorting
      let sortCondition = { createdAt: -1 };
      if (sortBy === "low-to-high") {
        sortCondition = { salePrice: 1 };
      } else if (sortBy === "high-to-low") {
        sortCondition = { salePrice: -1 };
      } else if (sortBy === "aA-zZ") {
        sortCondition = { productName: 1 };
      } else if (sortBy === "zZ-aZ") {
        sortCondition = { productName: -1 };
      }
  
      // Pagination with MongoDB skip/limit
      const totalProducts = await Product.countDocuments(query);
      const totalPages = Math.ceil(totalProducts / itemsPerPage);
      const findProducts = await Product.find(query)
        .sort(sortCondition)
        .skip((page - 1) * itemsPerPage)
        .limit(itemsPerPage)
        .lean();
  
      // Update user search history
      let userData = null;
      if (user) {
        userData = await User.findById(user).lean();
        if (userData) {
          const searchEntry = {
            category: category || null,
            priceRange: priceRange || null,
            searchedOn: new Date()
          };
          await User.updateOne(
            { _id: user },
            { $push: { searchHistory: searchEntry } }
          );
        }
      }
  
      // Store filtered products in session
      req.session.filterProducts = findProducts;
  
      // Render shop page
      res.render("shop", {
        user: userData,
        product: findProducts,
        categories,
        totalPages,
        currentPage: page,
        selectedCategory: category || null,
        selectedPrice: priceRange || null,
        searchQuery,
        selectedSort: sortBy || null
      });
    } catch (error) {
      console.error("Error filtering products:", error);
      res.redirect("/pageNotFound");
    }
  };
//-----------------------------------------------------------------

const searchProducts = async (req, res) => {
  try {
    const user = req.session.user;
    const query = req.query.query ? req.query.query.trim() : "";

    const selectedFlavor = req.query.flavor || "";
    const selectedCategory = req.query.category || "";
    const selectedPrice = req.query.price || "";
    const sortBy = req.query.sort || ""; 

    

   
    const categories = await Category.find({ isListed: true, isDeleted: false }).lean();
    const validCategoryIds = categories.map(cat => cat._id.toString());

    

    let searchCondition = {
      isBlocked: false,
      quantity: { $gt: 0 },
      category: { $in: validCategoryIds }, 
      $or: [
        { name: { $regex: query, $options: "i" } }, 
        { description: { $regex: query, $options: "i" } }, 
      ],
    };

   
    const matchedCategory = await Category.findOne({ 
      name: { $regex: query, $options: "i" },
      isListed: true,
      isDeleted: false
    }).lean();

    if (matchedCategory) {
      searchCondition.$or.push({ category: matchedCategory._id });
    }

  
    

    if (selectedCategory && validCategoryIds.includes(selectedCategory)) {
      searchCondition.category = selectedCategory;
    }

    if (selectedPrice) {
      searchCondition.salePrice = {
        "1500": { $lt: 1500 },
        "2500": { $lt: 2500 },
        "4000": { $lt: 4000 },
        "above4000": { $gt: 4000 }
      }[selectedPrice] || searchCondition.salePrice;
    }

  
    let sortCondition = { createdAt: -1 };
    if (sortBy === "low-to-high") {
      sortCondition = { salePrice: 1 };
    } else if (sortBy === "high-to-low") {
      sortCondition = { salePrice: -1 };
    }

  
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

  
    const product = await Product.find(searchCondition)
      .sort(sortCondition)
      .skip(skip)
      .limit(limit)
      .lean();

    

    const totalProducts = await Product.countDocuments(searchCondition);
    const totalPages = Math.ceil(totalProducts / limit);

    res.render("shop", {
      user: user ? await User.findById(user).lean() : null,
      product,
      categories, 
      
      totalProducts,
      currentPage: page,
      totalPages,
      searchQuery: query,
      selectedFlavor,
      selectedCategory,
      selectedPrice,
      selectedSort: sortBy || null 
    });

  } catch (error) {
    console.error("Error in searchProducts:", error);
    res.redirect("/pageNotFound");
  }
};

module.exports ={loadHomePage,
    pageNotFound,load500ErrorPage,loadSignup,signup,
    verifyOtp,loadVerifyOtp,
    resendOtp,loadLogin,login,logout,loadShoppingPage,filterProduct,searchProducts};