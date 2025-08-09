const pool = require('../config/db');
const { getClient } = require('../utils/dbHelper');
const filesService = require('./filesService');
const scheduledNotificationsService = require('./scheduledNotificationsService');


class RecordsService {
  async setAuditUser(client, userId) {
    if (!userId) {
      return;
    }
    const sanitizedUserId = String(userId).replace(/'/g, "");  
    await client.query(`SET session "audit.user_id" = '${sanitizedUserId}'`);
  }
  
  /**
   * Obtiene un cliente configurando el search_path al schema especificado.
   * Reutiliza client existente si ya viene en options (futuro) o crea nuevo.
   */
  async getClientWithSchema(schemaName, existingClient = null) {
    const { client, release } = await getClient({ schemaName, existingClient });
    client.__releaseWrapper = release;
    return client;
  }

  // Crear registro (multi-schema)
  async createRecord({ table_id, record_data, position_num, createdBy, ipAddress, userAgent }, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      await this.setAuditUser(client, createdBy);

      const result = await client.query(
        'SELECT insertar_registro_dinamico($1, $2, $3) AS message',
        [table_id, record_data, position_num]
      );

      const recordIdResult = await client.query(
        'SELECT id FROM records WHERE table_id = $1 ORDER BY created_at DESC LIMIT 1',
        [table_id]
      );
      const recordId = recordIdResult.rows[0]?.id;

      return { id: recordId, ...result.rows[0] };

    } catch (error) {
      throw new Error(`Error al crear registro: ${error.message}`);
  } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }




