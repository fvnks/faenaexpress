const { Client } = require('D:/proyectos/facturas/node_modules/.pnpm/pg@8.23.1/node_modules/pg/lib/index.js');
const c = new Client({
  host: '148.113.196.87',
  port: 5432,
  user: 'postgres',
  password: 'UtdiejuIDIJh08O47DIRhQwGUC5p76ov9OV6m42zjSRZacktCc7bNxF0Wy6HFY11',
  database: 'postgres'
});
c.connect().then(() => c.query('SELECT 1 as test')).then(r => console.log('Conexión directa OK (IP pública, sin SSL):', r.rows[0])).catch(e => console.log('Error:', e.message)).finally(() => c.end().catch(()=>{}));