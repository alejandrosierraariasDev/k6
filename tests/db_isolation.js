import http from 'k6/http';
import { check, sleep } from 'k6';

// Las opciones definen un test de carga constante para simular un tráfico estable.
export const options = {
    // Usamos el ejecutor constant-vus: 50 usuarios virtuales constantes
    scenarios: {
        db_isolation_simulation: {
            executor: 'constant-vus',
            vus: 50, // 50 Usuarios Virtuales (VUs)
            duration: '30s', // Duración de 30 segundos
        },
    },
    thresholds: {
        // La duración de la petición HTTP no debe superar los 500ms para el 95% de las peticiones
        'http_req_duration': ['p(95)<500'],
        // El 99% de las peticiones deben ser exitosas (Status 200)
        'checks': ['rate>0.99'],
    },
    // Definimos un tag para esta prueba para que sea fácil de encontrar en Grafana/InfluxDB
    tags: {
        test_type: 'http_isolation'
    }
};

// La función principal se ejecuta repetidamente por cada usuario virtual
export default function () {
    // Simulamos una petición GET que normalmente simularía una "lectura" a la base de datos
    // Usamos el endpoint público de k6 para que la prueba se ejecute sin errores de backend.
    const res = http.get('http://test.k6.io');

    // Verificación de que la petición fue exitosa
    check(res, {
        'Status is 200': (r) => r.status === 200,
    });

    // Pausa de 1 segundo para simular el tiempo de procesamiento del usuario
    sleep(1);
}
