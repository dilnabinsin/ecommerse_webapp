require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const Category =require("../../models/categorySchema")
const Product = require("../../models/productSchema")
const sharp = require("sharp")
const path = require("path")
const fs = require("fs")
const User =require("../../models/userSchema")
const HTTP_STATUS=require('../../config/httpStatusCode')
const {uploadToCloudinary} =require('../../config/cloudinary')


const calculateEffectivePrice = async (product) => {
  const regularPrice = product.regularPrice;
  const manualSalePrice = product.salePrice;

  // Initialize offers
  let productOffer = product.productOffer || 0;
  let categoryOffer = product.category && product.category.categoryOffer || 0;

  // Check if product offer or category offer exists and calculate sale price accordingly
  const effectiveOffer = Math.max(productOffer, categoryOffer); // Get the greater of both offers

  if (effectiveOffer > 0) {
    const discounted = regularPrice - (regularPrice * effectiveOffer / 100);
    return discounted.toFixed(2); // Apply greater discount (either product or category)
  }

  // If no offers, return the manual sale price
  return manualSalePrice.toFixed(2);
};


const getProductAddPage = async (req, res) => {
  try {
    const category = await Category.find({ isListed: true })
    res.render("product-add", {
      categories: category,error: null, success: null, formData: {},
    })
  } catch (error) {
    console.error("Error loading product add page:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error loading product add page" });
  }
  }




const addProducts = async (req, res) => {
  try {
      console.log("Received files:", req.files); 

      const product = req.body;
      
      const regularPrice = parseFloat(product.regularPrice);
      const salePrice = parseFloat(product.salePrice);
      const quantity = parseInt(product.quantity);
     // const brand = parseFloat(product.brand);
    //  const color = parseFloat(product.color);

      if (!product.productName || !product.description ||!product.fulldescription||!product.color||!product.brand|| isNaN(regularPrice) || isNaN(salePrice) || isNaN(quantity)  ) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "All required fields must be filled with valid values" });
      }

      if (regularPrice < 0 || salePrice < 0 || quantity < 0 ) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Price, Quantity, and Size must not be negative" });
      }

      if (salePrice >= regularPrice) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Sale Price must be less than Regular Price" });
      }

      if (!/^\d+(\.\d{1,3})?$/.test(quantity)) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Size must be a valid number (e.g., 0.100Kg, 1Kg, 2.5Kg, etc.)" });
      }

      const productExists = await Product.findOne({ productName: product.productName });
      if (productExists) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Product already exists, try with another name" });
      }

      const categoryId = await Category.findOne({ _id: product.category });
      if (!categoryId) {
          return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Invalid category selected" });
      }

      const uploadedImages = [];

      for (const file of req.files) {
          const result = await new Promise((resolve, reject) => {
              cloudinary.uploader.upload_stream(
                  { folder: "products" }, 
                  (error, result) => {
                      if (error) {
                          console.error("Cloudinary Upload Error:", error);
                          reject(error);
                      } else {
                          resolve(result.secure_url);
                      }
                  }
              ).end(file.buffer); 
          });

          uploadedImages.push(result);
      }

      console.log("Uploaded Image URLs:", uploadedImages);

      const newProduct = new Product({
          productName: product.productName,
          description: product.description,
          fulldescription: product.fulldescription,
          category: categoryId._id,
          regularPrice: product.regularPrice,
          salePrice: product.salePrice,
          createdOn: new Date(),
          quantity: product.quantity,
          brand: product.brand,
          color: product.color,
          productImage: uploadedImages,
          status: "available"
      });

      await newProduct.save();
      console.log("Saved product:", newProduct); 

      return res.status(HTTP_STATUS.OK).json({ success: "Product added successfully!" });
  } catch (error) {
      console.error("Error saving product:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "An error occurred. Please try again." });
  }
};


     
const getAllProducts = async (req, res) => {
  try {
    const search = req.query.search || "";
    const page = req.query.page || 1;
    const limit = 4;
    

    const productData = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
      ]
    })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate("category")  // Ensure population of category
      .sort({ createdAt: -1 })
      .exec();

    const count = await Product.find({
      $or: [
        { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
        { brand: { $regex: new RegExp(".*" + search + ".*", "i") } }
      ]
    }).countDocuments();

    const category = await Category.find({ isListed: true });
const productsWithEffectivePrices = await Promise.all(productData.map(async (product) => {
      const effectivePrice = await calculateEffectivePrice(product);
      return {
        ...product.toObject(),
        salePrice: effectivePrice
      };
    }));
    if (category.length > 0) {
      res.render("products", {
        data: productsWithEffectivePrices,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        categories: category,
      });
    } else {
      res.render("admin-error");
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    res.render("admin-error");
  }
};
const addProductOffer = async (req, res) => {
  try {
      const { productId, percentage } = req.body;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Product not found" });
      }

      product.productOffer = parseInt(percentage);
      product.salePrice = await calculateEffectivePrice(product);
      await product.save();

      res.status(HTTP_STATUS.OK).json({ status: true, message: "Offer added successfully" });
  } catch (error) {
      console.error("Error in addProductOffer:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
  }
};
const removeProductOffer = async (req, res) => {
  try {
      const { productId } = req.body;
      const product = await Product.findById(productId);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Product not found" });
      }

      product.productOffer = 0;
      product.salePrice = await calculateEffectivePrice(product);
      await product.save();

      res.status(HTTP_STATUS.OK).json({ status: true, message: "Offer removed successfully" });
  } catch (error) {
      console.error("Error in removeProductOffer:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal server error" });
  }
};

