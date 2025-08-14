const pool = require('../config/db');
const bcrypt = require('bcryptjs');

exports.getUsers = async (schemaName = 'public') => {
  // Query that joins users with their roles using dynamic schema
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
    FROM ${schemaName}.users u
    LEFT JOIN ${schemaName}.user_roles ur ON u.id = ur.user_id
    LEFT JOIN ${schemaName}.roles r ON ur.role_id = r.id
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

// Crea el usuario tanto en public (global) como en el schema específico de la empresa
exports.createUser = async ({ name, email, password, password_hash }, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let publicCreated = false;
    // Asegurar hash (si llega password plano, lo convertimos)
    let finalHash = password_hash;
    if (!finalHash) {
      if (!password) throw new Error('Password requerido');
      finalHash = await bcrypt.hash(password, 10);
    }
    // 1. Crear (o asegurar) usuario en public si el schema objetivo no es public
    if (schemaName !== 'public') {
      try {
        await client.query(`SET search_path TO public`);
        const pubRes = await client.query('SELECT sp_registrar_usuario($1, $2, $3) AS message', [name, email, finalHash]);
        publicCreated = true;
      } catch (err) {
        // Si ya existe en public ignoramos error de duplicado
        if (!(err.code === '23505')) { // 23505 unique_violation
          throw err;
        }
      }
    }

    // 2. Crear usuario en schema de la empresa (o public si es el mismo)
    await client.query(`SET search_path TO ${schemaName}, public`);
    const companyRes = await client.query('SELECT sp_registrar_usuario($1, $2, $3) AS message', [name, email, finalHash]);

    await client.query('COMMIT');
    return { ...companyRes.rows[0], public_synced: schemaName === 'public' ? true : publicCreated };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Sincronizar actualización (nombre, email) en public y schema
exports.updateUser = async ({ id, name, email }, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_actualizar_usuario($1, $2, $3) AS message', [id, name, email]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_actualizar_usuario($1, $2, $3) AS message', [id, name, email]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Sincronizar cambio de password
exports.updatePassword = async ({ id, password_hash, password }, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let finalHash = password_hash;
    if (!finalHash) {
      if (!password) throw new Error('Password requerido');
      finalHash = await bcrypt.hash(password, 10);
    }
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_actualizar_contrasena($1, $2) AS message', [id, finalHash]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_actualizar_contrasena($1, $2) AS message', [id, finalHash]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Sincronizar eliminación (lógica/física) en ambos (usa mismo stored proc)
exports.deleteUser = async (id, tipo = 'fisica', schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_eliminar_usuario($1, $2) AS message', [id, tipo]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_eliminar_usuario($1, $2) AS message', [id, tipo]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};
// Sincronizar bloqueo
exports.blockUser = async (id, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_bloquear_usuario($1) AS message', [id]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_bloquear_usuario($1) AS message', [id]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Sincronizar desbloqueo
exports.unblockUser = async (id, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_desbloquear_usuario($1) AS message', [id]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_desbloquear_usuario($1) AS message', [id]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Sincronizar estado activo
exports.setActiveStatus = async (id, activo, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_actualizar_estado_activo($1, $2) AS message', [id, activo]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_actualizar_estado_activo($1, $2) AS message', [id, activo]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

// Sincronizar reset password (admin)
exports.resetPasswordAdmin = async (id, password_hash, schemaName = 'public') => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    let finalHash = password_hash;
    if (!finalHash) throw new Error('Password hash requerido');
    if (schemaName !== 'public') {
      await client.query('SET search_path TO public');
      await client.query('SELECT sp_reiniciar_contrasena_admin($1, $2) AS message', [id, finalHash]);
    }
    await client.query(`SET search_path TO ${schemaName}, public`);
    const res = await client.query('SELECT sp_reiniciar_contrasena_admin($1, $2) AS message', [id, finalHash]);
    await client.query('COMMIT');
    return res.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
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

exports.getUserWithRoles = async (email) => {
  const user = await exports.getUserByEmail(email);
  if (!user) return null;
  
  const roles = await exports.getUserRoles(user.id);
  return {
    ...user,
    roles
  };
};