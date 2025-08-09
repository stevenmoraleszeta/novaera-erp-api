-- =========================================
-- SCRIPT COMPLETO PARA COPIAR TODAS LAS FUNCIONES DEL SISTEMA A SCHEMAS DE EMPRESA
-- =========================================

-- Función principal para crear todas las funciones en el schema de empresa
CREATE OR REPLACE FUNCTION create_all_company_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- Establecer el search_path para crear las funciones en el schema correcto
    EXECUTE format('SET search_path TO %I, public', schema_name);
    
    -- Crear todas las funciones categorizadas
    PERFORM create_audit_functions(schema_name);
    PERFORM create_record_functions(schema_name);
    PERFORM create_user_role_functions(schema_name);
    PERFORM create_notification_functions(schema_name);
    PERFORM create_permission_functions(schema_name);
    PERFORM create_table_module_functions(schema_name);
    PERFORM create_view_functions(schema_name);
    
    -- Restaurar search_path
    SET search_path TO public;
END;
$$ LANGUAGE plpgsql;

-- Funciones de auditoría
CREATE OR REPLACE FUNCTION create_audit_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.audit_records_changes()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        user_id INTEGER;
    BEGIN
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
END;
$$ LANGUAGE plpgsql;

-- Funciones de registros dinámicos
CREATE OR REPLACE FUNCTION create_record_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- insertar_registro_dinamico
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.insertar_registro_dinamico(p_table_id integer, p_data jsonb, p_position_num integer)
    RETURNS json
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        v_columna RECORD;
        v_new_record RECORD;
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM %I.tables WHERE id = p_table_id) THEN
            RETURN json_build_object(''error'', ''La tabla lógica no existe.'');
        END IF;

        FOR v_columna IN SELECT * FROM %I.columns WHERE table_id = p_table_id AND is_required = true LOOP
            IF NOT p_data ? v_columna.name THEN
                RETURN json_build_object(''error'', ''El campo '' || v_columna.name || '' es obligatorio.'');
            END IF;
        END LOOP;

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

    -- actualizar_registro_dinamico
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.actualizar_registro_dinamico(p_record_id integer, p_data jsonb, p_position_num integer)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        v_table_id INT;
        v_col RECORD;
    BEGIN
        SELECT r.table_id INTO v_table_id FROM %I.records r WHERE r.id = p_record_id;
        IF NOT FOUND THEN
            RETURN ''Error: El registro no existe.'';
        END IF;

        FOR v_col IN SELECT * FROM %I.columns WHERE table_id = v_table_id LOOP
            IF v_col.is_required AND NOT p_data ? v_col.name THEN
                RETURN ''Error: El campo '' || v_col.name || '' es obligatorio.'';
            END IF;
        END LOOP;

        UPDATE %I.records SET record_data = p_data, position_num = p_position_num WHERE id = p_record_id;
        RETURN ''Registro actualizado correctamente.'';
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name);

    -- buscar_registros_por_valor
    EXECUTE format('
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

    -- obtener_registros_por_tabla
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.obtener_registros_por_tabla(p_table_id integer)
    RETURNS TABLE(id integer, record_data jsonb, created_at timestamp without time zone, position_num integer)
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        RETURN QUERY
        SELECT r.id, r.record_data, r.created_at, r.position_num
        FROM %I.records r
        WHERE r.table_id = p_table_id
        ORDER BY r.position_num;
    END;
    $func$;
    ', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Funciones de usuarios y roles
CREATE OR REPLACE FUNCTION create_user_role_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- asignar_rol_a_usuario
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.asignar_rol_a_usuario(p_user_id integer, p_rol_id integer)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        IF p_user_id IS NULL OR p_user_id <= 0 THEN
            RETURN ''ID de usuario inválido.'';
        END IF;

        IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
            RETURN ''ID de rol inválido.'';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM %I.users WHERE id = p_user_id) THEN
            RETURN ''No se encontró el usuario con ID: '' || p_user_id;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM %I.roles WHERE id = p_rol_id) THEN
            RETURN ''No se encontró el rol con ID: '' || p_rol_id;
        END IF;

        IF EXISTS (
            SELECT 1 FROM %I.user_roles
            WHERE user_id = p_user_id AND role_id = p_rol_id
        ) THEN
            RETURN ''El usuario ya tiene asignado este rol.'';
        END IF;

        INSERT INTO %I.user_roles (user_id, role_id)
        VALUES (p_user_id, p_rol_id);

        RETURN ''Rol asignado exitosamente al usuario.'';
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name, schema_name);

    -- crear_rol
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.crear_rol(nombre_rol text, descripcion text DEFAULT NULL, p_is_admin boolean DEFAULT false)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        rol_id INT;
    BEGIN
        IF nombre_rol IS NULL OR TRIM(nombre_rol) = '''' OR nombre_rol ~ ''[^a-zA-Z0-9_ ]'' THEN
            RETURN ''Nombre de rol inválido. Use solo letras, números, espacios o guiones bajos.'';
        END IF;

        SELECT id INTO rol_id FROM %I.roles WHERE LOWER(name) = LOWER(nombre_rol);
        IF rol_id IS NOT NULL THEN
            RETURN ''El rol '' || nombre_rol || '' ya existe.'';
        END IF;

        INSERT INTO %I.roles (name, description, is_admin, is_active)
        VALUES (nombre_rol, descripcion, p_is_admin, true)
        RETURNING id INTO rol_id;

        RETURN ''Rol '' || nombre_rol || '' creado con ID: '' || rol_id;
    END;
    $func$;
    ', schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Funciones de notificaciones
CREATE OR REPLACE FUNCTION create_notification_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- crear_notificacion
    EXECUTE format('
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

    -- contar_notificaciones_no_leidas
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.contar_notificaciones_no_leidas(p_user_id integer)
    RETURNS integer
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        v_cantidad INT;
    BEGIN
        SELECT COUNT(*) INTO v_cantidad
        FROM %I.notifications
        WHERE user_id = p_user_id AND read = FALSE;

        RETURN v_cantidad;
    END;
    $func$;
    ', schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Funciones de permisos
CREATE OR REPLACE FUNCTION create_permission_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- establecer_permisos_rol_tabla
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.establecer_permisos_rol_tabla(p_rol_id integer, p_table_id integer, p_can_create boolean, p_can_read boolean, p_can_update boolean, p_can_delete boolean)
    RETURNS text
    LANGUAGE plpgsql
    AS $func$
    BEGIN
        IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
            RETURN ''ID de rol inválido.'';
        END IF;

        IF p_table_id IS NULL OR p_table_id <= 0 THEN
            RETURN ''ID de tabla lógica inválido.'';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM %I.roles WHERE id = p_rol_id) THEN
            RETURN ''No existe el rol con ID '' || p_rol_id;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM %I.tables WHERE id = p_table_id) THEN
            RETURN ''No existe la tabla lógica con ID '' || p_table_id;
        END IF;

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
END;
$$ LANGUAGE plpgsql;

-- Funciones de tablas y módulos
CREATE OR REPLACE FUNCTION create_table_module_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- crear_tabla_logica
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.crear_tabla_logica(p_module_id integer, p_name character varying, p_description text DEFAULT NULL, p_original_table_id integer DEFAULT NULL, p_foreign_table_id integer DEFAULT NULL, p_position_num integer DEFAULT 0)
    RETURNS integer
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        new_table_id INT;
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM %I.modules WHERE id = p_module_id) THEN
            RAISE EXCEPTION ''Error: El módulo no existe.'';
        END IF;

        IF EXISTS (SELECT 1 FROM %I.tables WHERE module_id = p_module_id AND LOWER(name) = LOWER(p_name)) THEN
            RAISE EXCEPTION ''Error: Ya existe una tabla con ese nombre en el módulo.'';
        END IF;

        INSERT INTO %I.tables (module_id, name, description, original_table_id, foreign_table_id, position_num, created_at)
        VALUES (p_module_id, p_name, p_description, p_original_table_id, p_foreign_table_id, p_position_num, CURRENT_TIMESTAMP)
        RETURNING id INTO new_table_id;

        RETURN new_table_id;
    END;
    $func$;
    ', schema_name, schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;

-- Funciones de vistas
CREATE OR REPLACE FUNCTION create_view_functions(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- sp_crear_vista
    EXECUTE format('
    CREATE OR REPLACE FUNCTION %I.sp_crear_vista(p_table_id integer, p_name character varying, p_sort_by integer DEFAULT NULL, p_sort_direction character varying DEFAULT ''asc'', p_position_num integer DEFAULT 0)
    RETURNS json
    LANGUAGE plpgsql
    AS $func$
    DECLARE
        v_view_id INT;
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM %I.tables WHERE id = p_table_id) THEN
            RETURN json_build_object(''error'', ''La tabla lógica no existe.'');
        END IF;

        IF TRIM(p_name) IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
            RETURN json_build_object(''error'', ''El nombre de la vista es obligatorio.'');
        END IF;

        INSERT INTO %I.views (table_id, name, sort_by, sort_direction, created_at, position_num)
        VALUES (p_table_id, p_name, p_sort_by, p_sort_direction, CURRENT_TIMESTAMP, p_position_num)
        RETURNING id INTO v_view_id;

        RETURN json_build_object(''success'', true, ''view_id'', v_view_id);
    END;
    $func$;
    ', schema_name, schema_name, schema_name);
END;
$$ LANGUAGE plpgsql;
