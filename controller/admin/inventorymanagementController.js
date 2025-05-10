const Category =require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const sharp = require("sharp")
const path = require("path")
const fs = require("fs")
const User =require("../../models/userSchema")
const HTTP_STATUS=require('../../config/httpStatusCode')


const getInventoryPage = async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
  
      const totalCount = await Product.countDocuments();
      const products = await Product.find()
        .select("productName regularPrice salePrice quantity productOffer")
        .skip((page - 1) * limit)
        .limit(limit);
  
      const lowStockProducts = await Product.find({ quantity: { $lt: 5 } })
        .select("productName quantity");
  
      res.render("inventory-management", {page:"inventory-management",
        products,
        lowStockProducts,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
      });
    } catch (error) {
      console.error("Error loading inventory page:", error);
   res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).render("admin-error"); 
    }
  };
  
  const updateInventoryData = async (req, res) => {
    try {
      const { productId, quantity } = req.body;
  
      if (quantity > 500) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Quantity cannot exceed 500",
        });
      }
  
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: "Product not found",
        });
      }
  
      await Product.findByIdAndUpdate(productId, { quantity: quantity });
  
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: "Quantity updated successfully",
      });
    } catch (error) {
      console.error("Error updating inventory:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Server error",
      });
    }
  };
  
  
module.exports = {
    getInventoryPage,updateInventoryData
}


  