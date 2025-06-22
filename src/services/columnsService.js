const pool = require('../config/db');

exports.getColumns = async () => {
  const result = await pool.query('SELECT * FROM columns');
  return result.rows;
};

exports.createColumn = async ({ table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position }) => {
  const result = await pool.query(
    'SELECT sp_crear_columna($1, $2, $3, $4, $5, $6, $7, $8) AS message',
    [table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position]
  );
  return result.rows[0];
};


exports.getColumnsByTable = async (table_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_columnas_por_tabla($1)',
    [table_id]
  );
  return result.rows;
};

exports.getColumnById = async (column_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_columna_por_id($1)',
    [column_id]
  );
  return result.rows[0];
};

exports.updateColumn = async ({ column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_columna($1, $2, $3, $4, $5, $6, $7, $8) AS message',
    [column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position]
  );
  return result.rows[0];
};

exports.deleteColumn = async (column_id) => {
  const result = await pool.query(
    'SELECT sp_eliminar_columna($1) AS message',
    [column_id]
  );
  return result.rows[0];
};

exports.existsColumnNameInTable = async (table_id, name) => {
  const result = await pool.query(
    'SELECT sp_existe_nombre_columna_en_tabla($1, $2) AS exists',
    [table_id, name]
  );
  return result.rows[0].exists;
};

exports.columnHasRecords = async (column_id) => {
  const result = await pool.query(
    'SELECT sp_columna_tiene_registros_asociados($1) AS hasRecords',
    [column_id]
  );
  return result.rows[0].hasrecords;
};


exports.updateColumnPosition = async (column_id, newPosition) => {
  console.log("sadasdasdsdasd")
  const result = await pool.query(
    'SELECT sp_actualizar_posicion_columna($1, $2)',
    [column_id, newPosition]
  );
  return result;
};