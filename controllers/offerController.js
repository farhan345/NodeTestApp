const userModel = require("../models/user");
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const fs = require("fs");
const sendToken = require("../utils/getJwtToken");
const sendEmailToUser = require("../utils/sendMail");
const asyncErrorHandlers = require("../middleware/asyncErrorHandlers");
const crypto = require("crypto");
const isObjectPropertyEmpty = require("../utils/checkObjectProperties");
const { log } = require("console");
const mongoose = require("mongoose");
const geolib = require("geolib");
const offerModel = require("../models/offer");
const productModel = require("../models/product");
const { ObjectId } = require("mongodb");
const storeModel = require("../models/store");
const cartModel = require("../models/cart");
exports.addProductInOffer = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.offerProducts) {
    return next(new ErrorHandler(400, "Please select products"));
  }
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.offerCategory) {
    return next(new ErrorHandler(400, "Please enter offer category Name"));
  }
  for (let j = 0; j < req.body?.offerProducts?.length; j++) {
    if (!req.body.offerProducts[j].product) {
      return next(
        new ErrorHandler(
          400,
          `Please enter your${
            req.body?.offerProducts?.length > 1 ? `${j + 1}` : ""
          } offer item product Id`
        )
      );
    } else if (!req.body.offerProducts[j].stock) {
      return next(
        new ErrorHandler(
          400,
          `Please enter your${
            req.body?.offerProducts?.length > 1 ? `${j + 1}` : ""
          } offer item product quantity`
        )
      );
    }
  }
  for (let prod of req.body.offerProducts) {
    const existingOfferProduct = await offerModel.findOne({
      store: req.body.store,
      "offerProducts.product": prod?.product,
    });
    if (existingOfferProduct !== null) {
      if (existingOfferProduct?.offerCategory !== req.body.offerCategory) {
        console.log(existingOfferProduct);
        const productold = await productModel.findById(prod.product);
        return next(
          new ErrorHandler(
            400,
            `You cant add this product ${productold?.productName} as it is already added in some other offer category`
          )
        );
      }
    }
  }
  const existingOffer = await offerModel.findOne({
    store: req.body.store,
    offerCategory: req.body.offerCategory,
  });

  const offerProducts = req.body.offerProducts;
  let updatedField = 0,
    updateStock = 0,
    checkProduct = 0;
  let existingProductsArray = [];
  const productsID = req.body.offerProducts.map((obj) => {
    return obj;
  });

  // Format the date string using the toLocaleDateString() method
  const formattedDate = existingOffer?.dateTillPromoAvailable;
  console.log("existingOdder", existingOffer);
  const Data = {
    offerProducts: req.body.offerProducts,
    store: req.body.store,
    offerCategory: req.body.offerCategory,
  };
  const discountPercentage = existingOffer?.discountedPercentage;

  // Calculate the discounted price

  const isStoreAndCategoryExist = await offerModel.find({
    store: req.body.store,
    offerCategory: req.body.offerCategory,
  });
  if (isStoreAndCategoryExist.length === 0) {
    for (let obj of req.body.offerProducts) {
      const product = await productModel.findById(obj.product);
      if (product) {
        if (product.quantity < obj.stock) {
          return next(
            new ErrorHandler(
              400,
              `Sorry, you can't add this product (${product.productName}) in offer becuase it is out of stock`
            )
          );
        } else {
          checkProduct++;
        }
      }
    }
    if (checkProduct === req.body.offerProducts.length) {
      offerModel.create(Data, async (err, result) => {
        if (err) {
          return next(new ErrorHandler(400, err.message));
        } else {
          console.log("percentage1", result);
          for (let i = 0; i < req.body.offerProducts.length; i++) {
            const product = await productModel.findById(
              offerProducts[i].product
            );
            if (product) {
              const discountedPrice =
                product.price * (1 - discountPercentage / 100);

              const roundedPrice = Math.round(discountedPrice);
              console.log("dicounted1", discountedPrice);
              product.quantity -= offerProducts[i].stock;
              product.isAvailableInOffer = true;
              product.discountedPrice = roundedPrice;
              product.offPercentage = discountPercentage;
              product.dateTillAvailableInOffer = formattedDate;
              product.save({ validateBeforeSave: false }, (err, result) => {
                if (err) {
                  return next(new ErrorHandler(400, err.message));
                }
                updateStock++;
                if (updateStock === req.body.offerProducts.length) {
                  storeModel.updateOne(
                    { _id: req.body.store },
                    {
                      isStoreHasOffer: true,
                      offerPercentage: discountPercentage,
                    },
                    (err, result) => {
                      if (err) {
                        return next(new ErrorHandler(400, err.message));
                      } else {
                        res.status(200).json({
                          success: true,
                          message: "Products added in offer",
                        });
                      }
                    }
                  );
                }
              });
            }
          }
        }
      });
    }
  } else {
    for (let offer of productsID) {
      // check product already exist in offer or not
      const product = await offerModel.findOne(
        {
          store: req.body.store,
          offerCategory: req.body.offerCategory,
          offerProducts: { $elemMatch: { product: offer.product } },
        },
        { offerProducts: { $elemMatch: { product: offer.product } } }
      );
      if (product) {
        const existingProduct = await productModel.findOne({
          _id: offer.product,
        });
        if (existingProduct) {
          if (existingProduct.quantity < offer.stock) {
            return next(
              new ErrorHandler(
                400,
                `Sorry, you can't add this product (${existingProduct.productName}) in offer becuase it is out of stock`
              )
            );
          } else {
            // console.log(product.offerProducts[0].stock);
            // res.status(200).json({product})

            let newStock = product.offerProducts[0].stock + offer.stock;
            offerModel.updateOne(
              {
                store: req.body.store,
                offerCategory: req.body.offerCategory,
                "offerProducts.product": offer.product,
              },
              { $set: { "offerProducts.$.stock": newStock } },
              (err, result) => {
                if (err) {
                  return next(new ErrorHandler(400, err.message));
                } else {
                  console.log("percentage2", discountPercentage);
                  console.log("product2", existingProduct);
                  const discountedPrice =
                    existingProduct.price * (1 - discountPercentage / 100);
                  const roundedPrice = Math.round(discountedPrice);
                  console.log("dicounted2", discountedPrice);
                  existingProduct.quantity -= offer.stock;
                  existingProduct.isAvailableInOffer = true;
                  existingProduct.discountedPrice = roundedPrice;
                  existingProduct.offPercentage = discountPercentage;
                  existingProduct.dateTillAvailableInOffer = formattedDate;
                  existingProduct.save(
                    { validateBeforeSave: false },
                    async (err, result) => {
                      if (err) {
                        return next(new ErrorHandler(400, err.message));
                      } else {
                        updatedField++;
                        if (updatedField === productsID.length) {
                          storeModel.updateOne(
                            { _id: req.body.store },
                            {
                              isStoreHasOffer: true,
                              offerPercentage: discountPercentage,
                            },
                            (err, result) => {
                              if (err) {
                                return next(new ErrorHandler(400, err.message));
                              } else {
                                res.status(200).json({
                                  success: true,
                                  message:
                                    "All products are added in this offer",
                                });
                              }
                            }
                          );
                        }
                        // console.log(updatedField, "updatefield");
                      }
                    }
                  );
                }
              }
            );
          }
        }
      }
      if (!product) {
        const oldProduct = await productModel.findById(offer.product);
        if (oldProduct) {
          if (oldProduct.quantity < offer.stock) {
            return next(
              new ErrorHandler(
                400,
                `Sorry, you can't add this product (${oldProduct.productName}) in offer becuase it is out of stock`
              )
            );
          } else {
            offerModel.updateOne(
              { store: req.body.store, offerCategory: req.body.offerCategory },
              { $push: { offerProducts: offer } },
              (err, result) => {
                if (err) {
                  return next(new ErrorHandler(400, err.message));
                } else {
                  console.log("percentage3", discountPercentage);
                  console.log("product3", oldProduct);
                  const discountedPrice =
                    oldProduct.price * (1 - discountPercentage / 100);
                  const roundedPrice = Math.round(discountedPrice);
                  // console.log("dicounted3",discountedPrice);
                  oldProduct.quantity -= offer.stock;
                  oldProduct.isAvailableInOffer = true;
                  oldProduct.discountedPrice = roundedPrice;
                  oldProduct.offPercentage = discountPercentage;
                  oldProduct.dateTillAvailableInOffer = formattedDate;
                  oldProduct.save(
                    { validateBeforeSave: false },
                    async (err, result) => {
                      if (err) {
                        return next(new ErrorHandler(400, err.message));
                      } else {
                        updatedField++;
                        if (updatedField === productsID.length) {
                          storeModel.updateOne(
                            { _id: req.body.store },
                            {
                              isStoreHasOffer: true,
                              offerPercentage: discountPercentage,
                            },
                            (err, result) => {
                              if (err) {
                                return next(new ErrorHandler(400, err.message));
                              } else {
                                res.status(200).json({
                                  success: true,
                                  message:
                                    "All products are added in this offer",
                                });
                              }
                            }
                          );
                        }
                      }
                    }
                  );
                }
              }
            );
          }
        }
      }
    }
  }
});

