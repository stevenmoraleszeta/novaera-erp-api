const pool = require('../config/db');

exports.getRoles = async () => {
  // Retorna solo los campos que existen en la tabla
  const result = await pool.query('SELECT * FROM roles ORDER BY name');
  return result.rows;
};

exports.createRole = async ({ name }) => {
  // Solo acepta nombre, sin descripción
  const result = await pool.query('INSERT INTO roles (name) VALUES ($1) RETURNING *', [name]);
  return result.rows[0];
};

exports.getRoleById = async (id) => {
  // Retorna solo los campos que existen
  const result = await pool.query('SELECT * FROM roles WHERE id = $1', [id]);
  return result.rows[0];
};

exports.updateRole = async (id, { name }) => {
  // Solo actualiza el nombre
  const result = await pool.query('UPDATE roles SET name = $1 WHERE id = $2 RETURNING *', [name, id]);
  return result.rows[0];
};

exports.deleteRole = async (id) => {
  // Eliminación lógica usando el nuevo SP
  const result = await pool.query('SELECT eliminar_rol_logico($1) AS message', [id]);
  return result.rows[0];
};

exports.assignRoleToUser = async (user_id, role_id) => {
  const result = await pool.query('SELECT asignar_rol_a_usuario($1, $2) AS message', [user_id, role_id]);
  return result.rows[0];
};

exports.removeRoleFromUser = async (user_id, role_id) => {
  const result = await pool.query('SELECT eliminar_rol_de_usuario($1, $2) AS message', [user_id, role_id]);
  return result.rows[0];
};

exports.getRolesByUser = async (user_id) => {
  const result = await pool.query('SELECT * FROM obtener_roles_de_usuario($1)', [user_id]);
  return result.rows;
};

exports.setRolePermissions = async (role_id, table_id, can_create, can_read, can_update, can_delete) => {
  const result = await pool.query('SELECT establecer_permisos_rol_tabla($1, $2, $3, $4, $5, $6) AS message', [role_id, table_id, can_create, can_read, can_update, can_delete]);
  return result.rows[0];
};

exports.updateRolePermissions = async (role_id, table_id, can_create, can_read, can_update, can_delete) => {
  const result = await pool.query('SELECT actualizar_permisos_rol_tabla($1, $2, $3, $4, $5, $6) AS message', [role_id, table_id, can_create, can_read, can_update, can_delete]);
  return result.rows[0];
};

exports.getRolePermissions = async (role_id, table_id) => {
  const result = await pool.query('SELECT * FROM obtener_permisos_rol_tabla($1, $2)', [role_id, table_id]);
  return result.rows[0];
};

exports.deleteRolePermissions = async (role_id, table_id) => {
  const result = await pool.query('SELECT eliminar_permisos_rol_tabla($1, $2) AS message', [role_id, table_id]);
  return result.rows[0];
};