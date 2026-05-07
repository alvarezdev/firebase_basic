# Firebase Basic

Proyecto educativo para aprender Firebase paso a paso usando **Cloud Functions v2**, **Firestore**, **Cloud Storage** y la **Firebase Emulator Suite**.

El repositorio empezó con funciones simples de "Hola mundo" y actualmente ya incluye una primera arquitectura con capa de servicios para separar los endpoints HTTP de la lógica de Firestore y Storage.

## Estado Actual

- ✅ **Cloud Functions v2**: funciones `onCall` y `onRequest`.
- ✅ **Firestore**: CRUD básico sobre la colección `items`.
- ✅ **Cloud Storage**: subir, descargar, listar y borrar archivos.
- ✅ **Firebase Admin SDK**: inicialización centralizada para Firestore y Storage.
- ✅ **Emuladores**: configuración para Functions, Firestore, Auth, Storage y Emulator UI.
- 🔜 **Authentication**: pendiente de implementar en flujos reales.
- 🔜 **Reglas seguras**: actualmente hay reglas temporales abiertas para aprendizaje.
- 🔜 **Tests automatizados**: pendiente.

## Estructura del Proyecto

```text
firebase_basic/
├── functions/
│   ├── src/
│   │   ├── config/
│   │   │   └── firebase.ts          # Inicialización de Firebase Admin SDK
│   │   ├── services/
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

Desde `functions/`, compilar y levantar el emulador de Functions:

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
npm run serve        # Compila y levanta el emulador de Functions
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

### Firestore

Los endpoints trabajan sobre la colección `items`.

Crear item:

```bash
curl -X POST http://localhost:5001/guarderia-dev/us-central1/createItem \
  -H "Content-Type: application/json" \
  -d '{"name":"Primer item","done":false}'
```

Listar items:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/getAllItems?limit=10&offset=0"
```

Obtener item por ID:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/getItemById?id=<item-id>"
```

Actualizar item:

```bash
curl -X PATCH "http://localhost:5001/guarderia-dev/us-central1/updateItem?id=<item-id>" \
  -H "Content-Type: application/json" \
  -d '{"done":true}'
```

Borrar item:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/us-central1/deleteItem?id=<item-id>"
```

### Cloud Storage

Subir archivo:

```bash
curl -X POST "http://localhost:5001/guarderia-dev/us-central1/uploadFile?filename=hello.txt" \
  -H "Content-Type: text/plain" \
  --data "Hola Storage"
```

Listar archivos:

```bash
curl http://localhost:5001/guarderia-dev/us-central1/listFiles
```

Descargar archivo:

```bash
curl "http://localhost:5001/guarderia-dev/us-central1/downloadFile?filename=hello.txt"
```

Borrar archivo:

```bash
curl -X DELETE "http://localhost:5001/guarderia-dev/us-central1/deleteFileEndpoint?filename=hello.txt"
```

## Seguridad

Las reglas actuales son temporales y abiertas para facilitar aprendizaje:

- Firestore permite lectura y escritura hasta el **21 de mayo de 2026**.
- Storage permite lectura y escritura hasta el **24 de mayo de 2026**.

Antes de usar este proyecto en producción, reemplaza esas reglas por reglas basadas en autenticación y permisos reales. Un punto de partida mínimo sería:

```text
allow read, write: if request.auth != null;
```

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

- [ ] Registro de usuarios.
- [ ] Login/logout.
- [ ] Protección de endpoints.
- [ ] Reglas de Firestore y Storage basadas en `request.auth`.

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
