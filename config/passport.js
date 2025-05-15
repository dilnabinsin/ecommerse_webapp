const passport =require("passport")
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/userSchema');
const env = require('dotenv').config();



passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'https://tksarestudio.shop/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log("✅ Google OAuth Profile:", profile);

        // Ensure email exists in profile
        const email = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
        if (!email) {
            console.error("❌ No email found in Google profile.");
            return done(null, false, { message: "No email found." });
        }

        let user = await User.findOne({ email });

        if (!user) {
            user = new User({
                name: profile.displayName,
                email: email,
                googleId: profile.id
            });
            await user.save();
        }

        console.log("✅ User saved or found:", user);
        return done(null, user);
    } catch (error) {
        console.error("❌ Google OAuth Error:", error);
        return done(error, null);
    }
}));

// ✅ Serialize user
passport.serializeUser((user, done) => {
    console.log("✅ Serializing User:", user.id);
    done(null, user.id.toString());
});

// ✅ Deserialize user
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        if (!user) {
            console.error("❌ Deserialized User Not Found");
            return done(null, false);
        }
        console.log("✅ Deserializing User:", user);
        done(null, user);
    } catch (error) {
        console.error("❌ Deserialization Error:", error);
        done(error, null);
    }
});

// passport.use(new GoogleStrategy({
//     clientID: process.env.GOOGLE_CLIENT_ID,
   
//     clientSecret: process.env.GOOGLE_CLIENT_SECRET,
//       callbackURL: 'http://localhost:5000/auth/google/callback'
  
// }, 
// async (accessToken, refreshToken, profile, done) => {
//     try {

//          let user = await User.findOne({ googleId: profile.id });
//         if (user) {
//             return done(null, user);
        
//         }

//         else{
//             const user = new User({
//                 name: profile.displayName,
//                 email: profile.emails[0].value,
//                 googleId: profile.id
//             });
//             await user.save();
//             return done(null, user);
//         }
        
//     } catch (error) {

//         return done(err,null)
        
//     }
// }
// ));



// passport.serializeUser((user, done) => {//user details sessionlot assign cheyyan
//     done(null, user.id);
// });

// passport.deserializeUser((id, done) => { //sessionil ninnum user data fetch cheyth adukkan vendit
//     User.findById(id)
//     .then(user => {
//         done(null, user);
//     })
//     .catch(err => {
//         done(err,null)
//     })
// });


module.exports = passport;