exports.createOfferCategoryType = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.offerCategory) {
    return next(new ErrorHandler(400, "Please enter offer category Name"));
  }
  if (!req.body.discountedPercentage) {
    return next(new ErrorHandler(400, "Please enter discounted percentage"));
  }
  if (!req.body.dateTillPromoAvailable) {
    return next(
      new ErrorHandler(400, "Please enter date till promo available")
    );
  }

  // const dateStr = req.body.dateTillPromoAvailable.toString();

  // // Split the date string into parts
  // const dateParts = dateStr.split("-");

  // // Create a new Date object using the date parts
  // const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);

  // // Format the date string using the toLocaleDateString() method
  // const formattedDate = date.toLocaleDateString("en-US", {
  //   year: "numeric",
  //   month: "2-digit",
  //   day: "2-digit",
  // });
  // Parse the input date string
  const dateStr = req.body.dateTillPromoAvailable;
  const [day, month, year] = dateStr.split("-").map(Number);

  // Create a Date object and convert to ISO string
  const date = new Date(Date.UTC(year, month - 1, day));
  const isoDate = date.toISOString();
  const discount = req.body.discountedPercentage;
  const Data = {
    store: req.body.store,
    offerCategory: req.body.offerCategory,
    discountedPercentage: discount,
    dateTillPromoAvailable: isoDate,
  };

  const existingOfferCategory = await offerModel.findOne({
    store: req.body.store,
    offerCategory: req.body.offerCategory,
  });
  if (existingOfferCategory) {
    return next(new ErrorHandler(400, "Offer Category Type Already Exist"));
  } else {
    offerModel.create(Data, async (err, result) => {
      if (err) {
        return next(new ErrorHandler(400, err.message));
      }
      res
        .status(200)
        .json({ success: true, message: "Offer category type created" });
    });
  }
});

