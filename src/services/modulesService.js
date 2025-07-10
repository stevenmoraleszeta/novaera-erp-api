const pool = require('../config/db');

exports.createModule = async ({ name, description, icon_url, created_by }) => {
  const result = await pool.query(
    'SELECT sp_crear_modulo($1, $2, $3, $4) AS message',
    [name, description, icon_url, created_by]
  );
  return result.rows[0];
};

exports.getModules = async (order_by) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_modulos($1)',
    [order_by]
  );
  return result.rows;
};

exports.getModuleById = async (id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_modulo_por_id($1)',
    [id]
  );
  return result.rows[0];
};

exports.updateModule = async ({ id, name, description, icon_url, position_num }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_modulo($1, $2, $3, $4, $5) AS message',
    [id, name, description, icon_url, position_num]
  );
  return result.rows[0];
};

exports.deleteModule = async (id, cascada = false) => {
  const result = await pool.query(
    'SELECT sp_eliminar_modulo($1, $2) AS message',
    [id, cascada]
  );
  return result.rows[0];
};

exports.existsTableNameInModule = async (module_id, table_name) => {
  const result = await pool.query(
    'SELECT sp_existe_nombre_tabla_en_modulo($1, $2) AS exists',
    [module_id, table_name]
  );
  return result.rows[0].exists;
};

exports.updateModulePosition = async (module_id, newPosition) => {

  const result = await pool.query(
    'SELECT sp_actualizar_posicion_modulo($1, $2)',
    [module_id, newPosition]
  );
  return result;
};