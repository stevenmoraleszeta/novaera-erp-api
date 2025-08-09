-- =    -- 5. Crear todas las tablas del sistema en el nuevo schema
    PERFORM create_company_tables(v_schema_name);
    
    -- 6. Copiar dinámicamente todas las funciones del schema public al nuevo schema
    PERFORM copy_public_functions_to_schema(v_schema_name);
    
    -- 7. Insertar datos iniciales (roles, configuraciones, etc.)
    PERFORM setup_initial_data(v_schema_name);==========================    -- 4. Establecer el search_path para crear las tablas en el nuevo schema
    -- CORRECCIÓN: Incluir public para que encuentre las funciones
    EXECUTE format('SET search_path TO %I, public', v_schema_name);
    
    -- 5. Crear todas las tablas y funciones del sistema en el nuevo schema
    PERFORM create_company_tables(v_schema_name);
    PERFORM create_all_company_functions(v_schema_name);
    
    -- 6. Insertar datos iniciales (roles, configuraciones, etc.)
    PERFORM setup_initial_data(v_schema_name);
-- FUNCIÓN PARA CREAR SCHEMA DE EMPRESA AUTOMÁTICAMENTE
-- =========================================

-- Función principal para crear una nueva empresa con su schema completo
CREATE OR REPLACE FUNCTION create_company_schema(
    p_company_name VARCHAR(255),
    p_email VARCHAR(255),
    p_phone VARCHAR(50) DEFAULT NULL,
    p_address TEXT DEFAULT NULL,
    p_admin_name VARCHAR(100) DEFAULT NULL,
    p_admin_email VARCHAR(255) DEFAULT NULL,
    p_admin_password VARCHAR(255) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_company_code VARCHAR(20);
    v_schema_name VARCHAR(63);
    v_company_id INTEGER;
    v_admin_user_id INTEGER;
    result JSON;
BEGIN
    -- 1. Generar código y nombre de schema
    v_company_code := generate_company_code();
    v_schema_name := generate_schema_name(p_company_name);
    
    -- 2. Insertar empresa en la tabla principal
    INSERT INTO public.companies (
        company_code, company_name, schema_name, email, phone, address
    ) VALUES (
        v_company_code, p_company_name, v_schema_name, p_email, p_phone, p_address
    ) RETURNING id INTO v_company_id;
    
    -- 3. Crear el schema
    EXECUTE format('CREATE SCHEMA %I', v_schema_name);
    
    -- 4. Establecer el search_path para crear las tablas en el nuevo schema
    -- Incluir public para que encuentre las funciones
    EXECUTE format('SET search_path TO %I, public', v_schema_name);
    
    -- 5. Crear todas las tablas del sistema en el nuevo schema
    PERFORM create_company_tables(v_schema_name);
    
    -- 6. Insertar datos iniciales (roles, configuraciones, etc.)
    PERFORM setup_initial_data(v_schema_name);
    
    -- 7. Copiar todas las funciones del schema public al nuevo schema
    PERFORM copy_public_functions_to_schema(v_schema_name);
    
    -- 8. Crear usuario administrador si se proporcionaron datos
    IF p_admin_name IS NOT NULL AND p_admin_email IS NOT NULL AND p_admin_password IS NOT NULL THEN
        v_admin_user_id := create_admin_user(v_schema_name, p_admin_name, p_admin_email, p_admin_password);
    END IF;
    
    -- 9. Restaurar search_path
    SET search_path TO public;
    
    -- 10. Preparar resultado
    result := json_build_object(
        'success', true,
        'company_id', v_company_id,
        'company_code', v_company_code,
        'schema_name', v_schema_name,
        'admin_user_id', v_admin_user_id,
        'message', 'Empresa creada exitosamente'
    );
    
    RETURN result;
    
EXCEPTION
    WHEN OTHERS THEN
        -- En caso de error, limpiar todo
        PERFORM cleanup_failed_company_creation(v_schema_name, v_company_id);
        
        result := json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Error al crear la empresa'
        );
        
        RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Función para crear todas las tablas en el schema de la empresa