// exports.updateOfferCategoryType = asyncErrorCatch(async (req, res, next) => {
//   debugger;
//   if (!req.body.store) {
//     return next(new ErrorHandler(400, "Please enter store Id"));
//   }
//   if (!req.body.offerCategory) {
//     return next(new ErrorHandler(400, "Please enter offer category Name"));
//   }
//   if (!req.body.discountedPercentage) {
//     return next(new ErrorHandler(400, "Please enter discounted percentage"));
//   }
//   if (!req.body.dateTillPromoAvailable) {
//     return next(
//       new ErrorHandler(400, "Please enter date till promo available")
//     );
//   }
//   const dateStr = req.body.dateTillPromoAvailable.toString();

//   // // Split the date string into parts
//   // const dateParts = dateStr.split("-");

//   // // Create a new Date object using the date parts
//   // const date = new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);

//   // // Format the date string using the toLocaleDateString() method
//   // const formattedDate = date.toLocaleDateString("en-US", {
//   //   year: "numeric",
//   //   month: "2-digit",
//   //   day: "2-digit",
//   // });
//   const [day, month, year] = dateStr.split("-").map(Number);

//   // Create a Date object and convert to ISO string
//   const date = new Date(Date.UTC(year, month - 1, day));
//   const isoDate = date.toISOString();
//   const discount = req.body.discountedPercentage;
//   const existingOfferCategory = await offerModel.findOne({
//     store: req.body.store,
//     offerCategory: req.body.offerCategory,
//   });
//   if (!existingOfferCategory) {
//     return next(new ErrorHandler(400, "offer category not found"));
//   }
//   const Data = {
//     offerCategory: req.body.offerCategory,
//     discountedPercentage: discount,
//     dateTillPromoAvailable: isoDate,
//   };
//   const newData = await isObjectPropertyEmpty(Data, existingOfferCategory);
//   offerModel.updateOne(
//     { store: req.body.store, offerCategory: req.body.offerCategory },
//     newData,
//     { runValidators: true },
//     async (err, result) => {
//       if (err) {
//         return next(new ErrorHandler(400, err.message));
//       } else {
//         if (existingOfferCategory?.offerProducts?.length !== 0) {
//           let count = 0;
//           for (let prodct of existingOfferCategory?.offerProducts) {
//             const existingProduct = await productModel.findById(
//               prodct?.product
//             );

//             const discountedPrice =
//               existingProduct.price * (1 - discount / 100);
//             const roundedPrice = Math.round(discountedPrice);

//             existingProduct.isAvailableInOffer =
//               new Date(formattedDate) > new Date() ? true : false;
//             existingProduct.dateTillAvailableInOffer = formattedDate;
//             existingProduct.offPercentage = discount;
//             existingProduct.discountedPrice = roundedPrice;

//             existingProduct.save({ validateBeforeSave: false }, (err, resu) => {
//               if (err) {
//                 return next(new ErrorHandler(400, err.message));
//               } else {
//                 count++;

//                 if (count === existingOfferCategory?.offerProducts?.length) {
//                   res.status(200).json({
//                     success: true,
//                     message: "Offer category type updated",
//                   });
//                 }
//               }
//             });
//           }
//         } else {
//           res
//             .status(200)
//             .json({ success: true, message: "Offer category type updated" });
//         }
//       }
//     }
//   );

//   // const existingOfferCategory = await offerModel.findOne({ store: req.body.store, offerCategory: req.body.offerCategory })
//   // if (existingOfferCategory) {
//   //     let count = 0;
//   //     console.log(existingOfferCategory);
//   //     existingOfferCategory.discountedPercentage = discount
//   //     existingOfferCategory.dateTillPromoAvailable = formattedDate
//   //     existingOfferCategory.save({ validateBeforeSave: false }, async (err, result) => {
//   //         if (err) {
//   //             return next(new ErrorHandler(400, err.message))
//   //         } else {
//   //             // console.log(existingOfferCategory?.offerProducts);
//   //             const updateProductId = existingOfferCategory?.offerProducts?.map((obj) => obj.product)
//   //             console.log(formattedDate);
//   //             // console.log(updateProductId);
//   //             for (let prodct of existingOfferCategory?.offerProducts) {

//   //                 const existingProduct = await productModel.findById(prodct?.product);

//   //                 const discountedPrice = existingProduct.price * (1 - discount / 100);
//   //                 const roundedPrice = Math.round(discountedPrice);

//   //                 existingProduct.isAvailableInOffer = ((new Date(formattedDate)) > (new Date())) ? true : false
//   //                 existingProduct.dateTillAvailableInOffer = formattedDate
//   //                 existingProduct.offPercentage = discount
//   //                 existingProduct.discountedPrice = roundedPrice

//   //                 existingProduct.save({ validateBeforeSave: false }, (err, resu) => {
//   //                     if (err) {
//   //                         return next(new ErrorHandler(400, err.message))
//   //                     }
//   //                     else {
//   //                         count++

//   //                         if (count === existingOfferCategory?.offerProducts?.length) {
//   //                             res.status(200).json({ success: true, message: "Offer category type updated" })
//   //                         }
//   //                     }
//   //                 })
//   //             }

//   //         }

