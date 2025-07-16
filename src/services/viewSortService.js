const pool = require('../config/db');

// Crear un ordenamiento para una vista
exports.createViewSort = async ({ view_id, column_id, direction }) => {
  const result = await pool.query(
    'SELECT * FROM sp_crear_view_sort($1, $2, $3)',
    [view_id, column_id, direction]
  );

  return result.rows[0];
};

// Obtener todos los ordenamientos de una vista
exports.getViewSortsByViewId = async (view_id) => {
  const result = await pool.query(
    'SELECT * FROM sp_obtener_view_sorts($1)',
    [view_id]
  );
  return result.rows;
};

// Actualizar un ordenamiento (columna o dirección)
exports.updateViewSort = async ({ id, column_id, direction }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_view_sort($1, $2, $3) AS message',
    [id, column_id, direction]
  );
  return result.rows[0];
};

// Eliminar un ordenamiento
exports.deleteViewSort = async (id) => {
  const result = await pool.query(
    'SELECT sp_eliminar_view_sort($1) AS message',
    [id]
  );
  return result.rows[0];
};

// Reordenar prioridad (posición) del ordenamiento
exports.updateViewSortPosition = async ({ id, newPosition }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_posicion_view_sort($1, $2) AS message',
    [id, newPosition]
  );
  return result.rows[0];
};
