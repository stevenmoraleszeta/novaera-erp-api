CREATE OR REPLACE FUNCTION public.actualizar_permisos_rol_tabla(p_rol_id integer, p_table_id integer, p_can_create boolean, p_can_read boolean, p_can_update boolean, p_can_delete boolean)
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

    -- Validar existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'No existe el rol con ID ' || p_rol_id;
    END IF;

    -- Validar existencia de la tabla lógica
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RETURN 'No existe la tabla lógica con ID ' || p_table_id;
    END IF;

    -- Validar existencia del permiso
    IF NOT EXISTS (
        SELECT 1 FROM permissions
        WHERE role_id = p_rol_id AND table_id = p_table_id
    ) THEN
        RETURN 'No existen permisos registrados para este rol sobre esta tabla.';
    END IF;

    -- Actualizar los permisos
    UPDATE permissions
    SET
        can_create = p_can_create,
        can_read = p_can_read,
        can_update = p_can_update,
        can_delete = p_can_delete
    WHERE role_id = p_rol_id AND table_id = p_table_id;

    RETURN 'Permisos actualizados exitosamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.actualizar_registro_dinamico(p_record_id integer, p_data jsonb, p_position_num integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_table_id INT;
    v_col RECORD;
BEGIN
    SELECT records.table_id INTO v_table_id FROM records WHERE records.id = p_record_id;
    IF NOT FOUND THEN
        RETURN 'Error: El registro no existe.';
    END IF;

    FOR v_col IN SELECT * FROM columns WHERE table_id = v_table_id LOOP
        IF v_col.is_required AND NOT p_data ? v_col.name THEN
            RETURN FORMAT('Error: El campo requerido %s no está presente.', v_col.name);
        END IF;

        IF p_data ? v_col.name THEN
            IF v_col.data_type = 'int' AND NOT (p_data ->> v_col.name ~ '^\d+$') THEN
                RETURN FORMAT('Error: El campo %s debe ser un número entero.', v_col.name);
            ELSIF v_col.data_type = 'boolean' AND NOT (p_data ->> v_col.name ~ '^(true|false)$') THEN
                RETURN FORMAT('Error: El campo %s debe ser booleano.', v_col.name);
            ELSIF v_col.data_type = 'text' AND NOT jsonb_typeof(p_data -> v_col.name) = 'string' THEN
                RETURN FORMAT('Error: El campo %s debe ser texto.', v_col.name);
            END IF;
        END IF;
    END LOOP;

    UPDATE records SET record_data = p_data, position_num = p_position_num WHERE id = p_record_id;
    RETURN 'Registro actualizado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.actualizar_rol(p_rol_id integer, p_nombre text, p_descripcion text DEFAULT NULL::text, p_is_admin boolean DEFAULT NULL::boolean)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RETURN 'ID de rol inválido.';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'El rol con ID ' || p_rol_id || ' no existe.';
    END IF;

    UPDATE roles
    SET 
        name = COALESCE(p_nombre, name),
        is_admin = COALESCE(p_is_admin, is_admin)
    WHERE id = p_rol_id;

    RETURN 'Rol actualizado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.actualizar_tabla_logica(p_table_id integer, p_name character varying, p_description text, p_original_table_id integer DEFAULT NULL::integer, p_foreign_table_id integer DEFAULT NULL::integer, p_position_num integer DEFAULT NULL::integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_module_id INT;
