# MiliBrows Studio

## Proyecto
- Desarrollar por etapas un prototipo funcional sobre la instalación existente de React, TypeScript y Vite.
- Un proyecto y una instalación de dependencias. Portal de clientes en src/client, panel interno en src/admin y código compartido en src/shared. Dos entradas y compilaciones independientes.
- Cuentas y sesiones simuladas en memoria para administrador, recepcionista, estilista y cliente. Sin autenticación real en esta fase.
- Laravel y SQLite se conectarán posteriormente mediante una API común. La app móvil para clientes corresponde a otra etapa.

## Reglas esenciales
- Usar estilista, no profesional.
- Citas inicialmente confirmadas. Otros estados: completada, cancelada y no asistió.
- Una cita puede incluir varios servicios de una misma estilista, conservando precio y duración acordados. Horario inicial: lunes a sábado, 10:00 a 22:00.
- Administración y recepción reservan también para clientes sin cuenta. Las estilistas gestionan solo sus citas y cancelan indicando motivo. Cada cliente ve su información.
- El inventario queda fuera del alcance actual. Completar una cita y registrar su pago serán operaciones separadas en etapas futuras.
- La fidelización cuenta únicamente atenciones completadas.

## Desarrollo
- Implementar directamente el alcance solicitado. Leer solo los archivos pertinentes y resolver las decisiones rutinarias sin pedir confirmación.
- Preservar el trabajo existente. Evitar reinstalaciones, actualizaciones de versiones y dependencias que la tarea no necesite.
- Priorizar pantallas y flujos funcionales. Interfaz responsiva, accesible y en español; importes en soles.
- Usar Tailwind CSS con tokens en `src/shared/theme.css` (`@theme`). Paleta: marfil #FAF8F5, arena #F1ECE6, blanco #FFFFFF, línea #E8E5E0, grafito #2B2B2B, piedra #6F6B64, dorado #C9A24B, champagne #F3E5B5, salvia #7C8068 y caramelo #A9714F.
- El prototipo actual de agenda excluye cobros e inventario; se abordarán en etapas posteriores.
- Mantener TypeScript, componentes claros y acceso a datos separado de la interfaz. Datos, cuentas, contraseñas y sesión del prototipo viven solo en memoria; al recargar se restablecen. No sincronizar entre aplicaciones o pestañas hasta disponer de la API.
- Evitar abstracciones prematuras, auditorías generales, planes extensos y documentación adicional no solicitada. Mantener breves las explicaciones.

## Comprobación y entrega
- Usar lint cuando el cambio lo requiera. No repetir comprobaciones aprobadas sin nuevos cambios o fallos.
- No abrir ni automatizar el navegador, tomar capturas o ejecutar recorridos visuales salvo petición expresa del usuario. La revisión visual la realiza el usuario. No crear ni ejecutar pruebas automatizadas salvo petición expresa. Comprobar una vez la compilación afectada al finalizar cambios de código.
- Comandos actuales: `npm run dev:client` (5173), `npm run dev:admin` (5174), `npm run build:client`, `npm run build:admin`, `npm run build` (ambas) y `npm run lint`.
- Los cambios exclusivamente documentales no requieren compilar.
- Cerrar con un resumen breve: qué quedó funcionando, cómo ejecutarlo y cualquier bloqueo real. Continuar hasta completar la tarea solicitada.
