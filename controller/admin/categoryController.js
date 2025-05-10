const Category =require("../../models/categorySchema")
const Product = require("../../models/productSchema")

const HTTP_STATUS=require('../../config/httpStatusCode')
//..............................................................................

const categoryInfo = async (req, res) => {
  try {
    const page = Number.parseInt(req.query.page) || 1
    const limit = 4
    const skip = (page - 1) * limit

    const query = {}
    if (req.query.search) {
      query.name = { $regex: `^${req.query.search}`, $options: "i" }
    }
    if (req.query.minOffer || req.query.maxOffer) {
      query.categoryOffer = {}
      if (req.query.minOffer) query.categoryOffer.$gte = Number.parseInt(req.query.minOffer)
      if (req.query.maxOffer) query.categoryOffer.$lte = Number.parseInt(req.query.maxOffer)
    }

    const categories = await Category.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit)

    const totalCategories = await Category.countDocuments(query)
    const totalPages = Math.ceil(totalCategories / limit)

    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      // If it's an AJAX request, send JSON response
      res.status(HTTP_STATUS.OK).json({
        categories: categories,
        currentPage: page,
        totalPages: totalPages,
        totalCategories: totalCategories,
      })
    } else {
      // If it's a regular request, render the page
      res.render("category", {
        categories: categories,
        currentPage: page,
        totalPages: totalPages,
        totalCategories: totalCategories,
      })
    }
  } catch (error) {
    console.error(error)
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "An error occurred while fetching categories" });
    } else {
      res.redirect("/pageerror")
    }
  }
}

//......................................................................
const addCategory =async(req,res)=>{
    try{
        console.log("Received request to add category:", req.body)
        const { name, description } = req.body

        const trimmedName = name.trim()
      if (!trimmedName || trimmedName.length === 0) {
        console.log("Invalid input: name is empty or contains only whitespace")
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Category name cannot be empty" });
      }
        
        if (!description) {
            console.log("Invalid input: description is missing")
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Description is required" });
          }
         // Check if category with the same name already exists
          const existingCategory = await Category.findOne({name: new RegExp(`^${trimmedName}$`, "i") })
          if (existingCategory) {
            console.log("Category already exists:",trimmedName)
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Category with this name already exists" });
  
          }
          const newCategory = new Category({ name: trimmedName, description })
          const savedCategory = await newCategory.save()
          console.log("New category added:", savedCategory)
          res.status(HTTP_STATUS.CREATED).json({ success: true, message: "Category added successfully", category: savedCategory });
    }
    catch (error) {
        console.error("Error in addCategory:", error)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to add category", error: error.message });
      }
}

//.................................................................................

const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, percentage } = req.body
    const category = await Category.findById(categoryId)
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Category not found" });
    }

    const products= await Product.find({category:category._id})
    const hasProductOffer=products.some((product)=>product.productOffer>percentage )
if(hasProductOffer){
  return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message: "Products within this category already have a product offer" });
}
    if (isNaN(percentage) || percentage < 0 || percentage > 99) {
      return res.json({ status: false, message: "Invalid percentage value" });
    }
    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } })

    for(const product of products){
      product.productOffer=0
      product.salePrice =product.regularPrice
      await product.save()
    }
   
    return res.status(HTTP_STATUS.OK).json({ status: true, message: "Offer added successfully" });

  }
  
  catch (error) {
    console.error("Error in addCategoryOffer:", error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal Server Error" });
  }


}

//...................................................................................

const removeCategoryOffer = async (req, res) => {
  try {
    const categoryId = req.body.categoryId
    const category = await Category.findById(categoryId)
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: false,
        message: "Category not found"
      });
    }

const percentage =category.categoryOffer
const products = await Product.find({ category: category._id })
if(products.length>0){
  for (const product of products) {
    product.salePrice+=Math.floor(product.regularPrice*(percentage/100))
    product.productOffer=0
    await product.save()
  }

}
  

category.categoryOffer=0;
await category.save();
    //await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: null } })
    
   
    return res.status(HTTP_STATUS.OK).json({
      status: true,
      message: "Offer removed successfully"
    });
  } 
  
  
  catch (error) {
    console.error("Error in removeCategoryOffer:", error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: false,
      message: "Internal Server Error"
    });
  }
}
//...........................................................................................


