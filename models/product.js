const mongoose=require('mongoose');

const productSchema=new mongoose.Schema({
    productBarcode:{
        type:String,
        required:[true,"Please enter product barcode"]
    },
    productName:{
        type:String,
        required:[true,"please enter product name"]
    },
    price:{
        type:Number,
        required:[true,"please enter product price"],
    },
    discountedPrice:{
        type:Number,
        default:0
    },
    offPercentage:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        required:[true,"please enter product quantity"],
    },
    category:{
        type:mongoose.Schema.ObjectId,
        ref:"productCategoryModel",
        required:[true,"please select product category"]
    },
    productLocation:{
        type:String,
        required:true
    },
    isAvailableInOffer:{
        type:Boolean,
        default:false
    },
    dateTillAvailableInOffer:{
        type:Date,
        default:null
    },
    store:{
        type:mongoose.Schema.ObjectId,
        ref:"storeModel",
        required:[true,"please enter store Id"]
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    image:{
        type:String,
        required:[true,"please select product image"]
    }
})
// productSchema.pre('find', function() {
//     this.where({ isDeleted: false });
//   });
  
//   productSchema.pre('findOne', function() {
//     this.where({ isDeleted: false });
//   });
//   productSchema.pre('findById', function() {
//     this.where({ isDeleted: false });
//   });
// productSchema.pre('findOne', function() {
//     this.where({ isDeleted: { $ne: true } });
//   });
//   productSchema.pre('find', function() {
//     this.where({ isDeleted: { $ne: true } });
//   });
//   productSchema.pre('findById', function() {
//     this.where({ isDeleted: { $ne: true } });
//   });
  


// productSchema.pre('remove', async function (next) {
//     const productId = this._id;
//     await mongoose.model('offerModel').updateMany(
//       { 'offerProducts.product': productId },
//       { $pull: { offerProducts: { product: productId } } }
//     );
//     next();
//   });
// 
const productModel=mongoose.model('productModel',productSchema);

module.exports=productModel;