//   //     })
//   // }
// });
exports.updateOfferCategoryType = asyncErrorCatch(async (req, res, next) => {
  try {
    // Check required fields
    if (!req.body.store) {
      return next(new ErrorHandler(400, "Please enter store Id"));
    }
    if (!req.body.offerCategory) {
      return next(new ErrorHandler(400, "Please enter offer category Name"));
    }
    if (!req.body.discountedPercentage) {
      return next(new ErrorHandler(400, "Please enter discounted percentage"));
    }
    if (!req.body.dateTillPromoAvailable) {
      return next(
        new ErrorHandler(400, "Please enter date till promo available")
      );
    }

    // Parse and format the date
    const dateStr = req.body.dateTillPromoAvailable.toString();
    const [day, month, year] = dateStr.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    const isoDate = date.toISOString();

    // Find existing offer category
    const existingOfferCategory = await offerModel.findOne({
      store: req.body.store,
      offerCategory: req.body.offerCategory,
    });
    if (!existingOfferCategory) {
      return next(new ErrorHandler(400, "Offer category not found"));
    }

    // Update the offer category details
    const discount = req.body.discountedPercentage;
    const Data = {
      offerCategory: req.body.offerCategory,
      discountedPercentage: discount,
      dateTillPromoAvailable: isoDate,
    };
    const newData = await isObjectPropertyEmpty(Data, existingOfferCategory);
    await offerModel.updateOne(
      { store: req.body.store, offerCategory: req.body.offerCategory },
      newData,
      { runValidators: true }
    );

    // Update associated products if they exist
    if (existingOfferCategory.offerProducts?.length > 0) {
      let count = 0;
      for (let prodct of existingOfferCategory.offerProducts) {
        const existingProduct = await productModel.findById(prodct.product);
        if (existingProduct) {
          const discountedPrice = existingProduct.price * (1 - discount / 100);
          const roundedPrice = Math.round(discountedPrice);

          existingProduct.isAvailableInOffer = new Date(isoDate) > new Date();
          existingProduct.dateTillAvailableInOffer = isoDate;
          existingProduct.offPercentage = discount;
          existingProduct.discountedPrice = roundedPrice;

          await existingProduct.save({ validateBeforeSave: false });
          count++;

          if (count === existingOfferCategory.offerProducts.length) {
            return res.status(200).json({
              success: true,
              message: "Offer category type updated",
            });
          }
        }
      }
    } else {
      res
        .status(200)
        .json({ success: true, message: "Offer category type updated" });
    }
  } catch (err) {
    return next(new ErrorHandler(400, err.message));
  }
});

exports.removeProductFromOffer = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.offerCategory) {
    return next(new ErrorHandler(400, "Please enter offer category Name"));
  }
  if (req.body?.offerProducts?.length === 0) {
    return next(
      new ErrorHandler(
        400,
        "Please select product that you want to be remove from offer"
      )
    );
  }
  const deletedProducts = req.body.offerProducts.map((obj) => {
    return obj.product;
  });

  const beforeUpdatestore = await offerModel.findOne({
    store: req.body.store,
    offerCategory: req.body.offerCategory,
  });
  if (!beforeUpdatestore) {
    return next(new ErrorHandler(404, "Offer Not Found"));
  }
  console.log(beforeUpdatestore);
  if (beforeUpdatestore?.offerProducts?.length === 0) {
    return next(new ErrorHandler(404, "This offer has no product"));
  }
  let findStoreLength = 0;

  if (
    beforeUpdatestore?.offerProducts?.length !== 0 &&
    deletedProducts?.length !== 0
  ) {
    console.log("check 1");
    for (let i = 0; i < deletedProducts?.length; i++) {
      const offerProduct = await offerModel.findOne({
        store: req.body.store,
        offerCategory: req.body.offerCategory,
        "offerProducts.product": deletedProducts[i],
      });
      console.log(offerProduct, "lok");
      if (!offerProduct) {
        return next(
          new ErrorHandler(404, "product not found in that offer category type")
        );
      }
    }

    offerModel.updateOne(
      { store: req.body.store, offerCategory: req.body.offerCategory },
      { $pull: { offerProducts: { product: { $in: deletedProducts } } } },
      async (err, result) => {
        if (err) {
          return next(new ErrorHandler(400, "Products not found"));
        } else {
          console.log("check2");
          const afterUpdatestore = await offerModel.findOne({
            store: req.body.store,
            offerCategory: req.body.offerCategory,
          });
          if (!afterUpdatestore) {
            return next(new ErrorHandler(404, "Offer Not Found"));
          } else {
            console.log("check3");
            if (afterUpdatestore?.offerProducts?.length === 0) {
              const allStores = await offerModel.find({
                store: req?.body?.store,
              });
              if (allStores.length === 0) {
                console.log("check4");
                return next(new ErrorHandler(404, "Offer Not Found"));
              } else {
                console.log("check4");
                for (let i = 0; i < allStores?.length; i++) {
                  if (allStores[i].offerProducts?.length === 0) {
                    findStoreLength++;
                  }
                }
                console.log("check5", findStoreLength, allStores?.length);
                if (allStores?.length === findStoreLength) {
                  console.log("check6");
                  storeModel.updateOne(
                    { _id: req.body.store },
                    { isStoreHasOffer: false, offerPercentage: 0 },
                    (err, result) => {
                      if (err) {
                        return next(new ErrorHandler(400, err.message));
                      } else {
                        console.log("check7");
                        for (let i = 0; i < deletedProducts?.length; i++) {
                          for (
                            let j = 0;
                            j < beforeUpdatestore?.offerProducts?.length;
                            j++
                          ) {
                            console.log(
                              deletedProducts[i],
                              beforeUpdatestore?.offerProducts[j]?.product
                            );
                            if (
                              mongoose.Types.ObjectId(
                                deletedProducts[i]
                              ).equals(
                                beforeUpdatestore?.offerProducts[j]?.product._id
                              )
                            ) {
                              console.log("check8");
                              if (
                                beforeUpdatestore?.offerProducts[j]?.stock !== 0
                              ) {
                                console.log("check9");
                                productModel.updateOne(
                                  {
                                    _id: beforeUpdatestore?.offerProducts[j]
                                      ?.product._id,
                                  },
                                  {
                                    $inc: {
                                      quantity:
                                        beforeUpdatestore?.offerProducts[j]
                                          ?.stock,
                                    },
                                    $set: {
                                      isAvailableInOffer: false,
                                      discountedPrice: 0,
                                      offPercentage: 0,
                                      dateTillAvailableInOffer: null,
                                    },
                                  },
                                  (err, result) => {
                                    if (err) {
                                      return next(
                                        new ErrorHandler(400, err.message)
                                      );
                                    } else {
                                      res.status(200).json({
                                        success: true,
                                        message: "product removed from offer",
                                      });
                                    }
                                  }
                                );
                              }
                            }
                          }
                        }
                      }
                    }
                  );
                } else {
                  for (let i = 0; i < deletedProducts?.length; i++) {
                    for (
                      let j = 0;
                      j < beforeUpdatestore?.offerProducts?.length;
                      j++
                    ) {
                      if (
                        mongoose.Types.ObjectId(deletedProducts[i]).equals(
                          beforeUpdatestore?.offerProducts[j]?.product._id
                        )
                      ) {
                        if (beforeUpdatestore?.offerProducts[j]?.stock !== 0) {
                          productModel.updateOne(
                            {
                              _id: beforeUpdatestore?.offerProducts[j]?.product
                                ._id,
                            },
                            {
                              $inc: {
                                quantity:
                                  beforeUpdatestore?.offerProducts[j]?.stock,
                              },
                              $set: {
                                isAvailableInOffer: false,
                                discountedPrice: 0,
                                offPercentage: 0,
                                dateTillAvailableInOffer: null,
                              },
                            },
                            (err, result) => {
                              console.log("update");
                              if (err) {
                                return next(new ErrorHandler(400, err.message));
                              } else {
                                res.status(200).json({
                                  success: true,
                                  message: "product removed from offer",
                                });
                              }
                            }
                          );
                        }
                      }
                    }
                  }
                }
              }
            } else {
              // console.log(deletedProducts?.length, beforeUpdatestore?.offerProducts?.length);
              for (let i = 0; i < deletedProducts?.length; i++) {
                for (
                  let j = 0;
                  j < beforeUpdatestore?.offerProducts?.length;
                  j++
                ) {
                  if (
                    mongoose.Types.ObjectId(deletedProducts[i]).equals(
                      beforeUpdatestore?.offerProducts[j]?.product._id
                    )
                  ) {
                    if (beforeUpdatestore?.offerProducts[j]?.stock !== 0) {
                      productModel.updateOne(
                        {
                          _id: beforeUpdatestore?.offerProducts[j]?.product._id,
                        },
                        {
                          $inc: {
                            quantity:
                              beforeUpdatestore?.offerProducts[j]?.stock,
                          },
                          $set: {
                            isAvailableInOffer: false,
                            discountedPrice: 0,
                            offPercentage: 0,
                            dateTillAvailableInOffer: null,
                          },
                        },
                        (err, result) => {
                          console.log("update");
                          if (err) {
                            return next(new ErrorHandler(400, err.message));
                          } else {
                            res.status(200).json({
                              success: true,
                              message: "product removed from offer",
                            });
                          }
                        }
                      );
                    }
                  }
                }
              }
            }
          }
        }
      }
    );
  }
});

