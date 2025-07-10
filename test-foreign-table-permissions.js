const pool = require('./src/config/db');
const tablesService = require('./src/services/tablesService');
const rolesService = require('./src/services/rolesService');

async function testForeignTablePermissions() {
  console.log('🧪 Test: Creación de tabla foránea con asignación automática de permisos');
  
  try {
    // 1. Verificar que existen roles en el sistema
    console.log('\n1. Obteniendo roles existentes...');
    const roles = await rolesService.getRoles();
    console.log(`   ✅ Encontrados ${roles.length} roles:`, roles.map(r => r.name));
    
    if (roles.length === 0) {
      console.log('   ⚠️  No hay roles en el sistema. Creando un rol de prueba...');
      await rolesService.createRole({ name: 'Test Role' });
      const newRoles = await rolesService.getRoles();
      console.log(`   ✅ Rol de prueba creado. Total roles: ${newRoles.length}`);
    }
    
    // 2. Verificar que existen tablas para crear la relación
    console.log('\n2. Obteniendo tablas existentes...');
    const tables = await tablesService.getTables();
    console.log(`   ✅ Encontradas ${tables.length} tablas`);
    
    if (tables.length < 2) {
      console.log('   ⚠️  Se necesitan al menos 2 tablas para crear una relación many-to-many');
      console.log('   📝 Saltando test por falta de tablas');
      return;
    }
    
    const tableA = tables[0];
    const tableB = tables[1];
    console.log(`   📋 Usando tabla A: "${tableA.name}" (ID: ${tableA.id})`);
    console.log(`   📋 Usando tabla B: "${tableB.name}" (ID: ${tableB.id})`);
    
    // 3. Crear tabla foránea y verificar asignación de permisos
    console.log('\n3. Probando creación/búsqueda de tabla foránea...');
    const result1 = await tablesService.getOrCreateJoinTable(tableA.id, tableB.id, 'foreign_record_id');
    
    if (result1.status === 'created') {
      console.log(`   ✅ Tabla foránea creada: "${result1.joinTable.name}" (ID: ${result1.joinTable.id})`);
      
      // 4. Verificar que se asignaron permisos a todos los roles
      console.log('\n4. Verificando permisos asignados tras creación...');
      await verifyPermissions(result1.joinTable.id);
      
      // 5. Intentar obtener la misma tabla foránea (debería encontrarla)
      console.log('\n5. Probando búsqueda de tabla foránea existente...');
      const result2 = await tablesService.getOrCreateJoinTable(tableA.id, tableB.id, 'foreign_record_id');
      
      if (result2.status === 'found') {
        console.log(`   ✅ Tabla foránea encontrada: "${result2.joinTable.name}" (ID: ${result2.joinTable.id})`);
        console.log('   📝 No se asignan permisos adicionales para tablas existentes');
      } else {
        console.log('   ⚠️  Se esperaba encontrar la tabla existente, pero se creó una nueva');
      }
      
    } else if (result1.status === 'found') {
      console.log(`   ℹ️  Tabla foránea ya existe: "${result1.joinTable.name}" (ID: ${result1.joinTable.id})`);
      console.log('   📝 No se asignan permisos para tablas existentes');
      
      // Verificar permisos existentes
      console.log('\n4. Verificando permisos existentes...');
      await verifyPermissions(result1.joinTable.id);
    }
    
    async function verifyPermissions(joinTableId) {
      const currentRoles = await rolesService.getRoles();
      
      for (const role of currentRoles) {
        try {
          const permissions = await rolesService.getRolePermissions(role.id, joinTableId);
          console.log(`   🔍 Rol "${role.name}":`, {
            can_create: permissions?.can_create || false,
            can_read: permissions?.can_read || false, 
            can_update: permissions?.can_update || false,
            can_delete: permissions?.can_delete || false
          });
          
          if (permissions?.can_read === true) {
            console.log(`   ✅ Rol "${role.name}" tiene permisos de lectura correctamente asignados`);
          } else {
            console.log(`   ❌ Rol "${role.name}" NO tiene permisos de lectura`);
          }
        } catch (error) {
          console.log(`   ⚠️  Error al verificar permisos para rol "${role.name}":`, error.message);
        }
      }
    }
    
    console.log('\n🎉 Test completado exitosamente');
    
  } catch (error) {
    console.error('\n❌ Error durante el test:', error);
  } finally {
    // Cerrar conexión
    await pool.end();
  }
}

// Ejecutar el test
testForeignTablePermissions();
