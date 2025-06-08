const pool = require('../config/db');

exports.createRecord = async ({ table_id, record_data }) => {
  const result = await pool.query(
    'SELECT insertar_registro_dinamico($1, $2) AS message',
    [table_id, record_data]
  );
  return result.rows[0];
};

exports.getRecordsByTable = async (table_id) => {
  const result = await pool.query(
    'SELECT * FROM obtener_registros_por_tabla($1)',
    [table_id]
  );
  return result.rows;
};

exports.getRecordById = async (record_id) => {
  const result = await pool.query(
    'SELECT * FROM obtener_registro_por_id($1)',
    [record_id]
  );
  return result.rows[0];
};

exports.updateRecord = async ({ record_id, record_data }) => {
  const result = await pool.query(
    'SELECT actualizar_registro_dinamico($1, $2) AS message',
    [record_id, record_data]
  );
  return result.rows[0];
};

exports.deleteRecord = async (record_id) => {
  const result = await pool.query(
    'SELECT eliminar_registro_dinamico($1) AS message',
    [record_id]
  );
  return result.rows[0];
};

exports.searchRecordsByValue = async (table_id, value) => {
  const result = await pool.query(
    'SELECT * FROM buscar_registros_por_valor($1, $2)',
    [table_id, value]
  );
  return result.rows;
};

exports.countRecordsByTable = async (table_id) => {
  const result = await pool.query(
    'SELECT contar_registros_por_tabla($1) AS count',
    [table_id]
  );
  return result.rows[0].count;
};

exports.existsFieldInRecords = async (table_id, field_name) => {
  const result = await pool.query(
    'SELECT existe_campo_en_registros($1, $2) AS exists',
    [table_id, field_name]
  );
  return result.rows[0].exists;
};