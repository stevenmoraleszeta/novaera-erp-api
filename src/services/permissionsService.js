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