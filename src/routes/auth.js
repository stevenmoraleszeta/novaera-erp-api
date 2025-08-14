const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/select-company', authController.selectCompany);
router.get('/me', authController.me);
router.post('/logout', authController.logout);
router.post('/register', authController.register);
router.post('/register-company', authController.registerCompany);

module.exports = router;
