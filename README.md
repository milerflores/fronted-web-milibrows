# MiliBrows Studio — Frontend Web (Portal de Clientes y Panel Administrativo)

Aplicación web desarrollada con **React 19**, **TypeScript**, **Vite 8** y **Tailwind CSS v4** que reúne dos entradas independientes conectadas a la API REST de `backend-milibrows` (`/api/v1`):

- **Portal de clientes (`client`)**: `http://localhost:5173`
- **Panel administrativo (`admin`)**: `http://localhost:5174`

## Requisitos previos

- **Node.js** >= 20 y **npm** >= 10
- **Backend API (`backend-milibrows`)** ejecutándose en `http://localhost:8000` con MySQL configurado y CORS/Sanctum habilitados para `localhost:5173` y `localhost:5174`.

## Instalación y configuración

1. **Clonar el repositorio e instalar dependencias**
   ```bash
   npm install
   ```

2. **Configurar variables de entorno (opcional en desarrollo local)**
   ```bash
   cp .env.example .env.local
   ```
   Valores predeterminados:
   ```dotenv
   VITE_API_URL=/api/v1
   API_PROXY_TARGET=http://localhost:8000
   ```
   En desarrollo, Vite redirige `/api/*` al servidor Laravel definido en `API_PROXY_TARGET` preservando cookies de sesión y CSRF de Sanctum.

## Ejecutar en desarrollo

Inicia cada interfaz en una terminal separada:

```bash
# Portal de clientes (http://localhost:5173)
npm run dev:client
```

```bash
# Panel interno (http://localhost:5174)
npm run dev:admin
```

*(En Windows PowerShell con política de ejecución restringida, usa `npm.cmd run dev:client` y `npm.cmd run dev:admin`).*

## Funcionalidades

### Portal de clientes (`src/client`)
- Catálogo público de servicios con imágenes, descripciones, duración y precios.
- Registro con nombre, apellidos y DNI (vinculando ficha previa si existe), inicio de sesión y recuperación de contraseña.
- Reserva de citas con **uno o varios servicios**, con opción de elegir **distinta estilista y horario por servicio**.
- Consulta, reprogramación y cancelación de citas propias futuras y confirmadas.
- Perfil editable, **puntos acumulados, nivel de fidelización (Glow / Golden / VIP), historial de movimientos de puntos, pagos registrados** e historial de atenciones.

### Panel administrativo (`src/admin`)
- **Agenda**: vista general o por estilista, reserva de citas (incluyendo creación de fichas sin cuenta), inicio de servicios (`en_proceso`), cierre de atención con resultados individuales y notas internas, descuentos manuales por servicio y cobro directo.
- **Clientes**: listado, búsqueda, creación y edición de fichas e historial.
- **Cobros e ingresos** *(Administración y Recepción)*: cobros totales o parciales (Efectivo, Yape, Plin, Tarjeta, Transferencia), anulación con reversión de puntos y resumen de ingresos por fecha y método.
- **Inventario** *(Administración y Estilistas)*: gestión de insumos en unidades enteras, alertas de reposición, movimientos (`entrada`, `salida`, `devolucion`, `ajuste`), entregas a estilistas y marcado de agotamiento.
- **Servicios**: catálogo interno con carga, reemplazo y eliminación de imágenes (JPG, PNG, WebP hasta 2 MB).
- **Personal**: cuentas, roles, restablecimiento de contraseñas, servicios habilitados, jornadas y atenciones.
- **Fidelización**: tasa de puntos (`monto_por_punto`), niveles Glow / Golden / VIP, motivos de descuento manual y ajustes de puntos.
- **Estudio y Seguridad**: horario del estudio, configuración de avisos y gestión de autenticación multifactor (MFA con TOTP y códigos de recuperación).

## Scripts disponibles

```bash
npm run dev:client    # Servidor de desarrollo del portal de clientes (:5173)
npm run dev:admin     # Servidor de desarrollo del panel interno (:5174)
npm run lint          # Verificación con ESLint
npm run build         # Verifica TypeScript y compila ambos bundles (dist/client y dist/admin)
npm run build:client  # Compila solo el portal de clientes
npm run build:admin   # Compila solo el panel administrativo
```

## Despliegue en producción

`npm run build` genera dos carpetas independientes:
- `dist/client` — Portal de clientes
- `dist/admin` — Panel administrativo

En producción:
1. Configura `VITE_API_URL` apuntando a tu API si no comparten prefijo `/api/v1`.
2. Configura el servidor web para enrutar `/api/*` a Laravel y devolver el `index.html` correspondiente para rutas SPA (incluyendo `/restablecer-contrasena` en el portal).
3. Alinea en el backend `FRONTEND_URL`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS` y cookies seguras sobre HTTPS.

## Estructura del proyecto

```text
src/
├── shared/
│   ├── api/         # Cliente HTTP (CSRF/cookies), tipos DTO, manejo de errores y hook useApi
│   ├── agenda/      # Adaptadores de dominio, fechas (America/Lima), sesión y disponibilidad
│   └── components/  # Formularios reutilizables, BookingForm, RescheduleDialog, MFA y recuperación
├── client/          # Portal de clientes (páginas, componentes y recursos)
└── admin/           # Panel interno (Agenda, Clientes, Cobros, Inventario, Servicios, Personal, Fidelización, Estudio)
```
