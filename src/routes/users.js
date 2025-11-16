const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');

router.get('/', usersController.getUsers);
router.get('/exists/email', usersController.existsByEmail);
router.get('/:id', usersController.getUserById);
router.post('/', usersController.createUser);
router.put('/:id', usersController.updateUser);
router.put('/:id/password', usersController.updatePassword);
router.delete('/:id', usersController.deleteUser);
router.put('/:id/block', usersController.blockUser);
router.put('/:id/unblock', usersController.unblockUser);
router.put('/:id/active', usersController.setActiveStatus);
router.put('/:id/reset-password', usersController.resetPasswordAdmin);
router.put('/:id/avatar', usersController.setAvatar);

module.exports = router;