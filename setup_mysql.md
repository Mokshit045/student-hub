# MySQL Setup Guide

Follow these steps to set up your MySQL database for the Student Management System.

## 1. Install MySQL
If you don't have MySQL installed, we recommend using:
- **XAMPP**: Includes MariaDB and phpMyAdmin (Easiest for beginners).
- **MySQL Installer**: Official tool.

## 2. Create the Database & Table
Copy and paste this into your MySQL terminal (or phpMyAdmin SQL tab):

```sql
CREATE DATABASE IF NOT EXISTS student_mgmt;
USE student_mgmt;

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
);
```

## 3. Configure Environment Variables
Verify your `.env` file looks like this:

```bash
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=student_mgmt
```

## 4. Run the Application
Run these commands in your project terminal:

```bash
npm install
npm run dev
```
