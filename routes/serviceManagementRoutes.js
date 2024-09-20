const express = require('express');
const { addService, viewServiceData, deleteServiceData, getAllstores } = require('../controllers/serviceManagementController');
const { isAuthenticatedAdmin } = require('../middleware/auth');
const router = express.Router();


router.get('/all-stores', isAuthenticatedAdmin, getAllstores);
router.post('/add', isAuthenticatedAdmin, addService);
router.get('/view', isAuthenticatedAdmin, viewServiceData);
router.post('/delete', isAuthenticatedAdmin, deleteServiceData);

module.exports = router; 