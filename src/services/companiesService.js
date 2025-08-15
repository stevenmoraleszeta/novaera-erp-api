const pool = require('../config/db');
const bcrypt = require('bcrypt');

class CompaniesService {
  // Obtener lista básica de compañías activas (id, code, name, schema)
  async getAllActiveCompaniesBasic() {
    try {
      const result = await pool.query(`
        SELECT id, company_code, company_name, schema_name
        FROM public.companies
        WHERE is_active = true
      `);
      return result.rows;
    } catch (error) {
      console.error('Error en getAllActiveCompaniesBasic:', error);
      return [];
    }
  }

  // Clonar empresa completa copiando TODAS las tablas y TODOS los datos. El usuario solo proporciona un nombre (se usa como company_name y base para schema).
  async cloneCompany(sourceCompanyCode, copyName) {
    if (!sourceCompanyCode) throw new Error('Código origen requerido');
    if (!copyName || !copyName.trim()) throw new Error('Nombre de la copia requerido');

    const rawName = copyName.trim();
    // Construir nombre de schema seguro
    const toSchema = (txt) => {
      let s = txt.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      s = s.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
      if (!/^[a-z]/.test(s)) s = 'c_' + s; // asegurar que inicia con letra
      if (s.length === 0) s = 'c_schema';
      if (s.length > 50) s = s.slice(0, 50); // reservar espacio para sufijos
      return s;
    };
    const baseSchema = toSchema(rawName);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Obtener empresa origen
      const srcRes = await client.query('SELECT * FROM public.companies WHERE company_code = $1 AND is_active = true FOR UPDATE', [sourceCompanyCode]);
      if (srcRes.rows.length === 0) throw new Error('Empresa origen no encontrada');
      const src = srcRes.rows[0];

      // Resolver nombre de schema único agregando sufijos si es necesario
      let schemaName = baseSchema;
      let idx = 2;
      while (true) {
        const exists = await client.query('SELECT 1 FROM information_schema.schemata WHERE schema_name = $1', [schemaName]);
        if (exists.rows.length === 0) break;
        schemaName = `${baseSchema}_${idx}`;
        if (schemaName.length > 63) schemaName = schemaName.slice(0, 63); // límite Postgres
        idx++;
        if (idx > 200) throw new Error('No se pudo generar un nombre de schema único');
      }

      // Generar nuevo company_code
      const codeRes = await client.query('SELECT generate_company_code() as code');
      const newCode = codeRes.rows[0].code;

      // Crear schema destino
      await client.query(`CREATE SCHEMA "${schemaName}"`);

      // Copiar TODAS las tablas (estructura + datos)
      const tablesRes = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = $1 AND table_type='BASE TABLE'
        ORDER BY table_name
      `, [src.schema_name]);

      for (const { table_name: tbl } of tablesRes.rows) {
        await client.query(`CREATE TABLE "${schemaName}"."${tbl}" (LIKE "${src.schema_name}"."${tbl}" INCLUDING ALL)`);
        await client.query(`INSERT INTO "${schemaName}"."${tbl}" SELECT * FROM "${src.schema_name}"."${tbl}"`);
      }

      // Ajustar secuencias/identidades: establecer al MAX(col) para columnas identity
      const identities = await client.query(`
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = $1 AND is_identity = 'YES'
      `, [schemaName]);
      for (const r of identities.rows) {
        // setval(pg_get_serial_sequence('schema.table','col'), max(col))
        await client.query(`SELECT setval(pg_get_serial_sequence($1,$2), (SELECT COALESCE(MAX("${r.column_name}"),0) FROM "${schemaName}"."${r.table_name}" ) , true)`, [`${schemaName}.${r.table_name}`, r.column_name]);
      }

      // Insertar registro en public.companies
      // Asegurar email único (companies.email es único). Si el original ya existe, generar variantes.
      const deriveUniqueEmail = async () => {
        let baseEmail = (src.email || '').toLowerCase();
        if (!baseEmail || !baseEmail.includes('@')) {
          baseEmail = `${schemaName}@example.local`; // fallback
        }
        const [local, domain] = baseEmail.split('@');
        const cleanLocal = local.replace(/[^a-z0-9._-]+/g,'').slice(0,40) || 'company';
        // Primera prueba: usar mismo email si no existe
        let candidate = `${cleanLocal}@${domain}`;
        let attempt = 0;
        while (true) {
          const exists = await client.query('SELECT 1 FROM public.companies WHERE lower(email)=lower($1)', [candidate]);
            if (exists.rows.length === 0) return candidate;
          attempt++;
          if (attempt > 100) throw new Error('No se pudo generar email único para la copia');
          candidate = `${cleanLocal}_copy${attempt}@${domain}`;
        }
      };
      const newEmail = await deriveUniqueEmail();

      const newCompanyRes = await client.query(`
        INSERT INTO public.companies (company_code, company_name, schema_name, email, phone, address, is_active, subscription_plan, subscription_expires_at, max_users, storage_limit_mb, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,true,$7,$8,$9,$10,NOW(),NOW())
        RETURNING id, company_code, schema_name, company_name, email
      `, [
        newCode,
        rawName,
        schemaName,
        newEmail,
        src.phone,
        src.address,
        src.subscription_plan,
        src.subscription_expires_at,
        src.max_users,
        src.storage_limit_mb
      ]);

      await client.query('COMMIT');
      return { success: true, data: newCompanyRes.rows[0], message: 'Empresa clonada' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  
  // Crear nueva empresa con su schema completo
  async createCompany(companyData) {
    const {
      company_name,
      email,
      phone = null,
      address = null,
      admin_name = null,
      admin_email = null,
      admin_password = null
    } = companyData;
    
    try {
      // Hash de la contraseña del administrador si se proporciona
      let hashedPassword = null;
      if (admin_password) {
        hashedPassword = await bcrypt.hash(admin_password, 10);
      }
      
      // Llamar a la función de PostgreSQL para crear la empresa
      const result = await pool.query(`
        SELECT create_company_schema($1, $2, $3, $4, $5, $6, $7) AS result
      `, [
        company_name,
        email,
        phone,
        address,
        admin_name,
        admin_email,
        hashedPassword
      ]);
      
      const response = result.rows[0].result;
      
      if (!response.success) {
        const detail = response.error ? `: ${response.error}` : '';
        throw new Error(response.message ? `${response.message}${detail}` : 'Error al crear la empresa');
      }
      
      return {
        success: true,
        data: {
          company_id: response.company_id,
          company_code: response.company_code,
          schema_name: response.schema_name,
          admin_user_id: response.admin_user_id
        },
        message: 'Empresa creada exitosamente'
      };
      
    } catch (error) {
      console.error('Error en createCompany:', error);
      throw new Error(`Error al crear empresa: ${error.message}`);
    }
  }
  
  // Obtener empresa por código
  async getCompanyByCode(companyCode) {
    try {
      const result = await pool.query(`
        SELECT id, company_code, company_name, schema_name, email, 
               phone, address, created_at, is_active, subscription_plan,
               subscription_expires_at, max_users, storage_limit_mb
        FROM public.companies 
        WHERE company_code = $1 AND is_active = true
      `, [companyCode]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en getCompanyByCode:', error);
      throw new Error(`Error al obtener empresa: ${error.message}`);
    }
  }
  
  // Obtener empresa por schema
  async getCompanyBySchema(schemaName) {
    try {
      const result = await pool.query(`
        SELECT id, company_code, company_name, schema_name, email, 
               phone, address, created_at, is_active, subscription_plan,
               subscription_expires_at, max_users, storage_limit_mb
        FROM public.companies 
        WHERE schema_name = $1 AND is_active = true
      `, [schemaName]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en getCompanyBySchema:', error);
      throw new Error(`Error al obtener empresa: ${error.message}`);
    }
  }
  
  // Validar que un schema existe y es válido
  async validateSchema(schemaName) {
    try {
      // Verificar que el schema existe en la base de datos
      const schemaResult = await pool.query(`
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name = $1
      `, [schemaName]);
      
      if (schemaResult.rows.length === 0) {
        return { valid: false, error: 'Schema no encontrado' };
      }
      
      // Verificar que el schema está registrado en companies
      const companyResult = await pool.query(`
        SELECT id, company_code, is_active 
        FROM public.companies 
        WHERE schema_name = $1
      `, [schemaName]);
      
      if (companyResult.rows.length === 0) {
        return { valid: false, error: 'Schema no registrado como empresa' };
      }
      
      const company = companyResult.rows[0];
      
      if (!company.is_active) {
        return { valid: false, error: 'Empresa inactiva' };
      }
      
      return { 
        valid: true, 
        company_id: company.id,
        company_code: company.company_code 
      };
      
    } catch (error) {
      console.error('Error en validateSchema:', error);
      return { valid: false, error: 'Error al validar schema' };
    }
  }
  
  // Establecer el schema para las consultas
  async setCompanySchema(client, schemaName) {
    try {
      // Validar que el schema es seguro (solo letras, números y guiones bajos)
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(schemaName)) {
        throw new Error('Nombre de schema inválido');
      }
      
      // Validar que el schema existe y es válido
      const validation = await this.validateSchema(schemaName);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Establecer el search_path
      await client.query(`SET search_path TO "${schemaName}", public`);
      
      return true;
    } catch (error) {
      console.error('Error en setCompanySchema:', error);
      throw new Error(`Error al establecer schema de empresa: ${error.message}`);
    }
  }
  
  // Obtener conexión con schema configurado
  async getCompanyConnection(schemaName) {
    const client = await pool.connect();
    
    try {
      await this.setCompanySchema(client, schemaName);
      return client;
    } catch (error) {
      client.release();
      throw error;
    }
  }
  
  // Listar todas las empresas (solo para administración)
  async getAllCompanies(page = 1, limit = 10) {
    try {
      const offset = (page - 1) * limit;
      
      const result = await pool.query(`
        SELECT id, company_code, company_name, schema_name, email, 
               phone, created_at, is_active, subscription_plan,
               subscription_expires_at, max_users, storage_limit_mb
        FROM public.companies 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]);
      
      const countResult = await pool.query(`
        SELECT COUNT(*) as total FROM public.companies
      `);
      
      return {
        companies: result.rows,
        total: parseInt(countResult.rows[0].total),
        page,
        limit,
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      };
    } catch (error) {
      console.error('Error en getAllCompanies:', error);
      throw new Error(`Error al listar empresas: ${error.message}`);
    }
  }
  
  // Actualizar información de empresa
  async updateCompany(companyId, updateData) {
    const { company_name, email, phone, address, is_active, subscription_plan, max_users, storage_limit_mb } = updateData;
    
    try {
      const result = await pool.query(`
        UPDATE public.companies 
        SET company_name = COALESCE($2, company_name),
            email = COALESCE($3, email),
            phone = COALESCE($4, phone),
            address = COALESCE($5, address),
            is_active = COALESCE($6, is_active),
            subscription_plan = COALESCE($7, subscription_plan),
            max_users = COALESCE($8, max_users),
            storage_limit_mb = COALESCE($9, storage_limit_mb),
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `, [companyId, company_name, email, phone, address, is_active, subscription_plan, max_users, storage_limit_mb]);
      
      if (result.rows.length === 0) {
        throw new Error('Empresa no encontrada');
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('Error en updateCompany:', error);
      throw new Error(`Error al actualizar empresa: ${error.message}`);
    }
  }
  
  // Eliminar empresa (soft delete)
  async deleteCompany(companyId) {
    try {
      const result = await pool.query(`
        UPDATE public.companies 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING schema_name
      `, [companyId]);
      
      if (result.rows.length === 0) {
        throw new Error('Empresa no encontrada');
      }
      
      return { success: true, message: 'Empresa desactivada exitosamente' };
    } catch (error) {
      console.error('Error en deleteCompany:', error);
      throw new Error(`Error al eliminar empresa: ${error.message}`);
    }
  }
  
  // Verificar límites de empresa
  async checkCompanyLimits(schemaName) {
    try {
      const company = await this.getCompanyBySchema(schemaName);
      if (!company) {
        throw new Error('Empresa no encontrada');
      }
      
      // Usar el client con schema configurado
      const client = await this.getCompanyConnection(schemaName);
      
      try {
        // Contar usuarios actuales
        const userCountResult = await client.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        const currentUsers = parseInt(userCountResult.rows[0].count);
        
        // Calcular almacenamiento usado (ejemplo con archivos)
        const storageResult = await client.query('SELECT COALESCE(SUM(file_size), 0) as total_size FROM files WHERE is_active = true');
        const currentStorageMB = Math.ceil(parseInt(storageResult.rows[0].total_size) / (1024 * 1024));
        
        return {
          users: {
            current: currentUsers,
            limit: company.max_users,
            available: company.max_users - currentUsers
          },
          storage: {
            current_mb: currentStorageMB,
            limit_mb: company.storage_limit_mb,
            available_mb: company.storage_limit_mb - currentStorageMB
          },
          subscription: {
            plan: company.subscription_plan,
            expires_at: company.subscription_expires_at
          }
        };
      } finally {
        client.release();
      }
      
    } catch (error) {
      console.error('Error en checkCompanyLimits:', error);
      throw new Error(`Error al verificar límites: ${error.message}`);
    }
  }
}

module.exports = new CompaniesService();
