const pool = require('../config/db');
const rolesService = require('./rolesService');

exports.createTable = async ({ module_id, name, description, original_table_id, foreign_table_id, position_num}) => {

  let result
  let response

  if(module_id == null){
   result = await pool.query(
    `INSERT INTO tables (name, description, original_table_id, foreign_table_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, description, original_table_id, foreign_table_id]
  );
  response = result.rows[0];
  } else {
   result = await pool.query(
    'SELECT crear_tabla_logica($1, $2, $3, $4, $5, $6) AS data',
    [module_id, name, description, original_table_id, foreign_table_id, position_num]
  );
   response = result.rows[0].data;
  }

  if (response.error) {
    throw new Error(response.error);
  }

  return response; // { id: 123, message: "Tabla creada correctamente" }
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

exports.updateTable = async ({ table_id, name, description, original_table_id, foreign_table_id, position_num }) => {
  const result = await pool.query(
    'SELECT actualizar_tabla_logica($1, $2, $3, $4, $5, $6) AS message',
    [table_id, name, description, original_table_id, foreign_table_id, position_num]
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

exports.getTables = async () => {
  const result = await pool.query('SELECT id, name, description, module_id, created_at, original_table_id, foreign_table_id FROM tables ORDER BY name ASC');
  return result.rows;
};

/**
 * Busca o crea una tabla intermedia para una relación many-to-many.
 * @param {number} tableA_id - ID de la tabla origen.
 * @param {number} tableB_id - ID de la tabla foránea.
 * @returns {Promise<{status: 'found'|'created', joinTable: object}>}
 */
exports.getOrCreateJoinTable = async (tableA_id, tableB_id, forName) => {
  // Buscar si ya existe una tabla intermedia (en cualquier orden)
  const result = await pool.query(
    `SELECT * FROM tables 
     WHERE (original_table_id = $1 AND foreign_table_id = $2)
        OR (original_table_id = $2 AND foreign_table_id = $1)`,
    [tableA_id, tableB_id]
  );
  if (result.rows.length > 0) {
    const joinTable = result.rows[0];

    // --- NUEVO: Crear columnas lógicas en la tabla intermedia si no existen ---
    async function checkColumnExists(tableId, columnName) {
      const res = await pool.query(
        `SELECT 1 FROM columns WHERE table_id = $1 AND name = $2`,
        [tableId, columnName]
      );
      return res.rows.length > 0;
    }
    // original_record_id -> apunta a tableA
    if (!(await checkColumnExists(joinTable.id, 'original_record_id'))) {
      await pool.query(
        `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
         VALUES ($1, $2, 'select', true, true, $3, $4)`,
        [joinTable.id, 'original_record_id', tableA_id, 'id']
      );
    }
    // foreign_record_id -> apunta a tableB
    if (!(await checkColumnExists(joinTable.id, forName))) {
      await pool.query(
        `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
         VALUES ($1, $2, 'select', true, true, $3, $4)`,
        [joinTable.id, forName , tableB_id, 'id']
      );
    }
    return { status: 'found', joinTable };
  }

  // Obtener los nombres de las tablas
  const tableNamesRes = await pool.query(
    'SELECT id, name FROM tables WHERE id = $1 OR id = $2',
    [tableA_id, tableB_id]
  );
  if (tableNamesRes.rows.length !== 2) {
    throw new Error('No se encontraron ambas tablas para la relación many-to-many');
  }
  const tableA = tableNamesRes.rows.find(t => t.id === tableA_id);
  const tableB = tableNamesRes.rows.find(t => t.id === tableB_id);

  // Normaliza los nombres (minúsculas, sin espacios, sin tildes, etc.)
  function normalize(name) {
    return name
      .toLowerCase()
      .replace(/[áéíóúüñ]/g, c => ({
        á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', ñ: 'n'
      }[c] || c))
      .replace(/[^a-z0-9 _]/g, '');
  }
  const normA = normalize(tableA.name);
  const normB = normalize(tableB.name);
  const colA = normA + '_id';
  const colB = normB + '_id';
  const joinTableName = `${normA} - ${normB}`;
  // Nombre para la tabla física (sin espacios ni guiones)
  const physicalTableName = `${normA.replace(/\s+/g, '_')}_${normB.replace(/\s+/g, '_')}_join`;

  // Crea la tabla lógica en tu sistema
  const insert = await pool.query(
    `INSERT INTO tables (name, description, original_table_id, foreign_table_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [joinTableName, `Tabla intermedia entre ${tableA.name} y ${tableB.name}`, tableA_id, tableB_id]
  );
  const joinTable = insert.rows[0];

  // Crea la tabla física en la base de datos (si aplica)
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${physicalTableName} (
      id SERIAL PRIMARY KEY,
      original_record_id INT NOT NULL,
      foreign_record_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Después de crear la tabla lógica y física, repite la lógica de creación de columnas
  // Helper para verificar si existe la columna lógica
  async function checkColumnExists(tableId, columnName) {
    const res = await pool.query(
      `SELECT 1 FROM columns WHERE table_id = $1 AND name = $2`,
      [tableId, columnName]
    );
    return res.rows.length > 0;
  }
  // original_record_id -> apunta a tableA
  if (!(await checkColumnExists(joinTable.id, 'original_record_id'))) {
    await pool.query(
      `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
       VALUES ($1, $2, 'select', true, true, $3, $4)`,
      [joinTable.id, 'original_record_id', tableA_id, 'id']
    );
  }
  // foreign_record_id -> apunta a tableB
  if (!(await checkColumnExists(joinTable.id, 'foreign_record_id'))) {
    await pool.query(
      `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
       VALUES ($1, $2, 'select', true, true, $3, $4)`,
      [joinTable.id, 'foreign_record_id', tableB_id, 'id']
    );
  }

  // Asignar permisos de lectura a todos los roles existentes
  try {
    const allRoles = await rolesService.getRoles();
    for (const role of allRoles) {
      // Asignar solo permisos de lectura (can_read = true, los demás en false)
      await rolesService.setRolePermissions(
        role.id, 
        joinTable.id, 
        false, // can_create
        true,  // can_read
        false, // can_update
        false  // can_delete
      );
    }
  } catch (error) {
    console.error('Error al asignar permisos a roles para la tabla foránea:', error);
    // No fallar la creación de la tabla si hay error en permisos
  }

  return { status: 'created', joinTable };

};

  exports.updateTablePosition = async (table_id, newPosition) => {
  const result = await pool.query(
    'SELECT sp_actualizar_posicion_tabla($1, $2)',
    [table_id, newPosition]
  );
  return result;
};