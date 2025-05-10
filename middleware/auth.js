const User =require("../models/userSchema")
const { userBlockedEmitter } = require("../controller/admin/customerController");
const userAuth = (req, res, next) => {
    if (req.session.user) {
      User.findById(req.session.user)
        .then((user) => {
          if (user && !user.isBlocked) {
            next()
          } else {
            delete req.session.user
            res.redirect("/login")
          }
        })
        .catch((error) => {
          console.log("User Auth middleware Error", error)
          res.status(500).send("Internal Server Error")
        })
    } else {
      res.redirect("/login")
    }
  }
  
  const addCartWishlist = (req, res, next) => {
    if (!req.session.user) {
      res.redirect("/login")

    }
  }


  
  //module.exports = { userAuth}
  
  userBlockedEmitter.on("userBlocked", (userId) => {
    console.log(`User ${userId} has been blocked. Their session should be cleared.`);
    // You can also perform additional operations here, like clearing their session.
  });

const adminAuth = (req, res, next) => {
    if (req.session.admin) {
        User.findById(req.session.admin)
        .then(admin => {
            if (admin && admin.isAdmin) { 
                next();
            } else {
                req.session.destroy();  // Clear invalid session
                res.redirect('/admin/login');
            }
        })
        .catch(error => {
            console.error("Admin Auth middleware Error", error);
            res.status(500).send("Internal Server Error")
            res.redirect('/admin/login');
        });
    } else {
        res.redirect('/admin/login');
    }
};

const checkUserAuthWish = (req, res, next) => {
  if (req.session.user) {
      next(); // User is logged in, proceed to next function
  } else {
      return res.status(401).json({ status: false, message: "User not logged in" });
  }
};


const ajaxAuth = (req, res, next) => {
  if (req.session.user) {
    User.findById(req.session.user)
      .then((user) => {
        if (user && !user.isBlocked) {
          next();
        } else {
          delete req.session.user;
          res.status(401).json({ 
            status: false, 
            message: "User is blocked or not found" 
          });
        }
      })
      .catch((error) => {
        console.log("Ajax Auth Error", error);
        res.status(500).json({ 
          status: false, 
          message: "Internal server error" 
        });
      });
  } else {
    res.status(401).json({ 
      status: false, 
      message: "User not logged in" 
    });
  }
};

const loadBanners = async (req, res, next) => {
  try {
      res.locals.banner = await Banner.find();  // Store banner data globally
  } catch (error) {
      console.error("Error fetching banners:", error);
      res.locals.banner = [];
  }
  next();
};


const validateCancelRequest = (req, res, next) => {
  const { orderId } = req.params;
  const { user } = req.session;
  
  if (!user) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  
  if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
    return res.status(400).json({ success: false, message: "Invalid order ID" });
  }
  
  next();
};



module.exports = {
    userAuth,
    adminAuth,
    addCartWishlist,
    checkUserAuthWish,
    ajaxAuth,loadBanners,validateCancelRequest
    
}