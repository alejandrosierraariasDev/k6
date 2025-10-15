import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// --- Base de la API ---
const API_BASE_URL =  'http://k6_test_node_api:3000/api/v1';

// --- Datos de Usuarios para Autenticación ---
const users = new SharedArray('user data', function () {
    // RUTA CORREGIDA: Busca en el subdirectorio 'data'
    return JSON.parse(open('./data/users.json'));
});

// --- Categorías Activas Creadas por POST /products ---
// Estas son las categorías que el escenario 'submitForm' está insertando.
const READ_CATEGORIES = ['cat_0', 'cat_1', 'cat_2'];

// Función de ayuda para seleccionar una de las categorías creadas
function getRandomCategory() {
    return READ_CATEGORIES[Math.floor(Math.random() * READ_CATEGORIES.length)];
}

// ----------------------------------------------------
// 1. CONFIGURACIÓN GLOBAL Y UMBRALES
// ----------------------------------------------------
export const options = {
    thresholds: {
        // El 90% de las peticiones deben ser completadas en menos de 500ms
        'http_req_duration': ['p(90)<500'],
        // Tasa de éxito de checks debe ser al menos 95%
        'checks': ['rate>0.95'],
        // Umbral específico para el endpoint de login (permitimos hasta 1s)
        'http_req_duration{scenario:auth_stress}': ['p(95)<1000'],
    },

    // ----------------------------------------------------
    // 2. ESCENARIOS COMBINADOS (Adaptados a la nueva API)
    // ----------------------------------------------------
    scenarios: {
        // A) [ESTRÉS GRADUAL] - Lectura de categorías activas
        stress_test: {
            executor: 'ramping-vus',
            exec: 'browsingFlow',
            stages: [
                { duration: '1m', target: 50 },
                { duration: '30s', target: 50 },
                { duration: '30s', target: 0 },
            ],
        },

        // B) [CAPACIDAD CONSTANTE] - Lectura rápida de categorías activas
        capacity_check: {
            executor: 'constant-arrival-rate',
            exec: 'apiCall',
            rate: 5,
            timeUnit: '1s',
            duration: '1m',
            preAllocatedVUs: 10,
            maxVUs: 30,
            startTime: '1m',
        },

        // C) [TRABAJO TOTAL FIJO] - Escritura de productos (creando cat_0, cat_1, cat_2)
        form_submission: {
            executor: 'shared-iterations',
            exec: 'submitForm',
            vus: 5,
            iterations: 20,
            maxDuration: '1m',
        },

        // D) [USUARIO ÚNICO] - Lectura crítica de la categoría 'cat_0'
        single_critical_task: {
            executor: 'per-vu-iterations',
            exec: 'criticalTask',
            vus: 1,
            iterations: 1,
            startTime: '10s',
        },

        // E) [ESTRÉS DE AUTENTICACIÓN]
        auth_stress: {
            executor: 'constant-vus',
            exec: 'authFlow',
            vus: 10,
            duration: '1m',
            startTime: '10s',
        },
    },
};

// ----------------------------------------------------
// 3. FUNCIONES DE TRÁFICO (Sincronizadas con la API)
// ----------------------------------------------------

// Escenario A: stress_test (Lectura: GET /products/category/:category)
export function browsingFlow() {
    // *** CORREGIDO: Consulta una categoría activa al azar ***
    const category = getRandomCategory();
    const res = http.get(`${API_BASE_URL}/products/category/${category}`);

    const success = check(res, {
        'Browsing: Status 200/OK': (r) => r.status === 200,
        'Browsing: JSON es válido': (r) => r.json() !== null,
    });

    if (!success) {
        console.error(`ERROR en BrowsingFlow: Status=${res.status}, URL=${res.url}, Body=${res.body.substring(0, 200)}...`);
    }

    sleep(1.5);
}

// Escenario B: capacity_check (Lectura rápida: GET /products/category/:category)
export function apiCall() {
    // *** CORREGIDO: Consulta una categoría activa al azar ***
    const category = getRandomCategory();
    const res = http.get(`${API_BASE_URL}/products/category/${category}`);

    const success = check(res, {
        'API Call: Status 200/OK': (r) => r.status === 200,
    });

    if (!success) {
        console.error(`ERROR en APICall: Status=${res.status}, URL=${res.url}, Body=${res.body.substring(0, 200)}...`);
    }

    // Sin sleep
}

// Escenario C: form_submission (Escritura: POST /products)
export function submitForm() {
    // Simula la creación de un nuevo producto (genera cat_0, cat_1, cat_2)
    const payload = JSON.stringify({
        name: `Producto_${__VU}_${__ITER}`,
        category: `cat_${__ITER % 3}` // Genera las categorías que se leen arriba
    });

    const params = { headers: { 'Content-Type': 'application/json' } };

    const res = http.post(`${API_BASE_URL}/products`, payload, params);

    check(res, {
        'Product Creation: Status 201 (Created)': (r) => r.status === 201,
        'Product Creation: ID recibido': (r) => r.json() && r.json().id > 0,
    });
    sleep(1);
}

// Escenario D: single_critical_task (Lectura crítica: GET /products/category/cat_0)
export function criticalTask() {
    // *** CORREGIDO: Consulta la categoría 'cat_0' ***
    console.log('--- CRITICAL TASK: Started ---');
    const category = 'cat_0';
    const res = http.get(`${API_BASE_URL}/products/category/${category}`);

    check(res, {
        'Critical: Status 200/OK': (r) => r.status === 200,
    });
    console.log('--- CRITICAL TASK: Finished ---');
    sleep(1);
}

// Escenario E: auth_stress (Login: POST /auth/login)
export function authFlow() {
    const user = users[__VU % users.length];

    const payload = JSON.stringify({
        username: user.username,
        password: user.password
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        tags: {
            scenario: 'auth_stress'
        }
    };

    const res = http.post(`${API_BASE_URL}/auth/login`, payload, params);

    check(res, {
        'Auth: Status 200 (Login OK)': (r) => r.status === 200,
        'Auth: Token recibido': (r) => r.json() && r.json().token && r.json().token.length > 0,
    });

    sleep(2);
}
