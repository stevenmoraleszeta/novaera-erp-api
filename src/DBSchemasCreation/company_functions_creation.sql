-- =========================================
-- FUNCIONES PARA COPIAR EN CADA SCHEMA DE EMPRESA
-- =========================================

-- Función para crear todas las funciones del sistema en el schema de la empresa
CREATE OR REPLACE FUNCTION create_company_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
DECLARE
    function_sql TEXT;
BEGIN
    -- Establecer el search_path para crear las funciones en el schema correcto
    EXECUTE format('SET search_path TO %I, public', schema_name);
    
    -- 1. Funciones de auditoría y registros
    function_sql := format('
    CREATE OR REPLACE FUNCTION %I.audit_records_changes()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        user_id INTEGER;
    BEGIN
        -- Leer el ID del usuario desde la variable de sesión
        user_id := current_setting(''audit.user_id'', true)::INTEGER;

        IF TG_OP = ''UPDATE'' THEN
            IF OLD IS DISTINCT FROM NEW THEN
                INSERT INTO %I.audit_log(table_name, record_id, action, old_data, new_data, changed_by)
                VALUES (TG_TABLE_NAME, NEW.id, ''UPDATE'', row_to_json(OLD), row_to_json(NEW), user_id);
            END IF;
            RETURN NEW;

        ELSIF TG_OP = ''INSERT'' THEN
            INSERT INTO %I.audit_log(table_name, record_id, action, old_data, new_data, changed_by)
            VALUES (TG_TABLE_NAME, NEW.id, ''INSERT'', NULL, row_to_json(NEW), user_id);
            RETURN NEW;

        ELSIF TG_OP = ''DELETE'' THEN
            INSERT INTO %I.audit_log(table_name, record_id, action, old_data, new_data, changed_by)
            VALUES (TG_TABLE_NAME, OLD.id, ''DELETE'', row_to_json(OLD), NULL, user_id);
            RETURN OLD;
        END IF;
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name);
    
    EXECUTE function_sql;
    
    -- 2. Funciones de registros dinámicos
    function_sql := format('
    CREATE OR REPLACE FUNCTION %I.insertar_registro_dinamico(p_table_id integer, p_data jsonb, p_position_num integer)
    RETURNS json
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        v_columna RECORD;
        v_new_record RECORD;
    BEGIN
        -- Validar si existe la tabla lógica
        IF NOT EXISTS (SELECT 1 FROM %I.tables WHERE id = p_table_id) THEN
            RETURN json_build_object(''error'', ''La tabla lógica no existe.'');
        END IF;

        -- Validar campos requeridos
        FOR v_columna IN SELECT * FROM %I.columns WHERE table_id = p_table_id AND is_required = true LOOP
            IF NOT p_data ? v_columna.name THEN
                RETURN json_build_object(''error'', ''El campo '' || v_columna.name || '' es obligatorio.'');
            END IF;
        END LOOP;

        -- Insertar registro
        INSERT INTO %I.records (table_id, record_data, position_num, created_at)
        VALUES (p_table_id, p_data, p_position_num, CURRENT_TIMESTAMP)
        RETURNING * INTO v_new_record;

        RETURN json_build_object(
            ''success'', true,
            ''record_id'', v_new_record.id,
            ''data'', v_new_record.record_data
        );
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name);
    
    EXECUTE function_sql;
    
    -- 3. Funciones de búsqueda
    function_sql := format('
    CREATE OR REPLACE FUNCTION %I.buscar_registros_por_valor(p_table_id integer, p_valor text)
    RETURNS TABLE(id integer, record_data jsonb, created_at timestamp without time zone, position_num integer)
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        RETURN QUERY
        SELECT r.id, r.record_data, r.created_at, r.position_num
        FROM %I.records r
        WHERE r.table_id = p_table_id
          AND r.record_data::text ILIKE ''%%'' || p_valor || ''%%''
        ORDER BY r.created_at DESC;
    END;
    $func$;
    ', schema_name, schema_name);
    
    EXECUTE function_sql;
    
    -- 4. Funciones de notificaciones
    function_sql := format('
    CREATE OR REPLACE FUNCTION %I.crear_notificacion(p_user_id integer, p_title character varying, p_message text, p_url text DEFAULT NULL, p_reminder_at timestamp without time zone DEFAULT NULL)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM %I.users WHERE id = p_user_id) THEN
            RETURN ''Error: Usuario no encontrado.'';
        END IF;

        INSERT INTO %I.notifications (user_id, title, message, link_to_module, read, reminder_at, created_at)
        VALUES (p_user_id, p_title, p_message, p_url, FALSE, p_reminder_at, NOW());

        RETURN ''Notificación creada correctamente.'';
    END;
    $func$;
    ', schema_name, schema_name, schema_name);
    
    EXECUTE function_sql;
    
    -- 5. Funciones de permisos
    function_sql := format('
    CREATE OR REPLACE FUNCTION %I.establecer_permisos_rol_tabla(p_rol_id integer, p_table_id integer, p_can_create boolean, p_can_read boolean, p_can_update boolean, p_can_delete boolean)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        -- Validación de IDs
        IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
            RETURN ''ID de rol inválido.'';
        END IF;

        IF p_table_id IS NULL OR p_table_id <= 0 THEN
            RETURN ''ID de tabla lógica inválido.'';
        END IF;

        -- Validar existencia del rol
        IF NOT EXISTS (SELECT 1 FROM %I.roles WHERE id = p_rol_id) THEN
            RETURN ''No existe el rol con ID '' || p_rol_id;
        END IF;

        -- Validar existencia de la tabla lógica
        IF NOT EXISTS (SELECT 1 FROM %I.tables WHERE id = p_table_id) THEN
            RETURN ''No existe la tabla lógica con ID '' || p_table_id;
        END IF;

        -- Insertar o actualizar permisos
        INSERT INTO %I.permissions (role_id, table_id, can_create, can_read, can_update, can_delete)
        VALUES (p_rol_id, p_table_id, p_can_create, p_can_read, p_can_update, p_can_delete)
        ON CONFLICT (role_id, table_id) 
        DO UPDATE SET 
            can_create = EXCLUDED.can_create,
            can_read = EXCLUDED.can_read,
            can_update = EXCLUDED.can_update,
            can_delete = EXCLUDED.can_delete;

        RETURN ''Permisos establecidos correctamente.'';
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name);
    
    EXECUTE function_sql;
    
    -- 6. Funciones de usuarios y roles
    function_sql := format('
    CREATE OR REPLACE FUNCTION %I.asignar_rol_a_usuario(p_user_id integer, p_rol_id integer)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        -- Validación de parámetros
        IF p_user_id IS NULL OR p_user_id <= 0 THEN
            RETURN ''ID de usuario inválido.'';
        END IF;

        IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
            RETURN ''ID de rol inválido.'';
        END IF;

        -- Validar existencia del usuario
        IF NOT EXISTS (SELECT 1 FROM %I.users WHERE id = p_user_id) THEN
            RETURN ''No se encontró el usuario con ID: '' || p_user_id;
        END IF;

        -- Validar existencia del rol
        IF NOT EXISTS (SELECT 1 FROM %I.roles WHERE id = p_rol_id) THEN
            RETURN ''No se encontró el rol con ID: '' || p_rol_id;
        END IF;

        -- Verificar si ya existe la asignación
        IF EXISTS (
            SELECT 1 FROM %I.user_roles
            WHERE user_id = p_user_id AND role_id = p_rol_id
        ) THEN
            RETURN ''El usuario ya tiene asignado este rol.'';
        END IF;

        -- Insertar nueva asignación
        INSERT INTO %I.user_roles (user_id, role_id)
        VALUES (p_user_id, p_rol_id);

        RETURN ''Rol asignado exitosamente al usuario.'';
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
    
    EXECUTE function_sql;
    
    -- Restaurar search_path
    SET search_path TO public;
    
END;
$$ LANGUAGE plpgsql;

-- Función mejorada para crear tablas y funciones
CREATE OR REPLACE FUNCTION create_company_tables_and_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- Primero crear las tablas (función existente)
    PERFORM create_company_tables(schema_name);
    
    -- Luego crear todas las funciones del sistema
    PERFORM create_company_functions(schema_name);
    
END;
$$ LANGUAGE plpgsql;
