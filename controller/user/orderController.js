const Order = require("../../models/orderSchema")
const User = require("../../models/userSchema")
const Product = require("../../models/productSchema")
const Category = require("../../models/categorySchema")
const Coupon = require("../../models/couponSchema")
const Address = require("../../models/addressSchema")
const Wallet = require("../../models/walletSchema")
const Transaction = require("../../models/transactionSchema")
const HTTP_STATUS=require('../../config/httpStatusCode')
const {cloudinary,uploadToCloudinary} = require('../../config/cloudinary');
const Razorpay = require("razorpay")
const crypto = require("crypto")
const env = require("dotenv").config()

const fs = require("fs")
const path = require("path")
const ejs = require("ejs")
const puppeteer = require("puppeteer")

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
})

const DELIVERY_CHARGE = 50

const distributeDiscount = (cartItems, totalDiscount) => {
  const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  return cartItems.map((item) => {
    const itemTotal = item.price * item.quantity
    const discountShare = (itemTotal / totalAmount) * totalDiscount
    return {
      ...item,
      discountedPrice: item.price - discountShare / item.quantity,
    }
  })
}

const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { addressId, paymentMethod, couponCode } = req.body

    const user = await User.findById(userId).populate({
      path: "cart.productId",
      model: "Product",
    })

    if (!user || user.cart.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Cart is empty",
      })
    }

    const address = await Address.findOne({ userId: userId, "address._id": addressId })
    if (!address) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Address not found",
      })
    }

    const selectedAddress = address.address.find((addr) => addr._id.toString() === addressId)

    const totalAmount = user.cart.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0)
    let discount = 0
    let couponApplied = false

    if (couponCode) {
      const coupon = await Coupon.findOne({ name: couponCode, isList: true })
      if (coupon && !coupon.userId.includes(userId)) {
        discount = coupon.offerPrice
        couponApplied = true
        await Coupon.findByIdAndUpdate(coupon._id, {
          $push: { userId: userId },
        })
      }
    }

    const finalAmount = totalAmount - discount + DELIVERY_CHARGE
    const discountedItems = distributeDiscount(
      user.cart.map((item) => ({
        product: item.productId._id,
        productName: item.productId.productName,
        productImages: item.productId.productImage,
        quantity: item.quantity,
        price: item.productId.salePrice,
      })),
      discount,
    )

    if (paymentMethod === "cod" && totalAmount > 1000) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "COD not available for orders above ₹1,000",
      })
    }

    const orders = await Promise.all(
      discountedItems.map(async (item) => {
        const product = await Product.findById(item.product).select("regularPrice productName productImage")
        const order = new Order({
          userId: userId,
          orderedItems: [
            {
              product: item.product,
              productName: product.productName,
              productImages: product.productImage,
              quantity: item.quantity,
              price: item.discountedPrice,
              regularPrice: product.regularPrice,
              status: "pending",
            },
          ],
          totalPrice: item.price * item.quantity,
          discount: item.price * item.quantity - item.discountedPrice * item.quantity,
          finalAmount: item.discountedPrice * item.quantity + DELIVERY_CHARGE / discountedItems.length,
          address: selectedAddress,
          status: "pending",
          paymentMethod: paymentMethod,
          couponApplied: couponApplied,
          deliveryCharge: DELIVERY_CHARGE / discountedItems.length,
          createdOn: new Date(),
          updatedOn: new Date(), // Set initial updatedOn timestamp
        })

        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: -item.quantity },
        })

        return order.save()
      }),
    )
if (paymentMethod === "wallet") {
      const wallet = await Wallet.findOne({ userId })

      if (!wallet || wallet.balance < finalAmount) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: "Insufficient wallet balance",
        })
      }
      wallet.balance -= finalAmount
      wallet.totalDebited += finalAmount
      wallet.transactions.push({
        amount: finalAmount,
        transactionType: "debit",
        transactionPurpose: "purchase",
        description: "Order payment from wallet",
      })

      await wallet.save()
      await Transaction.create({
              userId: userId,
              amount: finalAmount,
              transactionType: "debit",
              paymentMethod: "wallet",
              paymentGateway: "wallet",
              status: "completed",
              purpose: "purchase",
              description: "Order payment from wallet",
              orders: orders.map((order) => ({
                orderId: order.orderId,
                amount: order.finalAmount,
              })),
              walletBalanceAfter: wallet.balance,
            })
          }
    await User.findByIdAndUpdate(userId, { $set: { cart: [] } })

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      orderIds: orders.map((order) => order.orderId),
      message: "Orders placed successfully",
    })
  } catch (error) {
    console.error("Error in placeOrder:", error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to place order",
    })
  }
}
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 4; // Number of orders per page
    const userId = req.session.user;

    // Get total count of orders
    const totalOrders = await Order.countDocuments({ userId });
    const totalPages = Math.ceil(totalOrders / limit);

    // Get paginated orders
    const orders = await Order.find({ userId })
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const categories = await Category.find({ isListed: true });
    const productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map((category) => category._id) },
      quantity: { $gt: 0 },
    });

    const user = await User.findById(userId);

    return res.status(HTTP_STATUS.OK).render("orders", {
      page: "orders",
      orders: orders,
      user: user,
      product: productData,
      currentPage: page,
      totalPages: totalPages,
      limit: limit
    });
  } catch (error) {
    console.error("Error in getOrders:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ error: "Internal server error" });
  }
};


