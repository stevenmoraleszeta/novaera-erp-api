const { getClient } = require('../utils/dbHelper');

exports.createView = async ({ table_id, name, sort_by = null, sort_direction = 'asc', position_num }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_crear_vista($1, $2, $3, $4, $5) AS message',[table_id, name, sort_by, sort_direction, position_num]);
    return result.rows[0];
  } finally { release(); }
};

exports.getViewsByTable = async (table_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_obtener_vistas_por_tabla($1)', [table_id]);
    return result.rows;
  } finally { release(); }
};

exports.addColumnToView = async ({ view_id, column_id, visible = true, filter_condition = null, filter_value = null, position_num , width_px}, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_agregar_columnas_a_vista($1, $2, $3, $4, $5, $6, $7) AS message', [view_id, column_id, visible, filter_condition, filter_value, position_num, width_px]);
    return result.rows[0];
  } finally { release(); }
};

exports.getColumnsByView = async (view_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_obtener_columnas_de_vista($1)', [view_id]);
    return result.rows;
  } finally { release(); }
};

exports.deleteView = async (view_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_eliminar_vista($1) AS message', [view_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateView = async ({ id, name, sort_by, sort_direction, position_num }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_vista($1, $2, $3, $4, $5) AS message', [id, name, sort_by, sort_direction, position_num]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateViewColumn = async ({ id, visible, filter_condition, filter_value, position_num, width_px, column_id }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_columna_vista($1, $2, $3, $4, $5, $6, $7) AS message', [id, visible, filter_condition, filter_value, position_num, width_px, column_id]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateViewPosition = async (view_id, newPosition, schemaName='public', existingClient=null) => {
  const cleanRecordId = parseInt(view_id, 10);
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_posicion_vistas($1, $2)', [cleanRecordId, newPosition]);
    return result;
  } finally { release(); }
};

exports.updateViewColumnPosition = async (view_id, newPosition, schemaName='public', existingClient=null) => {
  const cleanRecordId = parseInt(view_id, 10);
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_posicion_view_column($1, $2)', [cleanRecordId, newPosition]);
    return result;
  } finally { release(); }
};

exports.deleteViewColumn = async (id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_eliminar_columna_vista($1) AS message', [id]);
    return result.rows[0];
  } finally { release(); }
};

