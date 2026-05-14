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
- 🔜 **Uso de roles en recursos**: pendiente.
- 🔜 **Tests automatizados**: pendiente.

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

Crear usuario con email y contraseña:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/registerUser \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"secret123","displayName":"Demo User"}'
```

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

Asignar rol básico a un usuario:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/setUserRole \
  -H "Content-Type: application/json" \
  -d '{"uid":"<firebase-auth-uid>","role":"admin"}'
```

Consultar rol de un usuario:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/getUserRole?uid=<firebase-auth-uid>"
```

Después de cambiar un rol, el usuario debe iniciar sesión nuevamente o refrescar su ID token para recibir el custom claim actualizado.

### Firestore

Los endpoints trabajan sobre la colección `items`.

Cada item guarda automáticamente `ownerId` con el `uid` del usuario autenticado. Los listados y operaciones por ID solo devuelven documentos del propietario.

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

Descargar archivo:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/downloadFile?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN"
```

Borrar archivo:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/us-central1/deleteFileEndpoint?filename=hello.txt" \
  -H "Authorization: Bearer $TOKEN"
```

## Seguridad

Las reglas actuales requieren autenticación y propiedad.

Firestore permite crear items solo si `ownerId` coincide con el `uid` autenticado. Las lecturas, actualizaciones y borrados requieren que el documento existente pertenezca al usuario.

```text
request.auth != null && resource.data.ownerId == request.auth.uid
```

Storage permite leer y escribir únicamente bajo la carpeta del usuario:

```text
users/{request.auth.uid}/{filename}
```

Además, los endpoints HTTP de CRUD y Storage verifican ID tokens con Firebase Admin SDK. Si el request no incluye `Authorization: Bearer <ID_TOKEN>`, la función responde `401 Unauthorized`.

Este es un segundo nivel de seguridad: el usuario debe estar autenticado y ser propietario del recurso. El siguiente paso es agregar autorización por rol.

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
- [ ] Aplicar rol admin a Firestore y Storage.

### Fase 5: Calidad y Casos Avanzados

- [ ] Tests unitarios.
- [ ] Tests de integración con emuladores.
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