const loadOrderDetails = async (req, res) => {
  try {
    const userId = req.session.user
    const orderId = req.query.orderId

    const order = await Order.findOne({ orderId: orderId, userId })
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).send("Order not found")
    }

    const user = await User.findById(userId)

    return res.status(HTTP_STATUS.OK).render("order-details", {page:"order-details",
      order,
      user,
    })
  } catch (error) {
    console.error("Error in loadOrderDetails:", error)
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal server error")
  }
}

const cancelOrder = async (req, res) => {
  try {
    const { orderId, reason } = req.body;
    const userId = req.session.user;

    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" });
    }

    if (order.status !== "cancelled" && order.status !== "delivered") {
      order.status = "cancelled";
      order.cancelReason = reason;
      order.orderedItems[0].status = "cancelled";
      order.orderedItems[0].cancelReason = reason;

      // Update the timestamp when the user cancels the order
      order.updatedOn = new Date();

      // Update product stock
      await Product.findByIdAndUpdate(order.orderedItems[0].product, {
        $inc: { quantity: order.orderedItems[0].quantity },
      });

      // Process refund based on payment method (wallet or online)
      if (order.paymentMethod === "wallet" || order.paymentMethod === "online") {
        const refundSuccess = await processRefund(userId, order);
        if (!refundSuccess) {
          return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to process refund",
          });
        }
      }

      await order.save();
      return res.status(HTTP_STATUS.OK).json({ success: true, message: "Order cancelled successfully" });
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: "Order cannot be cancelled" });
    }
  } catch (error) {
    console.error("Error in cancelOrder:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
};



// Helper function to restore product stock
async function restoreProductStock(items) {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { stock: item.quantity }
    });
  }
}
const requestReturn = async (req, res) => {
  try {
    const { orderId, returnReason, returnDescription } = req.body
    const userId = req.session.user
    const files = req.files

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" })
    }

    const deliveryDate = new Date(order.updatedAt)
    const currentDate = new Date()
    const daysSinceDelivery = Math.floor((currentDate - deliveryDate) / (1000 * 60 * 60 * 24))

    if (order.status !== "delivered" || daysSinceDelivery > 7) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Order is not eligible for return",
      })
    }

    let imagePaths = []
    if (files && files.length > 0) {
      imagePaths = files.map(file => file.path);
    }

    order.status = "return_requested"
    order.returnReason = returnReason
    order.returnDescription = returnDescription
    order.returnImages = imagePaths
    order.requestStatus = "pending"

    // Update the timestamp when return is requested
    order.updatedOn = new Date()

    await order.save()

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Return request submitted successfully",
    })
  } catch (error) {
    console.error("Error in requestReturn:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
    })
  }
}
const processRefund = async (userId, order) => {
  try {
    // Find the user's wallet
    let wallet = await Wallet.findOne({ userId });

    // If no wallet exists, create a new one
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0 });
      console.log("No wallet found, creating a new one.");
    }

    // Calculate the refund amount (adjust if necessary)
    const refundAmount = order.finalAmount - order.deliveryCharge;
    console.log(`Calculated refund amount: ${refundAmount}`);

    // Update the wallet balance
    wallet.balance += refundAmount;
    wallet.refundAmount += refundAmount;

    // Log the balance before saving to verify the change
    console.log(`Wallet balance before save: ${wallet.balance}`);

    // Create a new transaction entry for the refund
    wallet.transactions.push({
      amount: refundAmount,
      transactionType: "credit",
      transactionPurpose: "refund",
      description: `Refund for ${order.status === "cancelled" ? "cancelled" : "returned"} order #${order.orderId}`,
    });

    // Save the updated wallet
    await wallet.save();
    console.log(`Wallet balance after save: ${wallet.balance}`);

    // Log a success message after saving
    console.log("Refund processed successfully!");

    // Create a transaction record in the database for the refund
    await Transaction.create({
      userId: userId,
      amount: refundAmount,
      transactionType: "credit",
      paymentMethod: "wallet",
      paymentGateway: "wallet",
      status: "completed",
      purpose: order.status === "cancelled" ? "cancellation" : "return",
      description: `Refund for ${order.status === "cancelled" ? "cancelled" : "returned"} order #${order.orderId}`,
      orders: [
        {
          orderId: order.orderId,
          amount: refundAmount,
        },
      ],
      walletBalanceAfter: wallet.balance,
    });

    return true;
  } catch (error) {
    console.error("Error processing refund:", error);
    return false;
  }
};
 
