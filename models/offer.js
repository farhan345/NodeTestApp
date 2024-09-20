const mongoose=require("mongoose");
const validator=require("validator")
const offerSchema=new mongoose.Schema({
    offerProducts: [
        {
          product: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: "productModel",
            unique:false,
          },
          stock:{
            type:Number,
          }
        },
      ],
    store:{
        type:mongoose.Schema.ObjectId,
        ref:"storeModel",
        required:[true,"please enter store Id"]
    },
    offerCategory:{
        type:String,
        required:[true,"please enter offer type"]
    },
    discountedPercentage:{
        type:Number,
        required:true
    },
    dateTillPromoAvailable:{
        type:Date,
        required:true,
    }
})



// offerSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: 'offerProducts.product',
//   });
//   this.populate({
//     path: 'store',
//     select: '-isDeleted',
//   });
//   next();
// });
// offerSchema.pre(/^findOne/, function (next) {
//   this.populate({
//     path: 'offerProducts.product',
//   });
//   this.populate({
//     path: 'store',
//     select: '-isDeleted', 
//   });
//   next();
// });
const offerModel=mongoose.model("offerModel",offerSchema);
module.exports=offerModel;