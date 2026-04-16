const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
    user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'student_mgmt',
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    ssl: (process.env.DB_HOST && process.env.DB_HOST !== 'localhost') || (process.env.MYSQLHOST && process.env.MYSQLHOST !== 'localhost') ? { rejectUnauthorized: false } : false,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: '+05:30'
});

console.log('Database Pool Created:');
console.log('- Host:', process.env.DB_HOST || process.env.MYSQLHOST || 'localhost (default)');
console.log('- User:', process.env.DB_USER || process.env.MYSQLUSER || 'root (default)');
console.log('- Database:', process.env.DB_NAME || process.env.MYSQLDATABASE || 'student_mgmt (default)');
console.log('- SSL:', ((process.env.DB_HOST && process.env.DB_HOST !== 'localhost') || (process.env.MYSQLHOST && process.env.MYSQLHOST !== 'localhost')) ? 'Enabled' : 'Disabled');

module.exports = pool;