const blockProduct = async (req,res) => {
  try {

    let id = req.query.id;
    let currentPage = req.query.page || 1;
    await Product.updateOne({_id:id},{$set:{isBlocked:true}});
    res.redirect(`/admin/products?page=${currentPage}`)
    
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const unblockProduct = async (req,res) => {
  try {

    let id = req.query.id;
    await Product.updateOne({_id:id},{$set:{isBlocked:false}});
    res.redirect("/admin/products")
    
  } catch (error) {
    res.redirect("/pageerror")
    
  }
}

const getEditProduct = async (req, res) => {
  try {
    const id = req.query.id
    const data = req.body;
    const product = await Product.findOne({ _id: id }).populate("category")
    const categories = await Category.find({})

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Product not found" });
    }
  

    res.render("product-edit", {
      product: product,
      categories: categories,error: null, success: null, formData: {}
    })
  } catch (error) {
    console.error("Error in getEditProduct:", error)
    
   // return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Error retrieving product for editing" });
    res.redirect("/pageerror")
  }
}
const editProduct = async (req, res) => {
  try {
      const id = req.params.id;
      const data = req.body;
    const product = await Product.findById(id);
      //const product = await Product.findById(req.params.id).populate('category');
      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Product not found" });
      }

      const existingProduct = await Product.findOne({
          productName: data.productName,
          _id: { $ne: id }
      });

      if (existingProduct) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Product with this name already exists. Please try with another name." });
      }

      if (!data.productName || !data.description || !data.category||!data.brand||!data.color||!data.fulldescription) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "All required fields must be filled." });
      }

      const regularPrice = parseFloat(data.regularPrice);
      const salePrice = parseFloat(data.salePrice);
      const quantity = parseInt(data.quantity);
     

      if (isNaN(regularPrice) || isNaN(salePrice) || isNaN(quantity) ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Price and Quantity must be valid numbers." });
      }

      if (regularPrice < 0 || salePrice < 0 || quantity < 0 ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Price, Quantity, cannot be negative." });
      }

      if (salePrice > regularPrice) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Sale Price must be less than Regular Price." });
      }
      
      const category = await Category.findById(data.category);
      if (!category) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ error: "Invalid category selected." });
      }

      // Upload new images to Cloudinary
      const newImages = [];
      if (req.files && req.files.length > 0) {
          for (const file of req.files) {
              const imageUrl = await uploadToCloudinary(file.buffer);
              newImages.push(imageUrl);
          }
      }

      // Merge existing images with newly uploaded images
      const updatedImages = [...(product.productImage || []), ...newImages];
      const updateFields = {
          productName: data.productName,
          description: data.description,
          fulldescription: data.fulldescription,
          category: category._id,
         
          regularPrice: data.regularPrice,
          salePrice: data.salePrice,
          quantity: data.quantity,
          brand: data.brand,
          color: data.color,
          productImage: updatedImages 
      };

      await Product.findByIdAndUpdate(id, updateFields, { new: true });

      return res.status(HTTP_STATUS.OK).json({ success: "Product updated successfully!" });

  } catch (error) {
      console.error("Error updating product:", error);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "An unexpected error occurred. Please try again." });
  }
};





const deleteSingleImage = async (req, res) => {
  try {
    const { imageNameToServer, productIdToServer, imageIndex } = req.body;
    const product = await Product.findById(productIdToServer);

    if (!product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Product not found" });
    }

    // Remove the image from the array
    product.productImage.splice(imageIndex, 1);
    await product.save();

    const imagePath = path.join(__dirname, "../../public", imageNameToServer);

    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
      console.log(`Image ${imageNameToServer} deleted successfully`);
    } else {
      console.log(`Image ${imageNameToServer} not found`);
    }

    return res.status(HTTP_STATUS.OK).json({ status: true, message: "Image deleted successfully" });
  } catch (error) {
    console.error("Error in deleteSingleImage:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "An error occurred while deleting the image" });
  }
};



const deleteProduct = async (req, res) => {
  const productId = req.query.id;
  
  if (!productId) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message: 'Product ID is required' });
  }
  
  try {
      // Find and delete the product by its ID
      const product = await Product.findByIdAndDelete(productId);

      if (!product) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: 'Product not found' });
      }

      res.redirect('/admin/products'); // Redirect to the products management page or wherever you want
  } catch (err) {
      console.error(err);
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: 'Server Error' });
  }
}


module.exports = {calculateEffectivePrice,
    getProductAddPage,
    addProducts,getAllProducts,addProductOffer,
    removeProductOffer,
    blockProduct,
    unblockProduct,getEditProduct,editProduct,deleteSingleImage,deleteProduct
};


  
  
//