BEGIN
    SELECT module_id INTO v_module_id FROM tables WHERE id = p_table_id;
    IF NOT FOUND THEN
        RETURN 'Error: La tabla lógica no existe.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM tables
        WHERE LOWER(name) = LOWER(p_name)
          AND module_id = v_module_id
          AND id <> p_table_id
    ) THEN
        RETURN 'Error: Ya existe otra tabla con ese nombre en el mismo módulo.';
    END IF;

    IF p_original_table_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tables WHERE id = p_original_table_id
    ) THEN
        RETURN 'Error: original_table_id no es válido.';
    END IF;

    IF p_foreign_table_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tables WHERE id = p_foreign_table_id
    ) THEN
        RETURN 'Error: foreign_table_id no es válido.';
    END IF;

    UPDATE tables
    SET name = p_name,
        description = p_description,
        original_table_id = p_original_table_id,
        foreign_table_id = p_foreign_table_id,
        position_num = p_position_num
    WHERE id = p_table_id;

    RETURN 'Tabla lógica actualizada correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.asignar_rol_a_usuario(p_user_id integer, p_rol_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación de parámetros
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        RETURN 'ID de usuario inválido.';
    END IF;

    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RETURN 'ID de rol inválido.';
    END IF;

    -- Validar existencia del usuario
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'No se encontró el usuario con ID: ' || p_user_id;
    END IF;

    -- Validar existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'No se encontró el rol con ID: ' || p_rol_id;
    END IF;

    -- Verificar si ya existe la asignación
    IF EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = p_user_id AND role_id = p_rol_id
    ) THEN
        RETURN 'El usuario ya tiene asignado este rol.';
    END IF;

    -- Insertar nueva asignación
    INSERT INTO user_roles (user_id, role_id)
    VALUES (p_user_id, p_rol_id);

    RETURN 'Rol asignado exitosamente al usuario.';
END;
$function$

