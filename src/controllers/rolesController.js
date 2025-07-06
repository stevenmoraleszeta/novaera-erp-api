const rolesService = require('../services/rolesService');

exports.getRoles = async (req, res) => {
  try {
    const roles = await rolesService.getRoles();
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRole = async (req, res) => {
  try {
    const { name } = req.body;
    const result = await rolesService.createRole({ name });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const { id } = req.params;
    const role = await rolesService.getRoleById(id);
    res.json(role);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const updated = await rolesService.updateRole(id, { name });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await rolesService.deleteRole(id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.assignRoleToUser = async (req, res) => {
  try {
    const { id } = req.params; // role_id
    const { user_id } = req.body;
    const result = await rolesService.assignRoleToUser(user_id, id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.removeRoleFromUser = async (req, res) => {
  try {
    const { id } = req.params; // role_id
    const { user_id } = req.body;
    const result = await rolesService.removeRoleFromUser(user_id, id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRolesByUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const roles = await rolesService.getRolesByUser(user_id);
    res.json(roles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.setRolePermissions = async (req, res) => {
  try {
    const { id } = req.params; // role_id
    const { table_id, can_create, can_read, can_update, can_delete } = req.body;
    const result = await rolesService.setRolePermissions(id, table_id, can_create, can_read, can_update, can_delete);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRolePermissions = async (req, res) => {
  try {
    const { id } = req.params; // role_id
    const { table_id, can_create, can_read, can_update, can_delete } = req.body;
    const result = await rolesService.updateRolePermissions(id, table_id, can_create, can_read, can_update, can_delete);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRolePermissions = async (req, res) => {
  try {
    const { id, table_id } = req.params;
    const permissions = await rolesService.getRolePermissions(id, table_id);
    res.json(permissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRolePermissions = async (req, res) => {
  try {
    const { id, table_id } = req.params;
    const result = await rolesService.deleteRolePermissions(id, table_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};