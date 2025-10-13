import http from 'k6/http';
import { check, sleep } from 'k6';

// ------------------------------------
// 1. CONFIGURACIÓN DE STAGES Y UMBRALES
// ------------------------------------
export const options = {
    // Escenario de Stress/Soak (Aguante) de 5 minutos
    stages: [
        // Stage 1: Subida gradual (Ramp up)
        { duration: '2m', target: 50 },  // 2 minutos para subir de 0 a 50 VUs

        // Stage 2: Mantenimiento (Soak)
        { duration: '1m', target: 50 },  // 1 minuto manteniendo 50 VUs (pico de carga)

        // Stage 3: Bajada gradual (Ramp down)
        { duration: '2m', target: 0 },   // 2 minutos para bajar de 50 VUs a 0
    ],

    // Umbrales para fallar la prueba si las condiciones no se cumplen
    thresholds: {
        // La tasa de éxito de los checks debe ser al menos 99%
        'checks': ['rate>0.99'],

        // El 95% de las peticiones deben ser completadas en menos de 500ms
        'http_req_duration': ['p(95)<500'], // tiempo en milisegundos (500ms)
    },
};

// ------------------------------------
// 2. FUNCIÓN PRINCIPAL DE LA PRUEBA
// ------------------------------------
export default function () {
    const res = http.get('https://test.k6.io');
    // Check para verificar que la petición fue exitosa (código 200)
    check(res, {
        'status is 200': (r) => r.status === 200,
    });

    sleep(1); // Espera de 1 segundo entre iteraciones de cada VU
}
