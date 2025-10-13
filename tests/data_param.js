// tests/data_param.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// 1. Carga de Datos: El array de usuarios se carga una sola vez en memoria.
// NOTA: La ruta './data/users.json' es relativa al script actual.
const users = new SharedArray('users', function () {
    // Abrir y parsear el archivo JSON desde la subcarpeta 'data'
    return JSON.parse(open('./data/users.json'));
});

export const options = {
    // Se usarán 10 Usuarios Virtuales (VUs) durante 10 segundos
    vus: 10,
    duration: '10s',
    thresholds: {
        'checks': ['rate>0.99'], // 99% de checks deben pasar
    }
};

export default function () {
    // 2. Uso del Dato: Asignación de usuario único por VU
    // Usamos el módulo (%) para garantizar que el índice esté dentro del rango del array (longitud 5)
    // Cuando __VU (ej. 6, 7, 8, 9, 10) sea mayor a la longitud del array (5), se repiten los usuarios.
    const userIndex = __VU % users.length;
    const user = users[userIndex];

    // Preparación del cuerpo de la petición (Payload)
    const payload = JSON.stringify({
        username: user.user,
        password: user.pass,
    });

    // Encabezados para indicar que estamos enviando un JSON
    const headers = { 'Content-Type': 'application/json' };

    // Petición POST funcional al endpoint de prueba de k6
    const res = http.post('http://test.k6.io/login', payload, { headers: headers });

    // Verificación: Se verifica que la respuesta sea 200 OK y que el payload se haya enviado
    check(res, {
        [`Login OK para ${user.user}`]: (r) => r.status === 200,
        // Opcional: Verificar que el cuerpo de la respuesta contenga el nombre de usuario
        'Body contains username': (r) => r.body.includes(user.user),
    });

    // Pequeña pausa
    sleep(1);
}