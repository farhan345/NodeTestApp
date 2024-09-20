const express = require('express');
const { getAllCountries, getAllStates, addTaxing, viewTaxDataByCountry, deleteTaxData } = require('../controllers/taxManagementController');
const { isAuthenticatedUser, isAuthenticatedAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/all-countries', getAllCountries);
router.post('/all-states', getAllStates);
router.post('/add', isAuthenticatedAdmin, addTaxing);
router.post('/view', isAuthenticatedAdmin, viewTaxDataByCountry);
router.post('/delete', isAuthenticatedAdmin, deleteTaxData);

module.exports = router; 