# Firebase Basic

Proyecto educativo para aprender Firebase paso a paso usando Cloud Functions v2, Authentication, Firestore, Cloud Storage, Security Rules y Firebase Emulator Suite.

El proyecto funciona con dos ambientes simples:

- **Dev local**: emuladores de Firebase.
- **PDN didáctico**: proyecto remoto `guarderia-dev`.

> Aunque el proyecto remoto se llama `guarderia-dev`, en este ejercicio representa el ambiente desplegado final.

## Estado Actual

- Cloud Functions v2 con endpoints HTTP `onRequest` y funciones callable `onCall`.
- Región explícita `southamerica-east1`, coherente con Firestore remoto.
- Firebase Admin SDK centralizado para Auth, Firestore y Storage.
- Registro de usuarios con estado `pending` o `active`.
- Código de activación admin simulado para representar un flujo de suscripción/pago.
- Custom claims `role: pending | user | admin`.
- Endpoints administrativos protegidos por token y rol admin.
- CRUD de Firestore protegido por autenticación, propietario y rol.
- Endpoints de Storage protegidos por autenticación, propietario y rol.
- Funciones callable para apps cliente en el CRUD de Firestore.
- App Check obligatorio en funciones callable.
- CORS configurado para localhost y dominios Firebase Hosting del proyecto.
- Rate limit distribuido por cliente y función usando Firestore.
- Validación de inputs con Zod.
- Errores y logs estructurados.
- Reglas de Firestore y Storage endurecidas.
- Tests de reglas e integración con emuladores.
- CI con lint, build, tests de reglas y tests de integración.

## Ambientes

### Dev local

Usa emuladores para probar sin tocar datos reales:

- Auth Emulator
- Firestore Emulator
- Storage Emulator
- Functions Emulator
- Emulator UI

Base URL local:

```text
http://localhost:5001/guarderia-dev/southamerica-east1
```

### PDN didáctico

Usa el proyecto Firebase real:

```text
guarderia-dev
```

Base URL desplegada:

```text
https://southamerica-east1-guarderia-dev.cloudfunctions.net
```

## Estructura

```text
firebase_basic/
├── functions/
│   ├── src/
│   │   ├── callable/
│   │   │   ├── handlers/
│   │   │   │   └── itemCallableHandlers.ts
│   │   │   ├── auth.ts
│   │   │   ├── errors.ts
│   │   │   ├── rateLimit.ts
│   │   │   └── index.ts
│   │   ├── config/
│   │   │   ├── firebase.ts
│   │   │   └── functions.ts
│   │   ├── http/
│   │   │   ├── handlers/
│   │   │   │   ├── authHandlers.ts
│   │   │   │   ├── itemHandlers.ts
│   │   │   │   └── storageHandlers.ts
│   │   │   ├── auth.ts
│   │   │   ├── methods.ts
│   │   │   ├── rateLimit.ts
│   │   │   ├── responses.ts
│   │   │   └── index.ts
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── activationCode.repository.ts
│   │   │   │   ├── auth.repository.ts
│   │   │   │   ├── auth.schemas.ts
│   │   │   │   ├── auth.service.ts
│   │   │   │   └── userProfile.repository.ts
│   │   │   ├── files/
│   │   │   │   ├── file.repository.ts
│   │   │   │   ├── file.schemas.ts
│   │   │   │   ├── file.service.ts
│   │   │   │   └── uploadValidation.ts
│   │   │   └── items/
│   │   │       ├── item.repository.ts
│   │   │       ├── item.schemas.ts
│   │   │       └── item.service.ts
│   │   ├── shared/
│   │   │   ├── errors.ts
│   │   │   ├── logger.ts
│   │   │   ├── rateLimiter.ts
│   │   │   ├── roles.ts
│   │   │   └── index.ts
│   │   ├── validation/
│   │   │   ├── index.ts
│   │   │   └── schemas.ts
│   │   ├── dependencies.ts
│   │   └── index.ts
│   ├── test/
│   │   ├── integrationEndpoints.test.js
│   │   └── securityRules.test.js
│   └── package.json
├── .github/workflows/ci.yml
├── firebase.json
├── firestore.rules
├── storage.rules
├── firestore.indexes.json
├── package.json
└── README.md
```

## Requisitos

- Node.js 20.x.
- npm.
- Git.
- Cuenta Firebase con acceso al proyecto `guarderia-dev`.

Los scripts usan Firebase CLI mediante:

```bash
npx -y firebase-tools@latest
```

No es obligatorio instalar Firebase CLI globalmente.

## Instalación

```bash
git clone <repository-url>
cd firebase_basic
npm --prefix functions install
```

