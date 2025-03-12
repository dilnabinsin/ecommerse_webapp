
const pageNotFound =async(req,res)=>{
try{
    res.render("page-404")

}
catch(error){
    res.redirect("/pageNotFound")

}



}
const loadHomePage =async(req,res)=>{
    try{
        return res.render("home")

    }
    catch(error){
        console.log("Home Pagenot Found")
        res.status(500).send("server Error")

    }



}

module.exports ={loadHomePage,pageNotFound};