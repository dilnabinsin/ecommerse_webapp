const Wallet = require("../../models/walletSchema")
const Transaction = require("../../models/transactionSchema")
const User = require("../../models/userSchema")
const Razorpay = require("razorpay")
const crypto = require("crypto")
const env = require("dotenv").config()
const HTTP_STATUS=require('../../config/httpStatusCode')


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const loadWallet = async (req, res) => {
  try {
    const userId = req.session.user
    const userData = await User.findById(userId)
    const wallet = await Wallet.findOne({ userId: userId })

    // Pagination
    const page = Number.parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit

    let transactions = []
    let totalTransactions = 0

    if (wallet) {
      totalTransactions = wallet.transactions.length
      transactions = wallet.transactions.sort((a, b) => b.createdAt - a.createdAt).slice(skip, skip + limit)
    }

    const totalPages = Math.ceil(totalTransactions / limit)

    res.render("wallet", {page:"wallet",
      user: userData,
      wallet: wallet || { balance: 0, refundAmount: 0, totalDebited: 0 },
      transactions: transactions,
      currentPage: page,
      totalPages: totalPages,
    })
  } catch (error) {
    console.error("Error loading wallet:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
}

const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body
    const userId = req.session.user

    if (!amount || amount < 1) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const options = {
      amount: amount * 100, // Razorpay expects amount in paise
      currency: "INR",
      receipt: `wallet_${Date.now()}`,
    }

    const order = await razorpay.orders.create(options)
    res.json({
      success: true,
      order_id: order.id,
      amount: amount * 100,
      key_id: process.env.RAZORPAY_KEY_ID,
    })
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to create order",
    });
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
    const userId = req.session.user

    // Verify signature
    const sign = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign.toString())
      .digest("hex")

    if (razorpay_signature !== expectedSign) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid signature",
      });
    }

    // Get payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id)
    const amount = payment.amount / 100 // Convert paise to rupees

    // Update wallet
    let wallet = await Wallet.findOne({ userId: userId })
    if (!wallet) {
      wallet = new Wallet({
        userId: userId,
        balance: 0,
        refundAmount: 0,
        totalDebited: 0,
        transactions: [],
      })
    }

    wallet.balance += Number(amount)
    wallet.transactions.push({
      amount: Number(amount),
      transactionType: "credit",
      transactionPurpose: "add",
      description: "Added money to wallet",
    })

    await wallet.save()

    // Create transaction record
    await Transaction.create({
      userId: userId,
      amount: Number(amount),
      transactionType: "credit",
      paymentMethod: "online",
      paymentGateway: "razorpay",
      gatewayTransactionId: razorpay_payment_id,
      status: "completed",
      purpose: "wallet_add",
      description: "Added money to wallet",
      walletBalanceAfter: wallet.balance,
    })

    res.json({
      success: true,
      message: "Payment verified and wallet updated successfully",
    })
  } catch (error) {
    console.error("Error verifying payment:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Payment verification failed",
    });
  }
}



const withdrawMoney = async (req, res) => {
  try {
    const userId = req.session.user
    const { amount } = req.body

    if (!amount || amount <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid amount",
      });
    }

    const wallet = await Wallet.findOne({ userId: userId })

    if (!wallet || wallet.balance < amount) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Insufficient balance",
      });
    }

    wallet.balance -= Number(amount)
    wallet.totalDebited += Number(amount)
    wallet.transactions.push({
      amount: Number(amount),
      transactionType: "debit",
      transactionPurpose: "withdraw",
      description: "Withdrawn from wallet",
    })

    await wallet.save()

    // Create transaction record
    await Transaction.create({
      userId: userId,
      amount: Number(amount),
      transactionType: "debit",
      paymentMethod: "wallet",
      paymentGateway: "wallet",
      status: "completed",
      purpose: "wallet_withdraw",
      description: "Withdrawn from wallet",
      walletBalanceAfter: wallet.balance,
    })

    res.json({
      success: true,
      message: "Money withdrawn successfully",
      newBalance: wallet.balance,
    })
  } catch (error) {
    console.error("Error withdrawing money:", error)
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}

module.exports = {
  loadWallet,
  createRazorpayOrder,
  verifyPayment,
  withdrawMoney,
  
}

