const recordsService = require('../services/recordsService');

exports.createRecord = async (req, res) => {
  try {
    const recordData = req.body;
    const result = await recordsService.createRecord(recordData);
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
    const { record_data } = req.body;
    const result = await recordsService.updateRecord({ record_id, record_data });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRecord = async (req, res) => {
  try {
    const { record_id } = req.params;
    const result = await recordsService.deleteRecord(record_id);
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