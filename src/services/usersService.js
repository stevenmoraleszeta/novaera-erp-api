const pool = require('../config/db');

exports.getUsers = async () => {
  // Query that joins users with their roles
  const result = await pool.query(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.is_active,
      u.is_blocked,
      u.last_login,
      u.avatar_url,
      r.name as role_name,
      r.id as role_id
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    ORDER BY u.id
  `);
  
  // Group users by id and collect their roles
  const usersMap = new Map();
  
  result.rows.forEach(row => {
    if (!usersMap.has(row.id)) {
      usersMap.set(row.id, {
        id: row.id,
        name: row.name,
        email: row.email,
        is_active: row.is_active,
        is_blocked: row.is_blocked,
        last_login: row.last_login,
        avatar_url: row.avatar_url,
        roles: []
      });
    }
    
    // Add role if it exists
    if (row.role_name) {
      usersMap.get(row.id).roles.push({
        id: row.role_id,
        name: row.role_name
      });
    }
  });
  
  // Convert map to array and add primary role
  const users = Array.from(usersMap.values()).map(user => ({
    ...user,
    role: user.roles.length > 0 ? user.roles[0].name : 'Sin rol'
  }));
  
  return users;
};

exports.createUser = async ({ name, email, password_hash }) => {
  const result = await pool.query(
    'SELECT sp_registrar_usuario($1, $2, $3) AS message',
    [name, email, password_hash]
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

exports.getUserRoles = async (userId) => {
  const result = await pool.query(`
    SELECT r.name 
    FROM roles r 
    JOIN user_roles ur ON r.id = ur.role_id 
    WHERE ur.user_id = $1
  `, [userId]);
  return result.rows.map(row => row.name);
};

exports.getUserRolesWithDetails = async (userId) => {
  const result = await pool.query(`
    SELECT r.id, r.name, r.is_admin, r.active
    FROM roles r 
    JOIN user_roles ur ON r.id = ur.role_id 
    WHERE ur.user_id = $1 AND r.active = true
  `, [userId]);
  return result.rows;
};

exports.getUserById = async (id) => {
  // Query that joins user with their roles
  const result = await pool.query(`
    SELECT 
      u.id,
      u.name,
      u.email,
      u.is_active,
      u.is_blocked,
      u.last_login,
      u.avatar_url,
      r.name as role_name,
      r.id as role_id
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.id = $1
  `, [id]);
  
  if (result.rows.length === 0) {
    return null;
  }
  
  // Group roles
  const user = {
    id: result.rows[0].id,
    name: result.rows[0].name,
    email: result.rows[0].email,
    is_active: result.rows[0].is_active,
    is_blocked: result.rows[0].is_blocked,
    last_login: result.rows[0].last_login,
    avatar_url: result.rows[0].avatar_url,
    roles: []
  };
  
  // Add roles if they exist
  result.rows.forEach(row => {
    if (row.role_name && row.role_id) {
      user.roles.push({
        id: row.role_id,
        name: row.role_name
      });
    }
  });
  
  // Add primary role
  user.role = user.roles.length > 0 ? user.roles[0].name : 'Sin rol';
  
  return user;
};

exports.getUserWithRoles = async (email) => {
  const user = await exports.getUserByEmail(email);
  if (!user) return null;
  
  // Obtener roles con detalles completos (incluyendo is_admin)
  const rolesWithDetails = await exports.getUserRolesWithDetails(user.id);
  // Mantener compatibilidad: roles como array de nombres
  const roleNames = rolesWithDetails.map(r => r.name);
  
  return {
    ...user,
    roles: roleNames, // Para compatibilidad con código existente
    rolesWithDetails: rolesWithDetails // Roles completos con is_admin
  };
};