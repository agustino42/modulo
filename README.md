# EcoSincro (Adcesa Edition)

**Sistema de Gestión Transaccional de Activos y Flujos Operativos**

> Una solución Desktop-Native diseñada para la gobernanza de recursos compartidos, control de suministros críticos y optimización de la productividad operativa en entornos con limitaciones de conectividad.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Contexto y Planteamiento del Problema](#-contexto-y-planteamiento-del-problema)
- [Objetivos](#-objetivos)
- [Arquitectura del Sistema](#-arquitectura-del-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Módulos y Funcionalidades](#-módulos-y-funcionalidades)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Modelo de Datos](#-modelo-de-datos)
- [Requerimientos del Sistema](#-requerimientos-del-sistema)
- [Instalación y Desarrollo](#-instalación-y-desarrollo)
- [Uso](#-uso)
- [Distribución y Empaquetado](#-distribución-y-empaquetado)
- [Beneficios Esperados](#-beneficios-esperados)
- [Integrantes del Proyecto](#-integrantes-del-proyecto)

---

## 📖 Descripción General

**EcoSincro (Adcesa Edition)** es un sistema de gestión transaccional desarrollado como Sub-Proyecto de la carrera de **Desarrollo de Aplicaciones** en la **UNELLEZ** (Universidad Nacional Experimental de los Llanos Occidentales "Ezequiel Zamora"), Sección **FS-01**.

El sistema aborda la **"crisis de búsqueda de recursos"** —un fenómeno donde el personal operativo de empresas creativas y de servicios pierde entre 3 y 5 horas semanales localizando herramientas o verificando existencias de materiales— mediante una aplicación de escritorio moderna que centraliza la gobernanza de activos, suministros y mantenimiento.

Está diseñado bajo el paradigma **Local-First**, garantizando operatividad total sin dependencia de conexión a internet, adaptándose a las condiciones de infraestructura del estado Barinas, Venezuela.

---


### Objetivos Específicos

1. **Diagnosticar** la situación actual de los procesos de gestión de activos y control de inventarios en Adcesa.
2. **Identificar** requerimientos técnicos, funcionales y no funcionales priorizando trazabilidad, ETR y alertas de stock crítico.
3. **Diseñar** la arquitectura lógica y el modelo de datos usando un entorno Desktop-Native con interfaz intuitiva.
4. **Construir** los módulos operativos: posesión (Check-in/Check-out), tablero de stock, reportes de mantenimiento y motor de BI.
5. **Evaluar** el funcionamiento y rendimiento mediante pruebas de usabilidad y estabilidad técnica.

---

## 🏗️ Arquitectura del Sistema

```
┌──────────────────────────────────────────────────────────────────┐
│                    ELECTRON MAIN PROCESS                         │
│                                                                  │
│  ┌──────────────┐  ┌─────────────────────────┐  ┌────────────┐  │
│  │   main.ts     │  │    database/             │  │ preload.ts │  │
│  │  (ventana,   │──│  ├─ connection.ts        │  │ (context-  │  │
│  │   IPC reg)   │  │  ├─ migrate.ts           │  │  Bridge)   │  │
│  │              │  │  └─ repositories/         │  │            │  │
│  └──────┬───────┘  │    ├─ userRepo.ts         │  └──────┬─────┘  │
│         │          │    ├─ resourceRepo.ts     │         │        │
│         │          │    ├─ checkInOutRepo.ts   │         │        │
│         │          │    ├─ incidentRepo.ts     │         │        │
│         │          │    ├─ stockRepo.ts        │         │        │
│         │          │    └─ reportRepo.ts       │         │        │
│         │          └───────────┬───────────────┘         │        │
│         │                      │                         │        │
│         │              ┌───────┴────────┐                │        │
│         │              │  sql.js (WASM)  │                │        │
│         │              │    (SQLite)     │                │        │
│         │              └────────────────┘                │        │
│         │                                                │        │
└─────────┼────────────────────────────────────────────────┼────────┘
          │ IPC (invoke/handle)                            │ preload
          │                                                │
┌─────────┼────────────────────────────────────────────────┼────────┐
│  RENDERER PROCESS (Chromium)                             │        │
│         │                                                │        │
│  ┌──────┴────────────────────────────────────────────────┴────┐  │
│  │            window.electronAPI (contextBridge)               │  │
│  │  .db.resources.getAll()   .db.users.authenticate()          │  │
│  │  .db.checkInOut.checkout()  .db.stock.*  .db.reports.*     │  │
│  └───────────────────────────┬────────────────────────────────┘  │
│                              │                                     │
│  ┌───────────────────────────┴────────────────────────────────┐  │
│  │                    REACT APP (Vite)                         │  │
│  │                                                             │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌───────────┐             │  │
│  │  │ Zustand  │  │ React Router │  │   Pages   │             │  │
│  │  │ Stores   │──│ (HashRouter) │──│ ├ Dashboard│             │  │
│  │  │(auth,app)│  │              │  │ ├ CheckInOut            │  │
│  │  └──────────┘  │ Protected-  │  │ ├ Stock     │             │  │
│  │                │ Route (RBAC) │  │ ├ Resources │             │  │
│  │  ┌──────────┐  │              │  │ ├ Incidents │             │  │
│  │  │ Recharts │  │ Layout +     │  │ ├ Reports   │             │  │
│  │  │ (charts) │  │ Sidebar     │  │ ├ Admin     │             │  │
│  │  └──────────┘  └──────────────┘  │ └ Login     │             │  │
│  │  ┌──────────┐                    └───────────┘             │  │
│  │  │ jsPDF +  │  ┌──────────────────────────────────┐        │  │
│  │  │autotable │  │      Tailwind CSS                 │        │  │
│  │  └──────────┘  └──────────────────────────────────┘        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

### Principios Arquitectónicos

| Principio | Implementación |
|-----------|---------------|
| **Local-First** | Base de datos SQLite embebida vía sql.js (WebAssembly). Sin dependencia de internet. |
| **Aislamiento de Procesos** | `contextIsolation: true`, `nodeIntegration: false`. Comunicación exclusiva vía IPC tipado. |
| **Arquitectura por Capas** | Renderer (UI) → Preload (API bridge) → Main Process (lógica de negocio) → Database (SQLite). |
| **RBAC** | Control de acceso basado en roles (`admin` / `user`) con rutas protegidas en frontend. |

---

## 🛠️ Stack Tecnológico

### Frontend (Renderer Process)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **React** | ^18.3.1 | Biblioteca de UI declarativa y basada en componentes. Se eligió por su ecosistema maduro, curva de aprendizaje accesible y excelente rendimiento con Virtual DOM. |
| **TypeScript** | ^5.7.2 | Tipado estático que previene errores en tiempo de compilación, mejora la documentación del código y facilita el mantenimiento colaborativo. |
| **Vite** | ^5.4.11 | Bundler de nueva generación con Hot Module Replacement (HMR) ultrarrápido. Reemplaza a Webpack por su velocidad de arranque y recompliación instantánea. |
| **React Router DOM** | ^6.28.0 | Enrutador SPA con HashRouter, nested layouts y protección de rutas por rol (RBAC). |
| **Tailwind CSS** | ^3.4.16 | Framework de CSS utilitario que permite diseñar interfaces profesionales sin salir del HTML, con generación de estilos purgada (archivo final pequeño). |
| **Zustand** | ^4.5.5 | Estado global liviano y simple (sin boilerplate). Se eligió sobre Redux por su API minimalista y menor curva de aprendizaje. |
| **Recharts** | ^2.15.0 | Biblioteca de gráficos para React (bar charts, line charts) usada en el Dashboard para visualizar estadísticas de uso. |
| **jsPDF + jspdf-autotable** | ^4.2.1 / ^5.0.8 | Generación de reportes PDF directamente en el cliente, con tablas automáticas para los informes de auditoría y BI. |

### Backend (Main Process)

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Electron** | ^33.2.0 | Framework que envuelve Chromium y Node.js en una aplicación de escritorio nativa. Permite desarrollar UI web con acceso completo al sistema de archivos y al hardware. |
| **TypeScript** | ^5.7.2 | Mismo lenguaje en frontend y backend, compilado a CJS mediante `esbuild` y `tsc`. |
| **sql.js** | ^1.11.0 | SQLite compilado a WebAssembly (WASM). Permite ejecutar una base de datos SQL relacional completa dentro del proceso principal de Electron, con persistencia a disco. |
| **bcryptjs** | ^2.4.3 | Hash de contraseñas con salt incorporado para autenticación segura de usuarios. |
| **esbuild** | ^0.24.0 | Bundler ultrarrápido para compilar el código TypeScript del backend a CommonJS. |

### Herramientas de Desarrollo y Distribución

| Herramienta | Propósito |
|-------------|-----------|
| **electron-builder** | Empaquetado y distribución: genera instaladores nsis para Windows, maneja actualizaciones y firmado. |
| **PostCSS + Autoprefixer** | Post-procesamiento de CSS: autoprefixer añade prefijos de navegadores automáticamente. |
| **Node.js** | Entorno de ejecución para el desarrollo y la compilación del proyecto. |

### ¿Por qué esta combinación?

1. **Electron + React** → UI moderna de estándar web con capacidades de sistema operativo (acceso a archivos, SQLite nativo).
2. **SQLite vía sql.js** → Persistencia local 100% autónoma. Sin servidor, sin conexión, sin latencia de red. Ideal para entornos con internet intermitente.
3. **Vite** → Desarrollo ultrarrápido con HMR. En producción, genera builds optimizados con code splitting automático.
4. **Tailwind CSS** → Estilizado rápido y consistente. El purging en producción elimina CSS no usado, resultando en bundles mínimos.
5. **Zustand** → Estado global simple. A diferencia de Redux, no requiere actions, reducers ni dispatch; se usa como un hook de React.
6. **jsPDF** → Generación de PDFs del lado del cliente sin necesidad de servidor, manteniendo la filosofía Local-First.

---

## 📦 Módulos y Funcionalidades

### Módulo 1: Gestión de Posesión (Check-in / Check-out)
**`/checkinout`** — RF-01, RF-03

- Registro de salida (`checkout`) de activos de alto valor, asignando responsable y **Tiempo Estimado de Retorno (ETR)**.
- Registro de entrada (`checkin`) al devolver el equipo.
- Historial completo de movimientos por recurso.
- Visualización de estado actual: disponible, en uso, vencido.
- Protege el patrimonio institucional mediante trazabilidad de responsabilidad individual.

### Módulo 2: Control de Stock Crítico
**`/stock`** — RF-02

- Inventario de suministros consumibles (vinilos, tintas, papelería especializada).
- Umbrales mínimos por producto con **alertas automáticas** de reposición.
- Registro de movimientos de entrada y salida con tipo (`entry`/`exit`), cantidad y notas.
- Sistema de solicitudes de reabastecimiento con flujo de aprobación (`pending → in_procurement → fulfilled → cancelled`).
- Vista de stock bajo con resaltado visual.

### Módulo 3: Gestión de Activos Fijos
**`/resources`**

- CRUD completo de recursos (equipos, maquinaria, herramientas).
- Clasificación por categorías y tipo (`consumable` / `non-consumable`).
- Estado de salud del equipo (`excellent`, `needs_review`, `out_of_service`).
- Código QR único por recurso para identificación y escaneo rápido.
- Visualización de disponibilidad y usuario actual.

### Módulo 4: Reporte de Incidencias y Mantenimiento
**`/incidents`** — RF-04

- Registro de incidencias con severidad (`low`, `medium`, `high`, `critical`).
- Flujo de estado: `open → in_progress → resolved → closed`.
- Historial de mantenimiento preventivo y correctivo por equipo.
- Reportes de salud general de la flota de activos.

### Módulo 5: Business Intelligence y Reportes
**`/reports`** — RF-05

- Dashboard ejecutivo con KPIs: total de recursos, en uso, incidencias abiertas, alertas pendientes.
- Estadísticas de uso: recursos más demandados, tiempos de uso acumulados.
- Reportes de auditoría: historial completo de Check-in/Check-out con responsables.
- Resumen de salud de activos.
- **Exportación a PDF** con jsPDF + autotable.

### Módulo 6: Administración de Usuarios
**`/admin`** (solo admin)

- Gestión de usuarios del sistema (crear, editar, listar).
- Roles: `admin` (acceso completo) y `user` (acceso operativo).
- Autenticación segura con bcryptjs.

### Módulo 7: Sistema de Escaneo por Código QR

- Mecanismo incorporado que acumula caracteres escaneados vía lector de código de barras/QR (emulación de teclado).
- Timeout de 150ms para detectar fin de escaneo.
- Dispara evento personalizado que permite buscar y seleccionar automáticamente un recurso en la interfaz.
- Acelera significativamente los procesos de Check-in/Check-out.

---

## 📁 Estructura del Proyecto

```
modulo-gestion/
│
├── electron/                          # Backend (TypeScript -> esbuild -> CJS)
│   ├── database/
│   │   ├── connection.ts              # Inicialización y persistencia de SQLite
│   │   ├── migrate.ts                 # Migraciones y datos de semilla
│   │   └── repositories/             # Capa de acceso a datos (patrón repositorio)
│   │       ├── userRepo.ts
│   │       ├── resourceRepo.ts
│   │       ├── checkInOutRepo.ts
│   │       ├── incidentRepo.ts
│   │       ├── stockRepo.ts
│   │       └── reportRepo.ts
│   ├── main.ts                        # Entry point de Electron (ventana, IPC)
│   └── preload.ts                     # contextBridge: API tipada para el renderer
│
├── src/                               # Frontend (React + TypeScript + Vite)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Layout.tsx             # Layout principal con sidebar + <Outlet/>
│   │   │   ├── ProtectedRoute.tsx     # Guardia de autenticación y roles
│   │   │   └── Sidebar.tsx            # Navegación sensible al rol
│   │   └── ui/                        # Componentes de interfaz reutilizables
│   ├── hooks/                         # Custom hooks de React
│   ├── pages/
│   │   ├── Login.tsx                  # Pantalla de inicio de sesión
│   │   ├── Dashboard.tsx              # Tablero ejecutivo con KPIs y gráficos
│   │   ├── Resources.tsx              # Gestión de activos fijos
│   │   ├── CheckInOut.tsx             # Check-in / Check-out con ETR
│   │   ├── Stock.tsx                  # Control de stock y alertas
│   │   ├── Incidents.tsx              # Reporte de incidencias
│   │   ├── Reports.tsx                # Business Intelligence y exportación PDF
│   │   └── Admin.tsx                  # Administración de usuarios
│   ├── stores/
│   │   ├── authStore.ts               # Zustand store: autenticación y sesión
│   │   └── appStore.ts                # Zustand store: recursos, dashboard, QR scan
│   ├── types/
│   │   └── index.ts                   # Interfaces TypeScript (User, Resource, etc.)
│   ├── App.tsx                        # Configuración de rutas
│   ├── main.tsx                       # Punto de entrada React
│   ├── index.css                      # Directivas Tailwind
│   └── vite-env.d.ts
│
├── scripts/
│   └── dev.mjs                        # Script de desarrollo: compila Electron + Vite
│
├── dist/                              # Build de producción de Vite (frontend)
├── dist-electron/                     # Compilación del backend Electron
├── release/                           # Instaladores generados por electron-builder
│
├── index.html                         # HTML shell de Vite
├── package.json                       # Dependencias y scripts
├── vite.config.ts                     # Configuración de Vite
├── tsconfig.json                      # TSConfig para frontend (React)
├── tsconfig.electron.json             # TSConfig para backend (Electron)
├── tailwind.config.js                 # Configuración de Tailwind CSS
├── postcss.config.js                  # Configuración de PostCSS
└── .gitignore
```

---

## 🗄️ Modelo de Datos

### Tablas (SQLite)

| Tabla | Propósito | Columnas principales |
|-------|-----------|---------------------|
| **users** | Autenticación y RBAC | id, name, email, password_hash, role, created_at |
| **resources** | Inventario de activos | id, name, description, category, type (consumable/non-consumable), qr_code, health_status, current_user_id, created_at |
| **consumable_stock** | Control de existencias | id, resource_id (FK), current_quantity, min_threshold, unit, updated_at |
| **checkin_checkout_log** | Trazabilidad de posesión | id, resource_id (FK), user_id (FK), action (checkout/checkin), etr_minutes, notes, created_at |
| **incidents** | Reporte de incidencias | id, resource_id (FK), reported_by (FK), description, severity, status, created_at, resolved_at |
| **restock_alerts** | Solicitudes de reposición | id, resource_id (FK), requested_by (FK), status, approved_by (FK), notes, created_at |
| **stock_movements** | Movimientos de inventario | id, resource_id (FK), quantity_change, type (entry/exit), notes, user_id (FK), created_at |

### Relaciones Clave

- `resources.current_user_id` → `users.id` (posesión actual)
- `consumable_stock.resource_id` → `resources.id` (1:1 para consumibles)
- `checkin_checkout_log.resource_id` → `resources.id` (historial)
- `checkin_checkout_log.user_id` → `users.id` (responsable)
- `incidents.resource_id` → `resources.id` (incidencias por equipo)
- `restock_alerts.resource_id` → `resources.id` (alertas por insumo)
- `stock_movements.resource_id` → `resources.id` (movimientos)

---

## 💻 Requerimientos del Sistema

### Hardware Recomendado

| Componente | Especificación Mínima |
|------------|----------------------|
| **Sistema Operativo** | Windows 10/11 (64-bit) |
| **Procesador** | Intel Core i3 / AMD Ryzen 3 o superior |
| **Memoria RAM** | 4 GB (mínimo) |
| **Almacenamiento** | 500 MB de espacio libre en disco |
| **Resolución de pantalla** | 1024 × 768 (mínimo) / 1280 × 800 (recomendado) |

### Consideraciones de Infraestructura

- El sistema **NO requiere conexión a internet** para su funcionamiento básico.
- Se recomienda respaldo de energía (UPS) en zonas con inestabilidad eléctrica.
- La base de datos se almacena localmente en `%APPDATA%/modulo-gestion/modulo-gestion.db`.
- Para funcionalidad de escaneo QR, se requiere un lector de código de barras/QR compatible con emulación de teclado HID.

---

## 🚀 Instalación y Desarrollo

### Prerrequisitos

- [Node.js](https://nodejs.org/) v18 o superior
- [Git](https://git-scm.com/)

### Clonar el Repositorio

```bash
git clone <url-del-repositorio>
cd modulo-gestion
```

### Instalar Dependencias

```bash
npm install
```

### Ejecutar en Modo Desarrollo

```bash
npm run dev
```

Esto ejecuta el script `scripts/dev.mjs` que:
1. Compila el backend de Electron (TypeScript → CJS via esbuild).
2. Inicia el servidor de desarrollo de Vite (frontend con HMR).
3. Espera a que Vite esté listo y lanza Electron con `VITE_DEV_SERVER_URL` configurado.

### Construir para Producción

```bash
npm run build
```

Compila el backend (`tsc -p tsconfig.electron.json`) y el frontend (`vite build`), generando:
- `dist/` → Frontend estático optimizado
- `dist-electron/` → Backend compilado

### Generar Instalador

```bash
npm run dist
```

Construye la aplicación y genera un instalador **NSIS** para Windows en la carpeta `release/`.

---

## 🖥️ Uso


> ⚠️ Estas credenciales se crean automáticamente al ejecutar la migración inicial de la base de datos.

### Flujo de Trabajo Típico

1. **Inicio de sesión** → Autenticación con email y contraseña.
2. **Dashboard** → Visión general del estado de la empresa: recursos en uso, incidencias abiertas, alertas pendientes, actividad reciente.
3. **Check-in/Check-out** → Escanear código QR o seleccionar un recurso, registrar salida con ETR, registrar entrada al devolver.
4. **Stock** → Monitorear niveles de existencias, registrar movimientos (entradas/salidas), crear solicitudes de reabastecimiento.
5. **Incidencias** → Reportar problemas con equipos, dar seguimiento al estado de resolución.
6. **Reportes** → Visualizar estadísticas de uso, exportar informes de auditoría en PDF.
7. **Admin** (solo administradores) → Gestionar usuarios del sistema.

---

## 📦 Distribución y Empaquetado

El sistema utiliza **electron-builder** con target **NSIS** (Nullsoft Scriptable Install System) para Windows.

```bash
npm run dist
```

Esto genera un instalador `.exe` en `release/` con:
- Instalación con directorio seleccionable por el usuario.
- Acceso directo en el menú de inicio.
- Configuración one-click deshabilitada (el usuario elige dónde instalar).

### Configuración de Empaquetado (`package.json` build)

```json
{
  "appId": "com.modulo-gestion.app",
  "productName": "Modulo Gestion",
  "files": ["dist/**/*", "dist-electron/**/*"],
  "win": { "target": "nsis" },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true
  }
}
```

---

## ✅ Beneficios Esperados

| Indicador | Impacto en Adcesa |
|-----------|-------------------|
| **Optimización de Tiempo** | Reducción estimada de 3 a 5 horas de búsqueda semanal por empleado |
| **Protección Patrimonial** | Historial de mantenimiento y auditoría de responsabilidad para equipos costosos |
| **Continuidad Operativa** | Independencia total de la conexión a internet para funciones básicas |
| **Eficiencia en Costos** | Reducción de compras redundantes de materiales que ya existen en depósito |
| **Toma de Decisiones** | Reportes analíticos sobre herramientas más demandadas para futuras inversiones |
| **Trazabilidad** | Registro completo de quién tiene qué, desde cuándo y hasta cuándo |
| **Mantenimiento Preventivo** | Historial de incidencias que permite anticipar fallas recurrentes |

---

