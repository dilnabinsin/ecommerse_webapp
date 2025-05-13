const User = require("../../models/userSchema");
const Product = require("../../models/productSchema");
const mongodb = require("mongodb");
const HTTP_STATUS=require('../../config/httpStatusCode')

const getCartPage1 = async (req, res) => {
  try {
    const id = req.session.user;
    const user = await User.findOne({ _id: id });
    const productIds = user.cart.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIds } });
    const oid = new mongodb.ObjectId(id);
    let data = await User.aggregate([
      { $match: { _id: oid } },
      { $unwind: "$cart" },
      {
        $project: {
          proId: { $toObjectId: "$cart.productId" },
          quantity: "$cart.quantity",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "proId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
    ]);
    let quantity = 0;
    for (const i of user.cart) {
      quantity += i.quantity;
    }
    let grandTotal = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i].productDetails && data[i].productDetails[0]) {
        grandTotal += data[i].productDetails[0].salePrice * data[i].quantity;
      }
      req.session.grandTotal = grandTotal;
    }
    res.render("cart", {page:"cart", 
      user,
      quantity,
      data,
      grandTotal,
     
     
    });
  } catch (error) {
    res.redirect("/pageNotFound");
  }
};

const getCartPage = async (req, res) => {
  try {
   
    const id = req.session.user;
    const user = await User.findOne({ _id: id });
    if (!user) {
      return res.redirect("/pageNotFound"); // Handle invalid user
    }

    const oid = new mongodb.ObjectId(id);
    let data = await User.aggregate([
      { $match: { _id: oid } },
      { $unwind: "$cart" },
      {
        $project: {
          proId: { $toObjectId: "$cart.productId" },
          quantity: "$cart.quantity",
        },
      },
      {
        $lookup: {
          from: "products",
          localField: "proId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      // Filter out items with empty productDetails
      {
        $match: {
          "productDetails.0": { $exists: true }, // Only keep items with non-empty productDetails
        },
      },
    ]);

    // Calculate quantity
    let quantity = 0;
    for (const i of user.cart) {
      quantity += i.quantity;
    }

    // Calculate grandTotal and store in session
    let grandTotal = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i].productDetails && data[i].productDetails[0]) {
        grandTotal += data[i].productDetails[0].salePrice * data[i].quantity;
      }
    }
    req.session.grandTotal = grandTotal;

    // Log data for debugging
    // Calculate cartCount and wishlistCount
    const cartCount = user.cart ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const wishlistCount = user.wishlist ? user.wishlist.length : 0;
    console.log('Cart data:', JSON.stringify(data, null, 2));
    console.log('Session user IDeeee:', req.session.user);
    console.log('User carteeee:', user.cart);
    res.render("cart", {
      page: "cart",
      user,
      quantity,
      data,
      grandTotal,
      cartCount, // Pass cartCount to the template
      wishlistCount, // Pass wishlistCount to the template
    });
  } catch (error) {
    console.error('Error in getCartPage:', error);
    res.redirect("/pageNotFound");
  }
};
const addToCart = async (req, res) => {
  try {
    const id = req.body.productId;
    const userId = req.session.user;
    const findUser = await User.findById(userId);
    const product = await Product.findById({ _id: id }).lean();
    
    if (!product) {
      return  res.status(HTTP_STATUS.NOT_FOUND).json({ status: "Product not found" });
    }
    
    if (product.quantity <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: "Out of stock" });
    }

    const cartIndex = findUser.cart.findIndex((item) => item.productId == id);

    if (cartIndex === -1) {
      const quantity = 1;
      await User.findByIdAndUpdate(userId, {
        $addToSet: {
          cart: {
            productId: id,
            quantity: quantity,
          },
        },
      });
      return res.json({ status: true, cartLength: findUser.cart.length + 1, user: userId });
    } else {
      const productInCart = findUser.cart[cartIndex];
      if (productInCart.quantity < product.quantity) {
        const newQuantity = productInCart.quantity + 1;
        await User.updateOne(
          { _id: userId, "cart.productId": id },
          { $set: { "cart.$.quantity": newQuantity } }
        );
        return res.json({ status: true, cartLength: findUser.cart.length, user: userId });
      } else {
        return res.json({ status: "Out of stock" });
      }
    }
  } catch (error) {
    console.error(error);
    return res.redirect("/pageNotFound");
  }
};


const changeQuantity = async (req, res) => {
  try {
    const id = req.body.productId;
    const user = req.session.user;
    const count = req.body.count;
    // count(-1,+1)
    const findUser = await User.findOne({ _id: user });
    const findProduct = await Product.findOne({ _id: id });
    const oid = new mongodb.ObjectId(user);
    if (findUser) {
      const productExistinCart = findUser.cart.find(
        (item) => item.productId === id
      );
      let newQuantity;
      if (productExistinCart) {
        if (count == 1) {
          newQuantity = productExistinCart.quantity + 1;
        } else if (count == -1) {
          newQuantity = productExistinCart.quantity - 1;
        } else {
          return res
            .status(400)
            .json({ status: false, error: "Invalid count" });
        }
      } else {
      }
      if (newQuantity > 0 && newQuantity <= findProduct.quantity) {
        let quantityUpdated = await User.updateOne(
          { _id: user, "cart.productId": id },
          {
            $set: {
              "cart.$.quantity": newQuantity,
            },
          }
        );
        const totalAmount = findProduct.salePrice * newQuantity;
        const grandTotal = await User.aggregate([
          { $match: { _id: oid } },
          { $unwind: "$cart" },
          {
            $project: {
              proId: { $toObjectId: "$cart.productId" },
              quantity: "$cart.quantity",
            },
          },
          {
            $lookup: {
              from: "products",
              localField: "proId",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          {
            $unwind: "$productDetails", // Unwind the array created by the $lookup stage
          },

          {
            $group: {
              _id: null,
              totalQuantity: { $sum: "$quantity" },
              totalPrice: {
                $sum: { $multiply: ["$quantity", "$productDetails.salePrice"] },
              }, 
            },
          },
        ]);
        if (quantityUpdated) {
          res.json({
            status: true,
            quantityInput: newQuantity,
            count: count,
            totalAmount: totalAmount,
            grandTotal: grandTotal[0].totalPrice,
          });
        } else {
          res.json({ status: false, error: "cart quantity is less" });
        }
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, error: "out of stock" });
      }
    }
  } catch (error) {
    res.redirect("/pageNotFound");
    return res.status(500).json({ status: false, error: "Server error" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const id = req.query.id;
    const userId = req.session.user;
    const user = await User.findById(userId);
    const cartIndex = user.cart.findIndex((item) => item.productId == id);
    user.cart.splice(cartIndex, 1);
    await user.save();
    res.status(HTTP_STATUS.OK).redirect("/cart");
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageNotFound");
  }
};



const getCartWishlistCount =async (req, res) => {
  try {
    const userId = req.session.user;
    if (!userId) {
      return res.json({ cartCount: 0, wishlistCount: 0 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.json({ cartCount: 0, wishlistCount: 0 });
    }

    const cartCount = user.cart ? user.cart.reduce((sum, item) => sum + item.quantity, 0) : 0;
    const wishlistCount = user.wishlist ? user.wishlist.length : 0;

    res.json({ cartCount, wishlistCount });
  } catch (error) {
    console.error('Error in getCartWishlistCount:', error);
    res.status(500).json({ cartCount: 0, wishlistCount: 0 });
  }
};

module.exports = {
  getCartPage,
  addToCart,
  changeQuantity,
  deleteProduct,getCartWishlistCount
};

