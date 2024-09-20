
const asyncErrorCatch = require('../middleware/asyncErrorHandlers');
const ErrorHandler = require("../utils/errorHandler");
const cartModel = require("../models/cart");
const productModel = require('../models/product');
const offerModel = require('../models/offer');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');

exports.addToCart = asyncErrorCatch(async (req, res, next) => {
    let isOutOfStock = false;
    let product, count = 0;
    if (!req.body.orderItems) {
        return next(new ErrorHandler(400, "Please enter order items"))
    }
    if (!req.body.user) {
        return next(new ErrorHandler(400, "Please enter user Id"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    // if (!req.body.offerCategory) {
    //     return next(new ErrorHandler(400, "Please enter offer category"))
    // }

    for (let j = 0; j < req.body?.orderItems?.length; j++) {
        if (!req.body.orderItems[j].quantity) {
            return next(new ErrorHandler(400, `Please enter your${req.body.orderItems.length > 1 ? `${j + 1}` : ""} order item product quantity`))
        }
        else if (!req.body.orderItems[j].product) {
            return next(new ErrorHandler(400, `Please enter your${req.body.orderItems.length > 1 ? `${j + 1}` : ""} order item product product Id`))
        }

    }
    const {
        orderItems,
        user,
        store,
    } = req.body;
    const oldCart = await cartModel.findOne({ user: user, store: store })
    let offeredProducts = await offerModel.find({ store: store }, { offerProducts: 1 })
    const productsID = req.body.orderItems.map((obj) => { return obj })
    // console.log(orderItems, "orderITems");
    // console.log(offeredProducts, "offer");
    if (oldCart) {
        // console.log("oldCart", oldCart);
        for (let i = 0; i < orderItems?.length; i++) {
            offeredProducts.forEach((offer) => {
                console.log(offer, "offer");
                offer.offerProducts.forEach(async (offeredProduct) => {
                    console.log(offeredProduct, "offerproduct");
                    if (mongoose.Types.ObjectId(offeredProduct.product).equals(orderItems[i]?.product)) {
                        if (orderItems[i]?.quantity > offeredProduct.stock) {
                            isOutOfStock = true;
                            let product = await productModel.findById(mongoose.Types.ObjectId(offeredProduct.product));
                            if ((orderItems[i]?.quantity > offeredProduct.stock) && offeredProduct.stock === 0) {
                                return next(new ErrorHandler(400, `No more stock available of this product ${product.productName} `))
                            }
                            return next(new ErrorHandler(400, `Only ${offeredProduct.stock} ${product.productName} available in stock`))
                        } else {
                            const product = await cartModel.findOne({ user: req.body.user, store: req.body.store, orderItems: { $elemMatch: { product: orderItems[i]?.product } } }, { orderItems: { $elemMatch: { product: orderItems[i]?.product } } })
                            if (product) {

                                const newStock = product.orderItems[0].quantity + orderItems[i]?.quantity;

                                cartModel.findOneAndUpdate({ user: req.body.user, store: req.body.store, "orderItems.product": orderItems[i]?.product }, { $set: { "orderItems.$.quantity": newStock, createdAt: Date.now(), status: "active" } }, { new: true }, (err, Uresult) => {
                                    if (err) {
                                        return next(new ErrorHandler(400, err.message))
                                    }
                                    if (Uresult) {
                                        offerModel.findOneAndUpdate(
                                            { "offerProducts.product": orderItems[i]?.product },
                                            { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
                                            { new: true },
                                            (err, updatedOffer) => {
                                                console.log("de");
                                                if (err) {
                                                    return next(new ErrorHandler(400, err.message));
                                                } else {
                                                    console.log(updatedOffer);
                                                    count++;
                                                    console.log(count, "count");
                                                    if (count === orderItems?.length) {
                                                        res.status(200).json({ success: true, message: "Items added in cart", cart: Uresult })
                                                    }

                                                }
                                            }
                                        );
                                    }
                                })
                            } else {

                                cartModel.findOneAndUpdate({ user: req.body.user, store: req.body.store }, { $push: { orderItems: orderItems[i] }, $set: { createdAt: Date.now(), status: "active" } }, { new: true }, (err, result) => {
                                    if (err) {
                                        return next(new ErrorHandler(400, err.message))
                                    } else {
                                        offerModel.findOneAndUpdate(
                                            { "offerProducts.product": orderItems[i]?.product },
                                            { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
                                            { new: true },
                                            (err, updatedOffer) => {
                                                if (err) {
                                                    return next(new ErrorHandler(400, err.message))
                                                }
                                                else {

                                                    count++;

                                                    if (count === orderItems.length) {
                                                        res.status(200).json({ success: true, message: "Items added in cart", cart: result })
                                                    }
                                                }
                                            }
                                        );
                                    }
                                })
                            }
                        }
                    }
                });
            });
        }
        // for (let i = 0; i < orderItems?.length; i++) {
        //     for (let j = 0; j < offeredProducts?.offerProducts?.length; j++) {
        //         if (mongoose.Types.ObjectId(offeredProducts?.offerProducts[j]?.product).equals(orderItems[i]?.product)) {
        //             //  console.log(orderItems[i]?.product,offeredProducts?.offerProducts[j]?.product);
        //             if (orderItems[i]?.quantity > offeredProducts?.offerProducts[j]?.stock) {
        //                 isOutOfStock = true;
        //                 let product = await productModel.findById(mongoose.Types.ObjectId(offeredProducts?.offerProducts[j]?.product));
        //                 if ((orderItems[i]?.quantity > offeredProducts?.offerProducts[j]?.stock) && offeredProducts?.offerProducts[j]?.stock === 0) {
        //                     return next(new ErrorHandler(400, `No more stock available of this product ${product.productName} `))

        //                 }
        //                 return next(new ErrorHandler(400, `Only ${offeredProducts?.offerProducts[j]?.stock} ${product.productName} available in stock`))
        //             } else {
        //                 const product = await cartModel.findOne({ user: req.body.user, store: req.body.store, orderItems: { $elemMatch: { product: orderItems[i]?.product } } }, { orderItems: { $elemMatch: { product: orderItems[i]?.product } } })
        //                 if (product) {

        //                     const newStock = product.orderItems[0].quantity + orderItems[i]?.quantity;

        //                     cartModel.findOneAndUpdate({ user: req.body.user, store: req.body.store, "orderItems.product": orderItems[i]?.product }, { $set: { "orderItems.$.quantity": newStock, createdAt: Date.now(), status: "active" } }, { new: true }, (err, Uresult) => {
        //                         if (err) {
        //                             return next(new ErrorHandler(400, err.message))
        //                         }
        //                         if (Uresult) {
        //                             offerModel.findOneAndUpdate(
        //                                 { "offerProducts.product": offeredProducts?.offerProducts[j]?.product },
        //                                 { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
        //                                 { new: true },
        //                                 (err, updatedOffer) => {
        //                                     if (err) {
        //                                         return next(new ErrorHandler(400, err.message));
        //                                     } else {

        //                                         count++;
        //                                         console.log(count, "count");
        //                                         if (count === orderItems?.length) {
        //                                             res.status(200).json({ success: true, message: "Items added in cart", cart: Uresult })
        //                                         }

        //                                     }
        //                                 }
        //                             );
        //                         }
        //                     })
        //                 } else {

        //                     cartModel.findOneAndUpdate({ user: req.body.user, store: req.body.store }, { $push: { orderItems: orderItems[i] }, $set: { createdAt: Date.now(), status: "active" } }, { new: true }, (err, result) => {
        //                         if (err) {
        //                             return next(new ErrorHandler(400, err.message))
        //                         } else {
        //                             offerModel.findOneAndUpdate(
        //                                 { "offerProducts.product": offeredProducts?.offerProducts[j]?.product },
        //                                 { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
        //                                 { new: true },
        //                                 (err, updatedOffer) => {
        //                                     if (err) {
        //                                         return next(new ErrorHandler(400, err.message));
        //                                     } else {

        //                                         count++;

        //                                         if (count === orderItems?.length) {
        //                                             res.status(200).json({ success: true, message: "Items added in cart", cart: result })
        //                                         }

        //                                     }
        //                                 }
        //                             );
        //                         }
        //                     })

        //                 }
        //             }

        //         }

        //     }
        // }
        // for (let i = 0; i < orderItems?.length; i++) {
        //     for (let k = 0; k < offeredProducts?.length; k++) {
        //         const currentOfferedProduct = offeredProducts[k];
        //         for (let j = 0; j < currentOfferedProduct?.offerProducts?.length; j++) {
        //             if (mongoose.Types.ObjectId(currentOfferedProduct?.offerProducts[j]?.product).equals(orderItems[i]?.product)) {
        //                 //  console.log(orderItems[i]?.product,currentOfferedProduct?.offerProducts[j]?.product);
        //                 if (orderItems[i]?.quantity > currentOfferedProduct?.offerProducts[j]?.stock) {
        //                     isOutOfStock = true;
        //                     let product = await productModel.findById(mongoose.Types.ObjectId(currentOfferedProduct?.offerProducts[j]?.product));
        //                     if ((orderItems[i]?.quantity > currentOfferedProduct?.offerProducts[j]?.stock) && currentOfferedProduct?.offerProducts[j]?.stock === 0) {
        //                         return next(new ErrorHandler(400, `No more stock available of this product ${product.productName} `))

        //                     }
        //                     return next(new ErrorHandler(400, `Only ${currentOfferedProduct?.offerProducts[j]?.stock} ${product.productName} available in stock`))
        //                 } else {
        //                     const product = await cartModel.findOne({ user: req.body.user, store: req.body.store, orderItems: { $elemMatch: { product: orderItems[i]?.product } } }, { orderItems: { $elemMatch: { product: orderItems[i]?.product } } })
        //                     if (product) {

        //                         const newStock = product.orderItems[0].quantity + orderItems[i]?.quantity;

        //                         cartModel.findOneAndUpdate({ user: req.body.user, store: req.body.store, "orderItems.product": orderItems[i]?.product }, { $set: { "orderItems.$.quantity": newStock, createdAt: Date.now(), status: "active" } }, { new: true }, (err, Uresult) => {
        //                             if (err) {
        //                                 return next(new ErrorHandler(400, err.message))
        //                             }
        //                             if (Uresult) {
        //                                 offerModel.findOneAndUpdate(
        //                                     { "offerProducts.product": currentOfferedProduct?.offerProducts[j]?.product },
        //                                     { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
        //                                     { new: true },
        //                                     (err, updatedOffer) => {
        //                                         console.log("de");
        //                                         if (err) {
        //                                             return next(new ErrorHandler(400, err.message));
        //                                         } else {
        //                                             console.log(updatedOffer);
        //                                             count++;
        //                                             console.log(count, "count");
        //                                             if (count === orderItems?.length) {
        //                                                 res.status(200).json({ success: true, message: "Items added in cart", cart: Uresult })
        //                                             }

        //                                         }
        //                                     }
        //                                 );
        //                             }
        //                         })
        //                     } else {

        //                         cartModel.findOneAndUpdate({ user: req.body.user, store: req.body.store }, { $push: { orderItems: orderItems[i] }, $set: { createdAt: Date.now(), status: "active" } }, { new: true }, (err, result) => {
        //                             if (err) {
        //                                 return next(new ErrorHandler(400, err.message))
        //                             } else {
        //                                 offerModel.findOneAndUpdate(
        //                                     { "offerProducts.product": currentOfferedProduct?.offerProducts[j]?.product },
        //                                     { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
        //                                     { new: true },
        //                                     (err, updatedOffer) => {
        //                                         if (err) {
        //                                             return next(new ErrorHandler(400, err.message))
        //                                         }
        //                                         else {

        //                                             count++;

        //                                             if (count === orderItems.length * offeredProducts.length) {
        //                                                 res.status(200).json({ success: true, message: "Items added in cart", cart: result })
        //                                             }
        //                                         }
        //                                     }
        //                                 );
        //                             }
        //                         })
        //                     }
        //                 }
        //             } else {
        //                 res.status(404).json({ success: false, message: "product not found" })
        //             }

        //         }
        //     }
        // }
    } else {
        console.log("jek");
        if (offeredProducts?.offerProducts?.length === 0) {
            return next(new ErrorHandler(404, "No Product Found"))
        } else {
            // console.log("dsd");
            // for (let i = 0; i < orderItems?.length; i++) {
            //     for (let j = 0; j < offeredProducts?.offerProducts?.length; j++) {
            //         if (mongoose.Types.ObjectId(offeredProducts?.offerProducts[j]?.product).equals(orderItems[i]?.product)) {
            //             //  console.log(orderItems[i]?.product,offeredProducts?.offerProducts[j]?.product);
            //             if (orderItems[i]?.quantity > offeredProducts?.offerProducts[j]?.stock) {
            //                 isOutOfStock = true;
            //                 let product = await productModel.findById(mongoose.Types.ObjectId(offeredProducts?.offerProducts[j]?.product));
            //                 if ((orderItems[i]?.quantity > offeredProducts?.offerProducts[j]?.stock) && offeredProducts?.offerProducts[j]?.stock === 0) {
            //                     return next(new ErrorHandler(400, `No more stock available of this product ${product.productName} `))

            //                 }
            //                 return next(new ErrorHandler(400, `Only ${offeredProducts?.offerProducts[j]?.stock} ${product.productName} available in stock`))
            //             }

            //         }

            //     }
            // }

            for (let i = 0; i < orderItems?.length; i++) {
                offeredProducts.forEach((offer) => {
                    offer.offerProducts.forEach(async (offeredProduct) => {
                        if (mongoose.Types.ObjectId(offeredProduct.product).equals(orderItems[i]?.product)) {
                            if (orderItems[i]?.quantity > offeredProduct.stock) {
                                isOutOfStock = true;
                                let product = await productModel.findById(mongoose.Types.ObjectId(offeredProduct.product));
                                if ((orderItems[i]?.quantity > offeredProduct.stock) && offeredProduct.stock === 0) {
                                    return next(new ErrorHandler(400, `No more stock available of this product ${product.productName} `))
                                }
                                return next(new ErrorHandler(400, `Only ${offeredProduct.stock} ${product.productName} available in stock`))
                            }
                        }
                    });
                });
            }

            if (!isOutOfStock) {

                cartModel.create({
                    orderItems,
                    user,
                    store,
                    status: "active",
                    createdAt: Date.now()
                }, (err, result) => {
                    if (err) {
                        return next(new ErrorHandler(400, err.message))
                    }
                    if (result) {

                        // for (let i = 0; i < orderItems?.length; i++) {
                        //     for (let j = 0; j < offeredProducts?.offerProducts?.length; j++) {
                        //         // console.log(orderItems[i]?.product,offeredProducts?.offerProducts[j]?.product);

                        //         if (mongoose.Types.ObjectId(offeredProducts?.offerProducts[j]?.product).equals(orderItems[i]?.product)) {

                        //             offerModel.findOneAndUpdate(
                        //                 { "offerProducts.product": offeredProducts?.offerProducts[j]?.product },
                        //                 { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
                        //                 { new: true },
                        //                 (err, updatedOffer) => {
                        //                     if (err) {
                        //                         return next(new ErrorHandler(400, err.message));
                        //                     }
                        //                     if (updatedOffer) {

                        //                         count++;
                        //                         console.log(count, "count");
                        //                         if (count === orderItems?.length) {
                        //                             res.status(200).json({ success: true, message: "Items added in cart", cart: result })
                        //                         }

                        //                     }
                        //                 }
                        //             );

                        //         }
                        //     }
                        // }
                        for (let i = 0; i < orderItems?.length; i++) {
                            for (let offerProduct of offeredProducts) {
                                for (let j = 0; j < offerProduct?.offerProducts?.length; j++) {
                                    if (mongoose.Types.ObjectId(offerProduct?.offerProducts[j]?.product).equals(orderItems[i]?.product)) {

                                        offerModel.findOneAndUpdate(
                                            { "offerProducts.product": offerProduct?.offerProducts[j]?.product },
                                            { $inc: { "offerProducts.$.stock": -orderItems[i]?.quantity } },
                                            { new: true },
                                            (err, updatedOffer) => {
                                                if (err) {
                                                    return next(new ErrorHandler(400, err.message));
                                                }
                                                if (updatedOffer) {

                                                    count++;
                                                    console.log(count, "count");
                                                    if (count === orderItems?.length) {
                                                        res.status(200).json({ success: true, message: "Items added in cart", cart: result })
                                                    }

                                                }
                                            }
                                        );

                                    }
                                }
                            }
                        }


                    }
                });

            }

        }

    }





});
// exports.getAllProductsThatHaveInCart = asyncErrorCatch(async (req, res, next) => {
//     if (!req.body.user) {
//         return next(new ErrorHandler(400, "Please enter user Id"))
//     }
//     if (!req.body.store) {
//         return next(new ErrorHandler(400, "Please enter store Id"))
//     }
//     const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
//     console.log(fifteenMinutesAgo);
//     const products = await cartModel.findOne({ user: req.body.user, store: req.body.store, createdAt: { $gt: fifteenMinutesAgo } });
//     console.log(products);
//     if (products === null) {
//         res.status(200).json({ success: true, status: "expired", message: "All offer products retrieved successfully" })

//     } else {
//         const orderProducts = products.orderItems
//         // console.log(orderProducts);

//         const productInfo = await productModel.find({ _id: { $in: orderProducts.map((obj) => { return obj.product }) } }, { productName: 1, price: 1, quantity: 1, image: 1, _id: 1, discountedPrice: 1, isAvailableInOffer: 1, store: 1, category: 1, offPercentage: 1, dateTillAvailableInOffer: 1 }).populate({ path: "category", select: "categoryName" });
//         if (productInfo?.length === 0) {
//             return next(new ErrorHandler(404, "No Product Found"))
//         } else {
//             res.status(200).json({ success: true, products: productInfo, status: products.status, message: "All offer products retrieved successfully", user: products.user, store: products.store, _id: products._id })

//         }
//     }




// })

exports.getAllProductsThatHaveInCart = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.user) {
        return next(new ErrorHandler(400, "Please enter user Id"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    const fifteenMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    // console.log(fifteenMinutesAgo);
    const products = await cartModel.findOne({ user: req.body.user, store: req.body.store, createdAt: { $gt: fifteenMinutesAgo } }).populate({
        path: "orderItems.product",
        select: "productName price quantity image discountedPrice isAvailableInOffer store category offPercentage dateTillAvailableInOffer obj.stock",
        populate: { path: "category", select: "categoryName" }
    });

    // console.log(products);
    if (products === null) {
        res.status(200).json({ success: true, status: "expired", message: "All offer products retrieved successfully" })

    } else {
        const orderProducts = products.orderItems;
        // console.log(orderProducts);
        let prodId = []
        const productInfo = orderProducts.map((obj) => {
            console.log(obj, "obj");
            const product = obj.product;
            const stock = obj.quantity;

            return {
                _id: product._id,
                addedQuantity: stock,
                productName: product.productName,
                price: product.price,
                quantity: product.quantity,
                image: product.image,
                discountedPrice: product.discountedPrice,
                isAvailableInOffer: product.isAvailableInOffer,
                store: product.store,
                category: product.category,
                offPercentage: product.offPercentage,
                dateTillAvailableInOffer: product.dateTillAvailableInOffer,

            }
        });
       
        if (productInfo?.length === 0) {
            return next(new ErrorHandler(404, "No Product Found"))
        } else {
            const offerProducts = await offerModel.find({ store: req.body.store }, { offerProducts: 1 })
            if (offerProducts.length === 0) {
                return next(new ErrorHandler(404, "No product found"))
            }else{
                const updatedProducts = productInfo.map(product => {
                    // Find the offerProducts array that contains the current product's _id
                    const offerProduct = offerProducts.find(offerProduct =>
                        offerProduct.offerProducts.find(offer => {
                            if (new ObjectId(offer.product).equals(product._id)) {
                                // If a matching offer product is found, add its stock field to the current product object
                                product.quantity = offer.stock;
                                // console.log(product.price, offer.stock, "line");
                                return true;
                            }
                        })
                    );
                    // console.log(product);
                    // Return the updated product object
                    return product;
                });
                res.status(200).json({ success: true, products: updatedProducts, status: products.status, message: "All offer products retrieved successfully", user: products.user, store: products.store, _id: products._id })
            }
           
        }
    }
})


exports.removeItemFromCart = asyncErrorCatch(async (req, res, next) => {
    //const cart=await cartModel.find({createdAt:{$gt:new Date().getTime()-1*60*1000}})
    const fifteenMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);

    const carts = await cartModel.find({
        createdAt: { $lte: fifteenMinutesAgo }, status: "active"
    });
    if (carts?.length !== 0) {
        const deletedItems = carts.map((obj) => { return obj._id })

        for (let i = 0; i < carts?.length; i++) {
            offerModel.find({ store: carts[i].store }, (err, offerDocs) => {
                if (err) {
                    return next(new ErrorHandler(400, err.message));
                }

                // loop over each offerProducts array in each document
                offerDocs.forEach((offerDoc) => {
                    offerDoc.offerProducts.forEach((offerProduct) => {
                        // loop over each order item to find the matching product id
                        carts[i].orderItems.forEach((orderItem) => {
                            if (orderItem.product.equals(offerProduct.product)) {
                                // update the stock value
                                offerProduct.stock += orderItem.quantity;
                            }
                        });
                    });

                    // save the updated document
                    offerDoc.save(async (err) => {
                        if (err) {
                            return next(new ErrorHandler(400, err.message));
                        } else {
                            const deleteCart = await cartModel.updateMany(
                                { _id: { $in: deletedItems } },
                                { $set: { orderItems: [], status: "expired" } },
                                { new: true });
                            if (deleteCart.acknowledged) {

                                res.status(200).json({ success: true, message: "Items removed from cart" })
                            }
                        }
                    });
                });
            });
        }
    } else {
        res.status(200).json({ success: true, message: "no cart found" })
    }
    //  const deletedItems = carts.filter((obj) => { return obj.status==="active" })





})

exports.addIncrementInProductQuantity = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.product) {
        return next(new ErrorHandler(400, "Please enter product Id"))
    }
    if (!req.body.user) {
        return next(new ErrorHandler(400, "Please enter user Id"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    if (!req.body.quantity) {
        return next(new ErrorHandler(400, "Please enter product quantity"))
    }

    offerModel.aggregate([
        { $match: { store: new ObjectId(req.body.store) } },
        { $unwind: "$offerProducts" },
        { $match: { "offerProducts.product": new ObjectId(req.body.product) } },
        { $project: { _id: 0, stock: "$offerProducts.stock" } }
    ], (err, result) => {
        if (err) {
            return next(new ErrorHandler(400, err.message))
        }
        if (result.length === 0) {
            return next(new ErrorHandler(404, "No Product Found"))
        }
        else {
            if (result[0].stock === 0) {
                return next(new ErrorHandler(400, `Item is Out of Stock`))
            }
            else if (result[0].stock < req.body.quantity) {
                return next(new ErrorHandler(400, `You only able to add just ${result[0].stock} more in quantity`))
            } else {
                offerModel.findOneAndUpdate(
                    {
                        "offerProducts.product": req.body.product,
                        store: req.body.store
                    },
                    { $inc: { "offerProducts.$.stock": -req.body.quantity } },
                    { new: true },
                    (err, doc) => {
                        if (err) {
                            return next(new ErrorHandler(400, err.message))
                        } else {
                            cartModel.findOneAndUpdate(
                                {
                                    "orderItems.product": req.body.product,
                                    store: req.body.store,
                                    user: req.body.user
                                },
                                { $inc: { "orderItems.$.quantity": req.body.quantity } },
                                { new: true },
                                (err, updatedCart) => {
                                    if (err) {
                                        return next(new ErrorHandler(400, err.message))
                                    } else {
                                        res.status(200).json({ success: true, message: "product quantity increased" })
                                    }
                                }
                            );
                        }
                    }
                );
            }
        }
    });
})

exports.addDecrementInProductQuantity = asyncErrorCatch(async (req, res, next) => {
    if (!req.body.product) {
        return next(new ErrorHandler(400, "Please enter product Id"))
    }
    if (!req.body.user) {
        return next(new ErrorHandler(400, "Please enter user Id"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "Please enter store Id"))
    }
    if (!req.body.quantity) {
        return next(new ErrorHandler(400, "Please enter product quantity"))
    }


    cartModel.aggregate([
        { $match: { store: new ObjectId(req.body.store), user: new ObjectId(req.body.user) } },
        { $unwind: "$orderItems" },
        { $match: { "orderItems.product": new ObjectId(req.body.product) } },
        { $project: { _id: 0, quantity: "$orderItems.quantity" } }
    ], (err, result) => {
        console.log(result)
        if (err) {
            return next(new ErrorHandler(400, err.message))
        }
        if (result.length === 0) {
            return next(new ErrorHandler(404, "No Product Found"))
        }

        else {
            if (result[0].quantity === 1) {
                return next(new ErrorHandler(400, `You are not be able to decrease  more in quantity`))
            } else {
                offerModel.findOneAndUpdate(
                    {
                        "offerProducts.product": req.body.product,
                        store: req.body.store
                    },
                    { $inc: { "offerProducts.$.stock": req.body.quantity } },
                    { new: true },
                    (err, doc) => {
                        if (err) {
                            return next(new ErrorHandler(400, err.message))
                        } else {
                            cartModel.findOneAndUpdate(
                                {
                                    "orderItems.product": req.body.product,
                                    store: req.body.store,
                                    user: req.body.user
                                },
                                { $inc: { "orderItems.$.quantity": -req.body.quantity } },
                                { new: true },
                                (err, updatedCart) => {
                                    console.log(updatedCart);
                                    if (err) {
                                        return next(new ErrorHandler(400, err.message))
                                    } else {
                                        res.status(200).json({ success: true, message: "product quantity decreased" })
                                    }
                                }
                            );
                        }
                    }
                );
            }

        }
    });
})
const updateStock = async (id, quantity) => {
    const product = await offerModel.findById(id);

    product.quantity -= quantity;

    return await product.save({ validateBeforeSave: false });
}

exports.removeItemFromCartByUser = asyncErrorCatch(async (req, res, next) => {

    if (!req.body._id) {
        return next(new ErrorHandler(400, "please enter cart Id"))
    }
    if (!req.body.product) {
        return next(new ErrorHandler(400, "please enter product Id"))
    }
    if (!req.body.store) {
        return next(new ErrorHandler(400, "please enter store Id"))
    }
    if (!req.body.user) {
        return next(new ErrorHandler(400, "please enter user Id"))
    }



    const query = {
        _id: req.body._id,
        store: req.body.store,
        user: req.body.user,
        'orderItems.product': req.body.product,
    };
    const update = {
        $pull: {
            orderItems: {
                product: req.body.product,
            },
        },
    };
    let isSave = false;
    const options = {
        new: true,
    };
    const oldcart = await cartModel.findOne({ _id: req.body._id, user: req.body.user, store: req.body.store })
    if (!oldcart) {
        return next(new ErrorHandler(404, "cart not found"))
    } else {
        console.log("old", oldcart);

        const updatedCart = await cartModel.findOneAndUpdate(query, update, options);
        console.log("", updatedCart);
        if (!updatedCart) {
            return next(new ErrorHandler(404, "No Cart found"))
        } else {
            offerModel.find({ store: oldcart?.store }, (err, offerDocs) => {
                if (err) {
                    return next(new ErrorHandler(400, err.message));
                }
                console.log("offer", offerDocs);
                // loop over each offerProducts array in each document
                offerDocs.forEach((offerDoc) => {
                    offerDoc.offerProducts.forEach((offerProduct) => {
                        // loop over each order item to find the matching product id

                        oldcart?.orderItems?.forEach((obj) => {
                            if ((offerProduct.product.equals(req.body.product)) && obj?.product.equals(req.body.product)) {
                                // update the stock value
                                offerProduct.stock += obj.quantity;
                                offerDoc.save({ validateBeforeSave: false }, (err, result) => {
                                    if (err) {
                                        return next(new ErrorHandler(400, err.message));
                                    }
                                    else {
                                        res.status(200).json({ success: true, message: "item removed from cart" })
                                    }
                                })
                            }
                        })


                    });

                    // save the updated document
                    // offerDoc.save(async (err) => {
                    // if (err) {
                    //     return next(new ErrorHandler(400, err.message));
                    // } else {
                    //        

                    //     }
                    // });
                });


            });

        }
    }















    // //const cart=await cartModel.find({createdAt:{$gt:new Date().getTime()-1*60*1000}})
    // const fifteenMinutesAgo = new Date(Date.now() - 1 * 60 * 1000);

    // const carts = await cartModel.find({
    //     createdAt: { $lte: fifteenMinutesAgo }, status: "active"
    // });
    // //  const deletedItems = carts.filter((obj) => { return obj.status==="active" })
    // const deletedItems = carts.map((obj) => { return obj._id })

    // for (let i = 0; i < carts?.length; i++) {
    //     offerModel.find({ store: carts[i].store }, (err, offerDocs) => {
    //         if (err) {
    //             return next(new ErrorHandler(400, err.message));
    //         }

    //         // loop over each offerProducts array in each document
    //         offerDocs.forEach((offerDoc) => {
    //             offerDoc.offerProducts.forEach((offerProduct) => {
    //                 // loop over each order item to find the matching product id
    //                 carts[0].orderItems.forEach((orderItem) => {
    //                     if (orderItem.product.equals(offerProduct.product)) {
    //                         // update the stock value
    //                         offerProduct.stock += orderItem.quantity;
    //                     }
    //                 });
    //             });

    //             // save the updated document
    //             offerDoc.save(async(err) => {
    //                 if (err) {
    //                     return next(new ErrorHandler(400, err.message));
    //                 } else {
    //                     const deleteCart = await cartModel.updateMany(
    //                         { _id: { $in: deletedItems } },
    //                         { $set: { orderItems: [], status: "expired" } },
    //                         { new: true });
    //                     if (deleteCart.acknowledged) {

    //                         res.status(200).json({ success: true, message: "Items removed from cart" })
    //                     }
    //                 }
    //             });
    //         });
    //     });
    // }




})


exports.removeCompleteItemFromCartByUser = asyncErrorCatch(async (req, res, next) => {

    if (!req.params.id) {
        return next(new ErrorHandler(400, "please enter cart Id"))
    }
    let count = 0;
    const cart = await cartModel.findOne({ _id: req.params.id })
    if (!cart) {
        return next(new ErrorHandler(404, "cart not found"))
    } else {
        offerModel.find({ store: cart?.store }, (err, offerDocs) => {
            if (err) {
                return next(new ErrorHandler(400, err.message));
            }
            // loop over each offerProducts array in each document
            offerDocs.forEach((offerDoc) => {
                offerDoc.offerProducts.forEach((offerProduct) => {
                    // loop over each order item to find the matching product id

                    cart?.orderItems?.forEach((obj) => {
                        if ((offerProduct.product.equals(obj.product))) {
                            // update the stock value
                            offerProduct.stock += obj.quantity;
                            offerDoc.save({ validateBeforeSave: false }, (err, result) => {
                                if (err) {
                                    return next(new ErrorHandler(400, err.message));
                                }
                                else {
                                    count++
                                    if (count === cart?.orderItems?.length) {
                                        cartModel.findByIdAndDelete(req.params.id, (err, cartResult) => {
                                            if (err) {
                                                return next(new ErrorHandler(400, err.message));
                                            } else {
                                                res.status(200).json({ success: true, message: "cart removed" })
                                            }
                                        });

                                    }

                                }
                            })
                        }
                    })


                });


            });


        });
    }









})