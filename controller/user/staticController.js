const User = require("../../models/userSchema");


const loadContact = async (req,res) => {

    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("contact",
        {
            user:userData,page:"contact"
        }
        )
    } catch (error) {
        
        res.redirect("/pagenotfound")
    }

}


const loadAbout = async (req,res) => {
    
    try {
        const userId = req.session.user;
        const userData = await User.findById(userId);
        res.render("about",
        {
            user:userData,page:"about"
        }
        )
    } catch (error) {
        
        res.redirect("/pagenotfound")
    }
}

module.exports = {
    loadContact,
    loadAbout
}