CREATE OR REPLACE FUNCTION create_company_tables(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- Crear todas las tablas principales usando el contenido de creation.sql
    EXECUTE format('
        -- 1. Entidades principales
        CREATE TABLE %I.modules (
            id SERIAL PRIMARY KEY,
            icon_url text,
            description text,
            position_num integer,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            created_by integer,
            name character varying(100)
        );

        CREATE TABLE %I.tables (
            id SERIAL PRIMARY KEY,
            position_num integer,
            original_table_id integer,
            description text,
            name character varying(100),
            foreign_table_id integer,
            module_id integer,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE %I.users (
            id SERIAL PRIMARY KEY,
            name character varying(100) NOT NULL,
            is_active boolean DEFAULT true,
            avatar_url text,
            is_blocked boolean DEFAULT false,
            password_hash text NOT NULL,
            last_login timestamp without time zone,
            email character varying(100) UNIQUE NOT NULL
        );

        CREATE TABLE %I.roles (
            id SERIAL PRIMARY KEY,
            active boolean DEFAULT true,
            is_admin boolean DEFAULT false,
            name character varying(50) NOT NULL
        );

        -- 2. Relaciones básicas
        CREATE TABLE %I.user_roles (
            user_id integer NOT NULL,
            role_id integer NOT NULL,
            PRIMARY KEY (user_id, role_id)
        );

        CREATE TABLE %I.columns (
            id SERIAL PRIMARY KEY,
            is_required boolean DEFAULT false,
            selection_type character varying(20),
            is_unique boolean DEFAULT false,
            table_id integer NOT NULL,
            validations character varying(500),
            column_position integer,
            relation_type character varying(50),
            foreign_table_id integer,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            name character varying(100) NOT NULL,
            data_type character varying(50) NOT NULL,
            is_foreign_key boolean DEFAULT false,
            foreign_column_name character varying(100)
        );
    ', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);
    
    -- Continúar con más tablas...
    EXECUTE format('
        CREATE TABLE %I.column_options (
            id SERIAL PRIMARY KEY,
            column_id integer NOT NULL,
            option_order integer,
            is_active boolean DEFAULT true,
            option_label character varying(255),
            option_value character varying(255),
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        -- 3. Datos principales
        CREATE TABLE %I.records (
            id SERIAL PRIMARY KEY,
            position_num integer,
            table_id integer NOT NULL,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            record_data jsonb NOT NULL
        );

        -- 4. Relaciones con records
        CREATE TABLE %I.record_subscriptions (
            id SERIAL PRIMARY KEY,
            record_id integer,
            table_id integer NOT NULL,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            is_active boolean DEFAULT true,
            created_by integer,
            notification_types integer[],
            user_id integer NOT NULL
        );

        CREATE TABLE %I.record_changes (
            id SERIAL PRIMARY KEY,
            change_type character varying(20) NOT NULL,
            changed_by integer,
            ip_address text,
            record_id integer NOT NULL,
            changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            new_data jsonb,
            old_data jsonb,
            table_id integer NOT NULL,
            user_agent text
        );
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
    
    -- Más tablas...
    EXECUTE format('
        CREATE TABLE %I.record_comments (
            id SERIAL PRIMARY KEY,
            record_id integer NOT NULL,
            comment_text text NOT NULL,
            is_active boolean DEFAULT true,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            user_id integer NOT NULL,
            table_id integer NOT NULL,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE %I.record_assigned_users (
            id SERIAL PRIMARY KEY,
            assigned_by integer,
            record_id integer NOT NULL,
            assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            user_id integer NOT NULL
        );

        -- 5. Permisos y colaboración
        CREATE TABLE %I.permissions (
            id SERIAL PRIMARY KEY,
            table_id integer NOT NULL,
            can_read boolean DEFAULT false,
            can_update boolean DEFAULT false,
            can_create boolean DEFAULT false,
            role_id integer NOT NULL,
            can_delete boolean DEFAULT false
        );

        CREATE TABLE %I.table_collaborators (
            id SERIAL PRIMARY KEY,
            is_active boolean DEFAULT true,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            user_id integer NOT NULL,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            notes text,
            assigned_by integer,
            table_id integer NOT NULL,
            assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
        );
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
    
    -- Sistema de notificaciones y más...
    EXECUTE format('
        -- 6. Vistas y visualización
        CREATE TABLE %I.views (
            id SERIAL PRIMARY KEY,
            table_id integer NOT NULL,
            sort_direction character varying(10),
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            sort_by integer,
            position_num integer,
            name character varying(100) NOT NULL
        );

        CREATE TABLE %I.view_columns (
            id SERIAL PRIMARY KEY,
            filter_condition character varying(50),
            view_id integer NOT NULL,
            visible boolean DEFAULT true,
            width_px integer,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            column_id integer NOT NULL,
            position_num integer,
            filter_value text
        );

        CREATE TABLE %I.view_sorts (
            id SERIAL PRIMARY KEY,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            column_id integer NOT NULL,
            direction character varying(10) DEFAULT ''ASC'',
            view_id integer NOT NULL,
            position_num integer
        );

        -- 7. Sistema de notificaciones
        CREATE TABLE %I.notifications (
            id SERIAL PRIMARY KEY,
            record_id integer,
            user_id integer NOT NULL,
            read boolean DEFAULT false,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            link_to_module text,
            message text,
            title character varying(100) NOT NULL,
            is_active boolean DEFAULT true,
            reminder_at timestamp without time zone
        );
    ', schema_name, schema_name, schema_name, schema_name, schema_name);
    
    EXECUTE format('
        CREATE TABLE %I.scheduled_notifications (
            id SERIAL PRIMARY KEY,
            created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            sent boolean DEFAULT false,
            created_by integer,
            updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            table_id integer NOT NULL,
            notification_sent boolean DEFAULT false,
            is_active boolean DEFAULT true,
            target_date timestamp without time zone,
            notify_before_days integer DEFAULT 0,
            notification_title character varying(200),
            sent_at timestamp without time zone,
            column_id integer,
            record_id integer,
            read boolean DEFAULT false,
            assigned_users integer[],
            notification_message text
        );

        -- 8. Auditoría y sistema
        CREATE TABLE %I.audit_log (
            id SERIAL PRIMARY KEY,
            new_data jsonb,
            changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            changed_by integer,
            record_id integer,
            action text NOT NULL,
            table_name text NOT NULL,
            old_data jsonb
        );

        CREATE TABLE %I.user_login_history (
            id SERIAL PRIMARY KEY,
            login_time timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            ip_address text,
            user_id integer NOT NULL,
            user_agent text
        );

        CREATE TABLE %I.files (
            id SERIAL PRIMARY KEY,
            uploaded_by integer,
            is_active boolean DEFAULT true,
            file_hash character varying(64),
            uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
            file_data bytea,
            file_size bigint,
            original_name character varying(255) NOT NULL,
            mime_type character varying(100)
        );
    ', schema_name, schema_name, schema_name, schema_name, schema_name);

END;
$$ LANGUAGE plpgsql;

-- Función para configurar datos iniciales
CREATE OR REPLACE FUNCTION setup_initial_data(schema_name VARCHAR(63))
RETURNS VOID AS $$
BEGIN
    -- Insertar roles básicos
    EXECUTE format('
        INSERT INTO %I.roles (name, is_admin, active) VALUES 
        (''Super Administrador'', true, true),
        (''Administrador'', true, true),
        (''Usuario'', false, true),
        (''Invitado'', false, true);
    ', schema_name);
END;
$$ LANGUAGE plpgsql;

-- Función para crear usuario administrador
CREATE OR REPLACE FUNCTION create_admin_user(
    schema_name VARCHAR(63),
    admin_name VARCHAR(100),
    admin_email VARCHAR(255),
    admin_password VARCHAR(255)
)
RETURNS INTEGER AS $$
DECLARE
    v_user_id INTEGER;
    v_admin_role_id INTEGER;
BEGIN
    -- Crear usuario administrador
    EXECUTE format('
        INSERT INTO %I.users (name, email, password_hash, is_active) 
        VALUES ($1, $2, $3, true) 
        RETURNING id
    ', schema_name) 
    USING admin_name, admin_email, admin_password
    INTO v_user_id;
    
    -- Obtener ID del rol de Super Administrador
    EXECUTE format('SELECT id FROM %I.roles WHERE is_admin = true LIMIT 1', schema_name)
    INTO v_admin_role_id;
    
    -- Asignar rol de administrador
    EXECUTE format('
        INSERT INTO %I.user_roles (user_id, role_id) 
        VALUES ($1, $2)
    ', schema_name)
    USING v_user_id, v_admin_role_id;
    
    RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

-- Función de limpieza en caso de error
CREATE OR REPLACE FUNCTION cleanup_failed_company_creation(
    schema_name VARCHAR(63),
    company_id INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Eliminar schema si existe
    IF schema_name IS NOT NULL THEN
        EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
    END IF;
    
    -- Eliminar registro de empresa si existe
    IF company_id IS NOT NULL THEN
        DELETE FROM public.companies WHERE id = company_id;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Si hay error en la limpieza, solo log pero no fallar
        RAISE NOTICE 'Error durante limpieza: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
