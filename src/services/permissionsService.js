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
    const result = await pool.query(`
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
      return {
        can_create: false,
        can_read: false,
        can_update: false,
        can_delete: false
      };
    }
    
    // Si el usuario tiene múltiples roles, combinar permisos (OR lógico)
    const combinedPermissions = result.rows.reduce((acc, row) => ({
      can_create: acc.can_create || row.can_create,
      can_read: acc.can_read || row.can_read,
      can_update: acc.can_update || row.can_update,
      can_delete: acc.can_delete || row.can_delete
    }), {
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false
    });
    
    return combinedPermissions;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    throw error;
  }
};

exports.getUserPermissionsForAllTables = async (userId) => {
  try {
    const result = await pool.query(`
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
    
    // Agrupar por table_id y combinar permisos
    const permissionsByTable = {};
    
    result.rows.forEach(row => {
      if (!permissionsByTable[row.table_id]) {
        permissionsByTable[row.table_id] = {
          can_create: false,
          can_read: false,
          can_update: false,
          can_delete: false
        };
      }
      
      // Combinar permisos (OR lógico)
      permissionsByTable[row.table_id].can_create = 
        permissionsByTable[row.table_id].can_create || row.can_create;
      permissionsByTable[row.table_id].can_read = 
        permissionsByTable[row.table_id].can_read || row.can_read;
      permissionsByTable[row.table_id].can_update = 
        permissionsByTable[row.table_id].can_update || row.can_update;
      permissionsByTable[row.table_id].can_delete = 
        permissionsByTable[row.table_id].can_delete || row.can_delete;
    });
    
    return permissionsByTable;
  } catch (error) {
    console.error('Error getting user permissions for all tables:', error);
    throw error;
  }
};