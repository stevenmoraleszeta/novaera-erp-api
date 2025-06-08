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