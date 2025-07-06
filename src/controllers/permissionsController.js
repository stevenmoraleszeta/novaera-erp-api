const permissionsService = require('../services/permissionsService');

exports.getPermissions = async (req, res) => {
  try {
    const permissions = await permissionsService.getPermissions();
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createPermission = async (req, res) => {
  try {
    const { table_id, role_id, can_create, can_read, can_update, can_delete } = req.body;
    const result = await permissionsService.createPermission({ table_id, role_id, can_create, can_read, can_update, can_delete });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoleTablePermissions = async (req, res) => {
  try {
    const { role_id, table_id } = req.params;
    const permissions = await permissionsService.getRoleTablePermissions(table_id, role_id);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRoleTablePermissions = async (req, res) => {
  try {
    const { role_id, table_id } = req.params;
    const result = await permissionsService.deleteRoleTablePermissions(table_id, role_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUsersWithPermissions = async (req, res) => {
  try {
    const { table_id } = req.params;
    const users = await permissionsService.getUsersWithPermissions(table_id);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignMassivePermissions = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { role_ids, can_create, can_read, can_update, can_delete } = req.body;
    const result = await permissionsService.assignMassivePermissions(table_id, role_ids, can_create, can_read, can_update, can_delete);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllPermissionsByTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const result = await permissionsService.deleteAllPermissionsByTable(table_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getPermissionsByRole = async (req, res) => {
  try {
    const { role_id } = req.params;
    const permissions = await permissionsService.getPermissionsByRole(role_id);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// New endpoint to update permissions for a role and table
exports.updateRolePermissions = async (req, res) => {
  try {
    const { role_id, table_id } = req.params;
    const permissions = req.body;
    const result = await permissionsService.updateRolePermissions(role_id, table_id, permissions);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// New endpoint to bulk update permissions for a role
exports.bulkUpdateRolePermissions = async (req, res) => {
  try {
    const { role_id } = req.params;
    const { permissions } = req.body;
    const result = await permissionsService.bulkUpdateRolePermissions(role_id, permissions);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserPermissions = async (req, res) => {
  try {
    const { userId, tableId } = req.params;
    const permissions = await permissionsService.getUserPermissions(userId, tableId);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUserPermissionsForAllTables = async (req, res) => {
  try {
    const { userId } = req.params;
    const permissions = await permissionsService.getUserPermissionsForAllTables(userId);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyPermissions = async (req, res) => {
  try {
    const userId = req.user?.id; // Desde el middleware de autenticación
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const { tableId } = req.params;
    const permissions = await permissionsService.getUserPermissions(userId, tableId);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMyPermissionsForAllTables = async (req, res) => {
  try {
    const userId = req.user?.id; // Desde el middleware de autenticación
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    const permissions = await permissionsService.getUserPermissionsForAllTables(userId);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteAllPermissionsByRole = async (req, res) => {
  try {
    const { roleId } = req.params;
    const result = await pool.query('DELETE FROM permissions WHERE role_id = $1', [roleId]);
    res.json({ message: 'Permisos eliminados correctamente', deletedCount: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};