const { getClient } = require('../utils/dbHelper');

exports.createViewSort = async ({ view_id, column_id, direction }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_crear_view_sort($1, $2, $3)', [view_id, column_id, direction]);
    return result.rows[0];
  } finally { release(); }
};

exports.getViewSortsByViewId = async (view_id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT * FROM sp_obtener_view_sorts($1)', [view_id]);
    return result.rows;
  } finally { release(); }
};

exports.updateViewSort = async ({ id, column_id, direction }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_view_sort($1, $2, $3) AS message', [id, column_id, direction]);
    return result.rows[0];
  } finally { release(); }
};

exports.deleteViewSort = async (id, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_eliminar_view_sort($1) AS message', [id]);
    return result.rows[0];
  } finally { release(); }
};

exports.updateViewSortPosition = async ({ id, newPosition }, schemaName='public', existingClient=null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query('SELECT sp_actualizar_posicion_view_sort($1, $2) AS message', [id, newPosition]);
    return result.rows[0];
  } finally { release(); }
};
