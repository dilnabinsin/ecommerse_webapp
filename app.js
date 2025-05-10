const express =require("express")
const app =express()
const passport =require("./config/passport")
const env =require("dotenv").config()
const connectDb =require("./config/db")
const path = require('path');
const session=require("express-session")
//const MongoStore = require("connect-mongo")
const userRouter =require("./routes/userRouter")
const adminRouter=require("./routes/adminRouter")
const User = require("./models/userSchema")
const checkBlockedUser = require("./middleware/profileAuth");
app.set('view engine', 'ejs');
const HTTP_STATUS = require('./config/httpStatusCode');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
        //store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
        cookie: { secure: false, httpOnly: true, maxAge: 24 * 60 * 60 * 1000 },
      }),
    )
    app.use(passport.initialize());
    app.use(passport.session())
    app.use((req, res, next) => {
        res.locals.user = req.user
        next()
      })
      app.use((req, res, next) => {
        console.log('Session on request:', req.session);
        next();
    });
 app.use((req, res, next) => {
    res.locals.user = req.session.googleUser || req.session.user || null; // Prioritize Google user, else normal user
    res.locals.admin = req.session.admin || null; // Keep admin session separate
    next();
});

app.use((req,res,next) => {
    res.set('Cache-Control','no-store')
    next();
})

app.use('/admin-assets', express.static(path.join(__dirname, 'public/admin-assets')));
app.set('views', [path.join(__dirname, 'views/user'), path.join(__dirname, 'views/admin')]);
app.use(express.static(path.join(__dirname, 'public')));

app.use("/",userRouter)
app.use("/admin",adminRouter)

app.use(async (req, res, next) => {
    try {
        if (req.session.user) {
            console.log(req.session.user);
            const user = await User.findById(req.session.user);
            console.log(user);
            
            if (user && user.isBlocked) {
                // Destroy the session completely
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error destroying session:", err);
                        return res.status(500).send('Server Error');
                    }
                    
                    // Redirect to login page after destroying the session
                    return res.redirect('/login');
                });
            } else {
                // If the user is not blocked, continue to the next middleware
                next();
            }
        } else {
            // If there is no user in the session, continue to the next middleware
            next();
        }
    } catch (error) {
        console.error("Error checking blocked user:", error);
        res.status(500).send('Server Error');
    }
});
  
// app.use((req, res, next) => {
//     if (!req.session.user && req.path !== '/login') {
//         // Redirect to login if user is not logged in
//         return res.redirect('/login');
//     } else if (req.session.user && req.path === '/login') {
//         // Redirect to dashboard if user is already logged in
//         return res.redirect('/');
//     }
//     next();
// });
// **** ERROR HANDLING MIDDLEWARE ****
app.use((err,req,res,next) => {

    console.log('hello')
    const errStatus = err.statusCode || 500 ;
    console.log()
    console.log(err.message)

    console.log(err.stack);

    if(errStatus == 404){
        if(req.session.adminId){
            res.status(errStatus).render('page-404',{link:'/admin'});
        }else{
            res.status(errStatus).render('page-404',{link:'/'});
        }
    }else{

        if(req.session.adminId){
            res.status(errStatus).render('error-500',{errorCode:errStatus, link:'/admin'});
        }else{
            res.status(errStatus).render('error-500',{errorCode:errStatus, link:'/'});
        }
    }
 
})



app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self'; img-src 'self' http://localhost:5000; script-src 'self' http://localhost:5000;");
    next();
});


connectDb()

app.listen(process.env.PORT , () => {
    console.log('Server is running on port http://localhost:5000');
})





module.exports=app


