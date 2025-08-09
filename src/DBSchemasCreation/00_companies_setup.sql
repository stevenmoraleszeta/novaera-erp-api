-- =========================================
-- SISTEMA MULTIEMPRESA - CONFIGURACIÓN INICIAL
-- =========================================

-- 1. Tabla principal de empresas (en el schema público)
CREATE TABLE IF NOT EXISTS public.companies (
    id SERIAL PRIMARY KEY,
    company_code VARCHAR(20) UNIQUE NOT NULL, -- Código único de la empresa
    company_name VARCHAR(255) NOT NULL,
    schema_name VARCHAR(63) NOT NULL UNIQUE, -- Nombre del schema (máx 63 chars en PostgreSQL)
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_expires_at TIMESTAMP,
    max_users INTEGER DEFAULT 10,
    storage_limit_mb INTEGER DEFAULT 1000
);

-- 2. Índices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_companies_code ON public.companies(company_code);
CREATE INDEX IF NOT EXISTS idx_companies_schema ON public.companies(schema_name);
CREATE INDEX IF NOT EXISTS idx_companies_active ON public.companies(is_active);

-- 3. Función para generar código único de empresa
CREATE OR REPLACE FUNCTION generate_company_code() 
RETURNS VARCHAR(20) AS $$
DECLARE
    new_code VARCHAR(20);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generar código: 3 letras + 4 números (ej: ABC1234)
        new_code := upper(
            chr(trunc(random() * 26 + 65)::int) ||
            chr(trunc(random() * 26 + 65)::int) ||
            chr(trunc(random() * 26 + 65)::int) ||
            lpad(trunc(random() * 10000)::text, 4, '0')
        );
        
        -- Verificar si el código ya existe
        SELECT EXISTS(SELECT 1 FROM public.companies WHERE company_code = new_code) INTO code_exists;
        
        -- Si no existe, salir del loop
        IF NOT code_exists THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- 4. Función para generar nombre de schema seguro
CREATE OR REPLACE FUNCTION generate_schema_name(company_name TEXT) 
RETURNS VARCHAR(63) AS $$
DECLARE
    base_name TEXT;
    new_schema_name VARCHAR(63);
    counter INTEGER := 1;
    name_exists BOOLEAN;
BEGIN
    -- Limpiar el nombre: solo letras, números y guiones bajos
    base_name := lower(regexp_replace(company_name, '[^a-zA-Z0-9]', '_', 'g'));
    base_name := regexp_replace(base_name, '_+', '_', 'g'); -- Eliminar múltiples guiones bajos
    base_name := trim(both '_' from base_name); -- Eliminar guiones bajos al inicio y final
    
    -- Limitar a 50 caracteres para dejar espacio para sufijos
    base_name := substring(base_name from 1 for 50);
    
    -- Asegurar que empiece con letra
    IF base_name !~ '^[a-z]' THEN
        base_name := 'company_' || base_name;
    END IF;
    
    new_schema_name := base_name;
    
    -- Verificar si existe y añadir número si es necesario
    LOOP
        SELECT EXISTS(
            SELECT 1 FROM information_schema.schemata 
            WHERE schema_name = new_schema_name
        ) OR EXISTS(
            SELECT 1 FROM public.companies 
            WHERE companies.schema_name = new_schema_name
        ) INTO name_exists;
        
        IF NOT name_exists THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        new_schema_name := base_name || '_' || counter;
        
        -- Verificar que no exceda 63 caracteres
        IF length(new_schema_name) > 63 THEN
            base_name := substring(base_name from 1 for (63 - length('_' || counter)));
            new_schema_name := base_name || '_' || counter;
        END IF;
    END LOOP;
    
    RETURN new_schema_name;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_companies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER companies_updated_at_trigger
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION update_companies_updated_at();

-- 6. Comentarios para documentación
COMMENT ON TABLE public.companies IS 'Tabla principal que gestiona las empresas registradas en el sistema multiempresa';
COMMENT ON COLUMN public.companies.company_code IS 'Código único de identificación de la empresa (ej: ABC1234)';
COMMENT ON COLUMN public.companies.schema_name IS 'Nombre del schema donde están los datos de la empresa';
COMMENT ON COLUMN public.companies.subscription_plan IS 'Plan de suscripción: basic, premium, enterprise';
COMMENT ON COLUMN public.companies.max_users IS 'Número máximo de usuarios permitidos para esta empresa';
COMMENT ON COLUMN public.companies.storage_limit_mb IS 'Límite de almacenamiento en MB para esta empresa';
