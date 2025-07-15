const recordsService = require('../services/recordsService');

exports.createRecord = async (req, res) => {
  try {
    const { table_id, record_data, position_num } = req.body;
    // Obtener información del usuario desde el token de autenticación
    const createdBy = req.user?.id || null;
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.get ? req.get('User-Agent') : (req.headers['user-agent'] || '');
    const result = await recordsService.createRecord({
      table_id,
      record_data,
      position_num,
      createdBy,
      ipAddress,
      userAgent
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRecords = async (req, res) => {
  try {
    const records = await recordsService.getRecords();
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRecordsByTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const records = await recordsService.getRecordsByTable(table_id);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRecordById = async (req, res) => {
  try {
    const { record_id } = req.params;
    const record = await recordsService.getRecordById(record_id);
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRecord = async (req, res) => {
  try {
    const { record_id } = req.params;
    const { recordData, position_num } = req.body;
    
    // Obtener información del usuario desde el token de autenticación
    const updatedBy = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const result = await recordsService.updateRecord({ 
      record_id, 
      recordData, 
      position_num, 
      updatedBy, 
      ipAddress, 
      userAgent 
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { record_id } = req.params;
    
    // Obtener información del usuario desde el token de autenticación
    const deletedBy = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    
    const result = await recordsService.deleteRecord(record_id, deletedBy, ipAddress, userAgent);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.searchRecordsByValue = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { value } = req.query;
    const records = await recordsService.searchRecordsByValue(table_id, value);
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.countRecordsByTable = async (req, res) => {
  try {
    const { table_id } = req.params;
    const count = await recordsService.countRecordsByTable(table_id);
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.existsFieldInRecords = async (req, res) => {
  try {
    const { table_id } = req.params;
    const { field_name } = req.query;
    const exists = await recordsService.existsFieldInRecords(table_id, field_name);
    res.json({ exists });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateRecordPosition = async (req, res) => {

  try {
    const { record_id } = req.params;
    const { position } = req.body;

    if (position === undefined || isNaN(position)) {
      return res.status(400).json({ error: 'La nueva posición es requerida y debe ser un número.' });
    }
    await recordsService.updateRecordPosition(record_id, Number(position));
    res.json({ message: 'Posición actualizada correctamente.' });
  } catch (err) {
    res.status(500).json({ error: 'Error actualizando la posición del registro.' });
  }
};