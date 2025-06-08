const pool = require('../config/db');

exports.getUsers = async () => {
  const result = await pool.query('SELECT * FROM users');
  return result.rows;
};

exports.createUser = async ({ name, email, password_hash, is_active, is_blocked, avatar_url }) => {
  const result = await pool.query(
    'SELECT * FROM sp_create_user($1, $2, $3, $4, $5, $6)',
    [name, email, password_hash, is_active, is_blocked, avatar_url]
  );
  return result.rows[0];
};

exports.updateUser = async ({ id, name, email }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_usuario($1, $2, $3) AS message',
    [id, name, email]
  );
  return result.rows[0];
};

exports.updatePassword = async ({ id, password_hash }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_contrasena($1, $2) AS message',
    [id, password_hash]
  );
  return result.rows[0];
};

exports.deleteUser = async (id, tipo) => {
  const result = await pool.query(
    'SELECT sp_eliminar_usuario($1, $2) AS message',
    [id, tipo]
  );
  return result.rows[0];
};

exports.blockUser = async (id) => {
  const result = await pool.query(
    'SELECT sp_bloquear_usuario($1) AS message',
    [id]
  );
  return result.rows[0];
};

exports.unblockUser = async (id) => {
  const result = await pool.query(
    'SELECT sp_desbloquear_usuario($1) AS message',
    [id]
  );
  return result.rows[0];
};

exports.setActiveStatus = async (id, activo) => {
  const result = await pool.query(
    'SELECT sp_actualizar_estado_activo($1, $2) AS message',
    [id, activo]
  );
  return result.rows[0];
};

exports.resetPasswordAdmin = async (id, password_hash) => {
  const result = await pool.query(
    'SELECT sp_reiniciar_contrasena_admin($1, $2) AS message',
    [id, password_hash]
  );
  return result.rows[0];
};

exports.existsByEmail = async (email) => {
  const result = await pool.query(
    'SELECT sp_existe_usuario_por_email($1) AS exists',
    [email]
  );
  return result.rows[0].exists;
};

exports.setAvatar = async (id, avatar_url) => {
  const result = await pool.query(
    'SELECT sp_asignar_avatar_usuario($1, $2) AS message',
    [id, avatar_url]
  );
  return result.rows[0];
};

exports.getUserByEmail = async (email) => {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
};