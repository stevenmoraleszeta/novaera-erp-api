
CREATE OR REPLACE FUNCTION public.sp_crear_columna(p_table_id integer, p_name character varying, p_data_type character varying, p_is_required boolean, p_is_foreign_key boolean, p_foreign_table_id integer DEFAULT NULL::integer, p_foreign_column_name character varying DEFAULT NULL::character varying, p_column_position integer DEFAULT 0, p_relation_type character varying DEFAULT NULL::character varying, p_validations character varying DEFAULT NULL::character varying)
 RETURNS TABLE(column_id integer, message text)
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_existe BOOLEAN;
    v_new_column_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RAISE EXCEPTION 'Error: La tabla lógica no existe.';
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM columns 
        WHERE table_id = p_table_id 
          AND LOWER(name) = LOWER(p_name)
    ) INTO v_existe;

    IF v_existe THEN
        RAISE EXCEPTION 'Ya existe una columna con ese nombre en la tabla lógica.';
    END IF;

    IF p_is_foreign_key THEN
        IF p_foreign_table_id IS NULL OR p_foreign_column_name IS NULL THEN
            RAISE EXCEPTION 'Error: Debe especificarse la tabla y columna referenciada si es clave foránea.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM tables t
            JOIN columns c ON c.table_id = t.id
            WHERE t.id = p_foreign_table_id AND c.name = p_foreign_column_name
        ) THEN
            RAISE EXCEPTION 'Error: La referencia de clave foránea no existe.';
        END IF;
    END IF;

    INSERT INTO columns (
        table_id, name, data_type, is_required, 
        is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations
    )
    VALUES (
        p_table_id, p_name, p_data_type, p_is_required, 
        p_is_foreign_key, p_foreign_table_id, p_foreign_column_name, p_column_position, p_relation_type,
        p_validations
    )
    RETURNING id INTO v_new_column_id;

    RETURN QUERY SELECT v_new_column_id, 'Columna creada exitosamente.'::TEXT;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_crear_comentario(p_record_id integer, p_table_id integer, p_user_id integer, p_comment_text text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_comment_id INT;
    v_user_name VARCHAR;
BEGIN
    -- Validaciones
    IF p_comment_text IS NULL OR LENGTH(TRIM(p_comment_text)) = 0 THEN
        RETURN json_build_object('error', 'El texto del comentario es obligatorio.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM records WHERE id = p_record_id) THEN
        RETURN json_build_object('error', 'El registro especificado no existe.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RETURN json_build_object('error', 'La tabla especificada no existe.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN json_build_object('error', 'El usuario especificado no existe.');
    END IF;

    -- Obtener nombre del usuario
    SELECT name INTO v_user_name FROM users WHERE id = p_user_id;

    -- Insertar comentario
    INSERT INTO record_comments (record_id, table_id, user_id, comment_text, created_at)
    VALUES (p_record_id, p_table_id, p_user_id, p_comment_text, CURRENT_TIMESTAMP)
    RETURNING id INTO v_comment_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Comentario creado exitosamente',
        'comment_id', v_comment_id,
        'user_name', v_user_name,
        'created_at', CURRENT_TIMESTAMP
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_crear_modulo(p_name character varying, p_description text, p_icon_url text, p_created_by integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_modulo_id INT;
    v_next_position INT;
BEGIN
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RETURN json_build_object('error', 'El nombre del módulo es obligatorio.');
    END IF;

    IF p_icon_url IS NULL OR LENGTH(TRIM(p_icon_url)) = 0 THEN
        RETURN json_build_object('error', 'La URL del ícono es obligatoria.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_created_by) THEN
        RETURN json_build_object('error', 'El usuario creador no existe.');
    END IF;

    IF EXISTS (SELECT 1 FROM modules WHERE LOWER(name) = LOWER(p_name)) THEN
        RETURN json_build_object('error', 'Ya existe un módulo con ese nombre.');
    END IF;

    -- Obtener la próxima posición
    SELECT COALESCE(MAX(position_num), 0) + 1 INTO v_next_position FROM modules;

    INSERT INTO modules (name, description, icon_url, created_by, created_at, position_num)
    VALUES (p_name, p_description, p_icon_url, p_created_by, CURRENT_TIMESTAMP, v_next_position)
    RETURNING id INTO v_modulo_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Módulo creado exitosamente',
        'module_id', v_modulo_id
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_crear_view_sort(p_view_id integer, p_column_id integer, p_direction character varying)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_sort_id INT;
    v_next_position INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM views WHERE id = p_view_id) THEN
        RETURN json_build_object('error', 'La vista no existe.');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM columns WHERE id = p_column_id) THEN
        RETURN json_build_object('error', 'La columna no existe.');
    END IF;

    IF p_direction NOT IN ('asc', 'desc') THEN
        RETURN json_build_object('error', 'La dirección debe ser asc o desc.');
    END IF;

    SELECT COALESCE(MAX(position_num), 0) + 1 INTO v_next_position
    FROM view_sorts
    WHERE view_id = p_view_id;

    INSERT INTO view_sorts(view_id, column_id, direction, position_num)
    VALUES (p_view_id, p_column_id, p_direction, v_next_position)
    RETURNING id INTO v_sort_id;

    RETURN json_build_object(
        'success', true,
        'message', 'Ordenamiento creado exitosamente.',
        'view_sort_id', v_sort_id
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_crear_vista(p_table_id integer, p_name character varying, p_sort_by integer DEFAULT NULL::integer, p_sort_direction character varying DEFAULT 'asc'::character varying, p_position_num integer DEFAULT 0)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_view_id INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
    RETURN json_build_object('error', 'La tabla lógica no existe.');
  END IF;

  IF TRIM(p_name) IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
    RETURN json_build_object('error', 'El nombre de la vista es obligatorio.');
  END IF;

  INSERT INTO views (table_id, name, sort_by, sort_direction, created_at, position_num)
  VALUES (p_table_id, p_name, p_sort_by, p_sort_direction, CURRENT_TIMESTAMP, p_position_num)
  RETURNING id INTO v_view_id;

  RETURN json_build_object('success', true, 'view_id', v_view_id);
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_desbloquear_usuario(p_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    UPDATE users
    SET is_blocked = false
    WHERE id = p_id;

    RETURN 'Usuario desbloqueado exitosamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_columna(p_columna_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_column_name TEXT;
    v_table_id INT;
    r_dependiente RECORD;
BEGIN
    -- Validar que la columna exista
    IF NOT EXISTS (SELECT 1 FROM columns WHERE id = p_columna_id) THEN
        RAISE EXCEPTION 'La columna con ID % no existe.', p_columna_id;
    END IF;

    -- Obtener datos de la columna
    SELECT name, table_id INTO v_column_name, v_table_id
    FROM columns
    WHERE id = p_columna_id;

    -- Recursivamente eliminar columnas que la usan como foreign key
    FOR r_dependiente IN
        SELECT id FROM columns 
        WHERE foreign_table_id = v_table_id
          AND foreign_column_name = v_column_name
    LOOP
        PERFORM sp_eliminar_columna(r_dependiente.id);
    END LOOP;

    -- Eliminar la clave del record_data en todos los registros de esa tabla
    UPDATE records
    SET record_data = record_data - v_column_name
    WHERE table_id = v_table_id
      AND record_data ? v_column_name;

    -- Eliminar la definición de la columna
    DELETE FROM columns WHERE id = p_columna_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_columna_vista(p_view_column_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM view_columns WHERE id = p_view_column_id) THEN
    RETURN 'Error: La columna de vista no existe.';
  END IF;

  DELETE FROM view_columns WHERE id = p_view_column_id;

  RETURN 'Columna de vista eliminada correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_comentario(p_comment_id integer, p_user_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM record_comments WHERE id = p_comment_id) THEN
        RAISE EXCEPTION 'El comentario especificado no existe.';
    END IF;

    -- Verificar que el usuario es el propietario del comentario
    IF NOT EXISTS (SELECT 1 FROM record_comments WHERE id = p_comment_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'No tienes permisos para eliminar este comentario.';
    END IF;

    -- Soft delete
    UPDATE record_comments 
    SET is_active = false, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_comment_id;

    RETURN 'Comentario eliminado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_modulo(p_module_id integer, p_cascada boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_tablas_asociadas INT;
    r_tabla RECORD;
    v_table_ids INT[];
BEGIN
    -- Verificar existencia del módulo
    IF NOT EXISTS (SELECT 1 FROM modules WHERE id = p_module_id) THEN
        RAISE EXCEPTION 'Error: No existe un módulo con el ID proporcionado (%).', p_module_id;
    END IF;

    -- Contar tablas asociadas
    SELECT COUNT(*) INTO v_tablas_asociadas
    FROM tables
    WHERE module_id = p_module_id;

    -- Si hay tablas y no se permite cascada, abortar
    IF v_tablas_asociadas > 0 AND NOT p_cascada THEN
        RAISE EXCEPTION 'Error: El módulo tiene % tablas asociadas. Deben eliminarse primero o permitir la eliminación en cascada.', v_tablas_asociadas;
    END IF;

    -- Si hay tablas y se permite cascada, eliminarlas con manejo mejorado
    IF p_cascada THEN
        -- Obtener todos los IDs de tablas del módulo
        SELECT array_agg(id) INTO v_table_ids
        FROM tables 
        WHERE module_id = p_module_id;

        -- Si hay tablas para eliminar
        IF array_length(v_table_ids, 1) > 0 THEN
            -- Paso 1: Eliminar todas las referencias de foreign_table_id en columns que apunten a estas tablas
            DELETE FROM columns 
            WHERE foreign_table_id = ANY(v_table_ids);

            -- Paso 2: Actualizar foreign_table_id en tables que referencien a las tablas del módulo
            UPDATE tables 
            SET foreign_table_id = NULL 
            WHERE foreign_table_id = ANY(v_table_ids);

            -- Paso 3: Actualizar original_table_id en tables que referencien a las tablas del módulo  
            UPDATE tables 
            SET original_table_id = NULL 
            WHERE original_table_id = ANY(v_table_ids);

            -- Paso 4: Eliminar todas las columnas de las tablas del módulo
            DELETE FROM columns 
            WHERE table_id = ANY(v_table_ids);

            -- Paso 5: Eliminar todos los registros de las tablas del módulo
            DELETE FROM records 
            WHERE table_id = ANY(v_table_ids);

            -- Paso 6: Eliminar permisos asociados a las tablas del módulo
            DELETE FROM permissions 
            WHERE table_id = ANY(v_table_ids);

            -- Paso 7: Finalmente eliminar las tablas del módulo
            DELETE FROM tables 
            WHERE id = ANY(v_table_ids);
        END IF;
    END IF;

    -- Eliminar el módulo
    DELETE FROM modules WHERE id = p_module_id;

    RETURN 'Módulo eliminado correctamente.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error al eliminar el módulo: %', SQLERRM;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_permisos_por_tabla(p_table_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
    RAISE EXCEPTION 'La tabla lógica con ID % no existe.', p_table_id;
  END IF;

  DELETE FROM permissions WHERE table_id = p_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_permisos_rol_sobre_tabla(p_table_id integer, p_role_id integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM permissions
    WHERE table_id = p_table_id AND role_id = p_role_id;

    RAISE NOTICE 'Permisos eliminados para rol % en tabla %', p_role_id, p_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_usuario(p_id integer, p_tipo_eliminacion character varying)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    IF p_id = 1 THEN
        RETURN 'Error: Este usuario está protegido y no puede ser eliminado.';
    END IF;

    IF LOWER(p_tipo_eliminacion) = 'logica' THEN
        UPDATE users SET is_active = false WHERE id = p_id;
        RETURN 'Usuario desactivado (eliminación lógica) correctamente.';
    ELSIF LOWER(p_tipo_eliminacion) = 'fisica' THEN
        DELETE FROM users WHERE id = p_id;
        RETURN 'Usuario eliminado físicamente del sistema.';
    ELSE
        RETURN 'Error: Tipo de eliminación no válido. Use logica o fisica.';
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_view_sort(p_view_sort_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM view_sorts WHERE id = p_view_sort_id) THEN
        RETURN 'Error: No existe el ordenamiento con el ID proporcionado.';
    END IF;

    DELETE FROM view_sorts WHERE id = p_view_sort_id;

    RETURN 'Ordenamiento eliminado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_eliminar_vista(p_view_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM views WHERE id = p_view_id) THEN
    RETURN 'Error: La vista no existe.';
  END IF;

  DELETE FROM view_columns WHERE view_id = p_view_id;
  DELETE FROM views WHERE id = p_view_id;

  RETURN 'Vista eliminada exitosamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_existe_nombre_columna_en_tabla(p_table_id integer, p_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    existe BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM columns 
        WHERE table_id = p_table_id AND name ILIKE p_name
    ) INTO existe;

    RETURN existe;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_existe_nombre_tabla_en_modulo(p_module_id integer, p_table_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_existe BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM tables t
        WHERE t.module_id = p_module_id 
          AND LOWER(t.name) = LOWER(p_table_name)
    ) INTO v_existe;

    RETURN v_existe;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_existe_usuario_por_email(p_email character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_existe BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM users u WHERE u.email = p_email
    ) INTO v_existe;

    RETURN v_existe;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_columna_por_id(p_columna_id integer)
 RETURNS TABLE(id_columna integer, table_id integer, name character varying, data_type character varying, is_required boolean, is_foreign_key boolean, foreign_table_id integer, foreign_column_name character varying, created_at timestamp without time zone, column_position integer, relation_type character varying, validations character varying, is_unique boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM columns WHERE id = p_columna_id) THEN
        RAISE EXCEPTION 'No existe una columna con el ID proporcionado: %', p_columna_id;
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.table_id,
        c.name,
        c.data_type,
        c.is_required,
        c.is_foreign_key,
        c.foreign_table_id,
        c.foreign_column_name,
        c.created_at,
        c.column_position,
        c.relation_type,
        c.validations,
		c.is_unique
    FROM columns c
    WHERE c.id = p_columna_id;
END;
$function$


