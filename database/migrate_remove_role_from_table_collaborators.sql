-- Script de migración para eliminar el campo 'role' de la tabla table_collaborators
-- Ejecutar este script para actualizar la base de datos existente

-- Eliminar la columna 'role' de la tabla table_collaborators
ALTER TABLE "table_collaborators" DROP COLUMN IF EXISTS "role";

-- Actualizar el comentario de la tabla para reflejar el cambio
COMMENT ON TABLE "table_collaborators" IS 'Tabla para gestionar colaboradores que reciben notificaciones de cambios en tablas lógicas del sistema';

-- Verificar que la tabla quedó correctamente estructurada
-- (Opcional: solo para verificación, se puede comentar después de ejecutar)
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'table_collaborators' 
ORDER BY ordinal_position;
