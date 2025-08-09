const pool = require('../config/db');

/**
 * Obtiene un cliente PostgreSQL configurado para el schema indicado reutilizando
 * el cliente existente (por request) si se proporciona.
 * @param {Object} options
 * @param {string} options.schemaName - Nombre del schema (empresa)
 * @param {object|null} options.existingClient - Cliente ya asociado al request (req.dbClient)
 * @returns {Promise<{client: any, release: Function}>}
 */
async function getClient({ schemaName = 'public', existingClient = null } = {}) {
  if (existingClient) {
    // Ya debería tener el search_path configurado por el middleware
    return {
      client: existingClient,
      release: () => {/* no-op */}
    };
  }
  const client = await pool.connect();
  let releaseCalled = false;
  try {
    if (schemaName && /^[a-zA-Z][a-zA-Z0-9_]*$/.test(schemaName) && schemaName !== 'public') {
      await client.query(`SET search_path TO "${schemaName}", public`);
    }
  } catch (err) {
    client.release();
    releaseCalled = true;
    throw err;
  }
  return {
    client,
    release: () => { if (!releaseCalled) { client.release(); releaseCalled = true; } }
  };
}

module.exports = { getClient };
