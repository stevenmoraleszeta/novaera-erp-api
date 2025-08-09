const { getClient } = require('../utils/dbHelper');

exports.createRelatedTable = async ({ name, description = '', module_id = null, original_table_id, position_num = 0 }, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  let localTx = false;
  try {
    if (!existingClient) { await client.query('BEGIN'); localTx = true; }
    const result = await client.query('INSERT INTO tables (name, description, module_id, original_table_id, position_num) VALUES ($1, $2, $3, $4, $5) RETURNING *', [name, description, module_id, original_table_id, position_num]);
    const newTable = result.rows[0];
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
      validations: null
    }, schemaName, client);
    if (localTx) await client.query('COMMIT');
    return newTable;
  } catch (e) {
    if (localTx) await client.query('ROLLBACK');
    throw e;
  } finally { release(); }
};

exports.getColumns = async (schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM columns');
    return result.rows;
  } finally { release(); }
};

exports.createColumn = async ({ table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations }, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_crear_columna($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)', [table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations]);
    return result.rows[0];
  } finally { release(); }
};

exports.getColumnsByTable = async (table_id, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_obtener_columnas_por_tabla($1)', [table_id]);
    return result.rows;
  } finally { release(); }
};

exports.getColumnById = async (column_id, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_obtener_columna_por_id($1)', [column_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateColumn = async ({ column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations }, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_columna($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) AS message', [column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations]);
    return result.rows[0];
  } finally { release(); }
};

exports.renameColumnKeyInRecords = async ({ tableId, oldKey, newKey }, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    await client.query(`UPDATE records SET record_data = record_data - $1 || jsonb_build_object($2::text, record_data->$1) WHERE table_id = $3 AND record_data ? $1`, [oldKey, newKey, tableId]);
  } finally { release(); }
};

exports.addFieldToAllRecords = async ({ tableId, columnName, defaultValue }, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  const safeValue = defaultValue === undefined ? null : defaultValue;
  try {
    await client.query(`UPDATE records SET record_data = jsonb_set( COALESCE(record_data, '{}'::jsonb), $1::text[], to_jsonb($2::text), true ) WHERE table_id = $3 AND NOT (COALESCE(record_data, '{}'::jsonb) ? $4);`, [[columnName], String(safeValue), tableId, columnName]);
  } finally { release(); }
};

exports.deleteColumn = async (column_id, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_eliminar_columna($1) AS message', [column_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.existsColumnNameInTable = async (table_id, name, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_existe_nombre_columna_en_tabla($1, $2) AS exists', [table_id, name]);
    return result.rows[0].exists;
  } finally { release(); }
};

exports.columnHasRecords = async (column_id, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_columna_tiene_registros_asociados($1) AS hasRecords', [column_id]);
    return result.rows[0].hasrecords;
  } finally { release(); }
};

exports.updateColumnPosition = async (column_id, newPosition, schemaName = 'public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_posicion_columna($1, $2)', [column_id, newPosition]);
    return result;
  } finally { release(); }
};