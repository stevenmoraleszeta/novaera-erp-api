-- =========================================
-- FUNCIÓN DINÁMICA PARA COPIAR FUNCIONES DEL SCHEMA PUBLIC AL SCHEMA DE EMPRESA
-- =========================================

-- Función principal que copia todas las funciones del schema public al schema de empresa
CREATE OR REPLACE FUNCTION copy_public_functions_to_schema(target_schema_name VARCHAR(63))
RETURNS TEXT AS $$
DECLARE
    function_record RECORD;
    function_definition TEXT;
    new_function_definition TEXT;
    functions_copied INT := 0;
    errors_count INT := 0;
    error_details TEXT := '';
BEGIN
    -- Establecer el search_path para crear las funciones en el schema correcto
    EXECUTE format('SET search_path TO %I, public', target_schema_name);
    
    -- Obtener todas las funciones del schema public (excluyendo las del sistema)
    FOR function_record IN
        SELECT 
            p.proname as function_name,
            pg_get_functiondef(p.oid) as function_definition,
            n.nspname as schema_name
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'generate_%'  -- Excluir funciones de generación de códigos
        AND p.proname NOT LIKE 'create_company%'  -- Excluir funciones de creación de empresa
        AND p.proname NOT LIKE 'setup_%'  -- Excluir funciones de setup
        AND p.proname NOT LIKE 'cleanup_%'  -- Excluir funciones de limpieza
        AND p.proname NOT LIKE 'copy_%'  -- Excluir esta misma función y similares
        ORDER BY p.proname
    LOOP
        BEGIN
            -- Obtener la definición completa de la función
            function_definition := function_record.function_definition;
            
            -- Reemplazar el schema 'public' por el schema de destino en la definición
            new_function_definition := replace(function_definition, 'CREATE OR REPLACE FUNCTION public.', format('CREATE OR REPLACE FUNCTION %I.', target_schema_name));
            
            -- También reemplazar cualquier referencia a tablas del schema public dentro de la función
            -- Esto es más complejo, pero podemos hacer algunos reemplazos básicos
            new_function_definition := replace(new_function_definition, ' FROM public.', format(' FROM %I.', target_schema_name));
            new_function_definition := replace(new_function_definition, ' JOIN public.', format(' JOIN %I.', target_schema_name));
            new_function_definition := replace(new_function_definition, ' INTO public.', format(' INTO %I.', target_schema_name));
            new_function_definition := replace(new_function_definition, ' UPDATE public.', format(' UPDATE %I.', target_schema_name));
            new_function_definition := replace(new_function_definition, ' INSERT INTO public.', format(' INSERT INTO %I.', target_schema_name));
            new_function_definition := replace(new_function_definition, ' DELETE FROM public.', format(' DELETE FROM %I.', target_schema_name));
            new_function_definition := replace(new_function_definition, ' EXISTS (SELECT 1 FROM public.', format(' EXISTS (SELECT 1 FROM %I.', target_schema_name));
            
            -- Ejecutar la nueva definición de función en el schema de destino
            EXECUTE new_function_definition;
            
            functions_copied := functions_copied + 1;
            
            RAISE NOTICE 'Función copiada: %.%', target_schema_name, function_record.function_name;
            
        EXCEPTION
            WHEN OTHERS THEN
                errors_count := errors_count + 1;
                error_details := error_details || format('Error copiando función %s: %s; ', function_record.function_name, SQLERRM);
                RAISE NOTICE 'Error copiando función %: %', function_record.function_name, SQLERRM;
        END;
    END LOOP;
    
    -- Restaurar search_path
    SET search_path TO public;
    
    -- Retornar resumen
    IF errors_count = 0 THEN
        RETURN format('Funciones copiadas exitosamente: %s de %s', functions_copied, functions_copied);
    ELSE
        RETURN format('Funciones copiadas: %s, Errores: %s. Detalles: %s', functions_copied, errors_count, error_details);
    END IF;
    
END;
$$ LANGUAGE plpgsql;

-- Función mejorada para obtener la lista de funciones disponibles
CREATE OR REPLACE FUNCTION get_public_functions_list()
RETURNS TABLE(
    function_name TEXT,
    return_type TEXT,
    argument_types TEXT,
    function_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.proname::TEXT,
        pg_catalog.pg_get_function_result(p.oid)::TEXT,
        pg_catalog.pg_get_function_arguments(p.oid)::TEXT,
        CASE 
            WHEN p.prokind = 'f' THEN 'FUNCTION'
            WHEN p.prokind = 'p' THEN 'PROCEDURE'
            WHEN p.prokind = 'a' THEN 'AGGREGATE'
            WHEN p.prokind = 'w' THEN 'WINDOW'
            ELSE 'OTHER'
        END::TEXT
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname NOT LIKE 'generate_%'
    AND p.proname NOT LIKE 'create_company%'
    AND p.proname NOT LIKE 'setup_%'
    AND p.proname NOT LIKE 'cleanup_%'
    AND p.proname NOT LIKE 'copy_%'
    AND p.proname NOT LIKE 'get_public_%'
    ORDER BY p.proname;
END;
$$ LANGUAGE plpgsql;

-- Función para verificar funciones copiadas en un schema
CREATE OR REPLACE FUNCTION verify_copied_functions(schema_name VARCHAR(63))
RETURNS TABLE(
    function_name TEXT,
    exists_in_public BOOLEAN,
    exists_in_schema BOOLEAN,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH public_functions AS (
        SELECT p.proname as fname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname NOT LIKE 'generate_%'
        AND p.proname NOT LIKE 'create_company%'
        AND p.proname NOT LIKE 'setup_%'
        AND p.proname NOT LIKE 'cleanup_%'
        AND p.proname NOT LIKE 'copy_%'
        AND p.proname NOT LIKE 'get_public_%'
        AND p.proname NOT LIKE 'verify_%'
    ),
    schema_functions AS (
        SELECT p.proname as fname
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = schema_name
    )
    SELECT 
        pf.fname::TEXT,
        TRUE::BOOLEAN,
        (sf.fname IS NOT NULL)::BOOLEAN,
        CASE 
            WHEN sf.fname IS NOT NULL THEN 'COPIADA'::TEXT
            ELSE 'FALTANTE'::TEXT
        END
    FROM public_functions pf
    LEFT JOIN schema_functions sf ON pf.fname = sf.fname
    ORDER BY pf.fname;
END;
$$ LANGUAGE plpgsql;
