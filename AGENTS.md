# MiliBrows Studio

## Proyecto y contrato

- Este es el frontend definitivo, desarrollado con React, TypeScript, Vite y Tailwind CSS.
- Mantener el portal de clientes en `src/client`, el panel interno en `src/admin` y el código compartido en `src/shared`. Son dos entradas con compilaciones independientes.
- Consumir la API Laravel y MySQL de `../backend-milibrows` bajo `/api/v1`. El contrato vigente está en `../backend-milibrows/docs/openapi.yaml` y el alcance en `../backend-milibrows/docs/ALCANCE.md`.
- Revisar los controladores y recursos del backend cuando sea necesario aclarar una respuesta. Registrar cualquier diferencia del contrato al comunicar la entrega.
- El alcance de este frontend incluye acceso, MFA, recuperación de contraseña, catálogo, disponibilidad, citas, atención parcial, clientes, personal, horarios, fidelización y configuración de avisos. Caja, pagos e inventario quedan para otra etapa.
- Trabajar dentro de `front-mili` salvo autorización del usuario para modificar otro proyecto.

## Acceso y datos

- Usar sesiones web de Sanctum mediante cookies y CSRF. `src/shared/api/http.ts` centraliza peticiones, errores y paginación. `authService.ts` y `useAuth.ts` gestionan la identidad autenticada.
- Recuperar la sesión desde `GET /mi-perfil` al iniciar y al recuperar el foco. Mantener el paso de MFA pendiente hasta verificarlo. Administración requiere MFA y el resto del personal puede activarlo.
- Las contraseñas, códigos TOTP y códigos de recuperación permanecen únicamente en memoria durante sus formularios. La API decide permisos, identidad y acceso a cada registro.
- Mantener DTO de la API en `src/shared/api/types.ts` y adaptar datos de presentación en `agendaService.ts`. Los identificadores se presentan como cadenas y se envían como números cuando el contrato lo exige.
- Las respuestas de negocio usan `datos`; los listados usan `meta` y `pagina`; los errores usan `mensaje` y `errores`. Consumir todas las páginas necesarias para las vistas que realizan búsqueda y filtrado local.
- El registro público requiere DNI y puede vincular una ficha existente. Tras crearlo, iniciar sesión mediante el endpoint de acceso. El correo de acceso y el correo de contacto son campos distintos.

## Reservas y atención

- Usar estilista en textos de la interfaz. Los roles de API son `administracion`, `recepcion`, `estilista` y `cliente`. Los modelos de presentación conservan las equivalencias de etiquetas en español.
- Las citas se crean confirmadas. La API devuelve `no_asistio`, que se presenta como `no asistió`.
- Cada cita contiene servicios de una sola estilista y conserva nombres, precios y duraciones acordados. Mostrar las fechas y horas en `America/Lima` y los importes en soles.
- Consultar disponibilidad real para reservas públicas. El backend revalida el intervalo al guardar. Las reservas internas de Administración permiten definir la hora y utilizar servicios internos con personal habilitado.
- Consultar `/citas/{id}/disponibilidad` al reprogramar. El formulario compartido muestra estilistas y horas disponibles, excluye el intervalo de la propia cita y conserva la duración acordada. Guardar vuelve a validar el intervalo y un conflicto actualiza la consulta.
- Para reservar a una persona nueva, crear primero su ficha y reutilizarla si falla la reserva. Mantener el resultado confirmado de una operación aunque una actualización posterior de pantalla falle.
- Completar una atención exige el resultado de todos sus servicios. Los cancelados o no realizados requieren motivo. Solo los realizados forman parte del historial y generan sellos elegibles.
- Usar los datos autorizados incluidos en las citas para las vistas de estilistas. Los endpoints de empleados y configuración son administrativos.
- Las notas de tratamiento son internas. El contrato actual de creación de citas no incluye observaciones de reserva.

## Diseño y mantenimiento

- Conservar Inter, Poppins, los tamaños, controles y lenguaje visual existentes. Reutilizar los componentes de formularios y los tokens de `src/shared/theme.css`.
- Paleta principal marfil `#FAF8F5`, arena `#F1ECE6`, línea `#E8E5E0`, grafito `#2B2B2B`, piedra `#6F6B64`, dorado `#C9A24B`, champagne `#F3E5B5`, salvia `#7C8068` y caramelo `#A9714F`.
- Mantener interfaces responsivas, etiquetas accesibles, estados de carga, errores recuperables y bloqueo de envíos repetidos.
- Administrar descripciones e imágenes desde Servicios. La descripción admite hasta 5000 caracteres y las imágenes JPEG, PNG y WebP hasta 2 MB. Utilizar multipart con POST y `_method=PATCH` al editar. El navegador establece Content-Type con el separador multipart.
- Usar `imagen_url` de la API para mostrar la fotografía del servicio y resolverla respecto al origen configurado de la API. Omitir imagen conserva la actual y `eliminar_imagen=1` permite quitarla. La API sirve sus archivos y genera una URL nueva al reemplazarlos.
- La portada explica cómo elegir la estilista durante la reserva. La API actual ofrece estilistas a través de disponibilidad y reserva el listado completo del personal para Administración.
- Evitar dependencias, abstracciones y cambios ajenos al alcance que la tarea no necesite.

## Ejecución y comprobación

- `npm run dev:client` abre el portal en 5173 y `npm run dev:admin` el panel en 5174. En PowerShell puede usarse `npm.cmd`.
- Vite carga variables desde esta carpeta. El valor predeterminado de `VITE_API_URL` es `/api/v1` y `API_PROXY_TARGET` apunta a `http://localhost:8000`. El proxy de desarrollo conserva cookies y adapta los encabezados al origen de Laravel.
- En despliegue, servir las compilaciones en `/client/` y `/admin/`, con redirección de rutas de aplicación y `/api` hacia Laravel, o configurar las URLs para la infraestructura elegida. Consultar README.md.
- Usar `npm run lint` y comprobar las dos compilaciones con `npm run build` al terminar los cambios de código. Corregir fallos antes de entregar.
- Mantener la revisión visual a cargo del usuario. Abrir o automatizar el navegador, tomar capturas y crear o ejecutar pruebas automatizadas requiere petición expresa.
- Comunicar qué se implementó, cómo ejecutarlo y qué comprobaciones siguen pendientes por servicios externos o configuración del entorno.
