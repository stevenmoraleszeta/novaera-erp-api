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
 * @param {string} displayColumn - Nombre de la columna que se mostrará en el selectbox.
 * @returns {Promise<{status: 'found'|'created', joinTable: object}>}
 */
exports.getOrCreateJoinTable = async (tableA_id, tableB_id, displayColumn) => {
  console.log('getOrCreateJoinTable called with:', {
    tableA_id,
    tableB_id, 
    displayColumn
  });
  
  // Si no se proporciona displayColumn, buscar en la columna original que generó esta relación
  let actualDisplayColumn = displayColumn;
  if (!actualDisplayColumn) {
    console.log('No displayColumn provided, searching for original foreign key column...');
    
    // Buscar la columna de tipo "foreign" que referencia estas tablas
    const originalColumnResult = await pool.query(`
      SELECT foreign_column_name 
      FROM columns 
      WHERE data_type = 'foreign' 
      AND is_foreign_key = true 
      AND foreign_table_id IN ($1, $2)
      AND table_id IN ($1, $2)
      ORDER BY id DESC 
      LIMIT 1
    `, [tableA_id, tableB_id]);
    
    if (originalColumnResult.rows.length > 0) {
      actualDisplayColumn = originalColumnResult.rows[0].foreign_column_name;
      console.log(`Found original foreign_column_name: "${actualDisplayColumn}"`);
    } else {
      console.log('No original foreign column found, using "id" as default');
      actualDisplayColumn = 'id';
    }
  }
  
  console.log(`Using displayColumn: "${actualDisplayColumn}"`);
  
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
    // original_record_id -> apunta a tableA (siempre usa 'id' como referencia)
    if (!(await checkColumnExists(joinTable.id, 'original_record_id'))) {
      await pool.query(
        `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
         VALUES ($1, $2, 'select', true, true, $3, $4)`,
        [joinTable.id, 'original_record_id', tableA_id, 'id']
      );
    }
    // Columna para la tabla foránea -> usa la columna especificada por el usuario
    if (!(await checkColumnExists(joinTable.id, 'foreign_record_id'))) {
      console.log(`Creating foreign column: foreign_record_id referencing table ${tableB_id}, column ${actualDisplayColumn}`);
      await pool.query(
        `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
         VALUES ($1, $2, 'select', true, true, $3, $4)`,
        [joinTable.id, 'foreign_record_id', tableB_id, actualDisplayColumn]
      );
    } else {
      // Si la columna ya existe, verificar y actualizar foreign_column_name si es necesario
      const existingColumn = await pool.query(
        `SELECT foreign_column_name FROM columns WHERE table_id = $1 AND name = $2`,
        [joinTable.id, 'foreign_record_id']
      );
      
      if (existingColumn.rows.length > 0) {
        const currentForeignColumn = existingColumn.rows[0].foreign_column_name;
        
        if (currentForeignColumn !== actualDisplayColumn) {
          console.log(`Updating foreign_column_name from '${currentForeignColumn}' to '${actualDisplayColumn}' for existing column`);
          await pool.query(
            `UPDATE columns SET foreign_column_name = $1 WHERE table_id = $2 AND name = $3`,
            [actualDisplayColumn, joinTable.id, 'foreign_record_id']
          );
        }
      }
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

  

  async function checkColumnExists(tableId, columnName) {
    const res = await pool.query(
      `SELECT 1 FROM columns WHERE table_id = $1 AND name = $2`,
      [tableId, columnName]
    );
    return res.rows.length > 0;
  }
  // original_record_id -> apunta a tableA (siempre usa 'id' como referencia)
  if (!(await checkColumnExists(joinTable.id, 'original_record_id'))) {
    await pool.query(
      `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
       VALUES ($1, $2, 'select', true, true, $3, $4)`,
      [joinTable.id, 'original_record_id', tableA_id, 'id']
    );
  }
  // Columna para la tabla foránea -> usa la columna especificada por el usuario
  if (!(await checkColumnExists(joinTable.id, 'foreign_record_id'))) {
    console.log(`Creating foreign column for new table: foreign_record_id referencing table ${tableB_id}, column ${actualDisplayColumn}`);
    await pool.query(
      `INSERT INTO columns (table_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name)
       VALUES ($1, $2, 'select', true, true, $3, $4)`,
      [joinTable.id, 'foreign_record_id', tableB_id, actualDisplayColumn]
    );
  } else {
    // Si la columna ya existe, verificar y actualizar foreign_column_name si es necesario
    const existingColumn = await pool.query(
      `SELECT foreign_column_name FROM columns WHERE table_id = $1 AND name = $2`,
      [joinTable.id, 'foreign_record_id']
    );
    
    if (existingColumn.rows.length > 0) {
      const currentForeignColumn = existingColumn.rows[0].foreign_column_name;
      
      if (currentForeignColumn !== actualDisplayColumn) {
        console.log(`Updating foreign_column_name from '${currentForeignColumn}' to '${actualDisplayColumn}' for new table column`);
        await pool.query(
          `UPDATE columns SET foreign_column_name = $1 WHERE table_id = $2 AND name = $3`,
          [actualDisplayColumn, joinTable.id, 'foreign_record_id']
        );
      }
    }
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

exports.isValueUnique = async ({ tableId, column, value, excludeId }) => {
  const result = await pool.query(
    'SELECT sp_check_unique_value($1, $2, $3, $4)',
    [tableId, column, value, excludeId || null]
  );
  return result.rows[0].sp_check_unique_value;
};