// exports.removeCompleteOffer = asyncErrorCatch(async (req, res, next) => {
//   debugger;
//   if (!req.body.store) {
//     return next(new ErrorHandler(400, "Please enter store Id"));
//   }
//   if (!req.body.offerCategory) {
//     return next(new ErrorHandler(400, "Please enter offer category Name"));
//   }

//   const offer = await offerModel.findOne({
//     store: req.body.store,
//     offerCategory: req.body.offerCategory,
//   });
//   if (!offer) {
//     return next(new ErrorHandler(404, "offer not found"));
//   }
//   console.log(offer);

//   let count = 0;
//   if (offer?.offerProducts?.length !== 0) {
//     for (let j = 0; j < offer?.offerProducts?.length; j++) {
//       if (offer?.offerProducts[j]?.stock !== 0) {
//         productModel.updateOne(
//           { _id: offer?.offerProducts[j]?.product },
//           {
//             $inc: { quantity: offer?.offerProducts[j]?.stock },
//             $set: {
//               isAvailableInOffer: false,
//               discountedPrice: 0,
//               offPercentage: 0,
//               dateTillAvailableInOffer: null,
//             },
//           },
//           async (err, result) => {
//             console.log("update");
//             if (err) {
//               return next(new ErrorHandler(400, err.message));
//             } else {
//               count++;
//               if (count === offer?.offerProducts?.length) {
//                 const allStoreOffers = await offerModel.find({
//                   store: req.body.store,
//                 });
//                 if (allStoreOffers?.length === 0) {
//                   storeModel.updateOne(
//                     { _id: req.body.store },
//                     { isStoreHasOffer: false, offerPercentage: 0 },
//                     (err, result) => {
//                       if (err) {
//                         return next(new ErrorHandler(400, err.message));
//                       }
//                       offerModel.deleteOne(
//                         {
//                           store: req.body.store,
//                           offerCategory: req.body.offerCategory,
//                         },
//                         (err, result) => {
//                           if (err) {
//                             return next(new ErrorHandler(400, err.message));
//                           } else {
//                             res.status(200).json({
//                               success: true,
//                               message: "product removed from offer",
//                             });
//                           }
//                         }
//                       );
//                     }
//                   );
//                 } else {
//                   offerModel.deleteOne(
//                     {
//                       store: req.body.store,
//                       offerCategory: req.body.offerCategory,
//                     },
//                     (err, result) => {
//                       if (err) {
//                         return next(new ErrorHandler(400, err.message));
//                       } else {
//                         res.status(200).json({
//                           success: true,
//                           message: "Offer Category removed",
//                         });
//                       }
//                     }
//                   );
//                 }
//               }
//             }
//           }
//         );
//       }
//     }
//   } else {
//     offerModel.deleteOne(
//       { store: req.body.store, offerCategory: req.body.offerCategory },
//       (err, result) => {
//         if (err) {
//           return next(new ErrorHandler(400, err.message));
//         } else {
//           res
//             .status(200)
//             .json({ success: true, message: "Offer Category removed" });
//         }
//       }
//     );
//   }
// });
exports.removeCompleteOffer = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.offerCategory) {
    return next(new ErrorHandler(400, "Please enter offer category Name"));
  }

  const offer = await offerModel.findOne({
    store: req.body.store,
    offerCategory: req.body.offerCategory,
  });
  if (!offer) {
    return next(new ErrorHandler(404, "Offer not found"));
  }

  if (offer?.offerProducts?.length > 0) {
    let count = 0;

    for (let j = 0; j < offer?.offerProducts?.length; j++) {
      const product = offer?.offerProducts[j];

      // Update the product's offer status regardless of stock
      try {
        await productModel.updateOne(
          { _id: product?.product },
          {
            $inc: { quantity: product?.stock }, // Will not increment if stock is 0
            $set: {
              isAvailableInOffer: false,
              discountedPrice: 0,
              offPercentage: 0,
              dateTillAvailableInOffer: null,
            },
          }
        );
        count++;
      } catch (err) {
        return next(new ErrorHandler(400, err.message));
      }

      // After all products are processed, check if all products were updated
      if (count === offer?.offerProducts?.length) {
        const allStoreOffers = await offerModel.find({
          store: req.body.store,
        });

        // If no more offers are left for the store, update the store info
        if (allStoreOffers?.length === 0) {
          await storeModel.updateOne(
            { _id: req.body.store },
            { isStoreHasOffer: false, offerPercentage: 0 }
          );
        }

        // Delete the offer category after all products are updated
        await offerModel.deleteOne({
          store: req.body.store,
          offerCategory: req.body.offerCategory,
        });

        return res.status(200).json({
          success: true,
          message: "Offer Category removed",
        });
      }
    }
  } else {
    // If no products in the offer, simply delete the offer category
    await offerModel.deleteOne({
      store: req.body.store,
      offerCategory: req.body.offerCategory,
    });

    return res.status(200).json({
      success: true,
      message: "Offer Category removed",
    });
  }
});

