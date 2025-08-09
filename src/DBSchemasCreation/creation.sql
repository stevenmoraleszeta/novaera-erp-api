-- 1. Entidades principales
CREATE TABLE modules (
    id integer,
    icon_url text,
    description text,
    position_num integer,
    created_at timestamp without time zone,
    created_by integer,
    name character varying(100)
);

CREATE TABLE tables (
    id integer,
    position_num integer,
    original_table_id integer,
    description text,
    name character varying(100),
    foreign_table_id integer,
    module_id integer,
    created_at timestamp without time zone
);

CREATE TABLE users (
    id integer,
    name character varying(100),
    is_active boolean,
    avatar_url text,
    is_blocked boolean,
    password_hash text,
    last_login timestamp without time zone,
    email character varying(100)
);

CREATE TABLE roles (
    id integer,
    active boolean,
    is_admin boolean,
    name character varying(50)
);

-- 2. Relaciones básicas
CREATE TABLE user_roles (
    user_id integer,
    role_id integer
);

CREATE TABLE columns (
    id integer,
    is_required boolean,
    selection_type character varying(20),
    is_unique boolean,
    table_id integer,
    validations character varying(500),
    column_position integer,
    relation_type character varying(50),
    foreign_table_id integer,
    created_at timestamp without time zone,
    name character varying(100),
    data_type character varying(50),
    is_foreign_key boolean,
    foreign_column_name character varying(100)
);

CREATE TABLE column_options (
    id integer,
    column_id integer,
    option_order integer,
    is_active boolean,
    option_label character varying(255),
    option_value character varying(255),
    created_at timestamp without time zone
);

-- 3. Datos principales
CREATE TABLE records (
    id integer,
    position_num integer,
    table_id integer,
    created_at timestamp without time zone,
    record_data jsonb
);

-- 4. Relaciones con records
CREATE TABLE record_subscriptions (
    id integer,
    record_id integer,
    table_id integer,
    created_at timestamp without time zone,
    is_active boolean,
    created_by integer,
    notification_types ARRAY,
    user_id integer
);

CREATE TABLE record_changes (
    id integer,
    change_type character varying(20),
    changed_by integer,
    ip_address text,
    record_id integer,
    changed_at timestamp without time zone,
    new_data jsonb,
    old_data jsonb,
    table_id integer,
    user_agent text
);

CREATE TABLE record_comments (
    id integer,
    record_id integer,
    comment_text text,
    is_active boolean,
    created_at timestamp without time zone,
    user_id integer,
    table_id integer,
    updated_at timestamp without time zone
);

CREATE TABLE record_assigned_users (
    assigned_by integer,
    record_id integer,
    assigned_at timestamp without time zone,
    id integer,
    user_id integer
);

-- 5. Permisos y colaboración
CREATE TABLE permissions (
    id integer,
    table_id integer,
    can_read boolean,
    can_update boolean,
    can_create boolean,
    role_id integer,
    can_delete boolean
);

CREATE TABLE table_collaborators (
    id integer,
    is_active boolean,
    created_at timestamp without time zone,
    user_id integer,
    updated_at timestamp without time zone,
    notes text,
    assigned_by integer,
    table_id integer,
    assigned_at timestamp without time zone
);

-- 6. Vistas y visualización
CREATE TABLE views (
    id integer,
    table_id integer,
    sort_direction character varying(10),
    created_at timestamp without time zone,
    sort_by integer,
    position_num integer,
    name character varying(100)
);

CREATE TABLE view_columns (
    id integer,
    filter_condition character varying(50),
    view_id integer,
    visible boolean,
    width_px integer,
    created_at timestamp without time zone,
    column_id integer,
    position_num integer,
    filter_value text
);

CREATE TABLE view_sorts (
    created_at timestamp without time zone,
    column_id integer,
    direction character varying(10),
    id integer,
    view_id integer,
    position_num integer
);

-- 7. Sistema de notificaciones
CREATE TABLE notifications (
    id integer,
    record_id integer,
    user_id integer,
    read boolean,
    created_at timestamp without time zone,
    link_to_module text,
    message text,
    title character varying(100),
    is_active boolean,
    reminder_at timestamp without time zone
);

CREATE TABLE scheduled_notifications (
    id integer,
    created_at timestamp without time zone,
    sent boolean,
    created_by integer,
    updated_at timestamp without time zone,
    table_id integer,
    notification_sent boolean,
    is_active boolean,
    target_date timestamp without time zone,
    notify_before_days integer,
    notification_title character varying(200),
    sent_at timestamp without time zone,
    column_id integer,
    record_id integer,
    read boolean,
    assigned_users ARRAY,
    notification_message text
);

-- 8. Auditoría y sistema
CREATE TABLE audit_log (
    new_data jsonb,
    changed_at timestamp without time zone,
    changed_by integer,
    record_id integer,
    id integer,
    action text,
    table_name text,
    old_data jsonb
);

CREATE TABLE user_login_history (
    id integer,
    login_time timestamp without time zone,
    ip_address text,
    user_id integer,
    user_agent text
);

CREATE TABLE files (
    id integer,
    uploaded_by integer,
    is_active boolean,
    file_hash character varying(64),
    uploaded_at timestamp without time zone,
    file_data bytea,
    file_size bigint,
    original_name character varying(255),
    mime_type character varying(100)
);
