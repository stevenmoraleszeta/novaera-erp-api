// Crear una nueva tabla vacía relacionada con original_table_id
exports.createRelatedTable = async ({ name, description = '', module_id = null, original_table_id, position_num = 0 }) => {
  // Inserta en la tabla 'tables' los campos básicos
  const result = await pool.query(
    `INSERT INTO tables (name, description, module_id, original_table_id, position_num)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, description, module_id, original_table_id, position_num]
  );
  const newTable = result.rows[0];

  // Crear columna 'Nombre' de tipo texto en la nueva tabla
  await exports.createColumn({
    table_id: newTable.id,
    name: 'Nombre',
    data_type: 'text',
    is_required: true,
    is_foreign_key: false,
    foreign_table_id: null,
    foreign_column_name: null,
    column_position: 0,
    relation_type: null,
    validations: null, 
    is_unique: false,
  });
  return newTable;
};
const pool = require('../config/db');

exports.getColumns = async () => {
  const result = await pool.query('SELECT * FROM columns');
  return result.rows;
};


exports.createColumn = async ({ table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations, is_unique }) => {
  const result = await pool.query(
    'SELECT * FROM sp_crear_columna($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)',
    [table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations, is_unique]
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

exports.updateColumn = async ({ column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations, is_unique }) => {
  const result = await pool.query(
    'SELECT sp_actualizar_columna($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) AS message',
    [column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations, is_unique]
  );
  return result.rows[0];
};

exports.renameColumnKeyInRecords = async ({ tableId, oldKey, newKey }) => {
  await pool.query(
    `UPDATE records
    SET record_data = record_data - $1 || jsonb_build_object($2::text, record_data->$1)
    WHERE table_id = $3 AND record_data ? $1`,
    [oldKey, newKey, tableId]
  );
};


exports.addFieldToAllRecords = async ({ tableId, columnName, defaultValue }) => {
  console.log("adding info to records:", tableId, columnName, defaultValue);

  const safeValue = defaultValue === undefined ? null : defaultValue;

  await pool.query(
    `UPDATE records
     SET record_data = jsonb_set(
       COALESCE(record_data, '{}'::jsonb),
       $1::text[],
       to_jsonb($2::text),
       true
     )
     WHERE table_id = $3
       AND NOT (COALESCE(record_data, '{}'::jsonb) ? $4);`,
    [[columnName], String(safeValue), tableId, columnName]
  );
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

  const result = await pool.query(
    'SELECT sp_actualizar_posicion_columna($1, $2)',
    [column_id, newPosition]
  );
  return result;
};