const getListCategory = async (req, res) => {
  try {
    const { id } = req.query;
    await Category.updateOne({ _id: id }, { $set: { isListed: true } });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Category listed successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to list category"
    });
  }
};

const getunListCategory = async (req, res) => {
  try {
    const { id } = req.query;
    await Category.updateOne({ _id: id }, { $set: { isListed: false } });
    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Category unlisted successfully"
    });
  } catch (error) {
    console.error(error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to unlist category"
    });
  }
};
const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: 'Category not found' });
    }

    // Toggle the status
    category.isListed = !category.isListed;
    await category.save();

    res.status(HTTP_STATUS.OK).json({ success: true, isListed: category.isListed });
  } catch (error) {
    console.error("Error updating category status:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: 'Server error' });
  }
  }





//.........................................................................
const getEditCategory = async (req, res) => {
  try {
    const categoryId = req.params.id; // Fix: Use req.params.id instead of req.query.id
    const category = await Category.findById(categoryId); // Fix: Use categoryId

    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Category not found" });
    }

    res.render("editcategory", { category });
  } catch (error) {
    console.error(error);
    res.redirect("/pageerror");
  }
};

//.....................................................................................
const editCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    const { name, description } = req.body;

    // Validate input
    if (!name || !description) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Name and description are required" });
    }

    // Check if a category with the same name exists, but exclude the current category
    // const existingCategory = await Category.findOne({ name: name, _id: { $ne: categoryId } });
    // if (existingCategory) {
    //   return res.status(400).json({ success: false, message: "Category name already exists. Please choose another name." });
    // }
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp('^' + name + '$', 'i') },
      _id: { $ne: categoryId }, // Make sure it's not the same category being updated
  });
  if (existingCategory) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      success: false,
      message: 'Category with this name already exists. Please choose a different name.',
    });
}
    // Update the category
    const updatedCategory = await Category.findByIdAndUpdate(
      categoryId,
      { name, description },
      { new: true } // Return the updated document
    );

    if (!updatedCategory) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Category not found" });
    }

    // Redirect after successful update
    res.status(HTTP_STATUS.OK).json({ success: true, message: "Category updated successfully" });
  } 
   catch (error) {
    console.error("Error updating category:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to update category" });
  }
};
//..............................................................................................
const editCategoryOffer = async (req, res) => {
  try {
    const percentage = Number.parseInt(req.body.percentage)
    const categoryId = req.body.categoryId

    if (isNaN(percentage) || percentage < 0 || percentage > 99) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message: "Invalid percentage value" });
    }

    const category = await Category.findById(categoryId)
    if (!category) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ status: false, message: "Category not found" });
    }

    const products = await Product.find({ category: category._id })
    const hasProductOffer = products.some((product) => product.productOffer > percentage)

    if (hasProductOffer) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message: "Some products have a higher offer already" });
    }

    await Category.updateOne({ _id: categoryId }, { $set: { categoryOffer: percentage } })

    for (const product of products) {
      product.productOffer = 0
      product.salePrice = product.regularPrice - product.regularPrice * (percentage / 100)
      await product.save()
    }

    res.status(HTTP_STATUS.OK).json({ status: true, message: "Offer updated successfully" });

  } catch (error) {
    console.error("Error in editCategoryOffer:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ status: false, message: "Internal Server Error" });
  }
}

//............................................................................................
const deleteCategory = async (req, res) => {
    try {
      const categoryId = req.params.id
      const deletedCategory = await Category.findByIdAndDelete(categoryId)
      if (!deletedCategory) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Category not found" });
      }

    
      res.status(HTTP_STATUS.OK).json({ success: true, message: "Category deleted successfully" });
    } catch (error) {
      console.error("Error in deleteCategory:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to delete category" });}
  }
module.exports={
  categoryInfo,
  addCategory,
  addCategoryOffer,
  removeCategoryOffer,
  getListCategory,
  getunListCategory,
  toggleCategoryStatus,
  getEditCategory,editCategory,editCategoryOffer,deleteCategory}