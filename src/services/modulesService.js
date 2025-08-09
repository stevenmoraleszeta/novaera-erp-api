const pool = require('../config/db');
const { getClient } = require('../utils/dbHelper');

exports.createModule = async ({ name, description, icon_url, created_by }, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_crear_modulo($1, $2, $3, $4) AS message',
      [name, description, icon_url, created_by]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.getModules = async (order_by, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT * FROM sp_obtener_modulos($1)',
      [order_by]
    );
    return result.rows;
  } finally { release(); }
};

exports.getModuleById = async (id, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT * FROM sp_obtener_modulo_por_id($1)',
      [id]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.updateModule = async ({ id, name, description, icon_url, position_num }, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_actualizar_modulo($1, $2, $3, $4, $5) AS message',
      [id, name, description, icon_url, position_num]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.deleteModule = async (id, cascada = false, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_eliminar_modulo($1, $2) AS message',
      [id, cascada]
    );
    return result.rows[0];
  } finally { release(); }
};

exports.existsTableNameInModule = async (module_id, table_name, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_existe_nombre_tabla_en_modulo($1, $2) AS exists',
      [module_id, table_name]
    );
    return result.rows[0].exists;
  } finally { release(); }
};

exports.updateModulePosition = async (module_id, newPosition, schemaName = 'public', existingClient = null) => {
  const { client, release } = await getClient({ schemaName, existingClient });
  try {
    const result = await client.query(
      'SELECT sp_actualizar_posicion_modulo($1, $2)',
      [module_id, newPosition]
    );
    return result;
  } finally { release(); }
};