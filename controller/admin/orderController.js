const Order = require("../../models/orderSchema")
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const processRefund = require("../user/orderController").processRefund
const { v4: uuidv4 } = require('uuid');
const HTTP_STATUS=require('../../config/httpStatusCode')

const getOrders = async (req, res) => {
  try {
    const searchQuery = req.query.search || "";
    const query = {
      $or: [
        { orderId: { $regex: searchQuery, $options: 'i' } }, 
        { customerName: { $regex: searchQuery, $options: 'i' } }, 
    
      ]
    };

    const allOrders = await Order.find(query).sort({ createdOn: -1 }).lean();

    // Pagination settings
    const itemsPerPage = 3;
    const currentPage = parseInt(req.query.page) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const totalOrders = allOrders.length;
    const totalPages = Math.ceil(totalOrders / itemsPerPage);

    // Slice the orders for the current page
    const orders = allOrders.slice(startIndex, endIndex);

    
    orders.forEach(order => {
      if (!order.orderId) {
        order.orderId = uuidv4(); // Only assign if it doesn’t exist
      }
    });

    res.render("admin-orders", {
      page: "admin-orders",
      orders, 
      title: "Order Management",
      totalPages,
      currentPage,
      search: searchQuery,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
};

const getOrderDetails = async (req, res) => {
    try {
      const orderId = req.params.id
      const order = await Order.findById(orderId)
  
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).send("Order not found");
      }
  
      res.render("admin-order-details", {
        order,
        title: "Order Details",
      })
    } catch (error) {
      console.error("Error fetching order details:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
  }
  const updateOrderStatus = async (req, res) => {
    try {
      const { orderId, status } = req.body
      const order = await Order.findById(orderId)
  
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
      }
  
      if (order.status === "cancelled") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Cannot update cancelled order" });
      }
  
      order.status = status
      order.orderedItems[0].status = status
  
      order.updatedOn = new Date()
  
      if (status === "delivered") {
        order.deliveredOn = new Date()
      }
  
      await order.save()
      res.json({ success: true, message: "Order status updated successfully" })
    } catch (error) {
      console.error("Error updating order status:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
  }
  const cancelOrder = async (req, res) => {
    try {
      const { orderId } = req.body
      const order = await Order.findById(orderId)
  
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
      }
  
      if (order.status !== "cancelled" && order.status !== "delivered") {
        order.status = "cancelled"
        order.orderedItems[0].status = "cancelled"
  
        order.updatedOn = new Date()
  
        await Product.findByIdAndUpdate(order.orderedItems[0].product, {
          $inc: { quantity: order.orderedItems[0].quantity },
        })
  
        if (order.paymentMethod === "online" || order.paymentMethod === "wallet") {
          const refundSuccess = await processRefund(order.userId, order)
          if (!refundSuccess) {
            return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
              success: false,
              message: "Failed to process refund",
            });
          }
        }
  
        await order.save()
        res.json({ success: true, message: "Order cancelled and refund processed successfully" });
      } else {
        res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order cannot be cancelled" });
      }
    } catch (error) {
      console.error("Error cancelling order:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
  }


  const handleReturnRequest = async (req, res) => {
    try {
      const { orderId, action, message, category } = req.body
      const order = await Order.findById(orderId)
  
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
    }
    
  
      if (action === "approve") {
        order.status = "returning"
        order.requestStatus = "approved"
      } else if (action === "reject") {
        order.status = "delivered"
        order.requestStatus = "rejected"
        order.rejectionCategory = category
        order.rejectionReason = message
      }
  
      order.updatedOn = new Date()
  
      await order.save()
      res.json({
        success: true,
        message: `Return request ${action}d successfully`,
      })
    } catch (error) {
      console.error("Error handling return request:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
    }
  }
  const updateReturnStatus1 = async (req, res) => {
    try {
      const { orderId, status } = req.body
      const order = await Order.findById(orderId)
  
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
      }
  
      if (order.status !== "returning" && status === "returned") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Order must be in returning status first",
        });
      }
  
      order.status = status
      
      order.updatedOn = new Date()
  
      if (status === "returned") {
        const refundSuccess = await processRefund(order.userId, order)
        if (!refundSuccess) {
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to process refund",
          });
        }
      }
  
      await order.save()
      res.json({
        success: true,
        message: "Return status updated successfully",
      })
    } catch (error) {
      console.error("Error updating return status:", error)
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  }


  const updateReturnStatus = async (req, res) => {
    try {
      const { orderId, status } = req.body;
      const order = await Order.findById(orderId);
  
      if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
      }
  
      if (order.status !== "returning" && status === "returned") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Order must be in returning status first",
        });
      }
  
      order.status = status;
      order.updatedOn = new Date();
  
      // ✅ Handle return logic
      if (status === "returned") {
        const orderedItem = order.orderedItems[0]; // handle multiple items if needed
        const product = await Product.findById(orderedItem.product);
  
        if (!product) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: "Product not found for returned order",
          });
        }
  
        // ✅ Increment the stock
        product.quantity += orderedItem.quantity;
        await product.save();
  
        // ✅ Process refund
        const refundSuccess = await processRefund(order.userId, order);
        if (!refundSuccess) {
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to process refund",
          });
        }
      }
  
      await order.save();
      res.json({
        success: true,
        message: "Return status updated successfully",
      });
    } catch (error) {
      console.error("Error updating return status:", error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Internal server error",
      });
    }
  };
  
module.exports={getOrders,getOrderDetails,
  updateOrderStatus,cancelOrder,handleReturnRequest,updateReturnStatus}