Login en Firebase, si vas a desplegar o consultar el proyecto remoto:

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest use guarderia-dev
```

## Scripts

Desde la raíz del proyecto:

```bash
npm run dev                 # Build y emuladores principales
npm run emulators           # Todos los emuladores configurados
npm run lint                # ESLint en functions/
npm run build               # TypeScript build
npm test                    # Lint, build, reglas e integración
npm run secrets:set:payment # Configura PAYMENT_WEBHOOK_SECRET en Firebase
npm run deploy:functions    # Despliega Cloud Functions
npm run deploy:rules        # Despliega reglas Firestore y Storage
npm run deploy:all          # Despliega functions + reglas
npm run logs                # Logs de Functions
```

Desde `functions/` también existen scripts equivalentes.

## Desarrollo Local

Levantar emuladores principales:

```bash
npm run dev
```

Puertos:

- Functions: http://localhost:5001
- Firestore: http://localhost:8080
- Auth: http://localhost:9099
- Storage: http://localhost:9199
- Emulator UI: http://localhost:4000

En local, el flujo de código de activación acepta el secreto didáctico:

```text
demo-payment-secret
```

Ese valor solo se permite cuando el backend corre con emuladores.

Para evitar que el emulador intente leer Secret Manager remoto durante pruebas locales, puedes crear el archivo local de secrets:

```bash
cp functions/.secret.local.example functions/.secret.local
```

El archivo `functions/.secret.local` está ignorado por Git.

## Secrets

El endpoint `createActivationCode` simula un webhook de pago. En el proyecto desplegado compara el header:

```text
x-payment-secret
```

contra el secret seguro:

```text
PAYMENT_WEBHOOK_SECRET
```

Configurar el secret remoto:

```bash
npm run secrets:set:payment
```

Firebase pedirá escribir el valor. No debe guardarse en el repositorio.
Si Firebase indica que Secret Manager API no está habilitada, acepta la activación desde CLI o habilítala en Google Cloud Console para `guarderia-dev`.

Después de crear o cambiar el secret, despliega Functions:

```bash
npm run deploy:functions
```

## App Check

Las funciones callable tienen App Check obligatorio:

```ts
enforceAppCheck: true
```

Esto aplica a llamadas desde apps cliente usando Firebase SDK. En Flutter, además de iniciar sesión con Firebase Auth, la app debe inicializar App Check y usar la región correcta:

```dart
final functions = FirebaseFunctions.instanceFor(
  region: 'southamerica-east1',
);
```

Los endpoints HTTP se conservan para pruebas manuales con `curl` y para simular webhooks externos. Están protegidos con Auth, roles, CORS, rate limit y secrets cuando aplica. Si una app cliente fuera a consumir HTTP directamente, el siguiente paso sería validar App Check manualmente en esos endpoints o migrar ese flujo a callable.

## Authentication

Crear usuario normal:

```bash
curl -X POST http://localhost:5001/guarderia-dev/southamerica-east1/registerUser \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123","displayName":"User Demo"}'
```

El usuario queda con:

```json
{
  "role": "pending",
  "status": "pending"
}
```

Crear código de activación admin en local:

```bash
curl -X POST http://localhost:5001/guarderia-dev/southamerica-east1/createActivationCode \
  -H "x-payment-secret: demo-payment-secret" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

Registrar admin usando el código:

```bash
curl -X POST http://localhost:5001/guarderia-dev/southamerica-east1/registerUser \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret123","displayName":"Admin Demo","activationCode":"SUB-CODE"}'
```

Login contra Auth Emulator:

```bash
curl -X POST "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"secret123","returnSecureToken":true}'
```

Guardar token:

```bash
TOKEN="<firebase-id-token>"
```

Obtener usuario actual:

```bash
curl http://localhost:5001/guarderia-dev/southamerica-east1/getCurrentUser \
  -H "Authorization: Bearer $TOKEN"
```

Logout:

```bash
curl -X POST http://localhost:5001/guarderia-dev/southamerica-east1/logoutUser \
  -H "Authorization: Bearer $TOKEN"
```

Listar usuarios pendientes como admin:

```bash
curl http://localhost:5001/guarderia-dev/southamerica-east1/listPendingUsers \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

Aprobar usuario como admin:

```bash
curl -X POST http://localhost:5001/guarderia-dev/southamerica-east1/setUserRole \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"uid":"<firebase-auth-uid>","role":"user"}'
```

Consultar rol:

```bash
curl "http://localhost:5001/guarderia-dev/southamerica-east1/getUserRole?uid=<firebase-auth-uid>" \
  -H "Authorization: Bearer $TOKEN"
```

Después de cambiar un custom claim, el usuario debe volver a iniciar sesión o refrescar su ID token para recibir el nuevo rol.

## Firestore HTTP

Los endpoints trabajan sobre la colección:

```text
items
```

El cliente solo envía:

```json
{
  "name": "Primer item",
  "done": false
}
```

El backend agrega `ownerId` con el `uid` autenticado.

Crear item:

```bash
curl -X POST http://localhost:5001/guarderia-dev/southamerica-east1/createItem \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Primer item","done":false}'
```

Listar items:

```bash
curl "http://localhost:5001/guarderia-dev/southamerica-east1/getAllItems?limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

Siguiente página:

```bash
curl "http://localhost:5001/guarderia-dev/southamerica-east1/getAllItems?limit=10&cursor=<nextCursor>" \
  -H "Authorization: Bearer $TOKEN"
```

Obtener item por ID:

```bash
curl "http://localhost:5001/guarderia-dev/southamerica-east1/getItemById?id=<item-id>" \
  -H "Authorization: Bearer $TOKEN"
```

Actualizar item:

```bash
curl -X PATCH "http://localhost:5001/guarderia-dev/southamerica-east1/updateItem?id=<item-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

Borrar item:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/southamerica-east1/deleteItem?id=<item-id>" \
  -H "Authorization: Bearer $TOKEN"
```

## Firestore Callable

Funciones callable disponibles para apps:

- `createItemCall`
- `getAllItemsCall`
- `getItemByIdCall`
- `updateItemCall`
- `deleteItemCall`

En callable:

- Auth llega automáticamente en `request.auth`.
- Los custom claims como `role` llegan en `request.auth.token`.
- App Check es obligatorio.

## Cloud Storage HTTP

Los archivos se guardan bajo:

```text
users/{uid}/{filename}
```

Reglas principales:

- Usuarios `pending` no pueden usar Storage.
- Usuarios `user` solo acceden a sus archivos.
- Usuarios `admin` pueden listar, descargar y borrar archivos de cualquier usuario.
- Upload máximo: 5 MB.
- Content types permitidos: `text/plain`, `application/json`, `application/pdf`, `image/*`.
- Usuarios normales solo pueden usar nombres planos como `hello.txt`.
- Admins usan rutas completas como `users/<uid>/hello.txt` para archivos ajenos.

Subir archivo:

```bash
curl -X POST "http://localhost:5001/guarderia-dev/southamerica-east1/uploadFile?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  --data "Hola Storage"
```

Listar archivos:

```bash
curl http://localhost:5001/guarderia-dev/southamerica-east1/listFiles \
  -H "Authorization: Bearer $TOKEN"
```

Descargar archivo propio:

```bash
curl "http://localhost:5001/guarderia-dev/southamerica-east1/downloadFile?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN"
```

Descargar como admin:

```bash
curl "http://localhost:5001/guarderia-dev/southamerica-east1/downloadFile?filename=users/<uid>/hello.txt" \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

Borrar archivo:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/southamerica-east1/deleteFileEndpoint?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN"
```

## Seguridad

Capas aplicadas:

- Firebase Auth para identidad.
- Custom claims para roles.
- Guards HTTP y callable.
- Validación con Zod.
- Reglas de Firestore y Storage para acceso directo desde clientes.
- CORS controlado.
- Rate limit distribuido.
- App Check en callable.
- Secrets para flujo tipo webhook.
- Logs estructurados.
- Tests automatizados.

Firestore:

- `items` solo acepta `name`, `done` y `ownerId`.
- `ownerId` debe coincidir con `request.auth.uid` al crear.
- `ownerId` no puede cambiar en update.
- Owner o admin pueden leer, actualizar y borrar.
- `users/{uid}` solo lo lee el propio usuario o admin.
- `activationCodes/{codeHash}` queda cerrado a clientes.

Storage:

- Solo rutas `users/{uid}/{filename}`.
- Rutas anidadas quedan bloqueadas.
- Uploads con tamaño y MIME controlado.
- Owner o admin pueden leer/borrar.

## Tests

Tests de reglas:

```bash
npm --prefix functions run test:rules:emulators
```

Tests de integración:

```bash
npm --prefix functions run test:integration:emulators
```

Suite completa desde la raíz:

```bash
npm test
```

El CI ejecuta:

1. `npm ci`
2. `npm run lint`
3. `npm run build`
4. `cp .secret.local.example .secret.local`
5. `npm run test:rules:emulators`
6. `npm run test:integration:emulators`

## Deploy Controlado

Checklist recomendado antes de desplegar:

1. Confirmar rama limpia:

```bash
git status
```

2. Ejecutar validación completa:

```bash
npm test
```

3. Configurar secret la primera vez:

```bash
npm run secrets:set:payment
```

4. Desplegar reglas:

```bash
npm run deploy:rules
```

5. Desplegar Functions:

```bash
npm run deploy:functions
```

O desplegar todo junto:

```bash
npm run deploy:all
```

6. Revisar logs:

```bash
npm run logs
```

Si ya existían funciones desplegadas en `us-central1`, después de mover a `southamerica-east1` Firebase crea nuevas funciones en la región nueva. Las funciones viejas deben eliminarse manualmente desde consola o con Firebase CLI.

## Notas

- Proyecto remoto: `guarderia-dev`.
- Dev real: emuladores locales.
- PDN didáctico: `guarderia-dev`.
- Firestore: `southamerica-east1`.
- Cloud Functions: `southamerica-east1`.
- Runtime Functions: Node.js 20.
- Lenguaje: TypeScript.

## Documentación Útil

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions v2](https://firebase.google.com/docs/functions)
- [Firestore](https://firebase.google.com/docs/firestore)
- [Cloud Storage for Firebase](https://firebase.google.com/docs/storage)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase CLI](https://firebase.google.com/docs/cli)

---

Proyecto creado para aprender Firebase de forma progresiva y cerrar con un backend serverless didáctico, seguro y desplegable.
