const express = require('express');
const router = express.Router();
const rolesController = require('../controllers/rolesController');

router.get('/', rolesController.getRoles);
router.post('/', rolesController.createRole);
router.get('/:id', rolesController.getRoleById);
router.post('/:id/assign', rolesController.assignRoleToUser);
router.delete('/:id/remove', rolesController.removeRoleFromUser);
router.get('/user/:user_id', rolesController.getRolesByUser);
router.post('/:id/permissions', rolesController.setRolePermissions);
router.put('/:id/permissions', rolesController.updateRolePermissions);
router.get('/:id/permissions/:table_id', rolesController.getRolePermissions);
router.delete('/:id/permissions/:table_id', rolesController.deleteRolePermissions);

module.exports = router;