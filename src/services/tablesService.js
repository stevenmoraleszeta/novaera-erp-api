const pool = require('../config/db');

exports.createTable = async ({ module_id, name, description }) => {
  const result = await pool.query(
    'SELECT crear_tabla_logica($1, $2, $3) AS message',
    [module_id, name, description]
  );
  return result.rows[0];
};

exports.getTablesByModule = async (module_id) => {
  const result = await pool.query(
    'SELECT * FROM obtener_tablas_por_modulo($1)',
    [module_id]
  );
  return result.rows;
};

exports.getTableById = async (table_id) => {
  const result = await pool.query(
    'SELECT * FROM obtener_tabla_por_id($1)',
    [table_id]
  );
  return result.rows[0];
};

exports.updateTable = async ({ table_id, name, description }) => {
  const result = await pool.query(
    'SELECT actualizar_tabla_logica($1, $2, $3) AS message',
    [table_id, name, description]
  );
  return result.rows[0];
};

exports.deleteTable = async (table_id) => {
  const result = await pool.query(
    'SELECT eliminar_tabla_logica($1) AS message',
    [table_id]
  );
  return result.rows[0];
};

exports.existsTableNameInModule = async (module_id, name) => {
  const result = await pool.query(
    'SELECT validar_nombre_tabla_existente($1, $2) AS exists',
    [module_id, name]
  );
  return result.rows[0].exists;
};