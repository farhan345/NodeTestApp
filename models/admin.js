const mongoose=require('mongoose');
const bcrypt=require('bcryptjs')
const jwt=require('jsonwebtoken')
const adminSchema=new mongoose.Schema({
    name:{
        type:String,
        required:[true,"please enter your name"]
    },
    email:{
        type:String,
        required:[true,"please enter your email"],
        unique:true,
    },
    password:{
        type:String,
        required:[true,"please enter your password"],
        minLength:[8,"password should be greater than 8 characters"],
        select:false,
    },
    role:{
        type:String,
        default:"admin"
    },
    isActive:{
        type:Boolean,
        default:"true"
    }
})

//called before save
adminSchema.pre('save',async function(req,res,next){
    if(!this.isModified("password")){
       return next();
    }
    this.password=await bcrypt.hash(this.password,12);
})

//get JWT Token
adminSchema.methods.getJWTToken=async function(){
    return jwt.sign({id:this._id},process.env.JWT_SECRET_KEY,{expiresIn:process.env.JWT_EXPIRE})
}

//compare password

adminSchema.methods.comparePassword=async function(enteredPassword){
    return bcrypt.compare(enteredPassword,this.password)
}
const adminModel=mongoose.model("adminModel",adminSchema);
module.exports=adminModel; 