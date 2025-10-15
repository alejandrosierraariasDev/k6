// Cliente de PostgreSQL
const { Client } = require('pg');
const express = require('express');
const app = express();

// Middleware para parsear JSON en las peticiones
app.use(express.json());

// --- Configuración de la Base de Datos ---

// La cadena de conexión se obtiene de la variable de entorno de Docker Compose
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("FATAL: DATABASE_URL no está definida. La API no puede conectarse a Postgres.");
    process.exit(1);
}

// Cliente global de PostgreSQL
let dbClient;

async function connectDB() {
    try {
        dbClient = new Client({ connectionString });
        await dbClient.connect();
        console.log("Conexión exitosa a PostgreSQL.");
    } catch (err) {
        console.error("Error al conectar a PostgreSQL:", err.message);
        // Terminamos el proceso para que Docker Compose pueda intentar reiniciar el contenedor
        setTimeout(() => process.exit(1), 5000);
    }
}

// Llama a la conexión al iniciar
connectDB();

// --- Endpoints de la API ---
const API_PREFIX = '/api/v1';

// **********************************************
// 0. ENDPOINT de AUTENTICACIÓN (POST) - ¡NUEVO!
// Este endpoint es el objetivo de tu prueba k6.
// **********************************************
app.post(`${API_PREFIX}/auth/login`, async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        // 400 Bad Request si faltan campos
        return res.status(400).json({ error: "Username and password are required." });
    }

    // --- SIMULACIÓN DE AUTENTICACIÓN ---
    // En una aplicación real, aquí verificarías el usuario y la contraseña en la base de datos.
    // Para el test de carga, si las credenciales existen, simulamos éxito.

    // Simulación de latencia de autenticación (típico en la generación de tokens)
    await new Promise(resolve => setTimeout(resolve, 50));

    // Simulación de éxito: Devolver 200 con un token.
    // Asumimos que todas las credenciales proporcionadas en users.json son válidas.
    res.status(200).json({
        message: "Login exitoso",
        token: `mock_jwt_token_for_${username}`,
        expires: "1h"
    });
});


// 1. ENDPOINT de LECTURA (GET)
// Endpoint para obtener productos por categoría (simula una lectura frecuente)
app.get(`${API_PREFIX}/products/category/:category`, async (req, res) => {
    const category = req.params.category;

    // Simula una pequeña latencia del servidor antes de la DB
    await new Promise(resolve => setTimeout(resolve, 10));

    try {
        const result = await dbClient.query('SELECT id, name, category FROM products WHERE category = $1', [category]);

        // Verifica si se encontraron datos
        if (result.rows.length > 0) {
            res.status(200).json(result.rows);
        } else {
            // Si la categoría existe pero no tiene productos, devuelve 200 con array vacío
            res.status(200).json([]);
        }
    } catch (err) {
        console.error("Error al ejecutar la query de SELECT:", err.message);
        res.status(500).json({ error: "Error interno del servidor al leer datos." });
    }
});

// 2. ENDPOINT de ESCRITURA (POST)
// Endpoint para crear un nuevo producto (simula una escritura)
app.post(`${API_PREFIX}/products`, async (req, res) => {
    const { name, category } = req.body;

    if (!name || !category) {
        return res.status(400).json({ error: "Faltan los campos 'name' o 'category'." });
    }

    // Simula una pequeña latencia del servidor antes de la DB
    await new Promise(resolve => setTimeout(resolve, 20));

    try {
        const query = 'INSERT INTO products (name, category) VALUES ($1, $2) RETURNING id';
        const result = await dbClient.query(query, [name, category]);

        res.status(201).json({
            message: "Producto creado exitosamente",
            id: result.rows[0].id
        });
    } catch (err) {
        console.error("Error al ejecutar la query de INSERT:", err.message);
        res.status(500).json({ error: "Error interno del servidor al escribir datos." });
    }
});


// --- Inicio del Servidor ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API de Node.js escuchando en el puerto ${PORT}`);
    console.log(`URL de la base de datos: ${connectionString.substring(0, connectionString.indexOf('@'))}@[...]`);
});
