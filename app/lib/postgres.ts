import postgres from 'postgres';

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL no está definido en las variables de entorno');
}

export const sql = postgres(process.env.POSTGRES_URL, { 
  ssl: 'require',
  prepare: false, // 🚫 desactiva planes preparados para evitar el error "cached plan must not change result type"
});