exports.getAllOfferProducts = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.offerCategory) {
    return next(new ErrorHandler(400, "Please enter offer category Id"));
  }
  const offerProducts = await offerModel.find(
    { store: req.body.store, offerCategory: req.body.offerCategory },
    { offerProducts: 1 }
  );

  if (offerProducts.length === 0) {
    return next(new ErrorHandler(404, "No product found"));
  }
  if (offerProducts.length !== 0) {
    const productInfo = await productModel
      .find(
        {
          isDeleted: false,
          $or: [
            { productName: { $regex: req.body.searchQuery, $options: "i" } },
            { productBarcode: { $regex: req.body.searchQuery } },
          ],
          _id: {
            $in: offerProducts[0].offerProducts.map((obj) => {
              return obj.product;
            }),
          },
        },
        {
          productName: 1,
          price: 1,
          quantity: 1,
          image: 1,
          _id: 1,
          discountedPrice: 1,
          isAvailableInOffer: 1,
          store: 1,
          category: 1,
        }
      )
      .populate({ path: "category", select: "categoryName" });
    if (productInfo.length !== 0) {
      res.status(200).json({
        success: true,
        offerProducts: productInfo,
        message: "All offer products retrieved successfully",
      });
    }
    if (productInfo?.length === 0) {
      return next(new ErrorHandler(404, "No Product Found"));
    }
  }
});

