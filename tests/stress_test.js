// tests/stress_test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    // Usamos stages para una rampa de estrés (0 VUs a 50 VUs)
    stages: [
        { duration: '1m', target: 50 }, // Subida de 0 a 50 VUs
        { duration: '30s', target: 50 },// Mantenimiento de pico
        { duration: '1m', target: 0 },  // Bajada
    ],
    thresholds: {
        'http_req_duration': ['p(99)<1000'], // El 99% debe ser < 1s
    },
};

export default function () {
    const res = http.get('http://test.k6.io/my_messages');
    check(res, {
        'status is 200': (r) => r.status === 200,
    });
    sleep(0.5);
}