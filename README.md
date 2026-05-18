# Firebase Basic

Proyecto educativo para aprender Firebase paso a paso usando **Cloud Functions v2**, **Firestore**, **Cloud Storage** y la **Firebase Emulator Suite**.

El repositorio empezó con funciones simples de "Hola mundo" y actualmente ya incluye una primera arquitectura con capa de servicios para separar los endpoints HTTP de la lógica de Firestore, Storage y Authentication.

## Estado Actual

- ✅ **Cloud Functions v2**: funciones `onCall` y `onRequest`.
- ✅ **Firestore**: CRUD básico sobre la colección `items`.
- ✅ **Cloud Storage**: subir, descargar, listar y borrar archivos.
- ✅ **Firebase Admin SDK**: inicialización centralizada para Auth, Firestore y Storage.
- ✅ **Emuladores**: configuración para Functions, Firestore, Auth, Storage y Emulator UI.
- ✅ **Authentication**: registro, validación de ID tokens y logout por revocación de refresh tokens.
- ✅ **Reglas seguras básicas**: Firestore y Storage requieren usuario autenticado.
- ✅ **Autorización por propietario**: cada usuario accede solo a sus items y archivos.
- ✅ **Roles básicos**: custom claims `user` y `admin` en Firebase Auth.
- ✅ **Uso de roles en recursos**: usuarios admin pueden acceder a recursos de otros usuarios.
- ✅ **Activación de administradores**: código de suscripción simulado para crear usuarios `admin`.
- ✅ **Aprobación de usuarios**: usuarios normales quedan `pending` hasta aprobación admin.
- ✅ **Tests de reglas**: pruebas automatizadas para Firestore y Storage con emuladores.
- ✅ **Tests de integración de endpoints**: flujo HTTP protegido con Auth, Firestore y Storage.

## Estructura del Proyecto

```text
firebase_basic/
├── functions/
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.ts          # Inicialización de Firebase Admin SDK
│   │   ├── services/
│   │   │   ├── authService.ts       # Operaciones básicas de Authentication
│   │   │   ├── firestoreService.ts  # Operaciones CRUD para Firestore
│   │   │   ├── storageService.ts    # Operaciones básicas de Cloud Storage
│   │   │   └── index.ts             # Export centralizado de servicios
│   │   └── index.ts                 # Cloud Functions expuestas
│   ├── package.json                 # Scripts y dependencias de Functions
│   ├── test/
│   │   ├── integrationEndpoints.test.js # Tests HTTP end-to-end con emuladores
│   │   └── securityRules.test.js    # Tests de reglas Firestore y Storage
│   ├── tsconfig.json                # Configuración TypeScript
│   └── .eslintrc.js                 # Configuración ESLint
├── firebase.json                    # Firebase, predeploy y emuladores
├── firestore.rules                  # Reglas de seguridad Firestore
├── firestore.indexes.json           # Índices de Firestore
├── storage.rules                    # Reglas de seguridad Storage
├── .firebaserc                      # Proyecto Firebase predeterminado
├── .gitignore                       # Archivos ignorados por Git
└── README.md
```

## Requisitos

- Node.js 20.x o superior.
- Firebase CLI.
- Git.
- Cuenta de Firebase / Google Cloud para despliegues reales.

Instalar Firebase CLI globalmente:

```bash
npm install -g firebase-tools
```

## Instalación

```bash
git clone <repository-url>
cd firebase_basic/functions
npm install
```

Configurar acceso a Firebase si vas a usar un proyecto real:

```bash
firebase login
firebase use --add
```

## Desarrollo Local

Desde `functions/`, compilar y levantar los emuladores necesarios para las funciones protegidas:

```bash
cd functions
npm run serve
```

Desde la raíz del proyecto, también puedes levantar todos los emuladores configurados:

```bash
firebase emulators:start
```

Puertos configurados:

- Cloud Functions Emulator: http://localhost:5001
- Firestore Emulator: http://localhost:8080
- Auth Emulator: http://localhost:9099
- Storage Emulator: http://localhost:9199
- Firebase Emulator UI: http://localhost:4000

## Scripts

Ejecutar dentro de `functions/`:

```bash
npm run build        # Compila TypeScript
npm run build:watch  # Compila en modo watch
npm run lint         # Ejecuta ESLint
npm run test:rules   # Ejecuta tests de reglas contra emuladores activos
npm run test:rules:emulators # Levanta Firestore/Storage y ejecuta tests de reglas
npm run test:integration # Ejecuta tests HTTP contra emuladores activos
npm run test:integration:emulators # Levanta emuladores y ejecuta tests HTTP
npm run serve        # Compila y levanta Functions, Auth, Firestore y Storage
npm run shell        # Shell interactivo de Functions
npm run deploy       # Despliega Cloud Functions
npm run logs         # Muestra logs de Functions
```

## Funciones Disponibles

### Hola Mundo

`helloCall`: función callable para invocar desde un cliente Firebase.

`helloHttp`: endpoint HTTP tradicional.

Ejemplo local:

```bash
curl http://localhost:5001/guarderia-dev/us-central1/helloHttp
```

Respuesta:

```json
{
  "message": "Hola 🚀"
}
```

> Nota: las funciones no definen una región explícita en el código, por eso usan la región por defecto de Cloud Functions.

### Authentication

Crear usuario normal con email y contraseña:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/registerUser \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123","displayName":"Demo User"}'
```

El usuario queda con `role: pending` y `status: pending`. Puede autenticarse, pero no puede consumir CRUD ni Storage hasta que un admin lo apruebe.

Simular pago y generar código de activación admin:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/createActivationCode \
  -H "x-payment-secret: demo-payment-secret" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com"}'
```

Registrar admin usando el código de activación:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/registerUser \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret123","displayName":"Admin User","activationCode":"SUB-CODE"}'
```

El código solo se puede usar una vez. En emuladores se acepta `demo-payment-secret`; en producción debe configurarse `PAYMENT_WEBHOOK_SECRET`.

Login con el Auth Emulator:

```bash
curl -X POST "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123","returnSecureToken":true}'
```

Validar el usuario autenticado desde Cloud Functions:

```bash
TOKEN="<firebase-id-token>"

curl http://localhost:5001/guarderia-dev/us-central1/getCurrentUser \
  -H "Authorization: Bearer $TOKEN"
```

Logout desde Cloud Functions revocando refresh tokens del usuario autenticado:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/logoutUser \
  -H "Authorization: Bearer $TOKEN"
```

Después del login, el ID token se envía en cada endpoint protegido con `Authorization: Bearer <ID_TOKEN>`.

Listar usuarios pendientes como admin:

```bash
curl http://localhost:5001/guarderia-dev/us-central1/listPendingUsers \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

Asignar rol básico a un usuario como admin:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/setUserRole \
  -H "Authorization: Bearer $TOKEN_ADMIN" \
  -H "Content-Type: application/json" \
  -d '{"uid":"<firebase-auth-uid>","role":"user"}'
```

Consultar rol de un usuario:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/getUserRole?uid=<firebase-auth-uid>" \
  -H "Authorization: Bearer $TOKEN"
```

Después de cambiar un rol, el usuario debe iniciar sesión nuevamente o refrescar su ID token para recibir el custom claim actualizado.

### Firestore

Los endpoints trabajan sobre la colección `items`.

Cada item guarda automáticamente `ownerId` con el `uid` del usuario autenticado. Los listados y operaciones por ID solo devuelven documentos del propietario.

Los usuarios con rol `admin` pueden listar, leer, actualizar y borrar items de cualquier usuario.

Los usuarios con rol `pending` no pueden consumir estos endpoints hasta ser aprobados por un admin.

Crear item:

```bash
TOKEN="<firebase-id-token>"

