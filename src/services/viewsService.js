const pool = require('../config/db');

exports.createView = async ({ table_id, name, sort_by = null, sort_direction = 'asc' }) => {
  const result = await pool.query(
    'SELECT sp_crear_vista($1, $2, $3, $4) AS message',
    [table_id, name, sort_by, sort_direction]
  );
  return result.rows[0];
};

exports.getViewsByTable = async (table_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_vistas_por_tabla($1)',
    [table_id]
  );
  return result.rows;
};

exports.addColumnToView = async ({ view_id, column_id, visible = true, filter_condition = null, filter_value = null }) => {
  const result = await pool.query(
    'SELECT sp_agregar_columnas_a_vista($1, $2, $3, $4, $5) AS message',
    [view_id, column_id, visible, filter_condition, filter_value]
  );
  return result.rows[0];
};

exports.getColumnsByView = async (view_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_columnas_de_vista($1)',
    [view_id]
  );
  return result.rows;
};

exports.deleteView = async (view_id) => {
  const result = await pool.query(
    'SELECT sp_eliminar_vista($1) AS message',
    [view_id]
  );
  return result.rows[0];
};

exports.updateView = async ({ id, name, sort_by, sort_direction }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_vista($1, $2, $3, $4) AS message',
    [id, name, sort_by, sort_direction]
  );
  return result.rows[0];
};

exports.updateViewColumn = async ({ id, visible, filter_condition, filter_value }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_columna_vista($1, $2, $3, $4) AS message',
    [id, visible, filter_condition, filter_value]
  );
  return result.rows[0];
};