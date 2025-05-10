const User =require("../../models/userSchema")
const EventEmitter = require("events")
const HTTP_STATUS=require('../../config/httpStatusCode')
const userBlockedEmitter = new EventEmitter()


const customerInfo = async (req, res) => {
    try {
        let search = '';   
        if (req.query.search) {
            search = req.query.search;
        }
        let page = 1;
        if (req.query.page) {
            page = req.query.page;
        }
        const limit = 9;

        // Query to fetch user data excluding Google sign-in users and limiting fields
        const userData = await User.find({
            isAdmin: false, 
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } },
            ]
        })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdOn: -1 })
        .exec();

        // Total page calculation
        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*" } },
                { email: { $regex: ".*" + search + ".*" } },
            ]
        }).countDocuments();

        // Render the view with data
        res.status(HTTP_STATUS.OK).render('customers', {
            data: userData,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            
        });

    } catch (error) {
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect('/pageerror');
    }
}


const customerBlocked = async (req, res) => {
    try {
        const id = req.query.id;
        const page = req.query.page || 1;
        const search = req.query.search || "";

        console.log("Blocking user with ID:", id);

        const user = await User.findById(id);
        if (!user) {
            console.error("User not found:", id);
            return    res.status(HTTP_STATUS.NOT_FOUND).redirect("/pageerror");
        }

        await User.updateOne({ _id: id }, { $set: { isBlocked: true } });
        userBlockedEmitter.emit("userBlocked", id)
  
        res.status(HTTP_STATUS.OK).redirect(`/admin/users?page=${page}&search=${search}`);
    } catch (error) {
        console.error("Error in customerBlocked:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageerror");
    }
};

const customerUnblocked = async (req, res) => {
    try {
        const id = req.query.id;

        console.log("Unblocking user with ID:", id);

        const user = await User.findById(id);
        if (!user) {
            console.error("User not found:", id);
            return res.status(HTTP_STATUS.NOT_FOUND).redirect("/pageerror");
        }

        await User.updateOne({ _id: id }, { $set: { isBlocked: false } });

        res.status(HTTP_STATUS.OK).redirect("/admin/users");
    } catch (error) {
        console.error("Error in customerUnblocked:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageerror");
    }
};

module.exports = { customerInfo, customerBlocked, customerUnblocked ,userBlockedEmitter };
//module.exports ={customerInfo,customerBlocked,customerUnblocked};