curl -X POST http://localhost:5001/guarderia-dev/us-central1/createItem \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Primer item","done":false}'
```

Listar items:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/getAllItems?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN"
```

Obtener item por ID:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/getItemById?id=<item-id>" \
  -H "Authorization: Bearer $TOKEN"
```

Actualizar item:

```bash
curl -X PATCH "http://localhost:5001/guarderia-dev/us-central1/updateItem?id=<item-id>" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

Borrar item:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/us-central1/deleteItem?id=<item-id>" \
  -H "Authorization: Bearer $TOKEN"
```

### Cloud Storage

Cada archivo se guarda bajo la ruta `users/{uid}/{filename}`. Los endpoints de Storage solo operan sobre archivos del usuario autenticado.

Los usuarios con rol `admin` pueden listar, descargar y borrar archivos de cualquier usuario. Para descargar o borrar archivos ajenos, el admin debe usar la ruta completa devuelta por `listFiles`, por ejemplo `users/<uid>/hello.txt`.

Los usuarios con rol `pending` no pueden subir, listar, descargar ni borrar archivos.

Subir archivo:

```bash
curl -X POST "http://localhost:5001/guarderia-dev/us-central1/uploadFile?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: text/plain" \
  --data "Hola Storage"
```

Listar archivos:

```bash
curl http://localhost:5001/guarderia-dev/us-central1/listFiles \
  -H "Authorization: Bearer $TOKEN"
```

Descargar archivo propio:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/downloadFile?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN"
```

Descargar archivo como admin usando ruta completa:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/downloadFile?filename=users/<uid>/hello.txt" \
  -H "Authorization: Bearer $TOKEN_ADMIN"
```

Borrar archivo propio:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/us-central1/deleteFileEndpoint?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN"
```

## Seguridad

Las reglas actuales requieren autenticación, rol activo y propiedad.

Firestore permite crear items solo si el usuario tiene `role: user` o `role: admin` y `ownerId` coincide con el `uid` autenticado. Las lecturas, actualizaciones y borrados requieren que el documento existente pertenezca al usuario activo o que el token tenga `role: admin`.

```text
request.auth != null &&
  (request.auth.token.role == 'user' || request.auth.token.role == 'admin') &&
  (resource.data.ownerId == request.auth.uid || request.auth.token.role == 'admin')
```

Storage permite leer y escribir bajo la carpeta del usuario solo si tiene rol activo. Un token con `role: admin` puede leer y escribir bajo cualquier carpeta de usuario:

```text
users/{userId}/{filename}
```

Los perfiles `users/{uid}` se leen por el propio usuario o por un admin. Los documentos `activationCodes/{code}` no se leen ni escriben desde clientes directos; solo el backend los maneja con Firebase Admin SDK.

Además, los endpoints HTTP de CRUD y Storage verifican ID tokens con Firebase Admin SDK. Si el request no incluye `Authorization: Bearer <ID_TOKEN>`, la función responde `401 Unauthorized`. Si el usuario existe pero sigue `pending`, responde `403 Forbidden`.

Este es un tercer nivel de seguridad: el usuario debe estar autenticado, estar activo, ser propietario del recurso o tener rol `admin`.

### Tests de Reglas

Los tests de reglas validan acceso directo de cliente a Firestore y Storage, sin pasar por Cloud Functions.

Ejecutar desde `functions/` levantando emuladores temporales:

```bash
npm run test:rules:emulators
```

Escenarios cubiertos:

- Usuario sin autenticación no puede leer ni escribir.
- Usuario autenticado solo puede acceder a sus propios items y archivos.
- Usuario normal no puede acceder a recursos de otro usuario.
- Usuario con `role: admin` puede acceder a recursos de otros usuarios.
- Usuario con `role: pending` no puede acceder a items ni archivos protegidos.
- Clientes directos no pueden leer códigos de activación.

### Tests de Integración

