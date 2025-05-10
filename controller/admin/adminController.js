const User =require("../../models/userSchema")
const mongoose =require("mongoose");
const bcrypt =require("bcrypt")
const Order = require('../../models/orderSchema');
const Product = require('../../models/productSchema');
const HTTP_STATUS=require('../../config/httpStatusCode')
const pageError = async (req, res) => {
    res.render('admin-error')
}
//.....................................//
const loadLogin =(req,res)=>{
    if(req.session.admin){
        return res.redirect("/admin/dashboard")
    }
    
        res.render('admin-login',{message:null})
    }
    //......................................................//



    const login =async(req,res)=>{
        try{

            const {email,password}=req.body
            const admin =await User.findOne({email,isAdmin:true})
            if(admin){
                const passwordMatch =bcrypt.compare(password,admin.password)
                if(passwordMatch){
                    req.session.admin=admin._id;   //change to id not treue
                    return res.redirect("/admin/dashboard")
                }
                else{
                  return res.status(HTTP_STATUS.UNAUTHORIZED).redirect('/admin/login');

                }
            } else {
              return res.status(HTTP_STATUS.NOT_FOUND).redirect('/admin/login');
            }
            }

        
        catch(error){
            console.log("Login Error", error);
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect('/pageerror');
        }
    }

