const pool = require('../config/db');

exports.getPermissions = async () => {
  const result = await pool.query('SELECT * FROM permissions');
  return result.rows;
};

exports.createPermission = async ({ table_id, role_id, can_create, can_read, can_update, can_delete }) => {
  const result = await pool.query(
    'SELECT sp_asignar_permisos_rol_sobre_tabla($1, $2, $3, $4, $5, $6) AS message',
    [table_id, role_id, can_create, can_read, can_update, can_delete]
  );
  return result.rows[0];
};

exports.getRoleTablePermissions = async (table_id, role_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_permisos_rol_sobre_tabla($1, $2)',
    [table_id, role_id]
  );
  return result.rows[0];
};

exports.deleteRoleTablePermissions = async (table_id, role_id) => {
  const result = await pool.query(
    'SELECT sp_eliminar_permisos_rol_sobre_tabla($1, $2) AS message',
    [table_id, role_id]
  );
  return result.rows[0];
};

exports.getUsersWithPermissions = async (table_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_usuarios_con_permisos_en_tabla($1)',
    [table_id]
  );
  return result.rows;
};

exports.assignMassivePermissions = async (table_id, role_ids, can_create, can_read, can_update, can_delete) => {
  const result = await pool.query(
    'SELECT sp_asignar_permisos_masivos($1, $2, $3, $4, $5, $6)',
    [table_id, role_ids, can_create, can_read, can_update, can_delete]
  );
  return result.rows[0];
};

exports.deleteAllPermissionsByTable = async (table_id) => {
  const result = await pool.query(
    'SELECT sp_eliminar_permisos_por_tabla($1)',
    [table_id]
  );
  return result.rows[0];
};

exports.getPermissionsByRole = async (role_id) => {
  const result = await pool.query('SELECT * FROM obtener_permisos_de_rol($1)', [role_id]);
  return result.rows;
};

// New function to update permissions for a role and table
exports.updateRolePermissions = async (role_id, table_id, permissions) => {
  const { can_create, can_read, can_update, can_delete } = permissions;
  
  // First delete existing permissions for this role and table
  await pool.query('DELETE FROM permissions WHERE role_id = $1 AND table_id = $2', [role_id, table_id]);
  
  // Then insert new permissions
  const result = await pool.query(
    'INSERT INTO permissions (role_id, table_id, can_create, can_read, can_update, can_delete) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [role_id, table_id, can_create, can_read, can_update, can_delete]
  );
  
  return result.rows[0];
};

// New function to bulk update permissions for a role
exports.bulkUpdateRolePermissions = async (role_id, permissionsMap) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Delete all existing permissions for this role
    await client.query('DELETE FROM permissions WHERE role_id = $1', [role_id]);
    
    // Insert new permissions
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
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

exports.getUserPermissions = async (userId, tableId) => {
  try {
    // Todos los usuarios tienen todos los permisos de administrador
    return {
      can_create: true,
      can_read: true,
      can_update: true,
      can_delete: true
    };
  } catch (error) {
    console.error('Error getting user permissions:', error);
    throw error;
  }
};

exports.getUserPermissionsForAllTables = async (userId) => {
  try {
    // Obtener todas las tablas para asignar permisos completos
    const tablesResult = await pool.query('SELECT id FROM tables');
    
    // Todos los usuarios tienen todos los permisos en todas las tablas
    const permissionsByTable = {};
    tablesResult.rows.forEach(row => {
      permissionsByTable[row.id] = {
        can_create: true,
        can_read: true,
        can_update: true,
        can_delete: true
      };
    });
    
    return permissionsByTable;
  } catch (error) {
    console.error('Error getting user permissions for all tables:', error);
    throw error;
  }
};