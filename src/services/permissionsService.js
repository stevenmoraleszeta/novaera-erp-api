const { getClient } = require('../utils/dbHelper');

// Pattern: (args..., schemaName='public', existingClient=null)
exports.getPermissions = async (schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM permissions');
    return result.rows;
  } finally { release(); }
};

exports.createPermission = async ({ table_id, role_id, can_create, can_read, can_update, can_delete }, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_asignar_permisos_rol_sobre_tabla($1, $2, $3, $4, $5, $6) AS message',
      [table_id, role_id, can_create, can_read, can_update, can_delete]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.getRoleTablePermissions = async (table_id, role_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT * FROM sp_obtener_permisos_rol_sobre_tabla($1, $2)',
      [table_id, role_id]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.deleteRoleTablePermissions = async (table_id, role_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_eliminar_permisos_rol_sobre_tabla($1, $2) AS message',
      [table_id, role_id]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.getUsersWithPermissions = async (table_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT * FROM sp_usuarios_con_permisos_en_tabla($1)',
      [table_id]
    );
    return result.rows;
  } finally { release(); }
};

exports.assignMassivePermissions = async (table_id, role_ids, can_create, can_read, can_update, can_delete, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_asignar_permisos_masivos($1, $2, $3, $4, $5, $6)',
      [table_id, role_ids, can_create, can_read, can_update, can_delete]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.deleteAllPermissionsByTable = async (table_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_eliminar_permisos_por_tabla($1)',
      [table_id]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.getPermissionsByRole = async (role_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM obtener_permisos_de_rol($1)', [role_id]);
    return result.rows;
  } finally { release(); }
};

exports.updateRolePermissions = async (role_id, table_id, permissions, schemaName = 'public', existingClient = null) => {
  const { can_create, can_read, can_update, can_delete } = permissions;
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM permissions WHERE role_id = $1 AND table_id = $2', [role_id, table_id]);
    const result = await client.query(
      'INSERT INTO permissions (role_id, table_id, can_create, can_read, can_update, can_delete) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [role_id, table_id, can_create, can_read, can_update, can_delete]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { release(); }
};

exports.bulkUpdateRolePermissions = async (role_id, permissionsMap, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM permissions WHERE role_id = $1', [role_id]);
    for (const [table_id, perms] of Object.entries(permissionsMap)) {
      if (perms.can_create || perms.can_read || perms.can_update || perms.can_delete) {
        await client.query(
          'INSERT INTO permissions (role_id, table_id, can_create, can_read, can_update, can_delete) VALUES ($1, $2, $3, $4, $5, $6)',
          [role_id, table_id, perms.can_create, perms.can_read, perms.can_update, perms.can_delete]
        );
      }
    }
    await client.query('COMMIT');
    return { success: true, message: 'Permisos actualizados correctamente' };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally { release(); }
};

exports.getUserPermissions = async (userId, tableId, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(`
      SELECT 
        p.can_create,
        p.can_read,
        p.can_update,
        p.can_delete
      FROM permissions p
      JOIN user_roles ur ON p.role_id = ur.role_id
      WHERE ur.user_id = $1 AND p.table_id = $2
    `, [userId, tableId]);
    if (result.rows.length === 0) {
      return { can_create: false, can_read: false, can_update: false, can_delete: false };
    }
    return result.rows.reduce((acc, row) => ({
      can_create: acc.can_create || row.can_create,
      can_read: acc.can_read || row.can_read,
      can_update: acc.can_update || row.can_update,
      can_delete: acc.can_delete || row.can_delete
    }), { can_create: false, can_read: false, can_update: false, can_delete: false });
  } finally { release(); }
};

exports.getUserPermissionsForAllTables = async (userId, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(`
      SELECT 
        p.table_id,
        p.can_create,
        p.can_read,
        p.can_update,
        p.can_delete
      FROM permissions p
      JOIN user_roles ur ON p.role_id = ur.role_id
      WHERE ur.user_id = $1
    `, [userId]);
    const permissionsByTable = {};
    result.rows.forEach(row => {
      if (!permissionsByTable[row.table_id]) {
        permissionsByTable[row.table_id] = { can_create: false, can_read: false, can_update: false, can_delete: false };
      }
      permissionsByTable[row.table_id].can_create ||= row.can_create;
      permissionsByTable[row.table_id].can_read ||= row.can_read;
      permissionsByTable[row.table_id].can_update ||= row.can_update;
      permissionsByTable[row.table_id].can_delete ||= row.can_delete;
    });
    return permissionsByTable;
  } finally { release(); }
};

exports.deleteAllPermissionsByRole = async (roleId, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('DELETE FROM permissions WHERE role_id = $1', [roleId]);
    return { message: 'Permisos eliminados correctamente', deletedCount: result.rowCount };
  } finally { release(); }
};