const express =require("express")
const app =express()
const env =require("dotenv").config()
const connectDb =require("./config/db")
const path = require('path');
const userRouter =require("./routes/userRouter")
//const adminRouter =require("./routes/adminRouter")
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));

app.use("/",userRouter)
//app.use("/",adminRouter)




connectDb()

app.listen(process.env.PORT , () => {
    console.log('Server is running on port http://localhost:3000');
})





module.exports=app


