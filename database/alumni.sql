CREATE DATABASE IF NOT EXISTS alumni_db;

USE alumni_db;

CREATE TABLE IF NOT EXISTS alumni (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(15),
    course VARCHAR(50),
    graduation_year INT
);