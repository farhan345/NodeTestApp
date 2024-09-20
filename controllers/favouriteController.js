const asyncErrorCatch = require("../middleware/asyncErrorHandlers");
const ErrorHandler = require("../utils/errorHandler");
const favouriteModel = require("../models/favourite");
const storeModel = require("../models/store");
const geolib = require("geolib");
exports.addToFavourite = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.store) {
    return next(new ErrorHandler(400, "Please enter store Id"));
  }
  if (!req.body.user) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  const Data = {
    store: req.body.store,
    user: req.body.user,
  };
  const favourite = await favouriteModel.findOne({
    user: req.body.user,
    store: req.body.store,
  });
  if (favourite) {
    favouriteModel.deleteOne(
      { user: req.body.user, store: req.body.store },
      (err, result) => {
        if (err) {
          return next(new ErrorHandler(400, err.message));
        }
        storeModel.updateOne(
          { _id: req.body.store },
          { $set: { isStoreInFavourite: false } },
          (err, result1) => {
            if (err) {
              return next(new ErrorHandler(400, err.message));
            }
            res
              .status(201)
              .json({ success: true, message: "Store removed from favourite" });
          }
        );
      }
    );
  } else {
    favouriteModel.create(Data, (err, result) => {
      if (err) {
        return next(new ErrorHandler(400, err.message));
      }
      storeModel.updateOne(
        { _id: req.body.store },
        { $set: { isStoreInFavourite: true } },
        (err, result1) => {
          if (err) {
            return next(new ErrorHandler(400, err.message));
          }
          res
            .status(201)
            .json({ success: true, message: "Store Addedd in your favourite" });
        }
      );
    });
  }
});

exports.getAllFavouriteStores = asyncErrorCatch(async (req, res, next) => {
  if (!req.body.userLatitude) {
    return next(new ErrorHandler(400, "please enter user latitude"));
  }
  if (!req.body.userLongitude) {
    return next(new ErrorHandler(400, "please enter user longitude"));
  }

  if (!req.body.user) {
    return next(new ErrorHandler(400, "Please enter user Id"));
  }
  const { userLatitude, userLongitude } = req.body;
  const favourite = await favouriteModel
    .find({ user: req.body.user })
    .populate({
      path: "store",
      select: "profile name ratings address location isStoreInFavourite",
    });
  if (!favourite?.length === 0) {
    return next(new ErrorHandler(404, "No store found in the favourite list"));
  }
  console.log(favourite);
  const storesWithDistance = favourite.map((store) => {
    const storeLat = store?.store?.location?.coordinates[1];
    const storeLng = store?.store?.location?.coordinates[0];
    console.log(storeLat, storeLng);
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
    favouriteStores: storesWithDistance,
    message: "All favourite stores retrieved successfully",
  });
});

exports.removeFromFavourite = asyncErrorCatch(async (req, res, next) => {});
