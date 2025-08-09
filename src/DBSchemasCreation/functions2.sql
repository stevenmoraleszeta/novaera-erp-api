CREATE OR REPLACE FUNCTION public.establecer_permisos_rol_tabla(p_rol_id integer, p_table_id integer, p_can_create boolean, p_can_read boolean, p_can_update boolean, p_can_delete boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación de IDs
    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RETURN 'ID de rol inválido.';
    END IF;

    IF p_table_id IS NULL OR p_table_id <= 0 THEN
        RETURN 'ID de tabla lógica inválido.';
    END IF;

    -- Validación de existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'El rol con ID ' || p_rol_id || ' no existe.';
    END IF;

    -- Validación de existencia de la tabla lógica
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RETURN 'La tabla lógica con ID ' || p_table_id || ' no existe.';
    END IF;

    -- Validar si ya existen permisos para esta combinación
    IF EXISTS (
        SELECT 1 FROM permissions
        WHERE role_id = p_rol_id AND table_id = p_table_id
    ) THEN
        RETURN 'Ya existen permisos para este rol sobre esta tabla. Use el procedimiento de actualización.';
    END IF;

    -- Insertar nuevos permisos
    INSERT INTO permissions (
        role_id, table_id, can_create, can_read, can_update, can_delete
    ) VALUES (
        p_rol_id, p_table_id, p_can_create, p_can_read, p_can_update, p_can_delete
    );

    RETURN 'Permisos establecidos correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.existe_campo_en_registros(p_table_id integer, p_field_name text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM records
        WHERE records.table_id = p_table_id
          AND records.record_data ? p_field_name
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.insertar_registro_dinamico(p_table_id integer, p_data jsonb, p_position_num integer)
 RETURNS json
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_columna RECORD;
    v_new_record RECORD;
BEGIN
    -- Validar si existe la tabla lógica
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'La tabla lógica no existe.'
        );
    END IF;

    -- Validar las columnas definidas
    FOR v_columna IN
        SELECT * FROM columns WHERE table_id = p_table_id
    LOOP
        IF v_columna.is_required AND NOT p_data ? v_columna.name THEN
            RETURN json_build_object(
                'success', false,
                'error', FORMAT('El campo requerido %s no está presente.', v_columna.name)
            );
        END IF;

        IF p_data ? v_columna.name THEN
            IF v_columna.data_type = 'int' AND NOT (p_data ->> v_columna.name ~ '^\d+$') THEN
                RETURN json_build_object(
                    'success', false,
                    'error', FORMAT('El campo %s debe ser de tipo entero.', v_columna.name)
                );
            ELSIF v_columna.data_type = 'boolean' AND NOT (p_data ->> v_columna.name ~ '^(true|false)$') THEN
                RETURN json_build_object(
                    'success', false,
                    'error', FORMAT('El campo %s debe ser de tipo booleano.', v_columna.name)
                );
            ELSIF v_columna.data_type = 'text' AND NOT jsonb_typeof(p_data -> v_columna.name) = 'string' THEN
                RETURN json_build_object(
                    'success', false,
                    'error', FORMAT('El campo %s debe ser texto.', v_columna.name)
                );
            END IF;
        END IF;
    END LOOP;

    -- Insertar el registro y devolver la fila como JSON
    INSERT INTO records (table_id, record_data, position_num)
    VALUES (p_table_id, p_data, p_position_num)
    RETURNING * INTO v_new_record;

    RETURN json_build_object(
        'success', true,
        'record', json_build_object(
            'id', v_new_record.id,
            'table_id', v_new_record.table_id,
            'position_num', v_new_record.position_num,
            'record_data', v_new_record.record_data,
            'created_at', v_new_record.created_at
        )
    );
END;
$function$

CREATE OR REPLACE FUNCTION public.marcar_notificacion_leida(p_user_id integer, p_notificacion_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM notifications 
        WHERE id = p_notificacion_id AND user_id = p_user_id
    ) THEN
        RETURN 'Error: Notificación no encontrada o no pertenece al usuario.';
    END IF;

    UPDATE notifications
    SET read = TRUE
    WHERE id = p_notificacion_id AND user_id = p_user_id;

    RETURN 'Notificación marcada como leída.';
