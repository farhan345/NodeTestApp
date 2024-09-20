const mongoose=require("mongoose");

const favouriteSchema=new mongoose.Schema({
    user:{
        type:mongoose.Schema.ObjectId,
        ref:"userModel",
        required:true,
    },
    store:{
        type:mongoose.Schema.ObjectId,
        ref:"storeModel",
        required:true,
    },
})

favouriteSchema.pre(/^find/, function (next) {
    this.populate({
      path: 'user',
      select: '-isDeleted',
      match: { isDeleted: false },
    });
    next();
  });

  favouriteSchema.pre(/^find/, function (next) {
    this.populate({
      path: 'store',
      select: '-isDeleted',
      match: { isDeleted: false },
    });
    next();
  });
const favouriteModel=mongoose.model("favouriteModel",favouriteSchema);
module.exports=favouriteModel