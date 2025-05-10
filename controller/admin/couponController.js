const Coupon = require("../../models/couponSchema")
const mongoose = require("mongoose")
const HTTP_STATUS=require('../../config/httpStatusCode')
const loadCoupon = async (req,res) => {
    try {
        const page = parseInt(req.query.page) || 1; // Default to page 1
  const perPage = 5; 
  const totalCoupons = await Coupon.countDocuments(); // Total number of coupons
  const totalPages = Math.ceil(totalCoupons / perPage); // Total number of pages

        const findCouponsRaw  = await Coupon.find({}).sort({createdOn:-1})

        .skip((page - 1) * perPage)
    .limit(perPage);
        
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const findCoupons = findCouponsRaw.map(coupon => {
        const isActive = coupon.expireOn >= today;
        return {
            ...coupon._doc,  // access raw data from Mongoose document
            status: isActive ? 'Active' : 'Inactive'
        };
    });
        return res.status(HTTP_STATUS.OK).render("coupon",{page:"coupon",coupons:findCoupons,
         
            
            totalPages,
            currentPage: page,
           })

    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageerror")
        
    }
}
const createCoupon = async (req,res) => {
    try {
        
        
    const data = {
        couponName:req.body.couponName,
        startDate: new Date(req.body.startDate + "T00:00:00"),
        endDate: new Date(req.body.endDate + "T00:00:00"),
        offerPrice: parseInt(req.body.offerPrice),
        minimumPrice: parseInt(req.body.minimumPrice),
    }

    const newCoupon = new Coupon({
        name:data.couponName,
        createdOn: data.startDate,
        expireOn: data.endDate,
        offerPrice: data.offerPrice,
        minimumPrice: data.minimumPrice
    })

    await newCoupon.save()

    return res.redirect("/admin/coupon")

    } catch (error) {

        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageerror")
        
    }
}
const editCoupon = async (req,res) => {
    try {

        const id = req.query.id;
        const findCoupon = await Coupon.findOne({_id:id});

        res.status(HTTP_STATUS.OK).render("edit-coupon",{
            findCoupon:findCoupon,

        })
        
    } catch (error) {

        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).redirect("/pageerror")
        
    }
}

const updateCoupon = async (req, res) => {
    try {
        const couponId = req.query.couponId;
        if (!mongoose.Types.ObjectId.isValid(couponId)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid coupon ID" });
        }

        const oid = new mongoose.Types.ObjectId(couponId);
        const selectedCoupon = await Coupon.findOne({ _id: oid });

        if (!selectedCoupon) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Coupon not found" });
        }

        const startDate = new Date(req.body.startDate + "T00:00:00");
        const endDate = new Date(req.body.endDate + "T00:00:00");

        const updatedCoupon = await Coupon.findByIdAndUpdate(
            { _id: oid },
            {
                $set: {
                    name: req.body.couponName,
                    createdOn: startDate,
                    expireOn: endDate,
                    offerPrice: parseInt(req.body.offerPrice),
                    minimumPrice: parseInt(req.body.minimumPrice)
                }
            },
            { new: true }
        );

        if (!updatedCoupon) {
            return   res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Error updating coupon" });
        }

        res.json({ message: "Coupon updated successfully", coupon: updatedCoupon });
    } catch (error) {
        console.error("Error updating coupon:", error);
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: "Internal server error" });
    }
};

const deleteCoupon = async (req,res) => {
    try {
        
        const id = req.query.id;
        await Coupon.deleteOne({_id:id})
        res.status(HTTP_STATUS.OK).send({success:true,message:"Coupon deleted successfully"})

    } catch (error) {
        console.error("Error Deleting Coupon",error)
        res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).send({success:false,message:"Internal Server Error"})
    }
}


module.exports = {
    loadCoupon,
    createCoupon,
    editCoupon,
    updateCoupon,
    deleteCoupon,


}