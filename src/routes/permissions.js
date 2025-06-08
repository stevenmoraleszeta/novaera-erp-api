const express = require('express');
const router = express.Router();
const permissionsController = require('../controllers/permissionsController');

router.get('/', permissionsController.getPermissions);
router.post('/', permissionsController.createPermission);
router.get('/role/:role_id/table/:table_id', permissionsController.getRoleTablePermissions);
router.delete('/role/:role_id/table/:table_id', permissionsController.deleteRoleTablePermissions);
router.get('/table/:table_id/users', permissionsController.getUsersWithPermissions);
router.post('/table/:table_id/roles', permissionsController.assignMassivePermissions);
router.delete('/table/:table_id', permissionsController.deleteAllPermissionsByTable);

module.exports = router;