  // Obtener el último registro insertado
  async getLastInsertedRecordId(tableId, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      const result = await client.query(
        'SELECT id FROM records WHERE table_id = $1 ORDER BY created_at DESC LIMIT 1',
        [tableId]
      );
      return result.rows[0]?.id;
    } catch (error) {
      throw new Error(`Error al obtener ID del registro: ${error.message}`);
    } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }

  async getRecordsByTable(table_id, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      const result = await client.query(
        'SELECT * FROM obtener_registros_por_tabla($1)',
        [table_id]
      );
      const expandedRecords = await this.expandFileReferences(result.rows, schemaName);
      return expandedRecords;
    } catch (error) {
      throw new Error(`Error al obtener registros: ${error.message}`);
    } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }

  // Obtener registro por ID
  async getRecordById(record_id, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      const result = await client.query(
        'SELECT * FROM obtener_registro_por_id($1)',
        [record_id]
      );
      if (result.rows.length === 0) {
        throw new Error('Registro no encontrado');
      }
      const expandedRecords = await this.expandFileReferences(result.rows, schemaName);
      return expandedRecords[0];
    } catch (error) {
      throw new Error(`Error al obtener registro: ${error.message}`);
    } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }

  // Actualizar registro
  async updateRecord({ record_id, recordData, position_num, updatedBy, ipAddress, userAgent }, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      await this.setAuditUser(client, updatedBy);

      const oldRecord = await this.getRecordById(record_id, schemaName);

      const result = await client.query(
        'SELECT actualizar_registro_dinamico($1, $2, $3) AS message',
        [record_id, recordData, position_num]
      );

      // Notificar a los usuarios asignados si existen
      try {
        const assignedUsersService = require('./recordAssignedUsersService');
  const assignedUsers = await assignedUsersService.getAssignedUsersByRecord(record_id, schemaName);
        if (assignedUsers && assignedUsers.length > 0) {
          // Obtener el module_id de la tabla
          let moduleId = null;
          try {
            const tableRes = await client.query('SELECT module_id FROM tables WHERE id = $1', [oldRecord.table_id]);
            moduleId = tableRes.rows[0]?.module_id;
          } catch (modErr) {
            console.error('No se pudo obtener el module_id de la tabla:', modErr);
          }
          for (const user of assignedUsers) {
            // Obtener el nombre del módulo
            let moduleName = '';
            try {
              if (moduleId) {
                const modRes = await client.query('SELECT name FROM modules WHERE id = $1', [moduleId]);
                moduleName = modRes.rows[0]?.name || '';
              }
            } catch (modNameErr) {
              console.error('No se pudo obtener el nombre del módulo:', modNameErr);
            }
            await scheduledNotificationsService.createNotificationForUser(
              user.user_id,
              'Registro actualizado',
              `El registro #${record_id} al que estás asignado ha sido actualizado en el módulo "${moduleName}".`,
              moduleId ? `/modulos/${moduleId}` : `/modulos`, // Fallback si no se encuentra el módulo
              record_id // Agregar record_id para navegación directa
            );
          }
        }
      } catch (notifyError) {
        console.error('Error notificando usuarios asignados:', notifyError);
      }

      await scheduledNotificationsService.logRecordChange({
        tableId: oldRecord.table_id,
        recordId: record_id,
        changeType: 'update',
        oldData: oldRecord.record_data,
        newData: recordData,
        changedBy: updatedBy,
        ipAddress,
        userAgent,
        schemaName
      });

      return result.rows[0];

    } catch (error) {
      throw new Error(`Error al actualizar registro: ${error.message}`);
  } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }


  // Eliminar registro
  async deleteRecord(record_id, deletedBy, ipAddress, userAgent, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      await this.setAuditUser(client, deletedBy);

      const oldRecord = await this.getRecordById(record_id, schemaName);

      const result = await client.query(
        'SELECT eliminar_registro_dinamico($1) AS message',
        [record_id]
      );

      await scheduledNotificationsService.logRecordChange({
        tableId: oldRecord.table_id,
        recordId: record_id,
        changeType: 'delete',
        oldData: oldRecord.record_data,
        newData: null,
        changedBy: deletedBy,
        ipAddress,
        userAgent,
        schemaName
      });

      return result.rows[0];

    } catch (error) {
      throw new Error(`Error al eliminar registro: ${error.message}`);
  } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }


  // Buscar registros por valor
  async searchRecordsByValue(table_id, value, schemaName = 'public', existingClient = null) {
    const client = await this.getClientWithSchema(schemaName, existingClient);
    try {
      const result = await client.query(
        'SELECT * FROM buscar_registros_por_valor($1, $2)',
        [table_id, value]
      );
      const expandedRecords = await this.expandFileReferences(result.rows, schemaName);
      return expandedRecords;
    } catch (error) {
      throw new Error(`Error al buscar registros: ${error.message}`);
    } finally { client.__releaseWrapper && client.__releaseWrapper(); }
  }

  // Expandir referencias de archivos
  async expandFileReferences(records, schemaName = 'public') {
    const expandedRecords = [];
    
    for (const record of records) {
      const expandedRecord = { ...record };
      
      if (record.record_data) {
        expandedRecord.record_data = await this.expandFiles(record.record_data, schemaName);
      }
      
      expandedRecords.push(expandedRecord);
    }
    
    return expandedRecords;
  }

  // Expandir archivos en el JSON
  async expandFiles(recordData, schemaName = 'public') {
    const expanded = { ...recordData };
    
    for (const [key, value] of Object.entries(expanded)) {
      if (value && typeof value === 'object') {
        // Archivo individual
        if (value.file_id) {
          const fileInfo = await filesService.getFileInfo(value.file_id, schemaName);
          if (fileInfo) {
            expanded[key] = {
              ...value,
              ...fileInfo,
              download_url: `/api/files/download/${value.file_id}`,
              view_url: `/api/files/view/${value.file_id}`
            };
          }
        }
        // Array de archivos
        else if (Array.isArray(value)) {
          const expandedArray = [];
          for (const item of value) {
            if (item && item.file_id) {
              const fileInfo = await filesService.getFileInfo(item.file_id, schemaName);
              if (fileInfo) {
                expandedArray.push({
                  ...item,
                  ...fileInfo,
                  download_url: `/api/files/download/${item.file_id}`,
                  view_url: `/api/files/view/${item.file_id}`
                });
              }
            } else {
              expandedArray.push(item);
            }
          }
          expanded[key] = expandedArray;
        }
      }
    }
    
    return expanded;
  }
}

// Mantener compatibilidad con la exportación anterior
const recordsService = new RecordsService();

exports.createRecord = recordsService.createRecord.bind(recordsService);
exports.getRecordsByTable = recordsService.getRecordsByTable.bind(recordsService);
exports.getRecordById = recordsService.getRecordById.bind(recordsService);
exports.updateRecord = recordsService.updateRecord.bind(recordsService);
exports.deleteRecord = recordsService.deleteRecord.bind(recordsService);
exports.searchRecordsByValue = recordsService.searchRecordsByValue.bind(recordsService);

exports.countRecordsByTable = async (table_id) => {
  const result = await pool.query(
    'SELECT contar_registros_por_tabla($1) AS count',
    [table_id]
  );
  return result.rows[0].count;
};

exports.existsFieldInRecords = async (table_id, field_name) => {
  const result = await pool.query(
    'SELECT existe_campo_en_registros($1, $2) AS exists',
    [table_id, field_name]
  );
  return result.rows[0].exists;
};

exports.updateRecordPosition = async (record_id, newPosition) => {
  const cleanRecordId = parseInt(record_id, 10);
  
  const result = await pool.query(
    'SELECT sp_actualizar_posicion_registro($1, $2)',
    [cleanRecordId, newPosition]
  );
  return result;
};