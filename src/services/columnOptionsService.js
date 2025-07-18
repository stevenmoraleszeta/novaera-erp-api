// Servicio para opciones personalizadas de columnas
const pool = require('../config/db');

// Crear/actualizar opciones personalizadas para una columna
exports.createColumnOptions = async (column_id, options) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Insertar nuevas opciones
    if (options && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        // Si es string simple, usar como valor y etiqueta
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        
        await client.query(
          'INSERT INTO column_options (column_id, option_value, option_label, option_order) VALUES ($1, $2, $3, $4)',
          [column_id, optionValue, optionLabel, i]
        );
      }
    }
    
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Obtener opciones de una columna
exports.getColumnOptions = async (column_id) => {
  const result = await pool.query(
    'SELECT * FROM column_options WHERE column_id = $1 AND is_active = true ORDER BY option_order',
    [column_id]
  );
  return result.rows;
};

// Actualizar una opción específica
exports.updateColumnOption = async (option_id, option_data) => {
  // Construir dinámicamente el query y los valores
  const fields = [];
  const values = [];
  let idx = 1;
  if (option_data.option_value !== undefined) {
    fields.push(`option_value = $${idx++}`);
    values.push(option_data.option_value);
  }
  if (option_data.option_label !== undefined) {
    fields.push(`option_label = $${idx++}`);
    values.push(option_data.option_label);
  }
  if (option_data.option_order !== undefined) {
    fields.push(`option_order = $${idx++}`);
    values.push(option_data.option_order);
  }
  if (option_data.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    values.push(option_data.is_active);
  }
  if (fields.length === 0) {
    throw new Error('No hay campos para actualizar');
  }
  values.push(option_id);
  const query = `UPDATE column_options SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`;
  const result = await pool.query(query, values);
  return result.rows[0];
};

// Eliminar una opción específica (soft delete)
exports.deleteColumnOption = async (option_id) => {
  const result = await pool.query(
    'UPDATE column_options SET is_active = false WHERE id = $1 RETURNING *',
    [option_id]
  );
  return result.rows[0];
};

// Eliminar todas las opciones de una columna
exports.deleteColumnOptions = async (column_id) => {
  await pool.query('DELETE FROM column_options WHERE column_id = $1', [column_id]);
  return true;
};

// Verificar si una columna existe
exports.columnExists = async (column_id) => {
  const result = await pool.query(
    'SELECT 1 FROM columns WHERE id = $1',
    [column_id]
  );
  return result.rows.length > 0;
};

// Obtener opciones disponibles para una columna (personalizadas o de tabla foránea)
exports.getAvailableOptions = async (column_id) => {
  // Primero obtener información de la columna
  const columnResult = await pool.query(
    'SELECT * FROM columns WHERE id = $1',
    [column_id]
  );
  
  if (columnResult.rows.length === 0) {
    throw new Error('Columna no encontrada');
  }
  
  const column = columnResult.rows[0];
  
  // Si la columna no es de tipo selección, retornar array vacío
  if (column.data_type !== 'select') {
    return [];
  }
  
  console.log('Processing column:', {
    column_id: column.id,
    data_type: column.data_type,
    is_foreign_key: column.is_foreign_key,
    foreign_table_id: column.foreign_table_id,
    foreign_column_name: column.foreign_column_name
  });
  
  // Si es una columna de foreign key, obtener opciones de la tabla referenciada
  if (column.foreign_table_id && column.foreign_column_name) {
    console.log(`Getting options from foreign table ${column.foreign_table_id}, column ${column.foreign_column_name}`);
    
    const tableResult = await pool.query(
      'SELECT id, record_data FROM records WHERE table_id = $1 AND record_data ? $2 ORDER BY id',
      [column.foreign_table_id, column.foreign_column_name]
    );
    
    const options = tableResult.rows
      .filter(record => {
        const fieldValue = record.record_data[column.foreign_column_name];
        return fieldValue && fieldValue !== '';
      })
      .map(record => ({
        value: record.id,
        label: record.record_data[column.foreign_column_name],
        type: 'foreign'
      }));
      
    console.log(`Found ${options.length} options from foreign table:`, options);
    return options;
  }
  
  // Si no es foreign key, verificar si tiene opciones personalizadas
  const customOptions = await this.getColumnOptions(column_id);
  
  // Si tiene opciones personalizadas, retornarlas
  if (customOptions.length > 0) {
    return customOptions.map(option => ({
      value: option.option_value,
      label: option.option_label,
      type: 'custom'
    }));
  }
  
  return [];
};
