const User = require("../../models/userSchema");
const Address = require("../../models/addressSchema");
const Wishlist = require("../../models/wishlistSchema")
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const env = require("dotenv").config();
const session = require("express-session")
const multer = require("multer")
const sharp = require("sharp")
const fs = require("fs")
const path = require("path")
const express =require("express")
const HTTP_STATUS=require('../../config/httpStatusCode')
function generateOtp(){
    const digits = "1234567890"
    let otp = "";
    for(let i=0;i<6;i++){
        otp+=digits[Math.floor(Math.random()*10)]
    }
    return otp 
}
//.....................................................................
const sendVerificationEmail = async (email,otp) => {
    try {
        
        const transporter = nodemailer.createTransport({
            service:"gmail",
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user: process.env.NODEMAILER_EMAIL,
                pass: process.env.NODEMAILER_PASSWORD,
            }
        })

        const mailOption = {
            from: process.env.NODEMAILER_EMAIL,
            to:email,
            subject:"Your OTP for password reset",
            text:`Your OTP is ${otp}`,
            html:`<b><h4>Your OTP : ${otp}</h4><br></b>`,

        }

        const info = await transporter.sendMail(mailOption);
        console.log("Email sent:",info.messageId)

        return true;

    } catch (error) {

        console.error("error sending email",error);
        return false
        
    }
}
//.........................................................................
const securePassword = async (password) => {
    try {
        
        const passwordHash = await bcrypt.hash(password,10);
        return passwordHash

    } catch (error) {

        
    }
}


//...........................................................................................
const getForgotPassPage = async (req,res) => {
    try {
        
        res.render("forgot-password",{page:"forgot-password"});

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}



// const getForgotPasswordpage = async (req,res) => {
//     try {
        
//         res.render("forgot-password");

//     } catch (error) {

//         res.redirect("/pageNotFound")
        
//     }
// }
//..............................................................................................
// function generateOtp(){
//     const digits = "1234567890"
//     let otp = "";
//     for(let i=0;i<6;i++){
//         otp+=digits[Math.floor(Math.random()*10)]
//     }
//     return otp 
// }
//...........................................................................................
// const sendVerificationEmail = async (email,otp) => {
//     try {
        
//         const transporter = nodemailer.createTransport({
//             service:"gmail",
//             port:587,
//             secure:false,
//             requireTLS:true,
//             auth:{
//                 user: process.env.NODEMAILER_EMAIL,
//                 pass: process.env.NODEMAILER_PASSWORD,
//             }
//         })

//         const mailOption = {
//             from: process.env.NODEMAILER_EMAIL,
//             to:email,
//             subject:"Your OTP for password reset",
//             text:`Your OTP is ${otp}`,
//             html:`<b><h4>Your OTP : ${otp}</h4><br></b>`,

//         }

//         const info = await transporter.sendMail(mailOption);
//         console.log("Email sent:",info.messageId)

//         return true;

//     } catch (error) {

//         console.error("error sending email",error);
//         return false
        
//     }
// }
//........................................................................................
const getResetPassPage = async (req,res) => {
    try {
        
        res.render("reset-password")

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}
//..........................................................................................
const forgotEmailValid = async (req,res) => {
    try {
        
        const {email} = req.body;
        const findUser = await User.findOne({email:email});
        if(findUser){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp);
            if(emailSent){
                req.session.userOtp = otp;
                req.session.email = email;
                res.render("forgotPass-otp");
                
                console.log("OTP: ",otp)
            } else{
                res.json({success:false,message:"Failed to send OTP. PLease try again"})
            }

        } else{
            res.render("forgot-password",{
                message:"User with this email does not exist"
            })
        }

    } catch (error) {

        res.redirec("/pageNotFound")
        
    }
}
//...........................................................................................


//...........................................................................................
const verifyForgotPassOtp = async (req,res) => {
    try {
        
        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            req.session.resetAllowed = true;
            res.json({success:true,redirectUrl:"/reset-password"})
        } else{
            res.json({success:false,message:"OTP not matching"})
        }

    } catch (error) {

        res.status(500).json({success:false,message:"An error occured please try again"})
        
    }
}
// const verifyForgotPassOtp = async (req,res) => {
//     try {
        
//         const enteredOtp = req.body.otp;
//         if(enteredOtp === req.session.userOtp){
//             req.session.resetAllowed = true;
//             res.json({success:true,redirectUrl:"/reset-password"})
//         } else{
//             res.json({success:false,message:"OTP not matching"})
//         }

//     } catch (error) {

//         res.status(500).json({success:false,message:"An error occured please try again"})
        
//     }
// }
//.........................................................................................
const resendOtp = async (req,res) => {
    try {
        
        const otp = generateOtp();
        req.session.userOtp = otp;
        const email = req.session.email;
        console.log("Resending otp to email",email);
        const emailSent = await sendVerificationEmail(email,otp);
        if(emailSent){
            console.log("Resend Otp: ",otp);
            res.status(200).json({success:true,message:"Resend OTP Successful"})

            
        }

    } catch (error) {

        console.error("Error in resend otp",error);
        res.status(500).json({success:false,message:"Internal server errro"})
        
    }
}

