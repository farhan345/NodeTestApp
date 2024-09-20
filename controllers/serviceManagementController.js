// imports
const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const serviceManagementModel = require("../models/serviceManagement");
const storeModel = require("../models/store");
const storeCategoryModel = require('../models/storeCategory');
// methods

// get all stores starts
exports.getAllstores = asyncErrorCatch(async (req, res, next) => {
  try {
    const stores = await storeModel.aggregate([
      {
        $lookup: {
          from: 'storecategories',
          localField: 'storeCategoryType',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $unwind: {
          path: '$categoryInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          storeCategoryType: 1,
          categoryName: '$categoryInfo.storeCategoryName'
        }
      }
    ]);

    if (stores.length === 0) {
      return res.status(400).json({ success: false, message: "No store found" });
    }

    for (let store of stores) {
      const storeCategory = await storeCategoryModel.findById(store.storeCategoryType);
      if (storeCategory) {
        store.categoryName = storeCategory.storeCategoryType;
      }
    }

    res.status(200).json({
      success: true,
      stores,
      message: "All stores fetched successfully"
    });
  } catch (error) {
    next(error);
  }
});
// get all stores ends

// crud starts

// create starts


// exports.addService = asyncErrorCatch(async (req, res, next) => {
//   // Validation starts
//   if (!req?.body?.defaultServiceCharges) {
//     return next(new ErrorHandler(400, "Default service charges cannot be null!"));
//   }
//   if (!req?.body?.storesData || !Array.isArray(req.body.storesData) || req.body.storesData.length === 0) {
//     return next(new ErrorHandler(400, "Invalid data format! 'storesData' array is required with at least one object."));
//   }
//   // Validation ends

//   const defaultServiceCharges = req.body.defaultServiceCharges;
//   const serviceData = req.body.storesData;

//   // Process each service data
//   const promises = serviceData.map(async (item) => {
//     // Validation
//     if (!item.storeId) {
//       throw new ErrorHandler(400, "Store id cannot be null!");
//     }
//     if (item.serviceCharges == null || item.serviceCharges == '') {
//       item.serviceCharges = 0;
//     }

//     const updateData = {
//       "storesData.$.serviceCharges": item.serviceCharges,
//       defaultServiceCharges: defaultServiceCharges,
//     };

//     const existingData = await serviceManagementModel.findOneAndUpdate(
//       { "storesData.storeId": item.storeId },
//       { $set: updateData },
//       { new: true }
//     );

//     // If no existing document, add a new entry
//     if (!existingData) {
//       const newEntry = await serviceManagementModel.findOneAndUpdate(
//         { defaultServiceCharges: defaultServiceCharges },
//         { $push: { storesData: item } },
//         { new: true, upsert: true }
//       );
//       return newEntry;
//     }

//     return existingData;
//   });

//   Promise.all(promises)
//     .then((results) => {
//       return res.status(200).json({
//         success: true,
//         message: "Data updated/added successfully",
//         data: results,
//       });
//     })
//     .catch((error) => {
//       return next(error);
//     });
// });



exports.addService = asyncErrorCatch(async (req, res, next) => {
  // Validation starts
  if (!req?.body?.defaultServiceCharges) {
    return next(new ErrorHandler(400, "Default service charges cannot be null!"));
  }
  if (!req?.body?.storesData || !Array.isArray(req.body.storesData) || req.body.storesData.length === 0) {
    return next(new ErrorHandler(400, "Invalid data format! 'storesData' array is required with at least one object."));
  }
  // Validation ends

  const defaultServiceCharges = req.body.defaultServiceCharges;
  const serviceData = req.body.storesData;

  try {
    // Fetch the existing document
    let existingDocument = await serviceManagementModel.findOne();

    if (!existingDocument) {
      // Create a new document if it doesn't exist
      existingDocument = new serviceManagementModel({
        storesData: [],
        defaultServiceCharges: defaultServiceCharges,
      });
    } else {
      // Update the defaultServiceCharges
      existingDocument.defaultServiceCharges = defaultServiceCharges;
    }

    // Update or add storesData
    serviceData.forEach((newStoreData) => {
      const existingStoreIndex = existingDocument.storesData.findIndex(
        (store) => store.storeId === newStoreData.storeId
      );

      if (existingStoreIndex !== -1) {
        // Update existing store's serviceCharges
        existingDocument.storesData[existingStoreIndex].serviceCharges = newStoreData.serviceCharges;
      } else {
        // Add new store data
        existingDocument.storesData.push(newStoreData);
      }
    });

    // Save the document
    const updatedDocument = await existingDocument.save();

    return res.status(200).json({
      success: true,
      message: "Data updated/added successfully",
      data: updatedDocument,
    });
  } catch (error) {
    return next(error);
  }
});



// create ends

// view starts
exports.viewServiceData = asyncErrorCatch(async (req, res, next) => {
  const serviceData = await serviceManagementModel.find();

  if (!serviceData || serviceData.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No service data found against the stores.",
      data: [],
    });
  }else{
    return res.status(200).json({
      success: true,
      message: "Service data retrieved successfully!",
      data: serviceData
      // defaultServiceCharges: defaultServiceCharges
    });
  }
});
// view ends

// delete starts
exports.deleteServiceData = asyncErrorCatch(async (req, res, next) => {
  // debugger;
  // validation starts
  if (!req?.body?.storeId) {
    return next(new ErrorHandler(200, "store id is required!"));
  }
  // validation ends

  const id = req?.body?.storeId;

  // Find and delete service data for the specific store
  const deletedData = await serviceManagementModel.deleteOne({ storeId: id });

  if (deletedData.deletedCount === 0) {
    return res.status(200).json({
      success: false,
      message: "No service data found for the specified store.",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Service data deleted successfully",
  });
});
// delete ends

// crud ends