END;
$function$

CREATE OR REPLACE FUNCTION public.marcar_todas_como_leidas(p_user_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE notifications
    SET read = TRUE
    WHERE user_id = p_user_id AND read = FALSE;

    RETURN 'Todas las notificaciones marcadas como leídas.';
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_notificaciones_usuario(p_user_id integer, p_solo_no_leidas boolean DEFAULT false)
 RETURNS TABLE(id integer, user_id integer, title character varying, message text, link_to_module text, read boolean, reminder_at timestamp without time zone, created_at timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT n.id, n.user_id, n.title, n.message, n.link_to_module, n.read, n.reminder_at, n.created_at
    FROM notifications n
    WHERE n.user_id = p_user_id
      AND (NOT p_solo_no_leidas OR n.read = FALSE)
    ORDER BY n.created_at DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_permisos_de_rol(p_rol_id integer)
 RETURNS TABLE(table_id integer, can_create boolean, can_read boolean, can_update boolean, can_delete boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.table_id,
    p.can_create,
    p.can_read,
    p.can_update,
    p.can_delete
  FROM permissions p
  WHERE p.role_id = p_rol_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_permisos_rol_tabla(p_rol_id integer, p_table_id integer)
 RETURNS TABLE(can_create boolean, can_read boolean, can_update boolean, can_delete boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación de IDs
    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RAISE NOTICE 'ID de rol inválido.';
        RETURN;
    END IF;

    IF p_table_id IS NULL OR p_table_id <= 0 THEN
        RAISE NOTICE 'ID de tabla lógica inválido.';
        RETURN;
    END IF;

    -- Validación de existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RAISE NOTICE 'El rol con ID % no existe.', p_rol_id;
        RETURN;
    END IF;

    -- Validación de existencia de la tabla
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RAISE NOTICE 'La tabla lógica con ID % no existe.', p_table_id;
        RETURN;
    END IF;

    -- Validación de existencia del registro de permisos
    IF NOT EXISTS (
        SELECT 1 FROM permissions
        WHERE role_id = p_rol_id AND table_id = p_table_id
    ) THEN
        RAISE NOTICE 'No hay permisos asignados para este rol en esta tabla.';
        RETURN;
    END IF;

    -- Retorno de permisos
    RETURN QUERY
    SELECT 
        permissions.can_create, 
        permissions.can_read, 
        permissions.can_update, 
        permissions.can_delete
    FROM permissions
    WHERE role_id = p_rol_id AND table_id = p_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_registro_por_id(p_record_id integer)
 RETURNS TABLE(id integer, table_id integer, record_data jsonb, created_at timestamp without time zone, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM records WHERE records.id = p_record_id) THEN
        RAISE NOTICE 'El registro con ID % no existe.', p_record_id;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT records.id, records.table_id, records.record_data, records.created_at, records.position_num
    FROM records
    WHERE records.id = p_record_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_registros_por_tabla(p_table_id integer)
 RETURNS TABLE(id integer, record_data jsonb, created_at timestamp without time zone, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT records.id, records.record_data, records.created_at, records.position_num
    FROM records
    WHERE records.table_id = p_table_id
    ORDER BY records.position_num;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_rol_por_id(p_rol_id integer)
 RETURNS TABLE(rol_id integer, rol_name character varying, rol_description text, rol_active boolean, rol_is_admin boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RAISE NOTICE 'ID de rol no válido.';
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RAISE NOTICE 'No se encontró ningún rol con el ID %.', p_rol_id;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT r.id, r.name, r.description, r.active, r.is_admin
    FROM roles r
    WHERE r.id = p_rol_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_roles()
 RETURNS TABLE(rol_id integer, rol_name character varying, rol_description text, rol_active boolean, rol_is_admin boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM roles) THEN
        RAISE NOTICE 'No existen roles registrados en el sistema.';
        RETURN;
    END IF;

    RETURN QUERY
    SELECT r.id, r.name, r.description, r.active, r.is_admin
    FROM roles r
    ORDER BY r.name ASC;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_roles_de_usuario(p_user_id integer)
 RETURNS TABLE(rol_id integer, rol_name character varying)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación de ID
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        RAISE NOTICE 'ID de usuario inválido.';
        RETURN;
    END IF;

    -- Validación de existencia del usuario
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RAISE NOTICE 'El usuario con ID % no existe.', p_user_id;
        RETURN;
    END IF;

    -- Consulta de roles asignados
    RETURN QUERY
    SELECT r.id, r.name
    FROM user_roles ur
    INNER JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    ORDER BY r.name;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_tabla_por_id(p_table_id integer)
 RETURNS TABLE(id integer, name character varying, description text, module_id integer, original_table_id integer, foreign_table_id integer, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM tables t WHERE t.id = p_table_id) THEN
        RAISE NOTICE 'La tabla lógica con ID % no existe.', p_table_id;
        RETURN;
    END IF;

    RETURN QUERY
    SELECT t.id, t.name, t.description, t.module_id, t.original_table_id, t.foreign_table_id, t.position_num
    FROM tables t
    WHERE t.id = p_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.obtener_tablas_por_modulo(p_module_id integer)
 RETURNS TABLE(id integer, name character varying, description text, created_at timestamp without time zone, original_table_id integer, foreign_table_id integer, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name, t.description, t.created_at, t.original_table_id, t.foreign_table_id, t.position_num
    FROM tables t
    WHERE t.module_id = p_module_id
    ORDER BY t.position_num;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_columna(columna_id integer, nuevo_nombre character varying DEFAULT NULL::character varying, nuevo_tipo character varying DEFAULT NULL::character varying, nuevo_requerido boolean DEFAULT NULL::boolean, nueva_clave_foranea boolean DEFAULT NULL::boolean, nueva_tabla_ref integer DEFAULT NULL::integer, nueva_columna_ref character varying DEFAULT NULL::character varying, nueva_posicion integer DEFAULT NULL::integer, nueva_relacion character varying DEFAULT NULL::character varying, nueva_validacion character varying DEFAULT NULL::character varying, nueva_is_unique boolean DEFAULT NULL::boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_table_id INT;
    v_nombre_actual VARCHAR;
BEGIN
    -- Verificar que la columna exista
    SELECT table_id, name INTO v_table_id, v_nombre_actual
    FROM columns
    WHERE id = columna_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una columna con el ID proporcionado: %', columna_id;
    END IF;

    -- Validar que no exista otra columna con el mismo nombre en esa tabla
    IF nuevo_nombre IS NOT NULL AND LOWER(nuevo_nombre) <> LOWER(v_nombre_actual) THEN
        IF EXISTS (
            SELECT 1 FROM columns
            WHERE table_id = v_table_id
              AND LOWER(name) = LOWER(nuevo_nombre)
              AND id <> columna_id
        ) THEN
            RAISE EXCEPTION 'Ya existe otra columna con el nombre %, en la misma tabla lógica.', nuevo_nombre;
        END IF;
    END IF;

    -- Ejecutar el UPDATE
    UPDATE columns
    SET
        name = COALESCE(nuevo_nombre, name),
        data_type = COALESCE(nuevo_tipo, data_type),
        is_required = COALESCE(nuevo_requerido, is_required),
        is_foreign_key = COALESCE(nueva_clave_foranea, is_foreign_key),
        foreign_table_id = COALESCE(nueva_tabla_ref, foreign_table_id),
        foreign_column_name = COALESCE(nueva_columna_ref, foreign_column_name),
        column_position = COALESCE(nueva_posicion, column_position),
        relation_type = COALESCE(nueva_relacion, relation_type),
        validations = COALESCE(nueva_validacion, validations),
		is_unique = COALESCE(nueva_is_unique, is_unique)
    WHERE id = columna_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_columna(columna_id integer, nuevo_nombre character varying DEFAULT NULL::character varying, nuevo_tipo character varying DEFAULT NULL::character varying, nuevo_requerido boolean DEFAULT NULL::boolean, nueva_clave_foranea boolean DEFAULT NULL::boolean, nueva_tabla_ref integer DEFAULT NULL::integer, nueva_columna_ref character varying DEFAULT NULL::character varying, nueva_posicion integer DEFAULT NULL::integer, nueva_relacion character varying DEFAULT NULL::character varying, nueva_validacion character varying DEFAULT NULL::character varying)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_table_id INT;
    v_nombre_actual VARCHAR;
BEGIN
    -- Verificar que la columna exista
    SELECT table_id, name INTO v_table_id, v_nombre_actual
    FROM columns
    WHERE id = columna_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe una columna con el ID proporcionado: %', columna_id;
    END IF;

    -- Validar que no exista otra columna con el mismo nombre en esa tabla
    IF nuevo_nombre IS NOT NULL AND LOWER(nuevo_nombre) <> LOWER(v_nombre_actual) THEN
        IF EXISTS (
            SELECT 1 FROM columns
            WHERE table_id = v_table_id
              AND LOWER(name) = LOWER(nuevo_nombre)
              AND id <> columna_id
        ) THEN
            RAISE EXCEPTION 'Ya existe otra columna con el nombre %, en la misma tabla lógica.', nuevo_nombre;
        END IF;
    END IF;

    -- Ejecutar el UPDATE
    UPDATE columns
    SET
        name = COALESCE(nuevo_nombre, name),
        data_type = COALESCE(nuevo_tipo, data_type),
        is_required = COALESCE(nuevo_requerido, is_required),
        is_foreign_key = COALESCE(nueva_clave_foranea, is_foreign_key),
        foreign_table_id = COALESCE(nueva_tabla_ref, foreign_table_id),
        foreign_column_name = COALESCE(nueva_columna_ref, foreign_column_name),
        column_position = COALESCE(nueva_posicion, column_position),
        relation_type = COALESCE(nueva_relacion, relation_type),
        validations = COALESCE(nueva_validacion, validations)
    WHERE id = columna_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_columna_vista(p_column_id integer, p_visibility boolean DEFAULT NULL::boolean, p_filter_condition character varying DEFAULT NULL::character varying, p_filter_value character varying DEFAULT NULL::character varying, p_position_num integer DEFAULT NULL::integer, p_width_px integer DEFAULT NULL::integer, p_new_column_id integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM view_columns WHERE id = p_column_id) THEN
    RETURN 'Error: No existe una columna de vista con el ID proporcionado.';
  END IF;

  IF p_visibility IS NOT NULL THEN
    UPDATE view_columns SET visible = p_visibility WHERE id = p_column_id;
  END IF;

  IF p_filter_condition IS NOT NULL THEN
    UPDATE view_columns SET filter_condition = p_filter_condition WHERE id = p_column_id;
  END IF;

  IF p_filter_value IS NOT NULL THEN
    UPDATE view_columns SET filter_value = p_filter_value WHERE id = p_column_id;
  END IF;

  IF p_position_num IS NOT NULL THEN
    UPDATE view_columns SET position_num = p_position_num WHERE id = p_column_id;
  END IF;

  IF p_width_px IS NOT NULL THEN
    UPDATE view_columns SET width_px = p_width_px WHERE id = p_column_id;
  END IF;

  IF p_new_column_id IS NOT NULL THEN
    UPDATE view_columns SET column_id = p_new_column_id WHERE id = p_column_id;
  END IF;

  RETURN 'Columna de vista actualizada correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_comentario(p_comment_id integer, p_user_id integer, p_comment_text text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validaciones
    IF p_comment_text IS NULL OR LENGTH(TRIM(p_comment_text)) = 0 THEN
        RAISE EXCEPTION 'El texto del comentario es obligatorio.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM record_comments WHERE id = p_comment_id) THEN
        RAISE EXCEPTION 'El comentario especificado no existe.';
    END IF;

    -- Verificar que el usuario es el propietario del comentario
    IF NOT EXISTS (SELECT 1 FROM record_comments WHERE id = p_comment_id AND user_id = p_user_id) THEN
        RAISE EXCEPTION 'No tienes permisos para editar este comentario.';
    END IF;

    -- Actualizar comentario
    UPDATE record_comments 
    SET comment_text = p_comment_text, 
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_comment_id;

    RETURN 'Comentario actualizado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_contrasena(p_id integer, p_password_hash text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    IF p_password_hash IS NULL OR LENGTH(TRIM(p_password_hash)) = 0 THEN
        RETURN 'Error: La nueva contraseña es obligatoria.';
    END IF;

    UPDATE users
    SET password_hash = p_password_hash
    WHERE id = p_id;

    RETURN 'Contraseña actualizada exitosamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_estado_activo(p_id integer, p_activo boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    UPDATE users
    SET is_active = p_activo
    WHERE id = p_id;

    IF p_activo THEN
        RETURN 'Usuario activado correctamente.';
    ELSE
        RETURN 'Usuario desactivado correctamente.';
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_modulo(p_module_id integer, p_name character varying DEFAULT NULL::character varying, p_description text DEFAULT NULL::text, p_icon_url text DEFAULT NULL::text, p_position_num integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM modules WHERE id = p_module_id) THEN
        RETURN 'Error: No existe un módulo con el ID proporcionado.';
    END IF;

    IF p_name IS NOT NULL AND LENGTH(TRIM(p_name)) > 0 THEN
        UPDATE modules SET name = p_name WHERE id = p_module_id;
    END IF;

    IF p_description IS NOT NULL AND LENGTH(TRIM(p_description)) > 0 THEN
        UPDATE modules SET description = p_description WHERE id = p_module_id;
    END IF;

    IF p_icon_url IS NOT NULL AND LENGTH(TRIM(p_icon_url)) > 0 THEN
        UPDATE modules SET icon_url = p_icon_url WHERE id = p_module_id;
    END IF;

    IF p_position_num IS NOT NULL THEN
        UPDATE modules SET position_num = p_position_num WHERE id = p_module_id;
    END IF;

    RETURN 'Módulo actualizado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_columna(p_columna_id integer, p_nueva_posicion integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM columns WHERE id = p_columna_id) THEN
        RAISE EXCEPTION 'La columna con ID % no existe.', p_columna_id;
    END IF;

    UPDATE columns
    SET column_position = p_nueva_posicion
    WHERE id = p_columna_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_modulo(p_modulo_id integer, p_nueva_posicion integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM modules WHERE id = p_modulo_id) THEN
        RAISE EXCEPTION 'El modulo con ID % no existe.', p_modulo_id;
    END IF;

    UPDATE modules
    SET position_num = p_nueva_posicion
    WHERE id = p_modulo_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_registro(p_registro_id integer, p_nueva_posicion integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM records WHERE id = p_registro_id) THEN
        RAISE EXCEPTION 'El registro con ID % no existe.', p_registro_id;
    END IF;

    UPDATE records
    SET position_num = p_nueva_posicion
    WHERE id = p_registro_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_tabla(p_table_id integer, p_nueva_posicion integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validar que la tabla exista
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RAISE EXCEPTION 'La tabla con ID % no existe.', p_table_id;
    END IF;

    -- Actualizar la posición
    UPDATE tables
    SET position_num = p_nueva_posicion
    WHERE id = p_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_view_column(p_view_column_id integer, p_nueva_posicion integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM view_columns WHERE id = p_view_column_id) THEN
        RAISE EXCEPTION 'La columna de vista con ID % no existe.', p_view_column_id;
    END IF;

    UPDATE view_columns
    SET position_num = p_nueva_posicion
    WHERE id = p_view_column_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_view_sort(p_view_sort_id integer, p_nueva_posicion integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM view_sorts WHERE id = p_view_sort_id) THEN
        RETURN 'Error: No existe el ordenamiento con el ID proporcionado.';
    END IF;

    UPDATE view_sorts
    SET position_num = p_nueva_posicion
    WHERE id = p_view_sort_id;

    RETURN 'Posición actualizada correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_posicion_vistas(p_vista_id integer, p_nueva_posicion integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM views WHERE id =  p_vista_id) THEN
        RAISE EXCEPTION 'La vista con ID % no existe.', p_vista_id;
    END IF;

    UPDATE views
    SET position_num = p_nueva_posicion
    WHERE id = p_vista_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_usuario(p_id integer, p_name character varying, p_email character varying)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM users
    WHERE email = p_email AND id <> p_id;

    IF v_count > 0 THEN
        RETURN 'Error: El correo electrónico ya está en uso por otro usuario.';
    END IF;

    UPDATE users
    SET name = p_name,
        email = p_email
    WHERE id = p_id;

    RETURN 'Usuario actualizado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_view_sort(p_view_sort_id integer, p_column_id integer, p_direction character varying)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM view_sorts WHERE id = p_view_sort_id) THEN
        RETURN 'Error: No existe el ordenamiento con el ID proporcionado.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM columns WHERE id = p_column_id) THEN
        RETURN 'Error: La columna no existe.';
    END IF;

    IF p_direction NOT IN ('asc', 'desc') THEN
        RETURN 'Error: La dirección debe ser asc o desc.';
    END IF;

    UPDATE view_sorts
    SET column_id = p_column_id,
        direction = p_direction
    WHERE id = p_view_sort_id;

    RETURN 'Ordenamiento actualizado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_actualizar_vista(p_view_id integer, p_name character varying DEFAULT NULL::character varying, p_sort_by integer DEFAULT NULL::integer, p_sort_direction character varying DEFAULT NULL::character varying, p_position_num integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM views WHERE id = p_view_id) THEN
    RETURN 'Error: No existe una vista con el ID proporcionado.';
  END IF;

  IF p_name IS NOT NULL THEN
    UPDATE views SET name = p_name WHERE id = p_view_id;
  END IF;

  IF p_sort_by IS NOT NULL THEN
    UPDATE views SET sort_by = p_sort_by WHERE id = p_view_id;
  END IF;

  IF p_sort_direction IS NOT NULL THEN
    UPDATE views SET sort_direction = p_sort_direction WHERE id = p_view_id;
  END IF;

  IF p_position_num IS NOT NULL THEN
    UPDATE views SET position_num = p_position_num WHERE id = p_view_id;
  END IF;

  RETURN 'Vista actualizada correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_agregar_columnas_a_vista(p_view_id integer, p_column_id integer, p_visible boolean DEFAULT true, p_filter_condition character varying DEFAULT NULL::character varying, p_filter_value text DEFAULT NULL::text, p_position_num integer DEFAULT NULL::integer, p_width_px integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM views WHERE id = p_view_id) THEN
    RETURN 'Error: No existe la vista especificada.';
  END IF;

  INSERT INTO view_columns (
    view_id, column_id, visible, filter_condition, filter_value,
    position_num, width_px, created_at
  )
  VALUES (
    p_view_id, p_column_id, p_visible, p_filter_condition, p_filter_value,
    p_position_num, p_width_px, CURRENT_TIMESTAMP
  );

  RETURN 'Columna agregada a la vista exitosamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_asignar_avatar_usuario(p_user_id integer, p_avatar_url text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    IF p_avatar_url IS NULL OR LENGTH(TRIM(p_avatar_url)) = 0 THEN
        RETURN 'Error: La URL del avatar no puede estar vacía.';
    END IF;

    UPDATE users
    SET avatar_url = p_avatar_url
    WHERE id = p_user_id;

    RETURN 'Avatar asignado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_asignar_permisos_masivos(p_table_id integer, p_role_ids integer[], p_can_create boolean, p_can_read boolean, p_can_update boolean, p_can_delete boolean)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_role_id INT;
BEGIN
  -- Iterar sobre cada rol y asignar permisos
  FOREACH v_role_id IN ARRAY p_role_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM permissions
      WHERE table_id = p_table_id AND role_id = v_role_id
    ) THEN
      -- Insertar nuevos
      INSERT INTO permissions (table_id, role_id, can_create, can_read, can_update, can_delete)
      VALUES (p_table_id, v_role_id, p_can_create, p_can_read, p_can_update, p_can_delete);
    ELSE
      -- Actualizar existentes
      UPDATE permissions
      SET can_create = p_can_create,
          can_read = p_can_read,
          can_update = p_can_update,
          can_delete = p_can_delete
      WHERE table_id = p_table_id AND role_id = v_role_id;
    END IF;
  END LOOP;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_asignar_permisos_rol_sobre_tabla(p_table_id integer, p_role_id integer, p_can_create boolean, p_can_read boolean, p_can_update boolean, p_can_delete boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Validar existencia previa
  IF EXISTS (
    SELECT 1 FROM permissions
    WHERE table_id = p_table_id AND role_id = p_role_id
  ) THEN
    -- Actualizar si ya existe
    UPDATE permissions
    SET
      can_create = p_can_create,
      can_read = p_can_read,
      can_update = p_can_update,
      can_delete = p_can_delete
    WHERE table_id = p_table_id AND role_id = p_role_id;

    RETURN 'Permisos actualizados correctamente.';
  ELSE
    -- Insertar si no existe
    INSERT INTO permissions (
      table_id, role_id, can_create, can_read, can_update, can_delete
    ) VALUES (
      p_table_id, p_role_id, p_can_create, p_can_read, p_can_update, p_can_delete
    );

    RETURN 'Permisos asignados correctamente.';
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_bloquear_usuario(p_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    UPDATE users
    SET is_blocked = true
    WHERE id = p_id;

    RETURN 'Usuario bloqueado exitosamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_buscar_usuarios(p_busqueda text)
 RETURNS TABLE(id integer, name character varying, email character varying, is_active boolean, is_blocked boolean, last_login timestamp without time zone, avatar_url text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.name,
        u.email,
        u.is_active,
        u.is_blocked,
        u.last_login,
        u.avatar_url
    FROM users u
    WHERE 
        u.name ILIKE '%' || p_busqueda || '%' OR
        u.email ILIKE '%' || p_busqueda || '%'
    ORDER BY u.name;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_check_unique_value(p_table_id integer, p_column_name text, p_value text, p_exclude_id integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM records
    WHERE
        table_id = p_table_id AND
        record_data ->> p_column_name = p_value AND
        (p_exclude_id IS NULL OR id != p_exclude_id); 

    RETURN v_count = 0; 
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_columna_tiene_registros_asociados(p_columna_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_table_id INT;
    v_column_name TEXT;
    v_existe BOOLEAN;
BEGIN
    -- Obtener el nombre de la columna y su tabla
    SELECT c.table_id, c.name INTO v_table_id, v_column_name
    FROM columns c
    WHERE c.id = p_columna_id;

    -- Validar existencia
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existe la columna con ID %', p_columna_id;
    END IF;

    -- Verificar si hay registros que contienen esa clave
    SELECT EXISTS (
        SELECT 1
        FROM records r
        WHERE r.table_id = v_table_id
          AND r.record_data ? v_column_name  -- El operador ? verifica si la clave existe en el JSONB
    )
    INTO v_existe;

    RETURN v_existe;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_contar_comentarios_registro(p_record_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM record_comments
    WHERE record_id = p_record_id AND is_active = true;

    RETURN v_count;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_crear_columna(p_table_id integer, p_name character varying, p_data_type character varying, p_is_required boolean, p_is_foreign_key boolean, p_foreign_table_id integer DEFAULT NULL::integer, p_foreign_column_name character varying DEFAULT NULL::character varying, p_column_position integer DEFAULT 0, p_relation_type character varying DEFAULT NULL::character varying, p_validations character varying DEFAULT NULL::character varying, p_is_unique boolean DEFAULT NULL::boolean)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_existe BOOLEAN;
    v_new_id INT;
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
            RAISE EXCEPTION 'Debe especificarse la tabla y columna referenciada si es clave foránea.';
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM tables t
            JOIN columns c ON c.table_id = t.id
            WHERE t.id = p_foreign_table_id AND c.name = p_foreign_column_name
        ) THEN
            RAISE EXCEPTION 'La referencia de clave foránea no existe.';
        END IF;
    END IF;

    INSERT INTO columns (
        table_id, name, data_type, is_required, is_unique,
        is_foreign_key, foreign_table_id, foreign_column_name, column_position, relation_type, validations
    )
    VALUES (
        p_table_id, p_name, p_data_type, p_is_required, p_is_unique,
        p_is_foreign_key, p_foreign_table_id, p_foreign_column_name, p_column_position, p_relation_type,
        p_validations
    )
    RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$function$

