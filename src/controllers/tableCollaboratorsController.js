const pool = require('../config/db');

class TableCollaboratorsController {
  // Obtener todos los colaboradores de una tabla
  async getTableCollaborators(req, res) {
    try {
      const { tableId } = req.params;
      
      const query = `
        SELECT 
          tc.id,
          tc.table_id,
          tc.user_id,
          tc.assigned_by,
          tc.assigned_at,
          tc.is_active,
          tc.notes,
          u.name as user_name,
          u.email as user_email,
          u.avatar_url as user_avatar,
          ab.name as assigned_by_name
        FROM table_collaborators tc
        JOIN users u ON tc.user_id = u.id
        JOIN users ab ON tc.assigned_by = ab.id
        WHERE tc.table_id = $1 AND tc.is_active = true
        ORDER BY tc.assigned_at DESC
      `;
      
      const result = await pool.query(query, [tableId]);
      
      res.json({
        success: true,
        data: result.rows,
        message: 'Colaboradores obtenidos exitosamente'
      });
      
    } catch (error) {
      console.error('Error al obtener colaboradores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener todas las tablas donde un usuario es colaborador
  async getUserCollaborations(req, res) {
    try {
      const { userId } = req.params;
      
      const query = `
        SELECT 
          tc.id,
          tc.table_id,
          tc.assigned_at,
          lt.name as table_name,
          lt.description as table_description,
          m.name as module_name
        FROM table_collaborators tc
        JOIN tables lt ON tc.table_id = lt.id
        LEFT JOIN modules m ON lt.module_id = m.id
        WHERE tc.user_id = $1 AND tc.is_active = true
        ORDER BY tc.assigned_at DESC
      `;
      
      const result = await pool.query(query, [userId]);
      
      res.json({
        success: true,
        data: result.rows,
        message: 'Colaboraciones del usuario obtenidas exitosamente'
      });
      
    } catch (error) {
      console.error('Error al obtener colaboraciones del usuario:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Asignar colaboradores a una tabla (bulk)
  async assignCollaborators(req, res) {
    try {
      const { tableId } = req.params;
      const { userIds, notes } = req.body;
      const assignedBy = req.user.id; // Asumiendo que el usuario está en req.user
      
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Se requiere al menos un ID de usuario'
        });
      }

      // Verificar que la tabla existe
      const tableCheck = await pool.query(
        'SELECT id FROM tables WHERE id = $1',
        [tableId]
      );
      
      if (tableCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tabla no encontrada'
        });
      }

      // Insertar colaboradores (usando ON CONFLICT para evitar duplicados)
      const insertQuery = `
        INSERT INTO table_collaborators 
        (table_id, user_id, assigned_by, notes) 
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (table_id, user_id) 
        DO UPDATE SET 
          assigned_by = EXCLUDED.assigned_by,
          notes = EXCLUDED.notes,
          is_active = true,
          updated_at = CURRENT_TIMESTAMP
      `;
      
      // Usar transacción para insertar múltiples colaboradores
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        for (const userId of userIds) {
          await client.query(insertQuery, [tableId, userId, assignedBy, notes]);
        }
        
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
      // Obtener los colaboradores actualizados
      const updatedQuery = `
        SELECT 
          tc.id,
          tc.user_id,
          u.name as user_name,
          u.email as user_email
        FROM table_collaborators tc
        JOIN users u ON tc.user_id = u.id
        WHERE tc.table_id = $1 AND tc.is_active = true
      `;
      
      const updatedResult = await pool.query(updatedQuery, [tableId]);
      
      res.json({
        success: true,
        data: updatedResult.rows,
        message: 'Colaboradores asignados exitosamente'
      });
      
    } catch (error) {
      console.error('Error al asignar colaboradores:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Remover un colaborador de una tabla
  async removeCollaborator(req, res) {
    try {
      const { tableId, userId } = req.params;
      
      const query = `
        UPDATE table_collaborators 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE table_id = $1 AND user_id = $2
      `;
      
      const result = await pool.query(query, [tableId, userId]);
      
      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: 'Colaborador no encontrado'
        });
      }
      
      res.json({
        success: true,
        message: 'Colaborador removido exitosamente'
      });
      
    } catch (error) {
      console.error('Error al remover colaborador:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  // Obtener usuarios disponibles para asignar como colaboradores
  async getAvailableUsers(req, res) {
    try {
      const { tableId } = req.params;
      
      const query = `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.avatar_url as avatar,
          CASE 
            WHEN tc.user_id IS NOT NULL THEN true 
            ELSE false 
          END as is_collaborator
        FROM users u
        LEFT JOIN table_collaborators tc ON u.id = tc.user_id 
          AND tc.table_id = $1 
          AND tc.is_active = true
        WHERE u.is_active = true
        ORDER BY is_collaborator DESC, u.name ASC
      `;
      
      const result = await pool.query(query, [tableId]);
      
      res.json({
        success: true,
        data: result.rows,
        message: 'Usuarios disponibles obtenidos exitosamente'
      });
      
    } catch (error) {
      console.error('Error al obtener usuarios disponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = new TableCollaboratorsController();
