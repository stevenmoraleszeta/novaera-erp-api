const pool = require('../config/db');
const { getClient } = require('../utils/dbHelper');

exports.getRoles = async (schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM roles WHERE active = true ORDER BY name');
    return result.rows;
  } finally { release(); }
};

exports.createRole = async ({ name }, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'INSERT INTO roles (name, active) VALUES ($1, true) RETURNING *',
      [name]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.getRoleById = async (id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM roles WHERE id = $1 AND active = true', [id]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateRole = async (id, { name }, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'UPDATE roles SET name = $1 WHERE id = $2 AND active = true RETURNING *',
      [name, id]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.deleteRole = async (id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'UPDATE roles SET active = false WHERE id = $1 AND active = true RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      throw new Error('Rol no encontrado o ya está inactivo');
    }
    return { message: 'Rol eliminado correctamente', role: result.rows[0] };
  } finally { release(); }
};

exports.assignRoleToUser = async (user_id, role_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT asignar_rol_a_usuario($1, $2) AS message', [user_id, role_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.removeRoleFromUser = async (user_id, role_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT eliminar_rol_de_usuario($1, $2) AS message', [user_id, role_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.getRolesByUser = async (user_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT r.* FROM roles r INNER JOIN user_roles ur ON r.id = ur.role_id WHERE ur.user_id = $1 AND r.active = true ORDER BY r.name',
      [user_id]
    );
    return result.rows;
  } finally { release(); }
};

exports.setRolePermissions = async (role_id, table_id, can_create, can_read, can_update, can_delete, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT establecer_permisos_rol_tabla($1, $2, $3, $4, $5, $6) AS message', [role_id, table_id, can_create, can_read, can_update, can_delete]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateRolePermissions = async (role_id, table_id, can_create, can_read, can_update, can_delete, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT actualizar_permisos_rol_tabla($1, $2, $3, $4, $5, $6) AS message', [role_id, table_id, can_create, can_read, can_update, can_delete]);
    return result.rows[0];
  } finally { release(); }
};

exports.getRolePermissions = async (role_id, table_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM obtener_permisos_rol_tabla($1, $2)', [role_id, table_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.deleteRolePermissions = async (role_id, table_id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT eliminar_permisos_rol_tabla($1, $2) AS message', [role_id, table_id]);
    return result.rows[0];
  } finally { release(); }
};