//.......................................................................................
const postNewPassword = async (req, res) => {
    try {
        const { newPass1, newPass2 } = req.body;
        const email = req.session.email;

        // Check if session email exists and is valid
        if (!email) {
            return res.redirect("/pageNotFound"); // or handle error appropriately
        }

        if (newPass1 === newPass2) {
            const passwordHash = await securePassword(newPass1); // Ensure this is a valid hashing function
            await User.updateOne(
                { email: email },
                { $set: { password: passwordHash } }
            );

            // Clear session after password reset
            req.session.userOtp = null;
            req.session.email = null;
            req.session.resetAllowed = null;

            res.redirect("/login"); // Redirect after successful password reset
        } else {
            res.render("reset-password", { message: "Passwords do not match." }); // Display error message
        }
    } catch (error) {
        console.error("Error during password reset:", error);
        res.redirect("/pageNotFound"); // Or use a more specific error page
    }
};

//.............................................................................................
//profilemanagement
const userProfile = async (req,res) => {
    try {
        
        const userId = req.session.user;
        const userData = await User.findById(userId);
        // let wishlistCount = 0;
        // if (userId) {
        //     const wishlist = await Wishlist.findOne({ userId: userId });
        //     wishlistCount = wishlist ? wishlist.items.length : 0;
        // }
        res.render("profile",{page: 'profile',
            user:userData

        })

        // console.log(userData.email);
        

    } catch (error) {

        console.error('Error:',error)
        res.redirect("/pageNotFound")
        
    }
}

const changeEmail = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        // let wishlistCount = 0;
        // if (userId) {
        //     const wishlist = await Wishlist.findOne({ userId: userId });
        //     wishlistCount = wishlist ? wishlist.items.length : 0;
        // }
        res.render("change-email",{page:"change-email",
            user:userData
            
        })

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}

const changeEmailValid = async (req,res) => {
    try {
        
        const {email} = req.body;
        const userExist = await User.findOne({email});
        if(userExist){
            const otp = generateOtp();
            const emailSent = await sendVerificationEmail(email,otp)
            if(emailSent) {
                req.session.userOtp = otp;
                req.session.userdata = req.body;
                req.session.email = email;
                res.render("change-email-otp",{page:"change-email-otp"});
                console.log(`Email Sent : ${email}, Otp: ${otp}`)
            }else {
                res.json("email-error")
            }
        }else{
            res.render("change-email",{page:"change-email",
                message: "User with email not exist"
            })
        }

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}

const verifyEmailOtp = async (req,res) => {
    try {

        const enteredOtp = req.body.otp;
        if(enteredOtp === req.session.userOtp){
            req.session.userData = req.body.userData;
            res.render("new-email",{page:"new-email",
                userData: req.session.userData,
            })
        }else{
            res.render("change-email-otp",{page:"change-email-otp",
                message:"OTP not Matching",
                userData: req.session.userData,
            })
        }
        
    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}

const updateEmail = async (req,res) => {
    try {
        
        const newEmail = req.body.newEmail;
        const userId = req.session.user;
        await User.findByIdAndUpdate(userId,{
            email:newEmail,
        })
        res.redirect("/userProfile")

    } catch (error) {

        res.redirect("/pageNotFound")
        
    }
}

const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user;
        console.log(currentPassword)
        

        
        if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
            return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long and contain both letters and numbers.' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ success: false, message: 'Passwords do not match.' });
        }

        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Check if the current password is correct
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, error: 'current_password_incorrect', message: 'Current password is incorrect.' });
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ success: false, message: 'An error occurred while changing the password.' });
    }
};
//..........................................................................................
const updateProfileold = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, username, phone } = req.body;

        // Validate phone number
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        // Check if username is already taken
        if (username) {
            const existingUser = await User.findOne({
                username,
                _id: { $ne: userId }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username is already taken. Please choose a different one.'
                });
            }
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, username, phone },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating your profile'
        });
    }
};
const updateProfile123 = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, username, phone } = req.body;

        // Validate phone number
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        // Check if username is already taken
        if (username) {
            const existingUser = await User.findOne({
                username,
                _id: { $ne: userId }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username is already taken. Please choose a different one.'
                });
            }
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, username, phone },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating your profile'
        });
    }
};

  

