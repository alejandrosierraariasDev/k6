import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// ATENCIÓN: Usamos 'k6_test_node_api' como host, que es el nombre del servicio en Docker Compose
// El puerto 3000 es el puerto interno en el que escucha el contenedor de Node.js
const BASE_URL = 'http://k6_test_node_api:3000/api/v1';
const CATEGORIES = ['Electronics', 'HomeGoods', 'Apparel'];

// Métrica para contar las inserciones
const successfulPosts = new Counter('successful_posts');


// Utilizamos 'export let' en lugar de 'export const' para asegurar la compatibilidad
export let options = {
    // Escenario de carga (50 Usuarios Virtuales por 60 segundos)
    vus: 50,
    duration: '60s',

    // Umbrales de éxito (performance goals)
    thresholds: {
        // Fallos de peticiones HTTP: deben ser menos del 5% del total
        'http_req_failed': ['rate<0.05'],
        // Duración de la petición: el 99% debe responder en menos de 500ms
        'http_req_duration': ['p(99) < 500'],
    },

    // Configuración para enviar métricas a InfluxDB
    ext: {
        influxdb: {
            // Utilizamos el nombre del servicio 'influxdb'
            'url': 'http://influxdb:8086/k6'
        }
    }
};

/**
 * Función principal y punto de entrada obligatorio (export default)
 * Simula una carga mixta: 80% de Lectura (GET), 20% de Escritura (POST)
 */
export default function () {
    // 80% de probabilidad de hacer una lectura
    if (Math.random() < 0.8) {
        getProductsByCategory();
    }
    // 20% de probabilidad de hacer una escritura
    else {
        insertNewProduct();
    }
    // Espera de 1 segundo entre iteraciones
    sleep(1);
}


// --- 1. SIMULACIÓN DE LECTURA (GET) ---
function getProductsByCategory() {
    const randomCategory = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    // ATENCIÓN: Corregimos la URL a 'k6_test_node_api' si es necesario, aunque en el prompt usaste 'node_api'
    const url = `${BASE_URL}/products/category/${randomCategory}`;

    const res = http.get(url);

    // Verificación de la respuesta
    check(res, {
        'API_READ: Status 200 (GET)': (r) => r.status === 200,
        'API_READ: Response body is not empty': (r) => r.body.length > 0,
    });
}

// --- 2. SIMULACIÓN DE ESCRITURA (POST) ---
function insertNewProduct() {
    const newProduct = {
        name: `API-Product-${__VU}-${Date.now()}`,
        category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
    };

    const url = `${BASE_URL}/products`;
    const params = {
        headers: { 'Content-Type': 'application/json' },
    };

    const res = http.post(url, JSON.stringify(newProduct), params);

    // Verificación de la respuesta
    const success = check(res, {
        'API_WRITE: Status 201 (POST)': (r) => r.status === 201,
    });

    if (success) {
        successfulPosts.add(1);
    }
}