exports.getAllOfferProductsByUser = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  const { query } = req;
  const offerProducts = await offerModel.find(
    { store: req.body.store },
    { offerProducts: 1 }
  );
  console.log(offerProducts, "offerProducts");
  if (offerProducts.length === 0) {
    return next(new ErrorHandler(404, "No product found"));
  }
  const filter = {
    isDeleted: false,
    $or: [
      { productName: { $regex: req.body.searchQuery, $options: "i" } },
      { productBarcode: { $regex: req.body.searchQuery } },
    ],
    _id: {
      $in: offerProducts.flatMap((obj) =>
        obj.offerProducts.map((obj) => obj.product)
      ),
    },
  };
  if (query?.categoryId) {
    filter.category = query?.categoryId;
  }
  console.log("filter", filter);
  // console.log(offerProducts);
  // res.status(200).json({ success: true, offerProducts })
  if (offerProducts.length !== 0) {
    const productInfo = await productModel
      .find(filter, {
        productName: 1,
        price: 1,
        image: 1,
        _id: 1,
        discountedPrice: 1,
        isAvailableInOffer: 1,
        store: 1,
        quantity: 1,
        category: 1,
        offPercentage: 1,
        dateTillAvailableInOffer: 1,
      })
      .populate({ path: "category", select: "categoryName" });

    // console.log(productsInfos);
    // const updatedProducts = productInfo.map(product => {
    //     console.log(product._id);

    //     // Find the offerProducts array that contains the current product's _id
    //     const offerProduct = offerProducts.find(offerProduct =>
    //       {
    //         // console.log(offerProducts,"offer");
    //       return  offerProduct.offerProducts.find((offer) => {
    //             console.log(offer.product,"offer prodjih");
    //             if (new ObjectId(offer.product).equals(product._id)) {
    //                 console.log("grt");
    //                 console.log(offer.stock);
    //                 product.stock=offer.stock
    //                 return product
    //             }

    //         })}
    //     );
    //   console.log(offerProduct,"found");
    //     // If an offerProduct is found, find the offer object that matches the current product's _id
    //     if (offerProduct) {
    //         console.log(product._id);
    //       const offer = offerProduct.offerProducts.find(offer =>{
    //         if (new ObjectId(offer.product).equals(product._id)) {
    //             return offer
    //         }
    //       });
    //       // If an offer object is found, add its stock field to the current product object
    //       if (offer) {
    //         console.log("matched");
    //         product.stock = offer.stock;
    //       }
    //     }
    //   console.log("fdfkdoereniiiiiiiiiiiiiiiiiiiiiiiiiiiiiii");
    //     return product;
    //   });
    // const updatedProducts = productsInfos?.map(product => {
    //     // Find the offerProducts array that contains the current product's _id
    //     const offerProduct = offerProducts.find(offerProduct =>
    //       offerProduct.offerProducts.find(offer => {
    //         if (new ObjectId(offer.product).equals(product._id)) {
    //             console.log("matched");
    //           // If a matching offer product is found, add its stock field to the current product object
    //           product.stock = offer.stock;
    //           console.log(product,"proooooooooooo");
    //           return true;
    //         }
    //       })
    //     );
    //   console.log("offer",offerProduct);
    //     // Return the updated product object
    //     return product;
    //   });

    //   for(let i=0;i<productInfo?.length;i++){
    //     console.log("product");
    //     for(let j=0;j<offerProducts?.length;j++){
    //         for(let k=0;k<offerProducts[j]?.offerProducts?.length;k++){
    //             if (new ObjectId(offerProducts[j]?.offerProducts[k].product).equals(productsInfos[i]?._id)) {
    //                 console.log(offerProducts[j]?.offerProducts[k]?.stock);
    //                 console.log( productsInfos[i].price);
    //                 productsInfos[i].stock=offerProducts[j]?.offerProducts[k]?.stock
    //             }
    //         }
    //     }
    //   }
    // Update the productInfo array with stock property from offerProducts
    const updatedProducts = productInfo.map((product) => {
      // Find the offerProducts array that contains the current product's _id
      const offerProduct = offerProducts.find((offerProduct) =>
        offerProduct.offerProducts.find((offer) => {
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

    console.log("updatedProductsupdatedProducts");

    // Print the updated products array
    // res.status(200).json({ success: true, updatedProducts })

    // let modifedArray = [];
    // offerProducts?.map((SingleOffer) => {
    //     SingleOffer?.offerProducts((singleProduct, index) => {

    //     })
    // })

    if (productInfo.length !== 0) {
      res.status(200).json({
        success: true,
        products: updatedProducts,
        message: "All offer products retrieved successfully",
      });
    }
    if (productInfo?.length === 0) {
      return next(new ErrorHandler(404, "No Product Found"));
    }
  }
});
exports.getAllStoresThatHaveOffer = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.userLatitude) {
    return next(new ErrorHandler(400, "please enter user latitude"));
  }
  if (!req.body.userLongitude) {
    return next(new ErrorHandler(400, "please enter user longitude"));
  }
  const { userLatitude, userLongitude } = req.body;
  const today = new Date();
  const stores = await offerModel
    .find(
      { dateTillPromoAvailable: { $gte: new Date() }, isDeleted: false },
      { store: 1 }
    )
    .populate("store");
  if (stores?.length == 0) {
    return next(new ErrorHandler(404, "No store Found"));
  }
  const filterStores = stores?.filter((store) => {
    return store?.offerProducts?.length !== 0;
  });
  const storesWithDistance = filterStores?.map((store) => {
    const storeLat = store.store.location.coordinates[1];
    const storeLng = store.store.location.coordinates[0];

    const distance = geolib.getDistance(
      { latitude: userLatitude, longitude: userLongitude },
      { latitude: storeLat, longitude: storeLng }
    );

    // Add the distance field to the store object
    return Object.assign(store.toObject(), {
      distance: (distance / 1609.34).toFixed(2),
    }); // Convert meters to miles
  });
  res.status(200).json({
    success: true,
    message: "offer stores fetched successfully",
    offerStores: storesWithDistance,
  });
});
exports.getAllStoresThatHaveOffer = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.userLatitude) {
    return next(new ErrorHandler(400, "Please enter user latitude"));
  }
  if (!req.body.userLongitude) {
    return next(new ErrorHandler(400, "Please enter user longitude"));
  }

  const { userLatitude, userLongitude } = req.body;
  const today = new Date();

  const storeIds = await offerModel.distinct("store", {
    dateTillPromoAvailable: { $gte: today },
    isDeleted: false,
  });

  if (storeIds.length === 0) {
    return next(new ErrorHandler(404, "No stores found with offers"));
  }

  // Fetch stores with offers, without a radius limit
  const stores = await storeModel.find({
    _id: { $in: storeIds },
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [parseFloat(userLongitude), parseFloat(userLatitude)],
        },
      },
    },
  });

  const storesWithDistance = stores.map((store) => {
    const storeLat = store.location.coordinates[1];
    const storeLng = store.location.coordinates[0];

    const distance = geolib.getDistance(
      { latitude: userLatitude, longitude: userLongitude },
      { latitude: storeLat, longitude: storeLng }
    );

    // Add the distance field to the store object
    return Object.assign(store.toObject(), {
      distance: (distance / 1609.34).toFixed(2), // Convert meters to miles
    });
  });

  res.status(200).json({
    success: true,
    message: "Offer stores fetched successfully",
    offerStores: storesWithDistance,
  });
});