const cancelReturnRequest = async (req, res) => {
  try {
    const { orderId } = req.body
    const userId = req.session.user

    const order = await Order.findOne({ _id: orderId, userId })
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({ success: false, message: "Order not found" })
    }

    if (order.status !== "return_requested" || order.requestStatus !== "pending") {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Return request cannot be cancelled",
      })
    }

    order.status = "delivered"
    order.returnReason = undefined
    order.returnDescription = undefined
    order.returnImages = []
    order.requestStatus = undefined
    order.adminMessage = undefined

    // Update the timestamp when return request is cancelled
    order.updatedOn = new Date()

    await order.save()

    res.status(HTTP_STATUS.OK).json({
      success: true,
      message: "Return request cancelled successfully",
    })
  } catch (error) {
    console.error("Error in cancelReturnRequest:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal server error",
    })
  }
}

const generateInvoice = async (req, res) => {
  try {
    const userId = req.session.user
    const orderId = req.query.orderId

    const order = await Order.findOne({ orderId: orderId, userId })
    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).send("Order not found");
    }

    if (order.status !== "delivered") {
      return res.status(HTTP_STATUS.BAD_REQUEST).send("Invoice is only available for delivered orders");
    }

    if (!order.invoiceDate) {
      order.invoiceDate = new Date()
      await order.save()
    }

    const templatePath = path.join(__dirname, "../../views/user/invoice-template.ejs")
    const html = await ejs.renderFile(templatePath, { order })

    const browser = await puppeteer.launch({ headless: true })
    const page = await browser.newPage()

    // Set content and generate PDF
    await page.setContent(html, { waitUntil: "networkidle0" })

    // Create directory if it doesn't exist
    const invoiceDir = path.join(__dirname, "../../public/invoices")
    if (!fs.existsSync(invoiceDir)) {
      fs.mkdirSync(invoiceDir, { recursive: true })
    }

    // Generate PDF file name
    const fileName = `invoice-${order.orderId}.pdf`
    const filePath = path.join(invoiceDir, fileName)

    // Generate PDF
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
    })

    await browser.close()

    // Send the PDF file
    res.download(filePath, fileName, (err) => {
      if (err) {
        console.error("Error sending file:", err)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error generating invoice");
      }

      // Optionally delete the file after sending
      // fs.unlinkSync(filePath);
    })
  } catch (error) {
    console.error("Error generating invoice:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Error generating invoice");
  }
}

const createRazorpayOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { addressId, couponCode } = req.body

    const user = await User.findById(userId).populate({
      path: "cart.productId",
      model: "Product",
    })

    if (!user || user.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cart is empty",
      })
    }

    const totalAmount = user.cart.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0)
    let discount = 0

    if (couponCode) {
      const coupon = await Coupon.findOne({ name: couponCode, isList: true })
      if (coupon && !coupon.userId.includes(userId)) {
        discount = coupon.offerPrice
      }
    }

    const finalAmount = totalAmount - discount + DELIVERY_CHARGE

    const razorpayOrder = await razorpay.orders.create({
      amount: finalAmount * 100,
      currency: "INR",
      receipt: `order_${Date.now()}`,
    })

    res.json({
      success: true,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: finalAmount * 100,
      currency: "INR",
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: user.phone,
    })
  } catch (error) {
    console.error("Error in createRazorpayOrder:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create order",
    });
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { paymentResponse, orderData } = req.body
    const userId = req.session.user

    const sign = paymentResponse.razorpay_order_id + "|" + paymentResponse.razorpay_payment_id
    const expectedSign = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(sign).digest("hex")

    if (expectedSign !== paymentResponse.razorpay_signature) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid payment signature",
      });
    }

    orderData.paymentMethod = "online"


    const result = await placeOrder(
      {
        session: { user: userId },
        body: orderData,
      },
      {
        json: (data) => {
          if (data.success) {
            
            const createTransactionRecord = async () => {
              try {
                const orders = await Order.find({
                  orderId: { $in: data.orderIds },
                })

                const totalAmount = orders.reduce((sum, order) => sum + order.finalAmount, 0)

                await Transaction.create({
                  userId: userId,
                  amount: totalAmount,
                  transactionType: "debit",
                  paymentMethod: "online",
                  paymentGateway: "razorpay",
                  gatewayTransactionId: paymentResponse.razorpay_payment_id,
                  status: "completed",
                  purpose: "purchase",
                  description: "Online payment for order",
                  orders: orders.map((order) => ({
                    orderId: order.orderId,
                    amount: order.finalAmount,
                  })),
                })
              } catch (error) {
                console.error("Error creating transaction record:", error)
              }
            }

            createTransactionRecord()
          }

          res.json(data)
        },
        status: (code) => {
          return {
            json: (data) => res.status(code).json(data),
          }
        },
      },
    )
  } catch (error) {
    console.error("Error in verifyPayment:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Payment verification failed",
    });
  }
}

