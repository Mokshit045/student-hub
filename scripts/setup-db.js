const db = require('./config/db');

async function init() {
    try {
        console.log('Creating students table...');
        await db.execute(`
            CREATE TABLE IF NOT EXISTS students (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                rollNumber VARCHAR(50) NOT NULL UNIQUE,
                phone VARCHAR(20),
                department VARCHAR(100) NOT NULL,
                year INT NOT NULL,
                gender VARCHAR(20) NOT NULL,
                gpa DECIMAL(4, 2) DEFAULT 0.00,
                status VARCHAR(50) DEFAULT 'Active',
                address TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        console.log('Table created successfully.');

        // Insert some sample data to see it on the website
        console.log('Inserting sample data...');
        await db.execute(`
            INSERT IGNORE INTO students (name, email, rollNumber, department, year, gender, gpa, status)
            VALUES 
            ('John Doe', 'john@example.com', 'S001', 'Computer Science', 2, 'Male', 3.85, 'Active'),
            ('Jane Smith', 'jane@example.com', 'S002', 'Data Science', 3, 'Female', 3.90, 'Active')
        `);
        console.log('Sample data inserted.');

        await db.end();
    } catch (err) {
        console.error('Error initializing database:', err.message);
        process.exit(1);
    }
}

init();
