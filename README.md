# Firebase Basic 🚀

Un proyecto educativo diseñado para aprender y practicar los servicios principales de **Firebase** en la plataforma Google Cloud. Este proyecto incluye ejemplos de Cloud Functions, Firestore, Authentication, Storage y otros servicios clave.

## 📋 Descripción

Firebase Basic es un repositorio de aprendizaje progresivo que comienza con ejemplos simples de "Hola Mundo" y evoluciona hacia implementaciones más complejas:

- **Commit 1**: Hola mundo en Cloud Functions (onCall y onRequest)
- **Commits siguientes**: CRUD, ejercicios, pruebas e integración de servicios

### Servicios de Firebase a Cubrir

- ✅ **Cloud Functions v2** - Funciones serverless (HTTP y Callable)
- 🔜 **Firestore** - Base de datos NoSQL en tiempo real
- 🔜 **Authentication** - Sistema de autenticación de usuarios
- 🔜 **Storage** - Almacenamiento de archivos en la nube
- 🔜 **Emuladores** - Desarrollo local con Firebase Emulator Suite

## 🏗️ Estructura del Proyecto

```
firebase_basic/
├── functions/                    # Cloud Functions
│   ├── src/
│   │   └── index.ts             # Funciones principales (onCall, onRequest)
│   ├── lib/                      # Código compilado (generado)
│   ├── package.json             # Dependencias de funciones
│   ├── tsconfig.json            # Configuración TypeScript
│   └── .eslintrc.js             # Linter configuration
│
├── firestore.rules              # Reglas de seguridad Firestore
├── firestore.indexes.json       # Índices de Firestore
├── storage.rules                # Reglas de seguridad Storage
├── firebase.json                # Configuración de Firebase
├── .firebaserc                  # Proyecto Firebase predeterminado
└── README.md                    # Este archivo
```

## 🛠️ Requisitos Previos

- **Node.js** 20.x o superior
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** para control de versiones
- Cuenta en **Google Cloud / Firebase** (para desplegar)

## 📦 Instalación

### 1. Clonar el repositorio
```bash
git clone <repository-url>
cd firebase_basic
```

### 2. Instalar dependencias de las funciones
```bash
cd functions
npm install
```

### 3. Configurar Firebase (opcional para desarrollo local)
```bash
firebase login
firebase use --add  # Seleccionar o crear proyecto
```

## 🚀 Uso Local

### Ejecutar Cloud Functions en local
```bash
cd functions
npm run serve
```

Esto iniciará:
- **Cloud Functions Emulator**: http://localhost:5001
- **Firestore Emulator**: http://localhost:8080
- **Auth Emulator**: http://localhost:9099
- **Storage Emulator**: http://localhost:9199
- **Firebase Emulator UI**: http://localhost:4000

### Otros comandos útiles
```bash
# Compilar TypeScript
npm run build

# Compilar en modo watch
npm run build:watch

# Lint del código
npm run lint

# Desplegar funciones a producción
npm run deploy

# Ver logs de funciones
npm run logs

# Shell interactivo de funciones
npm run shell
```

## 📚 Plan de Aprendizaje

### Fase 1: Cloud Functions (Actual)
- ✅ Función `onCall` - Funciones invocables desde cliente
- ✅ Función `onRequest` - Funciones HTTP endpoint
- Lógica compartida y reutilizable

### Fase 2: Firestore (Próxima)
- [ ] Crear colecciones y documentos
- [ ] Operaciones CRUD básicas
- [ ] Queries y filtros
- [ ] Listeners en tiempo real
- [ ] Transacciones

### Fase 3: Authentication
- [ ] Registro de usuarios
- [ ] Login/Logout
- [ ] Gestión de sesiones
- [ ] Autorización con reglas de seguridad

### Fase 4: Storage
- [ ] Subida de archivos
- [ ] Descarga de archivos
- [ ] Gestión de permisos
- [ ] Integración con Firestore

### Fase 5: Casos de Uso Avanzados
- [ ] Triggers basados en eventos
- [ ] Procesamiento de datos
- [ ] Integración con servicios externos
- [ ] Testing de funciones

## 💡 Ejemplos Actuales

### Función Callable (onCall)
Invocable directamente desde aplicaciones cliente:
```typescript
// Acceso desde cliente:
const result = await fnCall();
// Retorna: { message: "Hola 🚀" }
```

### Función HTTP (onRequest)
Endpoint HTTP tradicional:
```bash
curl http://localhost:5001/guarderia-dev/southamerica-east1/fnHttp
# Retorna: { "message": "Hola 🚀" }
```

## 🔒 Seguridad

### Reglas Actuales
- **Firestore**: Acceso público temporalmente (válido hasta 21-05-2026)
- **Storage**: Acceso público temporalmente (válido hasta 24-05-2026)

⚠️ **Importante**: Antes de la expiración, debes implementar reglas de seguridad apropiadas según tu lógica de negocio.

Ejemplo de regla segura:
```
allow read, write: if request.auth != null;
```

## 🧪 Testing

Para probar las funciones localmente:

1. Asegúrate de que el emulador esté corriendo
2. Usa el Firebase Emulator UI en http://localhost:4000
3. Invoca las funciones y verifica las respuestas

### Próximamente: Tests Automatizados
- Unit tests con Jest
- Integration tests
- E2E tests

## 🚢 Despliegue

### Desplegar a producción
```bash
cd functions
npm run deploy
```

### Pre-despliegue automático
El archivo `firebase.json` ejecuta automáticamente:
1. Lint (`npm run lint`)
2. Build (`npm run build`)

Asegúrate de que ambos pasen antes de desplegar.

## 📖 Documentación Útil

- [Firebase Documentation](https://firebase.google.com/docs)
- [Cloud Functions v2 Guide](https://firebase.google.com/docs/functions)
- [Firestore Guide](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/rules)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## 🤝 Contribuciones

Este es un proyecto educativo. Se aceptan sugerencias y mejoras a través de issues y pull requests.

## 📝 Notas del Proyecto

- **Región de Firestore**: South America East 1 (southamerica-east1)
- **Proyecto Firebase**: guarderia-dev
- **Node Version**: 20.x
- **TypeScript**: v6.x

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo una licencia MIT.

---

**Creado para aprender Firebase** 🎓 - Iniciando con Cloud Functions v2 y evolucionando hacia un stack completo.
