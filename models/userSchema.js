const mongoose = require("mongoose");
const {Schema} = mongoose;




const userSchema = new Schema({
   name : {
       type:String,
       required : true
   },
   email:{
    type: String,
    required: true,
    unique: true
},
   username: {
    type:String,
    required:false
},

   phone : {
       type : String,
       required: false,
       unique: false,
       sparse:true, //phon number null akan 
       default:null
   },
   googleId: {
       type : String,
     default: "" 
       
   },
   password : {
       type:String,
       required :false
   },
   isBlocked: {
       type : Boolean,
       default:false
   },
   isAdmin : {
       type: Boolean,
       default:false
   },
   cart: {
    type: [{
      productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true
      },
      quantity: {
        type: Number,
        required: true,
        min: 1
      }
    }],
    default: [] // Ensure cart is always an array
  },
   wallet:{
       type:Number,
       default:0,
   },
   wishlist: {
    type: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    default: [] // Ensure wishlist is always an array
  },

   orderHistory:[{
       type:Schema.Types.ObjectId,
       ref:"Order"
   }],
   createdOn : {
       type:Date,
       default:Date.now,
   },
   referalCode:{
       type:String
   },
   redeemed:{
       type:Boolean
   },
   redeemedUsers: [{
       type: Schema.Types.ObjectId,
       ref:"User"
   }],
   searchHistory: [{
       category: {
           type: Schema.Types.ObjectId,
           ref:"Category",
       },
     
       searchOn : {
           type: Date,
           default: Date.now
       }
   }]
 
})




const User = mongoose.model("User",userSchema);


module.exports = User;