exports.getAllOfferCategories = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "please enter store Id"));
  }
  const offersCategories = await offerModel.find(
    { store: req.body.store },
    { offerCategory: 1, discountedPercentage: 1, dateTillPromoAvailable: 1 }
  );
  if (offersCategories?.length === 0) {
    return next(new ErrorHandler(404, "No offers found of this store"));
  }
  res.status(200).json({
    success: true,
    message: "Offer categories fetched successfully",
    offersCategories,
  });
});

exports.getAllProductsOFSpecificOfferCategory = asyncErrorCatch(
  async (req, res, next) => {
    if (!req.body.store) {
      return next(new ErrorHandler(400, "please enter store Id"));
    }
    if (!req.body.offerCategory) {
      return next(new ErrorHandler(400, "please enter offer category type"));
    }

    // const offer = await offerModel.findOne({ store: req.body.store, offerCategory: req.body.offerCategory }, { offerProducts: 1 })
    //     .populate({ path: "offerProducts.product", populate: { path: "category" } });
    // const offer = await offerModel.findOne({ store: req.body.store, offerCategory: req.body.offerCategory }, { offerProducts: 1 })
    //     .populate({ path: "offerProducts.product", select: '-isDeleted', populate: { path: "category", select: '-isDeleted' } });

    const offer = await offerModel
      .findOne(
        { store: req.body.store, offerCategory: req.body.offerCategory },
        { offerProducts: 1 }
      )
      .populate({
        path: "offerProducts.product",
        match: { isDeleted: { $ne: true } },
        select: "-isDeleted",
        populate: { path: "category" },
      });

    if (!offer) {
      return next(new ErrorHandler(404, "No Offer Found"));
    }

    console.log(offer, "offer");
    // Filter the offer products based on the search text
    const filteredProducts = offer?.offerProducts.filter((offerProduct) => {
      console.log(offerProduct, "filter");
      const { product } = offerProduct;
      if (product === null) {
        console.log("inside");
        return false;
      }
      return (
        product.productName
          .toLowerCase()
          .includes(req.body.searchText.toLowerCase()) ||
        product.productBarcode
          .toLowerCase()
          .includes(req.body.searchText.toLowerCase())
      );
    });

    // Replace the offer products array with the filtered products
    const filteredOffer = {
      ...offer.toObject(),
      offerProducts: filteredProducts,
    };

    // const offerCategoryProducts=await offerModel.findOne({store:req.body.store,offerCategory:req.body.offerCategory},{offerProducts:1}).populate({path:"offerProducts.product",populate:{path:"category"}})
    // if(offerCategoryProducts===null){
    //     return next(new ErrorHandler(404,"No product found in this category"))
    // }
    res.status(200).json({
      success: true,
      message: "offer category products retrieved successfully",
      offerCategoryProducts: filteredOffer,
    });

    return filteredOffer;
  }
);

exports.removeExpiredOffers = async () => {
  try {
    const currentDate = new Date();

    // Find expired offers
    const expiredOffers = await offerModel.find({
      dateTillPromoAvailable: { $lt: currentDate },
    });
    if (!expiredOffers || expiredOffers.length === 0) {
      console.log("No expired offers found");
      return;
    }

    for (const offer of expiredOffers) {
      console.log(
        `Processing expired offer: ${offer._id} for store: ${offer.store}`
      );

      // Always update the offer products
      if (offer.offerProducts?.length > 0) {
        for (const product of offer.offerProducts) {
          console.log(
            `Reverting product: ${product.product}, Stock to add: ${product.stock}`
          );

          const updateResult = await productModel.updateOne(
            { _id: product.product },
            {
              $inc: { quantity: product.stock },
              $set: {
                isAvailableInOffer: false,
                discountedPrice: 0,
                offPercentage: 0,
                dateTillAvailableInOffer: null,
              },
            }
          );

          console.log(
            `Update result for product ${product.product}:`,
            updateResult
          );
        }
      }

      // Check and update carts for this offer's store
      const carts = await cartModel.find({ store: offer.store });
      if (carts && carts.length > 0) {
        for (const cart of carts) {
          // Revert stock for products in the cart
          for (const orderItem of cart.orderItems) {
            console.log(`Processing cart item: ${orderItem.product}`);

            // Find the matching product in the offer
            const matchingOfferProduct = offer.offerProducts.find(
              (offerProduct) => orderItem.product.equals(offerProduct.product)
            );

            if (matchingOfferProduct) {
              console.log(
                `Reverting cart item stock for product: ${matchingOfferProduct.product}, Quantity: ${orderItem.quantity}`
              );

              // Add the product quantity from the cart back to stock
              await productModel.updateOne(
                { _id: orderItem.product },
                { $inc: { quantity: orderItem.quantity } }
              );
            }
          }

          // Clear the cart and mark as expired
          cart.orderItems = [];
          cart.status = "expired";
          await cart.save();
          console.log(`Cart ${cart._id} marked as expired.`);
        }
      }

      // Update store if no more offers are active
      const allStoreOffers = await offerModel.find({ store: offer.store });
      if (allStoreOffers.length === 0) {
        await storeModel.updateOne(
          { _id: offer.store },
          { isStoreHasOffer: false, offerPercentage: 0 }
        );
        console.log(`Store ${offer.store} updated to remove offer status.`);
      }

      // Delete the expired offer
      await offerModel.deleteOne({
        _id: offer._id,
      });
      console.log(`Offer ${offer._id} deleted.`);
    }

    console.log("Expired offers processed successfully.");
  } catch (err) {
    console.error("Error in removeExpiredOffers:", err);
  }
};
