const mysql = require('mysql2/promise');
require('dotenv').config();

let poolConfig;

// Use public URL if available (for Railway/Vercel deployments)
if (process.env.MYSQL_PUBLIC_URL) {
    const url = new URL(process.env.MYSQL_PUBLIC_URL);
    poolConfig = {
        host: url.hostname,
        user: url.username,
        password: url.password,
        database: url.pathname.replace('/', ''),
        port: Number(url.port),
        ssl: { rejectUnauthorized: false },
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+05:30'
    };
    console.log('Database Pool Created (via MYSQL_PUBLIC_URL):');
    console.log('- Host:', url.hostname + ':' + url.port);
    console.log('- Database:', url.pathname.replace('/', ''));
} else {
    const host = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost';
    const port = Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306);
    poolConfig = {
        host,
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'student_mgmt',
        port,
        ssl: (host && host !== 'localhost') ? { rejectUnauthorized: false } : false,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        timezone: '+05:30'
    };
    console.log('Database Pool Created (via individual env vars):');
    console.log('- Host:', host + ':' + port);
    console.log('- Database:', process.env.DB_NAME || process.env.MYSQLDATABASE || 'student_mgmt (default)');
}

const pool = mysql.createPool(poolConfig);

module.exports = pool;

