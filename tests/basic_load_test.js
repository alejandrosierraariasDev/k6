import http from 'k6/http'; // 👈 CORRECCIÓN: Importar el módulo HTTP
import { check, sleep } from 'k6';

export const options = {
    // La prueba DEBE FALLAR debido a este umbral inalcanzable.
    thresholds: {
        'http_req_duration': ['p(95)<1'], // El 95% debe ser < 1ms (FALLO)
        'checks': ['rate>0.999'],          // Tasa de checks (FALLO)
    },
    vus: 1,
    duration: '10s', // 10s es suficiente
};

export default function () {
    // Ahora 'http' está definido y la función 'get' puede usarse.
    const res = http.get('https://test.k6.io');

    // Este check fallará el 100% de las veces, cumpliendo tu objetivo de fallo.
    check(res, {
        'status is 500 (Expected Fail)': (r) => r.status === 500,
    });

    sleep(1);
}