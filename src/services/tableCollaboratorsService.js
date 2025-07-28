const pool = require('../config/db');

class TableCollaboratorsService {
  // Verificar si un usuario es colaborador de una tabla
  async isUserCollaborator(tableId, userId) {
    try {
      const result = await pool.query(`
        SELECT id FROM table_collaborators 
        WHERE table_id = $1 AND user_id = $2 AND is_active = true
      `, [tableId, userId]);
      
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error al verificar colaborador:', error);
      return false;
    }
  }

  // Obtener si el usuario es colaborador (simplificado)
  async getUserRoleInTable(tableId, userId) {
    try {
      const result = await pool.query(`
        SELECT id FROM table_collaborators 
        WHERE table_id = $1 AND user_id = $2 AND is_active = true
      `, [tableId, userId]);
      
      return result.rows.length > 0 ? 'collaborator' : null;
    } catch (error) {
      console.error('Error al verificar colaborador:', error);
      return null;
    }
  }

  // Obtener estadísticas de colaboradores para una tabla
  async getTableCollaboratorStats(tableId) {
    try {
      const result = await pool.query(`
        SELECT 
          COUNT(*) as total_collaborators
        FROM table_collaborators 
        WHERE table_id = $1 AND is_active = true
      `, [tableId]);
      
      return result.rows[0] || {
        total_collaborators: 0,
        viewers: 0
      };
    } catch (error) {
      console.error('Error al obtener estadísticas de colaboradores:', error);
      return {
        total_collaborators: 0
      };
    }
  }

  // Obtener colaboradores con información de usuario
  async getCollaboratorsWithUserInfo(tableId) {
    try {
      const result = await pool.query(`
        SELECT 
          tc.id,
          tc.user_id,
          tc.assigned_at,
          tc.notes,
          u.name,
          u.email,
          u.avatar_url as avatar,
          ab.name as assigned_by_name
        FROM table_collaborators tc
        JOIN users u ON tc.user_id = u.id
        LEFT JOIN users ab ON tc.assigned_by = ab.id
        WHERE tc.table_id = $1 AND tc.is_active = true
        ORDER BY tc.assigned_at DESC
      `, [tableId]);
      
      return result.rows;
    } catch (error) {
      console.error('Error al obtener colaboradores con info de usuario:', error);
      return [];
    }
  }

  // Sincronizar colaboradores (agregar/quitar en batch)
  async syncCollaborators(tableId, userIds, assignedBy) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Crear placeholders para la consulta
      const placeholders = userIds.map((_, index) => `$${index + 2}`).join(',');
      
      // Desactivar colaboradores que no están en la nueva lista
      await client.query(`
        UPDATE table_collaborators 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE table_id = $1 AND user_id NOT IN (${placeholders}) AND is_active = true
      `, [tableId, ...userIds]);
      
      // Insertar o reactivar colaboradores
      for (const userId of userIds) {
        await client.query(`
          INSERT INTO table_collaborators (table_id, user_id, assigned_by)
          VALUES ($1, $2, $3)
          ON CONFLICT (table_id, user_id) 
          DO UPDATE SET 
            is_active = true,
            assigned_by = EXCLUDED.assigned_by,
            updated_at = CURRENT_TIMESTAMP
        `, [tableId, userId, assignedBy]);
      }
      
      await client.query('COMMIT');
      return true;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error al sincronizar colaboradores:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Notificar a colaboradores sobre cambios en la tabla
  async notifyCollaborators(tableId, message, excludeUserId = null) {
    try {
      const collaborators = await this.getCollaboratorsWithUserInfo(tableId);
      const collaboratorsToNotify = collaborators.filter(c => c.user_id !== excludeUserId);
      
      // Aquí podrías integrar con un sistema de notificaciones
      // Por ejemplo, enviar emails, push notifications, etc.
      
      console.log(`Notificando a ${collaboratorsToNotify.length} colaboradores sobre cambios en tabla ${tableId}`);
      
      return collaboratorsToNotify;
    } catch (error) {
      console.error('Error al notificar colaboradores:', error);
      return [];
    }
  }
}

module.exports = new TableCollaboratorsService();
