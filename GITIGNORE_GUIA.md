# Guía de .gitignore para Firebase + Node.js

Esta guía te explica qué archivos van en el `.gitignore` y **por qué** no deben ser commiteados.

## 🔴 CRÍTICO: NUNCA COMMITEAR

Estos archivos contienen información sensible y pueden comprometer tu proyecto:

### Variables de Entorno
```
.env
.env.local
.env.*.local
```
- Contienen claves API, contraseñas, tokens
- Cada desarrollador debe tener sus propias variables locales
- Firebase proveería estas en producción

**Ejemplo de qué NO commitear:**
```bash
FIREBASE_API_KEY=AIzaxxxxxxxxxxxxx
DATABASE_URL=https://xxxx.firebaseio.com
ADMIN_EMAIL=secret@example.com
```

### Archivos de Credenciales
```
service-account-key.json
firebase-key.json
credentials.json
```
- Claves privadas para autenticación de admin
- Controladas por Firebase / Google Cloud
- Son como la contraseña de tu proyecto

**Si commiteaste accidentalmente una clave:**
1. Regenera la clave en Google Cloud Console inmediatamente
2. Revierte el commit: `git reset HEAD~1`
3. Actualiza `.gitignore`
4. Haz un nuevo commit limpio

---

## 📦 Node/npm

```
node_modules/
package-lock.json
```

**Por qué:**
- `node_modules/` es ENORME (miles de archivos)
- `package-lock.json` se regenera automáticamente cuando alguien hace `npm install`
- Otros desarrolladores generarán sus propias versiones

**Cómo compartir dependencias:**
- Commitea **SÍ**: `package.json` (contiene lista de dependencias)
- Commitea **NO**: `node_modules/` y `package-lock.json`

Cuando alguien clona:
```bash
git clone <repo>
npm install  # Regenera node_modules y package-lock.json automáticamente
```

---

## 🔥 Firebase Específico

```
.firebase/
firebase-export-*.json
```

**`.firebase/`:**
- Caché local del CLI de Firebase
- Se regenera automáticamente

**`firebase-export-*.json`:**
- Backups de datos que exportas localmente para testing
- Solo necesarios en desarrollo local

**Sobre `.firebaserc`:**
```
# Comentado (compartir entre equipo)
# .firebaserc
```
- Define qué proyecto Firebase usa (`guarderia-dev` en tu caso)
- Se recomienda compartirlo si todo el equipo usa el mismo proyecto
- Descomenta si TODOS deben usar exactamente la misma configuración

---

## 🔨 Compilación y Build

```
lib/
dist/
build/
```

**Por qué:**
- Generados automáticamente por TypeScript (`npm run build`)
- El comando `tsc` crea `/lib` desde `/src`
- No necesitan estar en git

**Flujo en tu proyecto:**
1. Escribes código en `functions/src/`
2. `npm run build` → Genera `functions/lib/`
3. Commitea `src/`, NO `lib/`

---

## 📝 Logs

```
logs/
*.log
npm-debug.log*
yarn-debug.log*
firebase-debug.log*
```

**Por qué:**
- Se generan durante desarrollo/ejecución
- Ocupan espacio innecesario
- Contienen información de tu máquina local

---

## 🧪 Testing y Coverage

```
coverage/
.nyc_output/
test-results/
```

**Por qué:**
- Generados por herramientas de testing (Jest, Nyc)
- Se regeneran cada vez que corres tests
- No necesarios en el repo

---

## 💾 IDEs y Editores

```
.vscode/
.idea/
*.sublime-project
.DS_Store
```

**Por qué:**
- Configuración personal de cada desarrollador
- Si commiteas `.vscode/`, impones tu setup a otros
- Cada persona usa sus propias preferencias

**Excepción:**
Si el equipo decide compartir configuración específica de VSCode:
- Crea `/.vscode/settings.json.example`
- Docúmentalo en README
- Cada dev lo adapta localmente

---

## 📊 Comparación: Qué SÍ commitear vs NO

### ✅ SÍ Commitear
```
functions/src/index.ts          # Código fuente
firebase.json                   # Configuración de Firebase
package.json                    # Lista de dependencias
tsconfig.json                   # Configuración de TypeScript
.eslintrc.js                    # Reglas de linting
README.md                       # Documentación
firestore.rules                 # Reglas de Firestore
```

### ❌ NO Commitear
```
functions/lib/                  # Output compilado
node_modules/                   # Dependencias instaladas
.env                           # Variables de entorno
service-account-key.json       # Credenciales
.firebase/                     # Caché
*.log                          # Logs
coverage/                      # Resultados de tests
.DS_Store                      # Archivos del SO
```

---

## 🔍 Verificar qué sería commiteado

Antes de hacer un commit, usa estos comandos:

```bash
# Ver archivos sin commitear
git status

# Ver qué cambios específicos irías a commitear
git diff

# Ver archivos que git ignora
git check-ignore -v *
```

---

## 🛡️ Protege tu Proyecto

### Pre-commit Hook (Recomendado)
Agrega un script que previene commitear archivos sensibles:

**Crear `.git/hooks/pre-commit`** (sin extensión):
```bash
#!/bin/bash
if git diff --cached --name-only | grep -E '\.(env|key|json)$'; then
    echo "⚠️  ERROR: No puedes commitear archivos .env, .key o credenciales"
    exit 1
fi
```

Luego:
```bash
chmod +x .git/hooks/pre-commit
```

---

## 📝 Checklist para Nuevos Commits

- [ ] ¿Estoy commiteando código fuente (`.ts`, `.js`)?
- [ ] ¿No estoy incluyendo `node_modules/`?
- [ ] ¿No estoy incluyendo `.env` o credenciales?
- [ ] ¿No estoy incluyendo archivos generados (`lib/`, `dist/`)?
- [ ] ¿Reviré con `git status` antes de hacer push?

---

## Preguntas Frecuentes

**P: ¿Puedo commitear un `.env.example`?**
R: ¡Sí! Es una buena práctica. Contiene las variables que necesitas pero sin valores reales.

```
# .env.example (SÍ commitear)
FIREBASE_PROJECT_ID=mi-proyecto
FIREBASE_API_KEY=AQUI_VA_LA_CLAVE_REAL_EN_.env
```

**P: ¿Qué pasa si accidentalmente commitee un `.env`?**
R: 
1. Regresa el commit: `git reset HEAD~1`
2. Actualiza `.gitignore`
3. Hace un nuevo commit limpio
4. Regenera todas las claves en Firebase

**P: ¿Por qué `package-lock.json` no va?**
R: Se regenera automáticamente. Si dos personas tienen versiones diferentes, git muestra conflictos innecesarios.

---

**Recuerda:** El `.gitignore` es tu defensa contra commitear información sensible. ¡Úsalo bien! 🛡️