Los tests de integración validan el flujo HTTP real contra Cloud Functions usando Auth, Firestore y Storage en emuladores.

Ejecutar desde `functions/` levantando emuladores temporales:

```bash
npm run test:integration:emulators
```

Escenarios cubiertos:

- Registro de usuarios desde `registerUser`.
- Generación de código admin desde `createActivationCode`.
- Registro de admin con código de activación.
- Bloqueo de reutilización de códigos de activación.
- Bloqueo de usuarios `pending` antes de aprobación.
- Listado de usuarios pendientes para admin.
- Asignación de roles con `setUserRole`.
- Login contra Auth Emulator para obtener ID tokens.
- Bloqueo de endpoints protegidos sin token.
- Acceso de owner, bloqueo cross-user y acceso admin en Firestore.
- Acceso de owner, bloqueo cross-user y acceso admin en Storage.

## Plan de Aprendizaje

### Fase 1: Cloud Functions

- [x] Función callable con `onCall`.
- [x] Endpoint HTTP con `onRequest`.
- [x] Lógica compartida.

### Fase 2: Firestore

- [x] Inicializar Firebase Admin SDK.
- [x] Crear documentos.
- [x] Leer documentos por ID.
- [x] Listar documentos con paginación básica.
- [x] Actualizar documentos.
- [x] Borrar documentos.
- [ ] Agregar validación de datos.
- [ ] Agregar filtros y queries más específicas.
- [ ] Explorar transacciones.

### Fase 3: Cloud Storage

- [x] Subir archivos.
- [x] Descargar archivos.
- [x] Listar archivos.
- [x] Borrar archivos.
- [ ] Validar tipos y tamaños de archivo.
- [ ] Integrar metadata de archivos con Firestore.

### Fase 4: Authentication

- [x] Registro básico de usuarios.
- [x] Login con Auth Emulator / Firebase Auth REST API.
- [x] Obtener usuario actual con ID token.
- [x] Logout desde cliente y revocación de refresh tokens desde backend.
- [x] Verificación de Firebase ID tokens en Cloud Functions HTTP.
- [x] Protección de endpoints CRUD.
- [x] Protección de endpoints de Storage.
- [x] Reglas de Firestore y Storage basadas en `request.auth`.
- [x] Autorización por propietario en Firestore.
- [x] Autorización por propietario en Storage.
- [x] Asignación básica de roles con custom claims.
- [x] Aplicar rol admin a Firestore y Storage.
- [x] Crear flujo de activación admin con código de suscripción.
- [x] Crear perfiles `users/{uid}` con estado `pending` o `active`.
- [x] Proteger asignación de roles para uso exclusivo de admin.
- [x] Probar reglas de Firestore y Storage con emuladores.
- [x] Probar endpoints HTTP protegidos con emuladores.

### Fase 5: Calidad y Casos Avanzados

- [ ] Tests unitarios.
- [x] Tests de integración de endpoints con emuladores.
- [ ] Triggers basados en eventos.
- [ ] Procesamiento de datos.
- [ ] Integración con servicios externos.

## Despliegue

Desde `functions/`:

```bash
npm run deploy
```

El `predeploy` configurado en `firebase.json` ejecuta automáticamente:

1. `npm run lint`
2. `npm run build`

## Notas del Proyecto

- Proyecto Firebase predeterminado: `guarderia-dev`.
- Firestore configurado en `southamerica-east1`.
- Cloud Functions usa la región por defecto mientras no se configure otra en el código.
- Runtime de Functions: Node.js 20.
- Lenguaje: TypeScript.

## Documentación Útil

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions v2](https://firebase.google.com/docs/functions)
- [Firestore](https://firebase.google.com/docs/firestore)
- [Cloud Storage for Firebase](https://firebase.google.com/docs/storage)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase CLI](https://firebase.google.com/docs/cli)

---

Creado para aprender Firebase de forma progresiva, empezando por Cloud Functions y avanzando hacia un backend serverless más completo.