//........................................................................................
const loadAddressPage = async (req,res) => {
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const addressData = await Address.findOne({userId:userId})
        // let wishlistCount = 0;
        // if (userId) {
        //     const wishlist = await Wishlist.findOne({ userId: userId });
        //     wishlistCount = wishlist ? wishlist.items.length : 0;
        // }
        res.render("address",{page:"address",
            user:userData,
            userAddress:addressData
           
        })

    } catch (error) {

        console.error("Error in Address loading",error);
        res.redirect("/pageNotFound");
        // next(error)
    }
}
const addAddress = async (req, res) => {
    try {
        const user = req.session.user;
        if (!user) {
            return res.redirect("/login"); // Redirect to login if no session user is found
        }

        const userData = await User.findById(user);
        if (!userData) {
            return res.redirect("/pageNotFound"); // Redirect if user not found
        }

        // const wishlistCount = await Wishlist.countDocuments({ user: user });

        res.render("add-address", {
            page: "add-address",
            theUser: user,
            user: userData,
            
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.redirect("/pageNotFound"); // In case of an error, redirect
        // next(error)
    }
};


const postAddAddress = async (req,res) => {
    try {
        
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId})
        const { addressType, name, country, city, landMark, state, streetAddress, pincode, phone, email, altPhone } = req.body;

        const userAddress = await Address.findOne({userId:userData._id});
        
        if(!userAddress){
            const newAddress = new Address({
                userId:userData,
                address: [{addressType, name, country, city, landMark, state, streetAddress, pincode, phone, email, altPhone}]

            });
            await newAddress.save();
        }else{
            userAddress.address.push({addressType, name, country, city, landMark, state, streetAddress, pincode, phone, email, altPhone})
            await userAddress.save();
        }

        res.redirect("/address")

    } catch (error) {

        console.error("Error adding address",error)

        res.redirect("/pageNotFound")
        
    }
}
//...............................................................................



const editAddress = async (req,res) => {
    try {
        
        const addressId = req.query.id;
        const userId = req.session.user;
        const userData = await User.findById(userId);
        const currAddress = await Address.findOne({
            "address._id":addressId,

        });
        if(!currAddress){
            return res.redirect("/pageNotFound")
        }

        const addressData = currAddress.address.find((item) => {
            return item._id.toString() === addressId.toString();

        })

        if(!addressData){
            return res.redirect("/pageNotFound")
        }
        // let wishlistCount = 0;
        // if (userId) {
        //     const wishlist = await Wishlist.findOne({ userId: userId });
        //     wishlistCount = wishlist ? wishlist.items.length : 0;
        // }

        res.render("edit-address",{page:"edit-address",
            address:addressData,
            user:userData,  
        })

    } catch (error) {

        console.error("Error in edit Address",error)
        res.redirect("/pageNotFound")
        
    }
}


const postEditAddress = async (req,res) => {
    try {

        const data = req.body;
        const addressId = req.query.id;
        const user = req.session.user;
        const findAddress = await Address.findOne({
            "address._id":addressId
        });
        if(!findAddress){
            res.redirect("/pageNotFound")
        }
        await Address.updateOne(
            {"address._id":addressId},
            {$set:{
                "address.$":{
                    _id:addressId,
                    addressType:data.addressType,
                    name:data.name,
                    country:data.country,
                    city:data.city,
                    landMark:data.landMark,
                    state:data.state,
                    streetAddress:data.streetAddress,
                    pincode:data.pincode,
                    phone:data.phone,
                    email:data.email,
                    altPhone:data.altPhone
                }
            }}
        )

        res.redirect("/address")
        
    } catch (error) {

        console.error("Error in editing address",error)
        res.redirect("/pageNotFound")
        // next(error)
    }
}

const deleteAddress = async (req,res) => {
    try {
        
        const addressId = req.query.id;
        const findAddress = await Address.findOne({"address._id":addressId})

        if(!findAddress){
            return res.status(404).send("Address Not Found")
        }

        await Address.updateOne(
        {
            "address._id":addressId
        },
        {
            $pull: {
                address:{
                    _id:addressId,
                }
            }
        })

        res.redirect("/address")

    } catch (error) {

        console.error("Error in deleting in address",error)
        res.redirect("/pageNotFound")
        // next(error)
    }
}


const removeProfileImage = async (req, res) => {
    try {
        const userId = req.session.userId;
        await User.findByIdAndUpdate(userId, { $unset: { profileImage: 1 } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error removing profile image:', error);
        res.status(500).json({ 
            success: false,
            message: 'Error removing profile image'
        });
    }
};
const updateProfile = async (req, res) => {
    try {
        const userId = req.session.user;
        const { name, username, phone } = req.body;

        // Validate phone number
        const phoneRegex = /^\d{10}$/;
        if (!phoneRegex.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid 10-digit phone number'
            });
        }

        // Check if username is already taken
        if (username) {
            const existingUser = await User.findOne({
                username,
                _id: { $ne: userId }
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'Username is already taken. Please choose a different one.'
                });
            }
        }

        // Update user profile
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { name, username, phone },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'An error occurred while updating your profile'
        });
    }
};


module.exports={getForgotPassPage,
   
    verifyForgotPassOtp,
    forgotEmailValid,
    sendVerificationEmail,
    getResetPassPage, 
    verifyForgotPassOtp,
    resendOtp,postNewPassword,
    userProfile,changeEmail,changeEmailValid,
    verifyEmailOtp,updateEmail,userProfile,
    changePassword,updateProfile,removeProfileImage,loadAddressPage,addAddress,
    postAddAddress,editAddress,deleteAddress,postEditAddress
}