//..........................................................................................//
const loadDashboard = async (req, res) => {
    if (req.session.admin) {
      try {
        const productCount = await Product.countDocuments()
        const userCount = await User.countDocuments({ isAdmin: false })
        const orderCount = await Order.countDocuments()
  
        const orders = await Order.find({ status: "delivered" })
        const totalRevenue = orders.reduce((total, order) => total + order.finalAmount, 0)
  
        const topProducts = await getTopSellingProducts()
  
        const recentOrders = await getRecentOrders()
  
        const salesData = await getSalesDataHelper("monthly")
  
        const orderStatusCounts = await getOrderStatusCounts()
  
        const dashboardData = {
          productCount,
          userCount,
          orderCount,
          totalRevenue,
          topProducts,
          recentOrders,
          salesData: salesData.data,
          salesLabels: salesData.labels,
          orderStatusData: Object.values(orderStatusCounts),
          orderStatusLabels: Object.keys(orderStatusCounts),
        }
  
        res.status(HTTP_STATUS.OK).render("dashboard", { dashboardData, page: "dashboard" });
      } catch (error) {
        console.error("Dashboard Error:", error)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageerror");
      }
    } else {
      return res.status(HTTP_STATUS.UNAUTHORIZED).redirect("/admin/login");
    }
  }
  const getTopSellingProducts = async (limit = 10) => {
    try {
      const topProducts = await Order.aggregate([
        { $match: { status: "delivered" } },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.product",
            name: { $first: "$orderedItems.productName" },
            soldCount: { $sum: "$orderedItems.quantity" },
            totalSales: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } },
          },
        },
        { $sort: { soldCount: -1 } },
        { $limit: limit },
      ])
  
   
      const enrichedProducts = await Promise.all(
        topProducts.map(async (product) => {
          const productDetails = await Product.findById(product._id).populate("category")
          return {
            _id: product._id,
            name: product.name,
            category: productDetails?.category?.name || "Uncategorized",
            price: productDetails?.salePrice || 0,
            image: productDetails?.productImage?.[0] || null,
            soldCount: product.soldCount,
          }
        }),
      )
  
      return enrichedProducts
    } catch (error) {
      console.error("Error getting top products:", error)
      return []
    }
  }
  
  
  const getRecentOrders = async (limit = 5) => {
    try {
      const recentOrders = await Order.find().sort({ createdOn: -1 }).limit(limit)
  
      
      const ordersWithCustomers = await Promise.all(
        recentOrders.map(async (order) => {
          const customer = await User.findById(order.userId)
          return {
            ...order.toObject(),
            customerName: customer ? `${customer.name} ${customer.email}` : "Unknown",
          }
        }),
      )
  
      return ordersWithCustomers
    } catch (error) {
      console.error("Error getting recent orders:", error)
      return []
    }
  }
  
  
  const getSalesDataHelper = async (period = "yearly") => {
    try {
      const now = new Date()
      const labels = []
      const data = []
  
      if (period === "weekly") {
        
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now)
          date.setDate(date.getDate() - i)
  
          const dayStart = new Date(date.setHours(0, 0, 0, 0))
          const dayEnd = new Date(date.setHours(23, 59, 59, 999))
  
          const dayOrders = await Order.find({
            createdOn: { $gte: dayStart, $lte: dayEnd },
            status: "delivered",
          })
  
          const daySales = dayOrders.reduce((total, order) => total + order.finalAmount, 0)
  
          labels.push(date.toLocaleDateString("en-US", { weekday: "short" }))
          data.push(daySales)
        }
      } else if (period === "monthly") {
        //loop through last 6 months
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now)
          date.setMonth(date.getMonth() - i)
  
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1)
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  
          const monthOrders = await Order.find({
            createdOn: { $gte: monthStart, $lte: monthEnd },
            status: "delivered",
          })
  
          const monthSales = monthOrders.reduce((total, order) => total + order.finalAmount, 0)
  
          labels.push(date.toLocaleDateString("en-US", { month: "short" }))
          data.push(monthSales)
        }
      } else if (period === "yearly") {
        
        for (let i = 4; i >= 0; i--) {
          const year = now.getFullYear() - i
  
          const yearStart = new Date(year, 0, 1)
          const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999)
  
          const yearOrders = await Order.find({
            createdOn: { $gte: yearStart, $lte: yearEnd },
            status: "delivered",
          })
  
          const yearSales = yearOrders.reduce((total, order) => total + order.finalAmount, 0)
  
          labels.push(year.toString())
          data.push(yearSales)
        }
      }
  
      return { labels, data }
    } catch (error) {
      console.error("Error getting sales data:", error)
      return { labels: [], data: [] }
    }
  }
  
  
  const getOrderStatusCounts = async () => {
    try {
      const statusCounts = {
        Delivered: 0,
        Pending: 0,
        Shipped: 0,
        Cancelled: 0,
        Returned: 0,
      }
  
      const orders = await Order.find()
  
      orders.forEach((order) => {
        if (order.status === "delivered") statusCounts["Delivered"]++
        else if (order.status === "pending") statusCounts["Pending"]++
        else if (order.status === "shipped") statusCounts["Shipped"]++
        else if (order.status === "cancelled") statusCounts["Cancelled"]++
        else if (order.status.includes("return")) statusCounts["Returned"]++
      })
  
      return statusCounts
    } catch (error) {
      console.error("Error getting order status counts:", error)
      return { Delivered: 0, Pending: 0, Shipped: 0, Cancelled: 0, Returned: 0 }
    }
  }
  
  const getTopSelling = async (req, res) => {
    try {
      const { type } = req.query
  
      if (type === "categories") {
        
        const topCategories = await Order.aggregate([
          { $match: { status: "delivered" } },
          { $unwind: "$orderedItems" },
          {
            $lookup: {
              from: "products",
              localField: "orderedItems.product",
              foreignField: "_id",
              as: "productDetails",
            },
          },
          { $unwind: "$productDetails" },
          {
            $lookup: {
              from: "categories",
              localField: "productDetails.category",
              foreignField: "_id",
              as: "categoryDetails",
            },
          },
          { $unwind: "$categoryDetails" },
          {
            $group: {
              _id: "$categoryDetails._id",
              name: { $first: "$categoryDetails.name" },
              productCount: { $addToSet: "$productDetails._id" },
              soldCount: { $sum: "$orderedItems.quantity" },
              totalSales: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } },
            },
          },
          {
            $project: {
              _id: 1,
              name: 1,
              productCount: { $size: "$productCount" },
              soldCount: 1,
              totalSales: 1,
            },
          },
          { $sort: { soldCount: -1 } },
          { $limit: 10 },
        ])
  
        return res.status(HTTP_STATUS.OK).json({ categories: topCategories });
      } else {
       
        const topProducts = await Order.aggregate([
          { $match: { status: "delivered" } },
          { $unwind: "$orderedItems" },
          {
            $group: {
              _id: "$orderedItems.product",
              name: { $first: "$orderedItems.productName" },
              soldCount: { $sum: "$orderedItems.quantity" },
              totalSales: { $sum: { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] } },
            },
          },
          { $sort: { soldCount: -1 } },
          { $limit: 10 },
        ])
  
       
        const enrichedProducts = await Promise.all(
          topProducts.map(async (product) => {
            const productDetails = await Product.findById(product._id).populate("category")
            return {
              _id: product._id,
              name: product.name,
              category: productDetails?.category?.name || "Uncategorized",
              price: productDetails?.salePrice || 0,
              image: productDetails?.productImage?.[0] || null,
              soldCount: product.soldCount,
            }
          }),
        )
  
        return res.status(HTTP_STATUS.OK).json({ products: enrichedProducts });
      }
    } catch (error) {
      console.error("Error in getTopSelling API:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
  }
  
  const getSalesData = async (req, res) => {
    try {
      const { period = "monthly" } = req.query
  
      const salesData = await getSalesDataHelper(period)
      res.status(HTTP_STATUS.OK).json(salesData);
    } catch (error) {
      console.error("Error in getSalesData API:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
    }
  }
  
  
  
  
  
const logout = async (req, res) => {
    try {
        if (req.session.admin) {
            delete req.session.admin; //  Remove only admin session
        }
        res.status(HTTP_STATUS.OK).redirect('/admin/login');  // Redirect admin to login page
    } catch (error) {
        console.log('Logout Error', error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect('/pageerror');
    }
};


module.exports ={loadLogin,
    login,
    loadDashboard,
    pageError,logout, getTopSelling,
        getSalesData,}