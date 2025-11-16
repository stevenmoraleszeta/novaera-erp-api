const { Pool } = require('pg');
require('dotenv').config();

// SSL configuration options
let sslConfig = false;

// Check if we're in a hosted environment that requires SSL
const isHostedEnvironment = process.env.NODE_ENV === 'production' || 
                           process.env.DATABASE_URL || 
                           process.env.DB_HOST?.includes('amazonaws.com') ||
                           process.env.DB_HOST?.includes('railway.app') ||
                           process.env.DB_HOST?.includes('render.com') ||
                           process.env.DB_HOST?.includes('heroku.com');

if (process.env.DB_SSL === 'disable') {
  sslConfig = false;
} else if (process.env.DB_SSL === 'require') {
  sslConfig = { rejectUnauthorized: true };
} else if (process.env.DB_SSL === 'true' || isHostedEnvironment) {
  // For hosted environments, use SSL with flexible certificate validation
  sslConfig = { 
    rejectUnauthorized: false,
    // Allow self-signed certificates in hosted environments
    checkServerIdentity: () => undefined
  };
}

// Support DATABASE_URL (provided by Render) or individual connection parameters
let poolConfig;

// Debug: Log which connection method is being used
console.log('🔍 Database Configuration Debug:');
console.log('  DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('  NODE_ENV:', process.env.NODE_ENV);
console.log('  DB_HOST:', process.env.DB_HOST);
console.log('  DB_SSL:', process.env.DB_SSL);

if (process.env.DATABASE_URL) {
  // Use DATABASE_URL if provided (Render, Railway, Heroku, etc.)
  console.log('✅ Using DATABASE_URL for connection');
  // For Render, always use SSL when DATABASE_URL is provided
  const renderSslConfig = process.env.DB_SSL === 'disable' 
    ? false 
    : { rejectUnauthorized: false };
  
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: renderSslConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  };
} else {
  // Use individual connection parameters
  console.log('⚠️  Using individual DB parameters (DATABASE_URL not found)');
  console.log('  Host:', process.env.DB_HOST || 'localhost');
  console.log('  Port:', process.env.DB_PORT || 5432);
  console.log('  Database:', process.env.DB_NAME);
  
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: sslConfig,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: 20
  };
}

const pool = new Pool(poolConfig);

// Handle connection errors
pool.on('error', (err) => {
  console.error('Database connection error:', err);
  if (err.code === 'ECONNREFUSED') {
    console.error('Database connection refused. Check if PostgreSQL is running.');
  } else if (err.message.includes('SSL')) {
    console.error('SSL connection error. Try setting DB_SSL=disable in .env file.');
  }
});

// Test database connection with retry logic
const testConnection = async (maxRetries = 3) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('Database connection successful');
      return true;
    } catch (error) {
      lastError = error;
      console.log(`Database connection attempt ${i + 1} failed:`, error.message);
      
      // If it's an SSL/TLS error, try to adjust configuration
      if (error.message.includes('SSL') || error.message.includes('TLS') || error.message.includes('ECONNRESET')) {
        console.log('Detected SSL/TLS error. Adjusting SSL configuration...');
        
        // Try with SSL enabled if not already
        if (!sslConfig) {
          console.log('Retrying with SSL enabled...');
          pool.options.ssl = { rejectUnauthorized: false };
        }
      }
      
      // Wait before retry (exponential backoff)
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  }
  
  console.error('Failed to connect to database after', maxRetries, 'attempts');
  console.error('Last error:', lastError?.message || 'Unknown error');
  
  // Log helpful SSL debugging info
  if (lastError?.message?.includes('SSL') || lastError?.message?.includes('TLS')) {
    console.error('SSL/TLS Error detected. Try setting these environment variables:');
    console.error('For hosted databases: DB_SSL=true');
    console.error('For local databases: DB_SSL=disable');
    console.error('Current SSL config:', sslConfig);
  }
  
  return false;
};

// Test the connection with retry logic
testConnection().then(success => {
  if (!success) {
    console.error('Initial database connection failed. Server may still start but database operations will fail.');
  }
});

// Test the connection (keeping the old method as fallback)
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err);
    if (err.message.includes('SSL')) {
      console.error('SSL connection error. Try setting DB_SSL=disable in .env file.');
    }
    return;
  }
  console.log('Database connected successfully');
  release();
});

module.exports = pool;
