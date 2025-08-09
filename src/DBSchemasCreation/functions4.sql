
CREATE OR REPLACE FUNCTION public.sp_obtener_columnas_de_vista(p_view_id integer)
 RETURNS TABLE(id integer, view_id integer, column_id integer, visible boolean, filter_condition character varying, filter_value text, created_at timestamp without time zone, position_num integer, width_px integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    vc.id,
    vc.view_id,
    vc.column_id,
    vc.visible,
    vc.filter_condition,
    vc.filter_value,
    vc.created_at,
    vc.position_num,
    vc.width_px -- 🆕
  FROM view_columns vc
  WHERE vc.view_id = p_view_id
  ORDER BY vc.position_num ASC, vc.created_at;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_columnas_por_tabla(p_table_id integer)
 RETURNS TABLE(column_id integer, table_id integer, name character varying, data_type character varying, is_required boolean, is_foreign_key boolean, foreign_table_id integer, foreign_column_name character varying, column_position integer, relation_type character varying, validations character varying, is_unique boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tables t WHERE t.id = p_table_id
    ) THEN
        RAISE EXCEPTION 'Error: No existe una tabla lógica con el ID proporcionado.';
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
        c.column_position,
        c.relation_type,
        c.validations,
		c.is_unique
    FROM columns c
    WHERE c.table_id = p_table_id
    ORDER BY c.column_position;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_comentarios_registro(p_record_id integer, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS TABLE(id integer, record_id integer, table_id integer, user_id integer, user_name character varying, user_email character varying, comment_text text, created_at timestamp without time zone, updated_at timestamp without time zone, is_active boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        rc.id,
        rc.record_id,
        rc.table_id,
        rc.user_id,
        u.name as user_name,
        u.email as user_email,
        rc.comment_text,
        rc.created_at,
        rc.updated_at,
        rc.is_active
    FROM record_comments rc
    LEFT JOIN users u ON rc.user_id = u.id
    WHERE rc.record_id = p_record_id 
      AND rc.is_active = true
    ORDER BY rc.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_historial_login(p_user_id integer)
 RETURNS TABLE(id integer, login_time timestamp without time zone, ip_address text, user_agent text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p_user_id) THEN
        RAISE EXCEPTION 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    RETURN QUERY
    SELECT 
        h.id,
        h.login_time,
        h.ip_address,
        h.user_agent
    FROM user_login_history h
    WHERE h.user_id = p_user_id
    ORDER BY h.login_time DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_modulo_por_id(p_id integer)
 RETURNS TABLE(id integer, name character varying, description text, icon_url text, created_by integer, created_at timestamp without time zone, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM modules m WHERE m.id = p_id) THEN
        RAISE EXCEPTION 'Error: No existe un módulo con el ID proporcionado.';
    END IF;

    RETURN QUERY
    SELECT 
        m.id,
        m.name,
        m.description,
        m.icon_url,
        m.created_by,
        m.created_at,
        m.position_num
    FROM modules m
    WHERE m.id = p_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_modulos(p_ordenar_por character varying DEFAULT 'posicion'::character varying)
 RETURNS TABLE(id integer, name character varying, description text, icon_url text, created_by integer, created_at timestamp without time zone, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF LOWER(p_ordenar_por) = 'nombre' THEN
        RETURN QUERY
        SELECT 
            m.id,
            m.name,
            m.description,
            m.icon_url,
            m.created_by,
            m.created_at,
            m.position_num
        FROM modules m
        ORDER BY m.name;

    ELSIF LOWER(p_ordenar_por) = 'fecha' THEN
        RETURN QUERY
        SELECT 
            m.id,
            m.name,
            m.description,
            m.icon_url,
            m.created_by,
            m.created_at,
            m.position_num
        FROM modules m
        ORDER BY m.created_at DESC;

    ELSE
        -- Orden por posición por defecto
        RETURN QUERY
        SELECT 
            m.id,
            m.name,
            m.description,
            m.icon_url,
            m.created_by,
            m.created_at,
            m.position_num
        FROM modules m
        ORDER BY m.position_num;
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_permisos_rol_sobre_tabla(p_table_id integer, p_role_id integer)
 RETURNS TABLE(can_create boolean, can_read boolean, can_update boolean, can_delete boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    p.can_create,
    p.can_read,
    p.can_update,
    p.can_delete
  FROM permissions p
  WHERE p.table_id = p_table_id AND p.role_id = p_role_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_usuario_por_email(p_email character varying)
 RETURNS TABLE(id integer, name character varying, email character varying, is_active boolean, is_blocked boolean, last_login timestamp without time zone, avatar_url text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users u WHERE u.email = p_email) THEN
        RAISE EXCEPTION 'Error: No existe un usuario con el correo proporcionado.';
    END IF;

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
    WHERE u.email = p_email;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_usuarios(p_ordenar_por character varying DEFAULT 'nombre'::character varying)
 RETURNS TABLE(id integer, name character varying, email character varying, is_active boolean, is_blocked boolean, last_login timestamp without time zone, avatar_url text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF p_ordenar_por = 'fecha' THEN
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
        ORDER BY u.id;
    ELSE
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
        ORDER BY u.name;
    END IF;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_usuarios_por_estado(p_activo boolean)
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
    WHERE u.is_active = p_activo
    ORDER BY u.name;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_view_sorts(p_view_id integer)
 RETURNS TABLE(id integer, view_id integer, column_id integer, direction character varying, position_num integer, created_at timestamp without time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        vs.id,
        vs.view_id,
        vs.column_id,
        vs.direction,
        vs.position_num,
        vs.created_at
    FROM view_sorts vs
    WHERE vs.view_id = p_view_id
    ORDER BY vs.position_num;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_obtener_vistas_por_tabla(p_table_id integer)
 RETURNS TABLE(id integer, table_id integer, name character varying, sort_by integer, sort_direction character varying, created_at timestamp without time zone, position_num integer)
 LANGUAGE plpgsql
AS $function$
BEGIN
  RETURN QUERY
  SELECT v.id, v.table_id, v.name, v.sort_by, v.sort_direction, v.created_at, v.position_num
  FROM views v
  WHERE v.table_id = p_table_id
  ORDER BY v.position_num ASC, v.created_at DESC;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_registrar_evento_login(p_user_id integer, p_ip_address text, p_user_agent text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    INSERT INTO user_login_history (
        user_id,
        login_time,
        ip_address,
        user_agent
    )
    VALUES (
        p_user_id,
        CURRENT_TIMESTAMP,
        p_ip_address,
        p_user_agent
    );

    RETURN 'Evento de login registrado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_registrar_inicio_sesion(p_id integer)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    UPDATE users
    SET last_login = CURRENT_TIMESTAMP
    WHERE id = p_id;

    RETURN 'Último inicio de sesión registrado correctamente.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_registrar_usuario(p_name character varying, p_email character varying, p_password_hash text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_user_id INT;
BEGIN
    IF p_name IS NULL OR LENGTH(TRIM(p_name)) = 0 THEN
        RETURN 'Error: El nombre es obligatorio.';
    END IF;

    IF p_email IS NULL OR LENGTH(TRIM(p_email)) = 0 THEN
        RETURN 'Error: El correo electrónico es obligatorio.';
    END IF;

    IF NOT p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN 'Error: Formato de correo electrónico inválido.';
    END IF;

    IF p_password_hash IS NULL OR LENGTH(TRIM(p_password_hash)) = 0 THEN
        RETURN 'Error: La contraseña hasheada es obligatoria.';
    END IF;

    IF EXISTS (SELECT 1 FROM users WHERE email = p_email) THEN
        RETURN 'Error: Ya existe un usuario registrado con ese correo.';
    END IF;

    INSERT INTO users (name, email, password_hash)
    VALUES (p_name, p_email, p_password_hash)
    RETURNING id INTO v_user_id;

    RETURN 'Usuario registrado exitosamente con ID: ' || v_user_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_reiniciar_contrasena_admin(p_user_id integer, p_nueva_contrasena_hash text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = p_user_id) THEN
        RETURN 'Error: No existe un usuario con el ID proporcionado.';
    END IF;

    IF p_nueva_contrasena_hash IS NULL OR LENGTH(TRIM(p_nueva_contrasena_hash)) = 0 THEN
        RETURN 'Error: La nueva contraseña hasheada no puede estar vacía.';
    END IF;

    UPDATE users
    SET password_hash = p_nueva_contrasena_hash
    WHERE id = p_user_id;

    RETURN 'Contraseña restablecida correctamente por el administrador.';
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_usuario_puede_modificar_registro(p_user_id integer, p_record_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_table_id INT;
    v_has_permission BOOLEAN := false;
BEGIN
    -- Obtener la tabla del registro
    SELECT r.table_id INTO v_table_id
    FROM records r
    WHERE r.id = p_record_id;

    -- Verificar permisos de modificación
    SELECT TRUE INTO v_has_permission
    FROM permissions p
    JOIN user_roles ur ON p.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND p.table_id = v_table_id
      AND (p.can_update = true OR p.can_delete = true)
    LIMIT 1;

    RETURN COALESCE(v_has_permission, false);
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_usuario_puede_ver_registro(p_user_id integer, p_record_id integer)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE
    v_table_id INT;
    v_has_permission BOOLEAN := false;
BEGIN
    -- Obtener la tabla del registro
    SELECT r.table_id INTO v_table_id
    FROM records r
    WHERE r.id = p_record_id;

    -- Verificar permiso de lectura
    SELECT TRUE INTO v_has_permission
    FROM permissions p
    JOIN user_roles ur ON p.role_id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND p.table_id = v_table_id
      AND p.can_read = true
    LIMIT 1;

    RETURN COALESCE(v_has_permission, false);
END;
$function$

CREATE OR REPLACE FUNCTION public.sp_usuarios_con_permisos_en_tabla(p_table_id integer)
 RETURNS TABLE(user_id integer, role_id integer, can_create boolean, can_read boolean, can_update boolean, can_delete boolean)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        ur.user_id,
        p.role_id,
        p.can_create,
        p.can_read,
        p.can_update,
        p.can_delete
    FROM permissions p
    JOIN user_roles ur ON ur.role_id = p.role_id
    WHERE p.table_id = p_table_id;
END;
$function$

CREATE OR REPLACE FUNCTION public.validar_nombre_tabla_existente(p_module_id integer, p_name character varying)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM tables
        WHERE LOWER(name) = LOWER(p_name)
          AND module_id = p_module_id
    );
END;
$function$