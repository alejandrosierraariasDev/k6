import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// URL Base del servicio Node.js
const BASE_URL = 'http://k6_test_node_api:3000/api/v1';

// 1. Carga de Usuarios: Carga los datos de users.json una sola vez.
const users = new SharedArray('users', function () {
    try {
        return JSON.parse(open('./data/users.json'));
    } catch (e) {
        console.error(`ERROR: No se pudo cargar el archivo de usuarios. Asegúrate de que /app/tests/data/users.json exista. Error: ${e}`);
        return [];
    }
});

export const options = {
    // Definición de escenarios de carga (10 Usuarios Virtuales durante 10 segundos)
    vus: 10,
    duration: '10s',
    thresholds: {
        // Aseguramos que el 95% de los chequeos pasen
        'checks': ['rate>0.95'],
        // Aseguramos que haya menos del 2% de fallos en peticiones HTTP
        'http_req_failed': ['rate<0.02'],
        // El 95% de las peticiones deben ser inferiores a 500ms
        'http_req_duration': ['p(95)<500'],
    }
};

export default function () {
    if (users.length === 0) {
        sleep(1);
        return;
    }

    // Asignación de usuario único por VU
    const userIndex = __VU % users.length;
    const user = users[userIndex];

    // ==========================================================
    // 1. LOGIN (POST) - Obtener Token
    // ==========================================================

    const loginUrl = `${BASE_URL}/auth/login`;
    const loginPayload = JSON.stringify({
        username: user.username,
        // ¡CORRECCIÓN AQUÍ! Usamos user.pass para coincidir con el archivo users.json
        password: user.password,
    });
    const loginHeaders = { 'Content-Type': 'application/json' };

    const loginRes = http.post(loginUrl, loginPayload, { headers: loginHeaders });

    const loginSuccess = check(loginRes, {
        [`[1] Login exitoso para ${user.user}`]: (r) => r.status === 200,
        '[1] Respuesta contiene token': (r) => r.body.includes('token'),
    });

    if (!loginSuccess) {
        // Si el login falla, terminamos la iteración de esta VU
        console.error(`[VU: ${__VU}] ERROR DE LOGIN. Status: ${loginRes.status}. Body: ${loginRes.body.substring(0, 100)}...`);
        sleep(1);
        return;
    }

    // Extracción del token JWT simulado del cuerpo de la respuesta
    let authToken = null;
    try {
        const loginBody = loginRes.json();
        authToken = loginBody.token;
    } catch (e) {
        console.error(`[VU: ${__VU}] Error al parsear JSON del login: ${e}`);
        sleep(1);
        return;
    }

    // Configuración de headers con el token para peticiones autenticadas
    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
    };

    // ==========================================================
    // 2. LECTURA (GET) - Obtener productos por categoría
    // ==========================================================
    const categoryToSearch = 'Electronics'; // Simula la búsqueda en una categoría
    const getProductsUrl = `${BASE_URL}/products/category/${categoryToSearch}`;

    const getRes = http.get(getProductsUrl, { headers: authHeaders });

    check(getRes, {
        [`[2] GET Productos de ${categoryToSearch} OK`]: (r) => r.status === 200,
        '[2] Respuesta de GET es JSON válido': (r) => r.json() !== null,
    });

    // Pausa corta para simular tiempo de "navegación"
    sleep(0.5);


    // ==========================================================
    // 3. ESCRITURA (POST) - Crear un nuevo producto
    // ==========================================================
    const postProductsUrl = `${BASE_URL}/products`;

    // Genera un nombre de producto único para evitar colisiones
    const productName = `TestItem-VU${__VU}-${Date.now() % 1000}`;
    const productPayload = JSON.stringify({
        name: productName,
        category: 'LoadTestItem', // Categoría para los items de prueba
    });

    const postRes = http.post(postProductsUrl, productPayload, { headers: authHeaders });

    check(postRes, {
        '[3] POST Creación exitosa (201)': (r) => r.status === 201,
        '[3] Respuesta de POST contiene ID': (r) => postRes.json().id !== undefined,
    });

    // Pausa entre iteraciones
    sleep(1);
}
