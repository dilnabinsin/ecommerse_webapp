const User =require("../../models/userSchema")
const nodemailer = require('nodemailer');
const bcrypt =require("bcrypt")
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema")
const Banner = require("../../models/bannerSchema")
const Wishlist = require("../../models/wishlistSchema")

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

const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        let wishlistCount = 0;
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
                mostSellingByCategory
            });
        }
    } catch (error) {
        console.error('Error loading home page:', error);
        res.status(500).send('Server Error');
    }
};

// .......................................
const loadSignup= async(req,res)=>{

try{
    
    return res.render("signup")
}
catch(error){
    console.log("Home Page not Loading:",error)
    res.status(500).send("Server Error")
    
}

}
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


const loadLogin =async (req,res)=>{

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
        return res.render("login", {
          message: "Incorrect Password",
          email: email
        });
      }
  
      req.session.user = findUser._id;
      res.redirect("/");
    } catch (error) {
      console.error("Login Error:", error);
      res.render("login", {
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

const loadShoppingPage = async (req, res) => {
    try {
        // Get user data if authenticated
        const user = req.session.user;
        
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
            priceRange  
        });

    } catch (error) {
        console.error("Error loading shopping page:", error);
        res.status(500).redirect("/pageNotFound");
    }
};

const filterProduct2 = async (req, res) => {
    try {
        const user = req.session.user;
        const { category, priceRange, sort = '', query: searchQuery, page = 1 } = req.query;

        const filter = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        if (category) {
            filter.category = category;
        }

        if (searchQuery) {
            filter.productName = { $regex: searchQuery.trim(), $options: 'i' };
        }

        if (priceRange) {
            switch (priceRange) {
                case "1500":
                    filter.salePrice = { $lte: 1500 };
                    break;
                case "2500":
                    filter.salePrice = { $gte: 1501, $lte: 2500 };
                    break;
                case "4000":
                    filter.salePrice = { $gte: 2501, $lte: 4000 };
                    break;
                case "above4000":
                    filter.salePrice = { $gt: 4000 };
                    break;
            }
        }

        let sortOption = { createdAt: -1 }; // default
        if (sort === 'price_asc') sortOption = { salePrice: 1 };
        else if (sort === 'price_desc') sortOption = { salePrice: -1 };
        else if (sort === 'name_asc') sortOption = { productName: 1 };
        else if (sort === 'name_desc') sortOption = { productName: -1 };

        const limit = 6;
        const skip = (page - 1) * limit;

        const products = await Product.find(filter)
            .populate('category', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        const categories = await Category.find({ isListed: true });
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => ({
                _id: cat._id,
                name: cat.name,
                productCount: await Product.countDocuments({ category: cat._id, isBlocked: false, quantity: { $gt: 0 } })
            }))
        );

        let userData = null;
        if (user) {
            userData = await User.findById(user);
            if (userData) {
                userData.searchHistory.push({
                    category: category || null,
                    searchedOn: new Date(),
                    query: searchQuery || null
                });
                await userData.save();
            }
        }

        res.render("shop", {
            page: "shop",
            user: userData,
            products,
            category: categoriesWithCounts,
            totalPages,
            currentPage: parseInt(page),
            sort,
            priceRange,
            selectedCategory: category || '',
            search: searchQuery || ''
        });

    } catch (error) {
        console.error("Error while filtering products:", error);
        res.redirect("/pageNotFound");
    }
};

