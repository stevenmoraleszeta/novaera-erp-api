const columnsService = require('../services/columnsService');
const columnOptionsService = require('../services/columnOptionsService');

exports.getColumns = async (req, res) => {
  try {
    const columns = await columnsService.getColumns();
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createColumn = async (req, res) => {
  try {
    const { custom_options, related_table_name, related_table_description, ...columnData } = req.body;
    console.log('---[CREATE COLUMN]---');
    console.log('Column data:', columnData);
    console.log('Custom options:', custom_options);
    console.log('Related table name:', related_table_name);

    // Si es columna tipo 'tabla', crear la tabla relacionada primero
    let relatedTable = null;
    if (columnData.data_type === 'tabla' && related_table_name) {
      // Puedes ajustar el nombre del campo data_type si usas otro valor
      relatedTable = await columnsService.createRelatedTable({
        name: related_table_name,
        description: related_table_description || '',
        module_id: null,
        original_table_id: columnData.table_id,
        position_num: columnData.column_position || 0
      });
      // Puedes guardar el id de la tabla relacionada en la columna si lo necesitas
      columnData.foreign_table_id = relatedTable.id;
    }

    // Crear la columna
    const result = await columnsService.createColumn(columnData);
    console.log('Column creation result:', result);

    // El procedimiento almacenado ahora devuelve el ID de la columna creada
    const newColumnId = result.column_id;

    // Si es una columna de tipo selección con opciones personalizadas
    if (columnData.data_type === 'select' && custom_options && Array.isArray(custom_options) && custom_options.length > 0) {
      console.log('Processing custom options for select column');
      if (newColumnId) {
        console.log('Creating custom options for column ID:', newColumnId);
        try {
          await columnOptionsService.createColumnOptions(newColumnId, custom_options);
          console.log('Custom options created successfully');
        } catch (optErr) {
          console.error('Error creating custom options:', optErr);
          // Enviar error específico de opciones personalizadas
          return res.status(500).json({ error: 'Error al crear opciones personalizadas', details: optErr.message });
        }
      } else {
        console.log('Error: Could not get newly created column ID');
        return res.status(500).json({ error: 'No se pudo obtener el ID de la columna creada' });
      }
    }

    // Solo agrega el campo a los registros de la tabla principal, no a la tabla relacionada
    await columnsService.addFieldToAllRecords({
      tableId: columnData.table_id,
      columnName: columnData.name,
      defaultValue: "",
    });

    // Responder con la columna y la tabla relacionada si aplica
    res.status(201).json({ column: result, relatedTable });
  } catch (err) {
    console.error('Error in createColumn:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
};

exports.getColumnsByTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const columns = await columnsService.getColumnsByTable(table_id);
    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getColumnById = async (req, res) => {
  try {
    const { column_id } = req.params;
    const column = await columnsService.getColumnById(column_id);
    res.json(column);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateColumn = async (req, res) => {
  try {
    const { column_id } = req.params;
    const { custom_options, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations, is_unique } = req.body;
    const currentColumn = await columnsService.getColumnById(column_id);

    const oldName = currentColumn.name;

    const result = await columnsService.updateColumn({ column_id, name, data_type, is_required, is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations, is_unique });

    // Si es una columna de tipo selección con opciones personalizadas
    if (data_type === 'select' && custom_options && Array.isArray(custom_options)) {
      // Actualizar las opciones personalizadas
      await columnOptionsService.createColumnOptions(column_id, custom_options);
    }

    if (oldName !== name) {
      const tableId = currentColumn.table_id;
      await columnsService.renameColumnKeyInRecords({
        tableId,
        oldKey: oldName,
        newKey: name
      });
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteColumn = async (req, res) => {
  try {
    const { column_id } = req.params;
    const result = await columnsService.deleteColumn(column_id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsColumnNameInTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { name } = req.query;
    const exists = await columnsService.existsColumnNameInTable(table_id, name);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.columnHasRecords = async (req, res) => {
  try {
    const { column_id } = req.params;
    const hasRecords = await columnsService.columnHasRecords(column_id);
    res.json({ hasRecords });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateColumnPosition = async (req, res) => {
  try {
    const { column_id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }

    await columnsService.updateColumnPosition(column_id, Number(position));

    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    console.error('Error actualizando posición de columna:', err);
    res.status(500).json({ error: 'Error actualizando la posición de la columna.' });
  }
};

// Obtener columnas de una tabla con sus opciones personalizadas
exports.getColumnsByTableWithOptions = async (req, res) => {
  try {
    const { table_id } = req.params;
    const columns = await columnsService.getColumnsByTable(table_id);

    // Para cada columna de tipo selección, obtener sus opciones personalizadas
    for (let column of columns) {
      if (column.data_type === 'select') {
        const customOptions = await columnOptionsService.getColumnOptions(column.column_id);
        column.custom_options = customOptions;
      }
    }

    res.json(columns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
