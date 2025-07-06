const express = require('express');
const router = express.Router();
const permissionsController = require('../controllers/permissionsController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/', permissionsController.getPermissions);
router.post('/', permissionsController.createPermission);
router.get('/role/:role_id/table/:table_id', permissionsController.getRoleTablePermissions);
router.delete('/role/:role_id/table/:table_id', permissionsController.deleteRoleTablePermissions);
router.get('/table/:table_id/users', permissionsController.getUsersWithPermissions);
router.post('/table/:table_id/roles', permissionsController.assignMassivePermissions);
router.delete('/table/:table_id', permissionsController.deleteAllPermissionsByTable);
router.get('/role/:role_id', permissionsController.getPermissionsByRole);

// New routes for bulk permission updates
router.put('/role/:role_id/table/:table_id', permissionsController.updateRolePermissions);
router.post('/role/:role_id/bulk', permissionsController.bulkUpdateRolePermissions);

// Nuevas rutas para verificar permisos de usuario
router.get('/user/:userId/table/:tableId', permissionsController.getUserPermissions);
router.get('/user/:userId/all-tables', permissionsController.getUserPermissionsForAllTables);

// Rutas para permisos del usuario actual (autenticado)
router.get('/my-permissions/table/:tableId', authMiddleware, permissionsController.getMyPermissions);
router.get('/my-permissions/all-tables', authMiddleware, permissionsController.getMyPermissionsForAllTables);

module.exports = router;