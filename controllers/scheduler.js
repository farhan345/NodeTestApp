const cron = require('node-cron');
const { removeExpiredOffers } = require('./offerController');

// Schedule the task to run every day at midnight
cron.schedule('0 */6 * * *', async () => {
  console.log("Running scheduled task to remove expired offers...");
  try {
      await removeExpiredOffers();
      console.log("Expired offers removed successfully");
  } catch (err) {
      console.error("Error removing expired offers:", err.message);
  }
});

module.exports = {
  startSchedulers: () => {
      console.log("Schedulers initialized");
  },
};
