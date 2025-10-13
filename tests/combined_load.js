import http from 'k6/http';
import { check, sleep } from 'k6';

// ----------------------------------------------------
// 1. CONFIGURACIÓN GLOBAL Y UMBRALES
// ----------------------------------------------------
export const options = {
    // La prueba terminará después de 2m30s (o el tiempo del escenario más largo)
    // Usamos maxVUs global para limitar los VUs totales si los escenarios lo necesitan
    maxVUs: 150,

    thresholds: {
        // El 90% de las peticiones deben ser completadas en menos de 500ms
        'http_req_duration': ['p(90)<500'],
        // Tasa de éxito de checks debe ser al menos 95%
        'checks': ['rate>0.95'],
    },

    // ----------------------------------------------------
    // 2. ESCENARIOS COMBINADOS
    // ----------------------------------------------------
    scenarios: {
        // A) [ESTRÉS GRADUAL] - Simula usuarios que navegan durante un período
        stress_test: {
            executor: 'ramping-vus',
            exec: 'browsingFlow', // Usa la función browsingFlow
            stages: [
                { duration: '1m', target: 50 }, // Rampa de 0 a 50 VUs en 1 minuto
                { duration: '30s', target: 50 },// Mantiene 50 VUs (pico)
                { duration: '30s', target: 0 }, // Baja a 0 VUs
            ],
        },

        // B) [CAPACIDAD CONSTANTE] - Simula una integración que debe mantener
        //    un rendimiento fijo (ej. un webhook que recibe 5 req/seg)
        capacity_check: {
            executor: 'constant-arrival-rate',
            exec: 'apiCall', // Usa la función apiCall
            rate: 5,         // Inicia 5 nuevas peticiones CADA 1 segundo
            timeUnit: '1s',
            duration: '1m',
            preAllocatedVUs: 10,
            maxVUs: 30, // Límite para este escenario
            startTime: '1m', // Empieza 1 minuto después del inicio de la prueba
        },

        // C) [TRABAJO TOTAL FIJO] - Simula un proceso que se debe completar
        //    un número exacto de veces (ej. envío de 20 formularios)
        form_submission: {
            executor: 'shared-iterations',
            exec: 'submitForm', // Usa la función submitForm
            vus: 5,             // 5 VUs para el trabajo
            iterations: 20,     // Total de 20 formularios a enviar (4 por VU)
            maxDuration: '1m',  // Fallar si toma más de 1 minuto
        },

        // D) [USUARIO ÚNICO] - Simula la acción de un administrador o usuario clave
        //    que hace una tarea crítica y única.
        single_critical_task: {
            executor: 'per-vu-iterations',
            exec: 'criticalTask', // Usa la función criticalTask
            vus: 1, // Solo un VU
            iterations: 1, // Solo una iteración
            startTime: '10s', // Empieza 10 segundos después del inicio
        },
    },
};

// ----------------------------------------------------
// 3. FUNCIONES DE TRÁFICO (ASIGNADAS POR 'exec')
// ----------------------------------------------------

// Escenario A: stress_test
export function browsingFlow() {
    // Navegación secuencial
    const res = http.get('http://test.k6.io/public/crocodiles/');
    sleep(0.5);
    http.get('http://test.k6.io/');
    check(res, {
        'Browsing: Status 200': (r) => r.status === 200,
    });
    sleep(1);
}

// Escenario B: capacity_check
export function apiCall() {
    // Una petición rápida y simple
    const res = http.get('http://test.k6.io/metrics');
    check(res, {
        'API: Status 200': (r) => r.status === 200,
    });
}

// Escenario C: form_submission
export function submitForm() {
    const payload = JSON.stringify({ email: `user_${__VU}_${__ITER}@example.com` });
    http.post('http://test.k6.io/login', payload);
    sleep(1);
}

// Escenario D: single_critical_task
export function criticalTask() {
    // Tarea crítica que se ejecuta una sola vez al principio
    console.log('--- CRITICAL TASK: Started ---');
    const res = http.get('http://test.k6.io/my_messages');
    check(res, {
        'Critical: Status 200': (r) => r.status === 200,
    });
    console.log('--- CRITICAL TASK: Finished ---');
    sleep(1);
}