const placeWalletOrder = async (req, res) => {
  try {
    const userId = req.session.user
    const { addressId, couponCode } = req.body

    const user = await User.findById(userId).populate({
      path: "cart.productId",
      model: "Product",
    })

    if (!user || user.cart.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Cart is empty",
      });
    }

    const address = await Address.findOne({ userId: userId, "address._id": addressId })
    if (!address) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Address not found",
      });
    }

    const selectedAddress = address.address.find((addr) => addr._id.toString() === addressId)

    const totalAmount = user.cart.reduce((sum, item) => sum + item.productId.salePrice * item.quantity, 0)
    let discount = 0
    let couponApplied = false

    if (couponCode) {
      const coupon = await Coupon.findOne({ name: couponCode, isList: true })
      if (coupon && !coupon.userId.includes(userId)) {
        discount = coupon.offerPrice
        couponApplied = true
        await Coupon.findByIdAndUpdate(coupon._id, {
          $push: { userId: userId },
        })
      }
    }

    const finalAmount = totalAmount - discount + DELIVERY_CHARGE
    const discountedItems = distributeDiscount(
      user.cart.map((item) => ({
        product: item.productId._id,
        productName: item.productId.productName,
        productImages: item.productId.productImage,
        quantity: item.quantity,
        price: item.productId.salePrice,
      })),
      discount,
    )

    const orders = await Promise.all(
      discountedItems.map(async (item) => {
        const product = await Product.findById(item.product).select("regularPrice productName productImage")
        const order = new Order({
          userId: userId,
          orderedItems: [
            {
              product: item.product,
              productName: product.productName,
              productImages: product.productImage,
              quantity: item.quantity,
              price: item.discountedPrice,
              regularPrice: product.regularPrice,
              status: "pending",
            },
          ],
          totalPrice: item.price * item.quantity,
          discount: item.price * item.quantity - item.discountedPrice * item.quantity,
          finalAmount: item.discountedPrice * item.quantity + DELIVERY_CHARGE / discountedItems.length,
          address: selectedAddress,
          status: "pending",
          paymentMethod: "wallet",
          couponApplied: couponApplied,
          deliveryCharge: DELIVERY_CHARGE / discountedItems.length,
          createdOn: new Date(),
          updatedOn: new Date(), // Set initial updatedOn timestamp
        })

        await Product.findByIdAndUpdate(item.product, {
          $inc: { quantity: -item.quantity },
        })

        return order.save()
      }),
    )

    //rest of the code is same as placeOrder function.
    const wallet = await Wallet.findOne({ userId })

    if (!wallet || wallet.balance < finalAmount) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    wallet.balance -= finalAmount
    wallet.totalDebited += finalAmount
    wallet.transactions.push({
      amount: finalAmount,
      transactionType: "debit",
      transactionPurpose: "purchase",
      description: "Order payment from wallet",
    })

    await wallet.save()

    await Transaction.create({
      userId: userId,
      amount: finalAmount,
      transactionType: "debit",
      paymentMethod: "wallet",
      paymentGateway: "wallet",
      status: "completed",
      purpose: "purchase",
      description: "Order payment from wallet",
      orders: orders.map((order) => ({
        orderId: order.orderId,
        amount: order.finalAmount,
      })),
      walletBalanceAfter: wallet.balance,
    })

    // Clear cart
    await User.findByIdAndUpdate(userId, { $set: { cart: [] } })

    res.json({
      success: true,
      orderIds: orders.map((order) => order.orderId),
      message: "Orders placed successfully",
    })
  } catch (error) {
    console.error("Error in placeWalletOrder:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to place order",
    });
  }
}
module.exports = {
  placeOrder,
  getOrders,
  loadOrderDetails,
  cancelOrder,
  
  requestReturn,
   processRefund,
  cancelReturnRequest,
  generateInvoice,
  createRazorpayOrder,
    verifyPayment,
    placeWalletOrder,
    
}