CREATE OR REPLACE FUNCTION public.audit_records_changes()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  user_id INTEGER;
BEGIN
  -- Leer el ID del usuario desde la variable de sesión
  user_id := current_setting('audit.user_id', true)::INTEGER;

  IF TG_OP = 'UPDATE' THEN
    IF OLD IS DISTINCT FROM NEW THEN
      INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, changed_by)
      VALUES (
        TG_TABLE_NAME,
        NEW.id,
        'update',
        to_jsonb(OLD),
        to_jsonb(NEW),
        user_id
      );
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'insert',
      NULL,
      to_jsonb(NEW),
      user_id
    );
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log(table_name, record_id, action, old_data, new_data, changed_by)
    VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'delete',
      to_jsonb(OLD),
      NULL,
      user_id
    );
    RETURN OLD;
  END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.buscar_registros_por_valor(p_table_id integer, p_valor text)
 RETURNS TABLE(id integer, record_data jsonb, created_at timestamp without time zone, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT records.id, records.record_data, records.created_at, records.position_num
    FROM records
    WHERE records.table_id = p_table_id
      AND records.record_data::text ILIKE '%' || p_valor || '%'
    ORDER BY records.created_at DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.contar_notificaciones_no_leidas(p_user_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_cantidad INT;
BEGIN
    SELECT COUNT(*) INTO v_cantidad
    FROM notifications
    WHERE user_id = p_user_id AND read = FALSE;

    RETURN v_cantidad;
END;
$function$

CREATE OR REPLACE FUNCTION public.contar_registros_por_tabla(p_table_id integer)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_count INT;
BEGIN
    SELECT COUNT(*) INTO v_count FROM records WHERE table_id = p_table_id;
    RETURN v_count;
END;
$function$

CREATE OR REPLACE FUNCTION public.crear_notificacion(p_user_id integer, p_title character varying, p_message text, p_url text DEFAULT NULL::text, p_reminder_at timestamp without time zone DEFAULT NULL::timestamp without time zone)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'Error: Usuario no encontrado.';
    END IF;

    INSERT INTO notifications (user_id, title, message, link_to_module, read, reminder_at, created_at)
    VALUES (p_user_id, p_title, p_message, p_url, FALSE, p_reminder_at, NOW());

    RETURN 'Notificación creada correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.crear_notificaciones_masivas(p_user_ids integer[], p_title character varying, p_message text, p_url text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$ 
DECLARE
    i INT;
BEGIN
    IF array_length(p_user_ids, 1) IS NULL THEN
        RETURN 'Error: Lista de usuarios vacía.';
    END IF;

    FOREACH i IN ARRAY p_user_ids LOOP
        INSERT INTO notifications (user_id, title, message, link_to_module, read, created_at)
        VALUES (i, p_title, p_message, p_url, FALSE, NOW());
    END LOOP;

    RETURN 'Notificaciones enviadas correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.crear_rol(nombre_rol text, descripcion text DEFAULT NULL::text, p_is_admin boolean DEFAULT false)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    rol_id INT;
BEGIN
    IF nombre_rol IS NULL OR TRIM(nombre_rol) = '' OR nombre_rol ~ '[^a-zA-Z0-9_ ]' THEN
        RETURN 'Nombre de rol inválido. Use solo letras, números, espacios o guiones bajos.';
    END IF;

    SELECT id INTO rol_id FROM roles WHERE LOWER(name) = LOWER(nombre_rol);
    IF rol_id IS NOT NULL THEN
        RETURN 'El rol ' || nombre_rol || ' ya existe.';
    END IF;

    INSERT INTO roles(name, description, active, is_admin)
    VALUES (nombre_rol, descripcion, true, p_is_admin)
    RETURNING id INTO rol_id;

    RETURN 'Rol ' || nombre_rol || ' creado con ID: ' || rol_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.crear_tabla_logica(p_module_id integer, p_name character varying, p_description text DEFAULT NULL::text, p_original_table_id integer DEFAULT NULL::integer, p_foreign_table_id integer DEFAULT NULL::integer, p_position_num integer DEFAULT 0)
 RETURNS integer
 LANGUAGE plpgsql
AS $function$
DECLARE
    new_table_id INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM modules WHERE id = p_module_id) THEN
        RAISE EXCEPTION 'El módulo especificado no existe.';
    END IF;

    IF TRIM(p_name) IS NULL OR TRIM(p_name) = '' THEN
        RAISE EXCEPTION 'El nombre de la tabla no puede estar vacío.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM tables WHERE LOWER(name) = LOWER(p_name) AND module_id = p_module_id
    ) THEN
        RAISE EXCEPTION 'Ya existe una tabla con ese nombre en este módulo.';
    END IF;

    IF p_original_table_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tables WHERE id = p_original_table_id
    ) THEN
        RAISE EXCEPTION 'El original_table_id no es válido.';
    END IF;

    IF p_foreign_table_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM tables WHERE id = p_foreign_table_id
    ) THEN
        RAISE EXCEPTION 'El foreign_table_id no es válido.';
    END IF;

    INSERT INTO tables (
        module_id, name, description, original_table_id, foreign_table_id, position_num
    )
    VALUES (
        p_module_id, p_name, p_description, p_original_table_id, p_foreign_table_id, p_position_num
    )
    RETURNING id INTO new_table_id;

    RETURN new_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_notificacion(p_user_id integer, p_notificacion_id integer)
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

    DELETE FROM notifications
    WHERE id = p_notificacion_id AND user_id = p_user_id;

    RETURN 'Notificación eliminada.';
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_permisos_rol_tabla(p_rol_id integer, p_table_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación de parámetros
    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RETURN 'ID de rol inválido.';
    END IF;

    IF p_table_id IS NULL OR p_table_id <= 0 THEN
        RETURN 'ID de tabla lógica inválido.';
    END IF;

    -- Validar existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'El rol con ID ' || p_rol_id || ' no existe.';
    END IF;

    -- Validar existencia de la tabla
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RETURN 'La tabla lógica con ID ' || p_table_id || ' no existe.';
    END IF;

    -- Verificar si hay permisos existentes para esa relación
    IF NOT EXISTS (
        SELECT 1 FROM permissions
        WHERE role_id = p_rol_id AND table_id = p_table_id
    ) THEN
        RETURN 'No existen permisos registrados para ese rol en esta tabla.';
    END IF;

    -- Eliminar el registro de permisos
    DELETE FROM permissions
    WHERE role_id = p_rol_id AND table_id = p_table_id;

    RETURN 'Permisos eliminados correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_registro_dinamico(p_record_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM records WHERE id = p_record_id) THEN
        RETURN 'Error: El registro no existe.';
    END IF;

    DELETE FROM records WHERE id = p_record_id;
    RETURN 'Registro eliminado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_rol_de_usuario(p_user_id integer, p_rol_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación de parámetros
    IF p_user_id IS NULL OR p_user_id <= 0 THEN
        RETURN 'ID de usuario inválido.';
    END IF;

    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RETURN 'ID de rol inválido.';
    END IF;

    -- Validar existencia del usuario
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'No se encontró el usuario con ID: ' || p_user_id;
    END IF;

    -- Validar existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'No se encontró el rol con ID: ' || p_rol_id;
    END IF;

    -- Verificar existencia de la relación
    IF NOT EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_id = p_user_id AND role_id = p_rol_id
    ) THEN
        RETURN 'El usuario no tiene asignado ese rol.';
    END IF;

    -- Eliminar la relación
    DELETE FROM user_roles
    WHERE user_id = p_user_id AND role_id = p_rol_id;

    RETURN 'Rol eliminado correctamente del usuario.';
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_rol_logico(p_rol_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Validación: ID nulo o inválido
    IF p_rol_id IS NULL OR p_rol_id <= 0 THEN
        RETURN 'ID de rol inválido.';
    END IF;

    -- Validación: existencia del rol
    IF NOT EXISTS (SELECT 1 FROM roles WHERE id = p_rol_id) THEN
        RETURN 'No se encontró el rol con ID: ' || p_rol_id;
    END IF;

    -- Eliminación lógica del rol
    UPDATE roles SET active = false WHERE id = p_rol_id;

    RETURN 'Rol eliminado lógicamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_tabla_logica(p_table_id integer, visited integer[] DEFAULT '{}'::integer[])
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    r_columna RECORD;
    r_columna_dependiente RECORD;
    r_tabla_dependiente RECORD;
    new_visited INT[];
BEGIN
    -- Verificar que la tabla existe
    IF NOT EXISTS (SELECT 1 FROM tables WHERE id = p_table_id) THEN
        RAISE EXCEPTION 'Error: La tabla lógica con ID % no existe.', p_table_id;
    END IF;

    -- Evitar ciclos infinitos
    IF p_table_id = ANY(visited) THEN
        RAISE NOTICE 'Evitar ciclo: tabla lógica % ya fue procesada.', p_table_id;
        RETURN FORMAT('Tabla lógica %s ya fue procesada anteriormente, evitando recursión.', p_table_id);
    END IF;

    -- Agregar tabla actual a la lista de visitados
    new_visited := array_append(visited, p_table_id);

    -- Paso 0: Eliminar recursivamente tablas que referencian a esta (por foreign_table_id o original_table_id en tables)
    FOR r_tabla_dependiente IN
        SELECT id FROM tables
        WHERE foreign_table_id = p_table_id OR original_table_id = p_table_id
    LOOP
        PERFORM eliminar_tabla_logica(r_tabla_dependiente.id, new_visited);
    END LOOP;

    -- Paso 1: Eliminar columnas en otras tablas que referencian a esta tabla (por foreign_table_id en columns)
    FOR r_columna_dependiente IN
        SELECT id FROM columns WHERE foreign_table_id = p_table_id
    LOOP
        PERFORM sp_eliminar_columna(r_columna_dependiente.id);
    END LOOP;

    -- Paso 2: Eliminar columnas propias
    FOR r_columna IN
        SELECT id FROM columns WHERE table_id = p_table_id
    LOOP
        PERFORM sp_eliminar_columna(r_columna.id);
    END LOOP;

    -- Paso 3: Eliminar registros propios
    DELETE FROM records WHERE table_id = p_table_id;

    -- Paso 4: Eliminar la tabla
    DELETE FROM tables WHERE id = p_table_id;

    RETURN FORMAT('Tabla lógica %s y sus referencias eliminadas correctamente.', p_table_id);
END;
$function$

CREATE OR REPLACE FUNCTION public.eliminar_todas_notificaciones(p_user_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    DELETE FROM notifications WHERE user_id = p_user_id;
    RETURN 'Todas las notificaciones eliminadas.';
END;
$function$