const filterProduct1= async (req, res) => {
    try {
        const user = req.session.user;
        const category = req.query.category;
        const priceRange = req.query.priceRange;
        const sort = req.query.sort || '';
        const query = {
            isBlocked: false,
            quantity: { $gt: 0 }
        };
        if (sort === 'price_asc') {
            Product.sort((a, b) => a.salePrice - b.salePrice);
        } else if (sort === 'price_desc') {
            Product.sort((a, b) => b.salePrice - a.salePrice);
        } else if (sort === 'name_asc') {
            Product.sort((a, b) => a.productName.localeCompare(b.productName));
        } else if (sort === 'name_desc') {
            Product.sort((a, b) => b.productName.localeCompare(a.productName));
        }
        // If a category is selected, filter by category
        if (category) {
            const findCategory = await Category.findOne({ _id: category });
            if (findCategory) {
                query.category = findCategory._id;
            }
        }
      
        if (priceRange) {
            switch (priceRange) {
                case "1500":
                    query.salePrice = { $gte: 0, $lte: 1500 };
                    break;
                case "2500":
                    query.salePrice = { $gte: 1501, $lte: 2500 };
                    break;
                case "4000":
                    query.salePrice = { $gte: 2501, $lte: 4000 };
                    break;
                case "above4000":
                    query.salePrice = { $gt: 4000 };
                    break;
                default:
                    break; // Ignore invalid priceRange values
            }
        }
      
         
        // Check for search query in the URL
        if (req.query.query) {
            const searchQuery = req.query.query.trim();
            if (searchQuery) {
                // Perform a text search for matching products
                query.$text = { $search: searchQuery };
            }
        }

        // Fetch products based on the filter criteria
        let findProducts = await Product.find(query)
        .populate('category', 'name').lean()

        // Sort products by creation date in descending order
        findProducts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const categories = await Category.find({ isListed: true });

        // Get category counts
        const categoriesWithCounts = await Promise.all(
            categories.map(async (category) => {
                const count = await Product.countDocuments({
                    category: category._id,
                    isBlocked: false,
                    quantity: { $gt: 0 }
                });
                return { _id: category._id, name: category.name, productCount: count };
            })
        );

        // Pagination setup
        let itemsPerPage = 6;
        let currentPage = parseInt(req.query.page) || 1;
        let startIndex = (currentPage - 1) * itemsPerPage;
        let endIndex = startIndex + itemsPerPage;
        let totalPages = Math.ceil(findProducts.length / itemsPerPage);
        const currentProduct = findProducts.slice(startIndex, endIndex);

        // Handle user data and search history
        let userData = null;
        // let wishlistCount = 0;
        // if (user) {
        //     // Assuming you have a Wishlist model that tracks user's wishlist
        //     const wishlist = await Wishlist.findOne({ userId: user });
        //     wishlistCount = wishlist ? wishlist.items.length : 0;
        // }
        if (user) {
            userData = await User.findOne({ _id: user });
            if (userData) {
                const searchEntry = {
                    category: category || null,
                    searchedOn: new Date(),
                    query: req.query.query || null
                };
                userData.searchHistory.push(searchEntry);
                await userData.save();
            }
        }

        req.session.filteredProducts = currentProduct;

        // Render the results
        res.render("shop", {page:"shop",
            user: userData,
            products: currentProduct,
            // wishlistCount: wishlistCount,
            category: categoriesWithCounts,
            totalPages,
            currentPage,
            sort: sort,
            priceRange,
            selectedCategory: category || null,
            search: req.query.query || ''
        });

    } catch (error) {
        console.error("Error while filtering products:", error);
        res.redirect("/pageNotFound");
    }
};





const searchProducts = async (req, res) => {
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
        const user = req.session.user;
        const { category, priceRange, sort = '', query: searchQuery = '', page = 1 } = req.query;

        // Build the filter object
        const filter = {
            isBlocked: false,
            quantity: { $gt: 0 },
        };

        // Apply category filter if provided
        if (category) {
            filter.category = category;
        }

        // Apply search query if provided
        if (searchQuery.trim()) {
            filter.$or = [
                { productName: { $regex: searchQuery.trim(), $options: 'i' } },
                { description: { $regex: searchQuery.trim(), $options: 'i' } },
            ];
        }

        // Apply price range filter if provided
        if (priceRange) {
            switch (priceRange) {
                case "1500":
                    filter.salePrice = { $lte: 1500 };
                    break;
                case "2500":
                    filter.salePrice = { $gte: 1501, $lte: 2500 };
                    break;
                case "4000":
                    filter.salePrice = { $gte: 2501, $lte: 4000 };
                    break;
                case "above4000":
                    filter.salePrice = { $gt: 4000 };
                    break;
            }
        }

        // Define sorting options
        let sortOption = { createdAt: -1 }; // Default sort by newest
        if (sort === 'price_asc') sortOption = { salePrice: 1 };
        else if (sort === 'price_desc') sortOption = { salePrice: -1 };
        else if (sort === 'name_asc') sortOption = { productName: 1 };
        else if (sort === 'name_desc') sortOption = { productName: -1 };

        // Pagination settings
        const limit = 6;
        const skip = (page - 1) * limit;

        // Fetch products with filters, sorting, and pagination
        const products = await Product.find(filter)
            .populate('category', 'name')
            .sort(sortOption)
            .skip(skip)
            .limit(limit)
            .lean();

        // Count total products for pagination
        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limit);

        // Fetch categories and their product counts
        const categories = await Category.find({ isListed: true }).lean();
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => ({
                _id: cat._id,
                name: cat.name,
                productCount: await Product.countDocuments({
                    category: cat._id,
                    isBlocked: false,
                    quantity: { $gt: 0 },
                }),
            }))
        );

        // Handle user data and search history
        let userData = null;
        if (user) {
            userData = await User.findById(user);
            if (userData && searchQuery.trim()) {
                userData.searchHistory.push({
                    category: category || null,
                    searchedOn: new Date(),
                    query: searchQuery || null,
                });
                await userData.save();
            }
        }

        // Render the shop page
        res.render("shop", {
            page: "shop",
            user: userData,
            products,
            category: categoriesWithCounts,
            totalPages,
            currentPage: parseInt(page),
            totalProducts,
            sort,
            priceRange: priceRange || '',
            selectedCategory: category || '',
            search: searchQuery,
            noProductsMessage: products.length === 0 ? 'No products available under this category' : '',
        });

    } catch (error) {
        console.error("Error while filtering products:", error);
        res.redirect("/pageNotFound");
    }
};

module.exports ={loadHomePage,
    pageNotFound,load500ErrorPage,loadSignup,signup,
    verifyOtp,loadVerifyOtp,
    resendOtp,loadLogin,login,logout,loadShoppingPage,filterProduct,searchProducts};