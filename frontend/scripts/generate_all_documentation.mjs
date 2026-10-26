import fs from "fs";
import path from "path";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  PageBreak
} from "docx";

const outDir = "C:/Users/maria/OneDrive/Escritorio/Documentacion.err";
fs.mkdirSync(outDir, { recursive: true });

const fontName = "Calibri";
const primaryColor = "1995AD"; // SENA / Corporate Teal
const darkHeaderColor = "1F3864"; // Deep Navy
const lightGray = "F2F2F2";

const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
  left: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
  right: { style: BorderStyle.SINGLE, size: 4, color: "A6A6A6" },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D9D9D9" }
};

// -------------------------------------------------------------
// 1. DATA: 24 HISTORIAS DE USUARIO
// -------------------------------------------------------------
const husData = [
  {
    code: "HU-001",
    name: "Crear Cuenta de Usuarios",
    complexity: "Media",
    related: "N/A",
    module: "Autenticación (AUT)",
    role: "Administrador (ADMIN)",
    require: "Registrar nuevos usuarios asignando sus nombres, correo corporativo, contraseña y perfil de rol.",
    benefit: "Dar de alta a los empleados de GlobalNet Telecom y asegurar que cada uno disponga de los privilegios exactos en el sistema.",
    requirement: "El sistema debe permitir al rol ADMIN registrar cuentas nuevas mediante mutación GraphQL, validando unicidad de correo y resguardando contraseñas mediante hashing criptográfico BCrypt (cost factor 12).",
    conditions: [
      {
        title: "Condición 01\nCreación exitosa",
        given: "Que el Administrador se encuentra autenticado en el módulo de gestión de usuarios.",
        when: "Ingresa los datos válidos (nombre completo, correo corporativo único, contraseña segura y selecciona el rol: ADMIN, INSPECTOR o TECHNICIAN).",
        then: "El sistema genera el hash BCrypt, almacena el usuario con estado activo en PostgreSQL y emite confirmación de éxito."
      },
      {
        title: "Condición 02\nCorreo duplicado",
        given: "Que el Administrador intenta registrar un usuario.",
        when: "Ingresa un correo electrónico que ya existe registrado en la base de datos.",
        then: "El sistema bloquea la transacción y muestra el mensaje: 'El correo electrónico ya se encuentra registrado'."
      },
      {
        title: "Condición 03\nControl de permisos",
        given: "Que un usuario no autorizado (INSPECTOR o TECHNICIAN) intenta ejecutar la mutación de registro.",
        when: "Envía la solicitud GraphQL al backend.",
        then: "El backend rechaza la operación arrojando error HTTP 403 Forbidden por permisos insuficientes."
      }
    ],
    tasks: [
      "Diseñar la entidad User y repositorio con restricción UNIQUE en email en PostgreSQL.",
      "Implementar la lógica de hash seguro BCrypt y servicio de creación en Spring Boot.",
      "Configurar la mutación GraphQL createUser protegida con anotación @PreAuthorize('hasRole(\"ADMIN\")').",
      "Desarrollar el formulario interactivo en Next.js con validaciones de campos en tiempo real.",
      "Conectar el formulario mediante Apollo Client y gestionar alertas de error/éxito.",
      "Realizar pruebas unitarias y de integración para validar la creación y el bloqueo de duplicados."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Actualización de roles y estandarización de criterios"
  },
  {
    code: "HU-002",
    name: "Iniciar Sesión y Autenticación",
    complexity: "Media",
    related: "HU-001",
    module: "Autenticación (AUT)",
    role: "Usuario del sistema (ADMIN, INSPECTOR o TECHNICIAN)",
    require: "Ingresar mi correo electrónico y contraseña en la pantalla de acceso.",
    benefit: "Acceder a la plataforma con las opciones y pantallas que corresponden exclusivamente a mi rol de trabajo.",
    requirement: "El sistema debe validar las credenciales contra PostgreSQL, verificar estado activo, generar token seguro de sesión con perfil de rol y redirigir al panel correspondiente.",
    conditions: [
      {
        title: "Condición 01\nInicio de sesión exitoso",
        given: "Que el usuario se encuentra en la pantalla de inicio de sesión.",
        when: "Ingresa su correo corporativo y contraseña válidos.",
        then: "El sistema valida el hash BCrypt, genera el token de sesión y redirige automáticamente al dashboard correspondiente."
      },
      {
        title: "Condición 02\nCredenciales incorrectas",
        given: "Que el usuario intenta iniciar sesión.",
        when: "Ingresa un correo no registrado o una contraseña errónea.",
        then: "El sistema rechaza el acceso y muestra el mensaje: 'Correo o contraseña incorrectos'."
      },
      {
        title: "Condición 03\nProtección de rutas privadas",
        given: "Que un usuario TECHNICIAN o INSPECTOR ha iniciado sesión.",
        when: "Intenta acceder manualmente mediante URL a una vista restringida de Administrador.",
        then: "El sistema intercepta la navegación mediante guardias de ruta y lo redirige a su panel autorizado."
      }
    ],
    tasks: [
      "Configurar Spring Security con autenticación stateless y verificación BCrypt.",
      "Exponer la mutación GraphQL login recibiendo email y password.",
      "Construir la interfaz de login en Next.js con feedback visual de carga.",
      "Almacenar credenciales seguras en contexto global del cliente.",
      "Implementar guardias de navegación para restringir el acceso a rutas protegidas.",
      "Ejecutar pruebas de autenticación correcta, bloqueo por contraseña inválida y navegación protegida."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Ajuste de guardias y sesión por roles"
  },
  {
    code: "HU-003",
    name: "Edición y Desactivación de Usuarios",
    complexity: "Media",
    related: "HU-001",
    module: "Autenticación (AUT)",
    role: "Directora de Logística (ADMIN)",
    require: "Modificar la información de usuarios registrados o inactivar cuentas de colaboradores desvinculados.",
    benefit: "Mantener la nómina del sistema al día y revocar inmediatamente el acceso a personal retirado.",
    requirement: "El sistema debe permitir al rol ADMIN actualizar nombre y rol, así como aplicar borrado lógico (status = INACTIVE) bloqueando sesiones activas.",
    conditions: [
      {
        title: "Condición 01\nActualización de datos",
        given: "Que la Administradora se encuentra en el módulo de usuarios.",
        when: "Modifica el nombre o rol de un usuario y guarda los cambios.",
        then: "El sistema actualiza la base de datos y confirma la operación exitosamente."
      },
      {
        title: "Condición 02\nDesactivación de cuenta",
        given: "Que la Administradora selecciona un usuario con estado activo.",
        when: "Cambia su estado a inactivo.",
        then: "El sistema actualiza status = 'INACTIVE' e impide cualquier inicio de sesión futuro."
      },
      {
        title: "Condición 03\nRestricción de acceso",
        given: "Que un usuario no autorizado intenta invocar la mutación de actualización.",
        when: "Envía la petición al servidor.",
        then: "El sistema bloquea la solicitud respondiendo con acceso denegado."
      }
    ],
    tasks: [
      "Crear métodos de servicio para actualización de perfil y borrado lógico.",
      "Exponer mutación GraphQL updateUser con control de acceso @PreAuthorize.",
      "Desarrollar el modal de edición y switch de estado activo/inactivo en Next.js.",
      "Reflejar los cambios en tiempo real en la tabla de usuarios.",
      "Validar que usuarios inactivos sean rechazados en el flujo de login.",
      "Pruebas de modificación y verificación de rechazo de credenciales inactivas."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Inclusión de borrado lógico y control de acceso"
  },
  {
    code: "HU-004",
    name: "Registro Manual y Consulta Paginada de Equipos",
    complexity: "Alta",
    related: "N/A",
    module: "Inventario (BOD)",
    role: "Administrador (ADMIN) o Inspector de Bodega (INSPECTOR)",
    require: "Registrar herramientas de alta gama individualmente (ADMIN) y consultar el inventario completo mediante paginación nativa desde la base de datos.",
    benefit: "Llevar el control de activos sin saturar la red ni la memoria del navegador con miles de registros.",
    requirement: "El sistema debe implementar paginación real SQL (LIMIT/OFFSET o Pageable) y permitir el alta manual de activos validando número de serie único.",
    conditions: [
      {
        title: "Condición 01\nConsulta paginada",
        given: "Que el usuario accede a la sección de inventario.",
        when: "Solicita una página específica indicando page y size.",
        then: "El sistema ejecuta la consulta SQL paginada retornando únicamente los registros solicitados y el total de páginas."
      },
      {
        title: "Condición 02\nAlta manual de activo",
        given: "Que la Administradora completa el formulario de nuevo activo.",
        when: "Ingresa serial único, modelo, valor comercial, fecha de compra y guarda.",
        then: "El sistema valida la unicidad del serial, almacena el equipo con estado AVAILABLE y confirma el alta."
      },
      {
        title: "Condición 03\nSerial duplicado",
        given: "Que se intenta registrar un equipo.",
        when: "Se ingresa un número de serie ya existente en la base de datos.",
        then: "El sistema bloquea el guardado y notifica que el serial ya está en uso."
      }
    ],
    tasks: [
      "Configurar la entidad Asset con restricciones de unicidad en PostgreSQL.",
      "Implementar Spring Data JPA PagingAndSortingRepository con consultas optimizadas.",
      "Exponer query GraphQL getAssets(page, size) y mutation createAsset.",
      "Construir tabla interactiva en Next.js con paginador numérico y selector de tamaño de página.",
      "Diseñar formulario modal de alta con validación de expresiones regulares.",
      "Pruebas de paginación con grandes volúmenes de datos y verificación de unicidad."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Estandarización de paginación real en BD"
  },
  {
    code: "HU-005",
    name: "Carga Masiva Transaccional de Activos (Excel/CSV)",
    complexity: "Alta",
    related: "HU-004",
    module: "Inventario (BOD)",
    role: "Directora de Logística (ADMIN)",
    require: "Importar un archivo masivo Excel (.xlsx) o CSV con el lote completo de herramientas tecnológicas.",
    benefit: "Cargar cientos de equipos rápidamente sin digitación manual propensa a fallas humanas.",
    requirement: "El procesamiento debe ejecutarse bajo una transacción atómica estricta (@Transactional): si una sola fila presenta error, formato inválido o serial duplicado, se debe ejecutar un rollback total sin guardar ningún registro.",
    conditions: [
      {
        title: "Condición 01\nCarga masiva limpia",
        given: "Que la Administradora adjunta un archivo Excel/CSV con datos correctos.",
        when: "Inicia el proceso de importación masiva.",
        then: "El sistema procesa todas las filas, valida seriales únicos, persiste el lote completo y emite reporte de éxito con total de registros cargados."
      },
      {
        title: "Condición 02\nRollback total por fila errónea",
        given: "Que el archivo contiene una fila con formato inválido o serial duplicado.",
        when: "El motor ejecuta la validación y guardado.",
        then: "El sistema aborta la transacción, revierte toda inserción (0 filas guardadas) e indica la fila exacta y motivo del rechazo."
      },
      {
        title: "Condición 03\nRestricción de perfil",
        given: "Que un perfil no autorizado (INSPECTOR o TECHNICIAN) intenta cargar archivos masivos.",
        when: "Intenta enviar la petición.",
        then: "El sistema deniega el acceso con mensaje de permisos no autorizados."
      }
    ],
    tasks: [
      "Implementar servicio de lectura de archivos XLSX (Apache POI) y CSV.",
      "Diseñar pipeline de validación fila por fila con anotación @Transactional(rollbackFor = Exception.class).",
      "Exponer mutación GraphQL o endpoint REST multipart protegido para rol ADMIN.",
      "Desarrollar componente de carga de archivos en Next.js con zona de arrastre (drag-and-drop).",
      "Mostrar resumen detallado de confirmación o alerta con fila de error.",
      "Pruebas con archivos masivos limpios y pruebas de reversión con errores intencionales."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Garantía de atomicidad y reversión transaccional"
  },
  {
    code: "HU-006",
    name: "Modificación y Control del Estado Físico de Activos",
    complexity: "Media",
    related: "HU-004",
    module: "Inventario (BOD)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Modificar el estado físico de los equipos tecnológicos (ej. disponible, en préstamo, mantenimiento).",
    benefit: "Reflejar en tiempo real la disponibilidad operativa de las herramientas y controlar qué dispositivos requieren revisión técnica o están fuera de servicio.",
    requirement: "El sistema debe permitir al rol INSPECTOR actualizar el atributo status de un activo específico mediante una mutación de GraphQL, validando las transiciones de estado permitidas y restringiendo esta acción para perfiles no autorizados.",
    conditions: [
      {
        title: "Condición 01\nActualización exitosa de estado",
        given: "Que el Inspector de Bodega localiza un equipo en el catálogo de inventario.",
        when: "Selecciona el activo y cambia su estado a 'En mantenimiento' (MAINTENANCE) o 'Disponible' (AVAILABLE) con notas técnicas.",
        then: "El backend ejecuta la mutación updateAssetStatus, valida la transición, persiste el cambio en PostgreSQL y notifica confirmación exitosa."
      },
      {
        title: "Condición 02\nValidación de transiciones permitidas",
        given: "Que el Inspector intenta forzar una transición prohibida (ej. marcar como 'ON_LOAN' un equipo que no ha completado el protocolo OTP).",
        when: "Envía la solicitud de actualización.",
        then: "El sistema rechaza la transición inválida, mantiene el estado previo y emite mensaje de error operacional."
      },
      {
        title: "Condición 03\nControl de acceso por rol",
        given: "Que un usuario con rol TECHNICIAN intenta modificar directamente el estado de un activo.",
        when: "Ejecuta la mutación GraphQL.",
        then: "El sistema bloquea la operación respondiendo con error 403 Forbidden por restricción de rol."
      }
    ],
    tasks: [
      "Definir el enum AssetStatus con estados: AVAILABLE, RESERVED, ON_LOAN, MAINTENANCE, RETIRED.",
      "Implementar en el servicio la máquina de transiciones de estado permitidas.",
      "Exponer la mutación GraphQL updateAssetStatus(id: ID!, status: AssetStatus!, notes: String) protegida para INSPECTOR y ADMIN.",
      "Desarrollar el modal interactivo de cambio de estado físico en la interfaz de inventario de Next.js.",
      "Integrar el botón de acción con icono de escudo (ShieldCheck) en la tabla de activos.",
      "Realizar pruebas de cambio de estado y verificación de bloqueo ante transiciones prohibidas."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Especificación completa de HU-006 con mutación GraphQL y control de transiciones"
  },
  {
    code: "HU-007",
    name: "Creación de Solicitud de Préstamo de Herramientas",
    complexity: "Alta",
    related: "HU-006",
    module: "Préstamos (PRE)",
    role: "Técnico de Campo (TECHNICIAN)",
    require: "Realizar solicitudes formales de préstamo de herramientas de alta gama disponibles en catálogo.",
    benefit: "Pedir oportunamente los equipos necesarios para las operaciones técnicas en terreno.",
    requirement: "El sistema debe permitir al rol TECHNICIAN registrar solicitudes asociando motivo y fecha estimada de retorno, validando que el equipo esté AVAILABLE.",
    conditions: [
      {
        title: "Condición 01\nRegistro de solicitud",
        given: "Que el Técnico consulta el catálogo y selecciona un activo disponible.",
        when: "Diligencia el motivo operativo, fecha requerida y fecha estimada de retorno.",
        then: "El sistema crea la solicitud con estado REQUESTED y notifica a la bandeja de bodega."
      },
      {
        title: "Condición 02\nEquipo no disponible",
        given: "Que un activo fue reservado o prestado previamente.",
        when: "El Técnico intenta registrar una solicitud sobre dicho equipo.",
        then: "El sistema impide la selección y alerta: 'El equipo no se encuentra disponible'."
      },
      {
        title: "Condición 03\nFecha de retorno inválida",
        given: "Que el solicitante ingresa una fecha estimada anterior a la fecha requerida.",
        when: "Intenta enviar el formulario.",
        then: "El sistema bloquea el envío indicando que la fecha de devolución debe ser posterior."
      }
    ],
    tasks: [
      "Diseñar la tabla loan_requests y su relación con users y assets en PostgreSQL.",
      "Crear servicio de validación de fechas y disponibilidad de activos.",
      "Exponer mutación GraphQL createLoanRequest protegida para rol TECHNICIAN.",
      "Construir modal interactivo de solicitud de préstamo en Next.js.",
      "Conectar formulario con Apollo Client y actualizar la bandeja de solicitudes.",
      "Pruebas de validación de disponibilidad y consistencia cronológica de fechas."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Validación de fechas y disponibilidad en préstamos"
  },
  {
    code: "HU-008",
    name: "Gestión de Aprobación y Entrega de Préstamos",
    complexity: "Alta",
    related: "HU-007",
    module: "Préstamos (PRE)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Revisar, aprobar o rechazar solicitudes de herramientas y formalizar la entrega física en bodega.",
    benefit: "Garantizar que ninguna herramienta salga del almacén sin visto bueno técnico y verificación previa.",
    requirement: "El Inspector debe aprobar o rechazar solicitudes. Al aprobar, el activo pasa a RESERVED y se dispara la generación del token OTP de retiro.",
    conditions: [
      {
        title: "Condición 01\nAprobación de solicitud",
        given: "Que el Inspector visualiza una solicitud pendiente con equipo apto.",
        when: "Presiona el botón de aprobar solicitud.",
        then: "El sistema actualiza la solicitud a APPROVED, el activo a RESERVED y genera el token OTP."
      },
      {
        title: "Condición 02\nRechazo justificado",
        given: "Que el Inspector decide rechazar la solicitud.",
        when: "Ingresa el motivo del rechazo y confirma.",
        then: "El sistema pasa la solicitud a REJECTED, libera el activo y notifica al técnico solicitante."
      },
      {
        title: "Condición 03\nRestricción para Técnicos",
        given: "Que un usuario TECHNICIAN intenta aprobar préstamos.",
        when: "Intenta ejecutar la mutación de aprobación.",
        then: "El sistema deniega la operación por carecer de facultades de bodega."
      }
    ],
    tasks: [
      "Implementar lógica de transición de estados de solicitudes y reservas.",
      "Vincular servicio de generación segura de PIN OTP al momento de la aprobación.",
      "Exponer mutaciones GraphQL approveLoanRequest y rejectLoanRequest.",
      "Construir bandeja de gestión de préstamos en Next.js con filtros por estado.",
      "Diseñar modal de ingreso de justificación en caso de rechazo.",
      "Pruebas de aprobación, rechazo y persistencia de reservas."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Integración de flujo de aprobación y enlace con OTP"
  },
  {
    code: "HU-009",
    name: "Autoconsulta de Custodias Activas e Históricas",
    complexity: "Media",
    related: "HU-007, HU-008",
    module: "Historial (REP)",
    role: "Técnico de Campo (TECHNICIAN)",
    require: "Consultar en cualquier momento la lista de herramientas actualmente bajo mi custodia y el historial de devoluciones.",
    benefit: "Tener control exacto de los activos a mi cargo para prevenir pérdidas y entregarlos oportunamente.",
    requirement: "El sistema debe aislar las consultas basándose en el identificador del usuario autenticado en el token JWT, impidiendo ver custodias de otros técnicos.",
    conditions: [
      {
        title: "Condición 01\nVisualización de custodias propias",
        given: "Que el Técnico accede a la sección 'Mis Custodias'.",
        when: "La vista carga.",
        then: "El sistema retorna únicamente los activos asignados al ID del técnico con fechas de entrega y vencimiento."
      },
      {
        title: "Condición 02\nAislamiento entre usuarios",
        given: "Que un Técnico intenta manipular los parámetros de consulta GraphQL.",
        when: "Intenta consultar préstamos pertenecientes a otro usuario.",
        then: "El backend extrae el ID del token JWT del solicitante y filtra estrictamente sus propios registros."
      },
      {
        title: "Condición 03\nAlerta visual de vencimiento",
        given: "Que el Técnico tiene herramientas con fecha de entrega próxima a vencer o vencida.",
        when: "Revisa su panel.",
        then: "El sistema resalta en color naranja/rojo los registros con advertencia de devolución inmediata."
      }
    ],
    tasks: [
      "Crear query en Spring Data JPA filtrada por technician_id autenticado.",
      "Exponer query GraphQL getMyLoans asegurando extracción del principal de seguridad.",
      "Construir vista personalizada en Next.js con tarjetas de estado de custodias.",
      "Implementar indicadores visuales semaforizados según días restantes.",
      "Pruebas de seguridad para asegurar la imposibilidad de fuga de datos entre técnicos."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Aislamiento estricto de datos por identidad JWT"
  },
  {
    code: "HU-010",
    name: "Visualización de Reportes Globales y Auditoría",
    complexity: "Alta",
    related: "HU-008, HU-009",
    module: "Reportes (REP)",
    role: "Directora de Logística (ADMIN)",
    require: "Consultar reportes globales consolidados de inventario, préstamos activos, moras y bitácora de auditoría.",
    benefit: "Disponer de visibilidad total para toma de decisiones logísticas y control de auditoría interna.",
    requirement: "El sistema debe generar estadísticas agregadas y tablas completas de auditoría inmutable accesibles exclusivamente por el rol ADMIN.",
    conditions: [
      {
        title: "Condición 01\nCarga de reportes globales",
        given: "Que la Administradora ingresa al módulo de reportes.",
        when: "Selecciona el periodo o tipo de métrica.",
        then: "El sistema calcula totales de inventario, valor monetario en préstamo y alertas vigentes."
      },
      {
        title: "Condición 02\nBitácora de auditoría",
        given: "Que la Administradora consulta el historial de eventos críticos.",
        when: "Filtra por usuario o entidad.",
        then: "El sistema presenta los registros inmutables con fecha, IP, actor y valor anterior/nuevo."
      },
      {
        title: "Condición 03\nBloqueo de acceso no autorizado",
        given: "Que un usuario no Administrador intenta ingresar al módulo.",
        when: "Peticiona la vista o datos de reporte.",
        then: "El sistema bloquea el acceso con mensaje de permisos insuficientes."
      }
    ],
    tasks: [
      "Diseñar consultas de agregación y reportes en Spring Data JPA.",
      "Exponer queries GraphQL para métricas consolidadas y consulta de audit_logs.",
      "Construir panel gerencial en Next.js con indicadores numéricos y gráficos ejecutivos.",
      "Implementar tabla de auditoría con filtros por fecha, acción y usuario.",
      "Pruebas de rendimiento de consultas agregadas y control de acceso."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Integración de auditoría inmutable y métricas globales"
  },
  {
    code: "HU-011",
    name: "Escaneo Rápido de Códigos QR para Identificación Subsegundo",
    complexity: "Alta",
    related: "HU-004, HU-008",
    module: "Inventario (BOD)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Escanear el código QR adherido al activo mediante la cámara web de la computadora o dispositivo móvil.",
    benefit: "Localizar de forma instantánea el registro del activo en menos de un segundo para agilizar entregas y recepciones en bodega.",
    requirement: "El sistema debe procesar la lectura del código QR en el navegador (<1s) y realizar la búsqueda indexada inmediata en la base de datos.",
    conditions: [
      {
        title: "Condición 01\nEscaneo exitoso",
        given: "Que el Inspector activa el lector QR en la interfaz.",
        when: "Presenta el código QR de la herramienta frente a la cámara.",
        then: "El sistema decodifica el valor en < 1 segundo, consulta el activo y abre automáticamente su ficha técnica."
      },
      {
        title: "Condición 02\nCódigo QR no registrado",
        given: "Que se escanea un código QR inexistente en la plataforma.",
        when: "El lector decodifica la cadena.",
        then: "El sistema notifica que el código escaneado no corresponde a ningún activo inventariado."
      },
      {
        title: "Condición 03\nEntrada manual alternativa",
        given: "Que la cámara presenta fallas o el QR físico está dañado.",
        when: "El usuario opta por digitar el serial o código manualmente.",
        then: "El sistema procesa la búsqueda con la misma rapidez y exactitud."
      }
    ],
    tasks: [
      "Crear índice único B-Tree sobre las columnas qr_code y serial_number en PostgreSQL.",
      "Integrar biblioteca de captura y decodificación html5-qrcode en Next.js.",
      "Diseñar componente visual con selector de cámara y visor en tiempo real.",
      "Exponer query GraphQL getAssetByQrCode optimizada.",
      "Pruebas de tiempo de respuesta garantizando respuesta subsegundo (<1000ms)."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Garantía de rendimiento subsegundo en lectura QR"
  },
  {
    code: "HU-012",
    name: "Bloqueo Preventivo por Calibración y Ciclos de Uso",
    complexity: "Alta",
    related: "HU-006, HU-008",
    module: "Calibración (CAL)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Recibir bloqueos automáticos al intentar prestar herramientas cuya calibración o límite de ciclos se encuentre vencido.",
    benefit: "Evitar el despacho de equipos descalibrados que comprometan la precisión de mediciones en terreno.",
    requirement: "El backend debe evaluar usage_cycles vs max_usage_cycles y fecha de última calibración. Si los límites se exceden, debe cambiar a MAINTENANCE e impedir el préstamo.",
    conditions: [
      {
        title: "Condición 01\nBloqueo por calibración expirada",
        given: "Que una herramienta superó los días de vigencia de calibración.",
        when: "Se intenta aprobar una solicitud de préstamo sobre ella.",
        then: "El sistema bloquea la entrega, cambia el activo a MAINTENANCE y registra la novedad en calibration_records."
      },
      {
        title: "Condición 02\nBloqueo por exceso de ciclos",
        given: "Que un equipo alcanzó su valor máximo de ciclos de uso recomendados.",
        when: "Se procesa el préstamo.",
        then: "El sistema rechaza la salida e indica necesidad urgente de mantenimiento técnico preventivo."
      },
      {
        title: "Condición 03\nEquipo conforme",
        given: "Que el activo cuenta con ciclos disponibles y calibración al día.",
        when: "Se evalúa para préstamo.",
        then: "El sistema autoriza la continuidad del flujo de entrega."
      }
    ],
    tasks: [
      "Agregar atributos usage_cycles, max_usage_cycles y last_calibration_date a la tabla assets.",
      "Implementar validador de condiciones técnicas en el servicio de aprobación de préstamos.",
      "Diseñar lógica de auto-transición a estado MAINTENANCE con registro de trazabilidad.",
      "Construir indicadores semafóricos (verde, amarillo, rojo) en la interfaz web.",
      "Pruebas unitarias de límites de ciclos y fechas de expiración de calibración."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Control técnico preventivo de calibración y ciclos"
  },
  {
    code: "HU-013",
    name: "Verificación de Custodia con Firma Digital y Token OTP",
    complexity: "Alta",
    related: "HU-007, HU-008",
    module: "Seguridad (OTP)",
    role: "Técnico de Campo (TECHNICIAN) e Inspector de Bodega (INSPECTOR)",
    require: "Validar la entrega física del activo mediante un PIN OTP de 6 dígitos que opera como firma digital de aceptación de custodia.",
    benefit: "Asegurar el principio legal de no repudio, impidiendo que un colaborador desconozca la posesión de una herramienta de alta gama.",
    requirement: "El sistema debe generar un PIN criptográfico seguro con expiración de 5 minutos, resguardar su hash BCrypt, validar en máx 3 intentos y dejar constancia en la bitácora inmutable.",
    conditions: [
      {
        title: "Condición 01\nValidación exitosa",
        given: "Que el Técnico se presenta en bodega y digita su PIN OTP vigente.",
        when: "El Inspector confirma la validación en pantalla.",
        then: "El sistema valida el hash, cambia el préstamo a ACTIVE, el activo a ON_LOAN y registra la firma digital en audit_logs."
      },
      {
        title: "Condición 02\nCódigo expirado",
        given: "Que han transcurrido más de 5 minutos desde la generación del OTP.",
        when: "Se digita el código en bodega.",
        then: "El sistema bloquea la entrega informando que el token ha caducado y solicita emitir uno nuevo."
      },
      {
        title: "Condición 03\nSuperación de intentos fallidos",
        given: "Que se digita un PIN erróneo en 3 ocasiones consecutivas.",
        when: "Se alcanza el tercer fallo.",
        then: "El sistema revoca el token definitivamente, bloquea la entrega y deja registro de incidente de seguridad."
      }
    ],
    tasks: [
      "Diseñar la tabla otp_tokens con campos pin_hash, expires_at, attempts y used.",
      "Implementar generador criptográfico con SecureRandom y hashing BCrypt con 12 rounds.",
      "Exponer mutación GraphQL validateDeliveryOtp con control de intentos y tiempo de expiración.",
      "Construir modal de captura de PIN OTP de 6 dígitos con autoenfoque y temporizador regresivo.",
      "Asegurar registro atómico en audit_logs garantizando trazabilidad y no repudio.",
      "Pruebas de validación exitosa, caducidad por tiempo y bloqueo por 3 fallos."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Criptografía y garantía legal de no repudio"
  },
  {
    code: "HU-014",
    name: "Automatización Diaria de Préstamos Vencidos (CRON)",
    complexity: "Media",
    related: "HU-008, HU-010",
    module: "Vencimientos (CRON)",
    role: "Sistema Automatizado (Spring Boot)",
    require: "Ejecutar diariamente a medianoche un proceso por lotes para detectar préstamos vencidos.",
    benefit: "Actualizar automáticamente el estado de moras sin intervención humana y generar alertas preventivas.",
    requirement: "El sistema debe configurar una tarea programada (@Scheduled, zona America/Bogota) que actualice préstamos con retorno vencido a OVERDUE e inserte registros en job_executions y audit_logs.",
    conditions: [
      {
        title: "Condición 01\nEjecución nocturna",
        given: "Que el reloj del servidor alcanza las 00:00:00 (America/Bogota).",
        when: "El planificador CRON se dispara automáticamente.",
        then: "El proceso identifica préstamos activos con expected_return_date anterior a hoy y los migra a estado OVERDUE."
      },
      {
        title: "Condición 02\nRegistro de ejecución",
        given: "Que el proceso CRON finaliza.",
        when: "Se completa el lote de registros.",
        then: "El sistema inserta en job_executions el resultado, cantidad de registros procesados y marca de tiempo."
      },
      {
        title: "Condición 03\nIdempotencia del proceso",
        given: "Que la tarea se ejecuta múltiples veces en el mismo día.",
        when: "Se corre el método programado.",
        then: "El sistema mantiene consistencia de estados sin duplicar alertas ni corromper transacciones."
      }
    ],
    tasks: [
      "Habilitar @EnableScheduling en la aplicación Spring Boot.",
      "Crear servicio OverdueLoansJob con expresión CRON '0 0 0 * * *' y zona America/Bogota.",
      "Diseñar la tabla job_executions para registrar historial de tareas automatizadas.",
      "Configurar actualización masiva atómica de préstamos vencidos a estado OVERDUE.",
      "Exponer endpoint administrativo para monitorear el estado de las ejecuciones del planificador.",
      "Pruebas simulando cambios de fecha del sistema para verificar la migración a OVERDUE."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Programación de tareas CRON e historial de ejecuciones"
  },
  {
    code: "HU-015",
    name: "Cálculo Financiero de Depreciación y Valor en Riesgo",
    complexity: "Alta",
    related: "HU-004, HU-010",
    module: "Finanzas (FIN)",
    role: "Directora de Logística (ADMIN)",
    require: "Calcular el valor contable actualizado de los activos mediante depreciación lineal y el monto total en riesgo por moras.",
    benefit: "Disponer de información financiera real para balances contables y pólizas de seguro de equipos.",
    requirement: "El sistema debe calcular depreciación basada en fecha de adquisición, vida útil en meses y valor estimado usando NUMERIC(14,2) para precisión monetaria exacta.",
    conditions: [
      {
        title: "Condición 01\nCálculo de depreciación lineal",
        given: "Que un activo tiene fecha de adquisición, vida útil de su categoría y valor de compra.",
        when: "La Administradora consulta el valor actual del activo.",
        then: "El sistema calcula el valor en libros aplicando la fórmula de línea recta y presenta el valor residual exacto."
      },
      {
        title: "Condición 02\nCálculo de valor en riesgo",
        given: "Que existen herramientas en estado OVERDUE.",
        when: "Se genera el reporte financiero de riesgos.",
        then: "El sistema suma los valores estimados de todos los activos en mora y lo presenta como 'Valor en Riesgo de Inventario'."
      },
      {
        title: "Condición 03\nPrecisión de dos decimales",
        given: "Que se ejecutan operaciones con montos monetarios.",
        when: "El sistema procesa multiplicaciones o divisiones contables.",
        then: "El sistema utiliza BigDecimal con redondeo bancario (HALF_EVEN) para evitar discrepancias de redondeo."
      }
    ],
    tasks: [
      "Modelar columnas monetarias con tipo NUMERIC(14,2) en PostgreSQL y BigDecimal en Java.",
      "Implementar servicio de cálculo de depreciación en línea recta.",
      "Exponer query GraphQL getFinancialSummary con total de inventario y valor en riesgo.",
      "Diseñar tarjetas financieras en el panel gerencial de Next.js con formato de moneda ($ COL / USD).",
      "Pruebas de cálculos con diferentes antigüedades y verificación de precisión de redondeo."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Cálculos de depreciación contable y precisión numérica"
  },
  {
    code: "HU-016",
    name: "Registro y Consulta de Calibraciones Periódicas",
    complexity: "Media",
    related: "HU-012",
    module: "Calibración (CAL)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Registrar los certificados de calibración externa emitidos por laboratorios autorizados para equipos especializados.",
    benefit: "Mantener la vigencia técnica de las herramientas y rehabilitar activos bloqueados por mantenimiento.",
    requirement: "El sistema debe registrar fecha de calibración, vigencia en días, resultado (PASS/FAIL), laboratorio y observaciones en calibration_records.",
    conditions: [
      {
        title: "Condición 01\nRegistro de calibración aprobada",
        given: "Que el Inspector recibe un equipo con certificado de calibración emitido.",
        when: "Registra el evento con resultado 'PASS' y nueva vigencia.",
        then: "El sistema actualiza last_calibration_date, resetea ciclos si aplica y habilita el activo en AVAILABLE."
      },
      {
        title: "Condición 02\nCalibración no conforme",
        given: "Que el resultado de la calibración es 'FAIL'.",
        when: "Se guarda el registro.",
        then: "El sistema retiene el equipo en MAINTENANCE e impide su asignación a préstamos."
      },
      {
        title: "Condición 03\nHistorial completo de calibraciones",
        given: "Que se consulta la ficha técnica de un equipo.",
        when: "Se accede a la pestaña de calibración.",
        then: "El sistema despliega el historial cronológico de todas las certificaciones registradas."
      }
    ],
    tasks: [
      "Diseñar la tabla calibration_records con claves foráneas a assets.",
      "Implementar mutación GraphQL registerCalibration.",
      "Construir formulario de calibración con campos de laboratorio y certificado.",
      "Vincular actualización automática de estado físico del activo tras calibración.",
      "Pruebas de reactivación de activos a estado disponible."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Trazabilidad de certificaciones y laboratorios"
  },
  {
    code: "HU-017",
    name: "Gestión de Mantenimiento Preventivo y Correctivo",
    complexity: "Media",
    related: "HU-006, HU-012",
    module: "Mantenimiento (MAN)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Gestionar el ingreso y egreso de equipos a talleres técnicos para reparación o cambio de repuestos.",
    benefit: "Restablecer la operatividad de herramientas averiadas y registrar los costos asociados.",
    requirement: "El sistema debe registrar órdenes de mantenimiento vinculadas al activo y permitir actualizar el estado operativo al finalizar el servicio técnico.",
    conditions: [
      {
        title: "Condición 01\nEnvío a mantenimiento",
        given: "Que una herramienta presenta fallas físicas o desgastes de uso.",
        when: "El Inspector registra la orden técnica de reparación.",
        then: "El equipo pasa a MAINTENANCE y queda bloqueado para cualquier préstamo."
      },
      {
        title: "Condición 02\nRetorno exitoso de taller",
        given: "Que el equipo fue reparado satisfactoriamente.",
        when: "El Inspector valida su funcionamiento y cierra la orden.",
        then: "El activo retorna a estado AVAILABLE con registro de notas técnicas en bitácora."
      },
      {
        title: "Condición 03\nEquipo no reparable",
        given: "Que el informe técnico dictamina daño irreparable.",
        when: "El Inspector o Administradora procesa la baja.",
        then: "El activo pasa a estado RETIRED y se genera registro de merma financiera."
      }
    ],
    tasks: [
      "Implementar endpoints para apertura y cierre de órdenes de servicio técnico.",
      "Integrar registro de novedades en bitácora y movimientos financieros.",
      "Construir interfaz de control de equipos en mantenimiento en Next.js.",
      "Pruebas de cambio de estado a RETIRED y AVAILABLE tras reparación."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Control de órdenes de reparación y retiro de activos"
  },
  {
    code: "HU-018",
    name: "Auditoría Inmutable de Eventos Críticos (Append-Only)",
    complexity: "Alta",
    related: "HU-010, HU-013",
    module: "Seguridad (AUD)",
    role: "Directora de Logística (ADMIN)",
    require: "Garantizar que ninguna acción sensible pueda ser eliminada o alterada en la base de datos.",
    benefit: "Cumplir con estándares internacionales de trazabilidad, transparencia y rendición de cuentas.",
    requirement: "La tabla audit_logs debe ser append-only: no se deben admitir operaciones UPDATE ni DELETE mediante restricciones o triggers en la base de datos.",
    conditions: [
      {
        title: "Condición 01\nInserción automática de evento",
        given: "Que ocurre un cambio sensible (creación de usuario, entrega OTP, cambio de estado).",
        when: "La operación culmina exitosamente.",
        then: "El sistema inserta automáticamente un registro en audit_logs con timestamp, actor, IP y payload."
      },
      {
        title: "Condición 02\nBloqueo de modificación o borrado",
        given: "Que un usuario con acceso directo intenta modificar o borrar un log.",
        when: "Ejecuta un UPDATE o DELETE en PostgreSQL.",
        then: "La base de datos bloquea la operación disparando una excepción de inmutabilidad."
      },
      {
        title: "Condición 03\nConsulta forense",
        given: "Que la Administradora requiere auditar un incidente.",
        when: "Filtra la bitácora por rango de fechas o identificador de activo.",
        then: "El sistema muestra la secuencia exacta e inalterable de todos los eventos ocurridos."
      }
    ],
    tasks: [
      "Diseñar la tabla audit_logs con restricciones de inmutabilidad en PostgreSQL.",
      "Implementar un Aspecto de Auditoría (@Aspect / AOP) en Spring Boot para intercepción automática.",
      "Exponer query protegida getAuditLogs con filtros combinados.",
      "Construir visualizador de auditoría con detalles en formato JSON legible en Next.js.",
      "Pruebas de verificación de inmutabilidad e intercepción de eventos."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Inmutabilidad append-only y aspecto AOP de auditoría"
  },
  {
    code: "HU-019",
    name: "Registro de Mermas, Daños y Pérdidas con Impacto Financiero",
    complexity: "Media",
    related: "HU-006, HU-015",
    module: "Finanzas (FIN)",
    role: "Inspector de Bodega (INSPECTOR) y Administrador (ADMIN)",
    require: "Registrar daños físicos o pérdidas de activos devueltos y cuantificar su impacto económico.",
    benefit: "Afectar contablemente el inventario y tramitar cobros o garantías de forma sustentada.",
    requirement: "El sistema debe registrar movimientos de tipo LOSS o DAMAGE en financial_movements asociados al responsable y al equipo.",
    conditions: [
      {
        title: "Condición 01\nRegistro de daño en devolución",
        given: "Que el Inspector recibe un equipo con roturas o averías.",
        when: "Registra la recepción indicando estado no conforme y monto estimado del daño.",
        then: "El sistema pasa el activo a MAINTENANCE, guarda el registro de daño y vincula al custodio."
      },
      {
        title: "Condición 02\nDeclaración de pérdida total",
        given: "Que un activo no es recuperado o fue extraviado.",
        when: "La Administradora formaliza la pérdida.",
        then: "El sistema pasa el activo a RETIRED y registra el impacto financiero total del activo."
      },
      {
        title: "Condición 03\nReporte consolidado de mermas",
        given: "Que se analiza el informe gerencial mensual.",
        when: "Se consulta la métrica de mermas.",
        then: "El sistema totaliza los costos generados por daños y pérdidas durante el periodo."
      }
    ],
    tasks: [
      "Crear tabla financial_movements con tipos LOSS, DAMAGE, DEPRECIATION.",
      "Implementar mutación GraphQL registerFinancialMovement.",
      "Integrar el formulario de novedades en la pantalla de devolución de préstamos.",
      "Mostrar el total acumulado de pérdidas en el tablero ejecutivo.",
      "Pruebas de vinculación contable y cambio de estado de activo."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Gestión contable de mermas y responsabilidades de custodia"
  },
  {
    code: "HU-020",
    name: "Panel de Control Gerencial con KPIs en Tiempo Real",
    complexity: "Alta",
    related: "HU-010, HU-015",
    module: "Dashboard (DSH)",
    role: "Directora de Logística (ADMIN)",
    require: "Visualizar un tablero interactivo con indicadores clave de rendimiento (KPIs), gráficas y métricas operativas al instante.",
    benefit: "Tomar decisiones estratégicas informadas y supervisar la operación logística en un solo vistazo.",
    requirement: "El dashboard debe calcular métricas de tasa de ocupación de equipos, activos en mora, valor en riesgo y calibraciones pendientes.",
    conditions: [
      {
        title: "Condición 01\nCarga instantánea de KPIs",
        given: "Que la Administradora inicia sesión.",
        when: "El dashboard principal se renderiza.",
        then: "El sistema despliega tarjetas interactivas con totales en tiempo real calculados por el backend."
      },
      {
        title: "Condición 02\nFiltro temporal de estadísticas",
        given: "Que se requiere comparar el rendimiento entre semanas o meses.",
        when: "Se selecciona un rango de fechas en el selector.",
        then: "Las gráficas y métricas se recalculan dinámicamente sin recargar la página completa."
      },
      {
        title: "Condición 03\nAcceso directo a acciones operativas",
        given: "Que un KPI alerta sobre préstamos en mora.",
        when: "La Administradora hace clic sobre la tarjeta de alerta.",
        then: "El sistema la redirige filtrando directamente la tabla de préstamos en mora."
      }
    ],
    tasks: [
      "Diseñar consultas analíticas optimizadas en Spring Boot.",
      "Exponer query GraphQL getDashboardKPIs.",
      "Construir componentes visuales con tarjetas de métricas en Next.js y Tailwind CSS.",
      "Integrar navegación directa desde las tarjetas de métricas a las tablas operativas.",
      "Pruebas de rendimiento garantizando tiempos de carga inferiores a 800ms."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Consolidación de KPIs ejecutivos y analítica operativa"
  },
  {
    code: "HU-021",
    name: "Notificaciones de Vencimiento de Préstamos y Calibración",
    complexity: "Media",
    related: "HU-012, HU-014",
    module: "Notificaciones (NOT)",
    role: "Técnico de Campo (TECHNICIAN) e Inspector (INSPECTOR)",
    require: "Recibir avisos y alertas preventivas en la interfaz cuando un préstamo o una calibración esté a punto de vencer.",
    benefit: "Agilizar devoluciones a tiempo y coordinar calibraciones preventivas antes del bloqueo del equipo.",
    requirement: "El sistema debe emitir alertas visuales tipo banner o toast informando cuando un activo esté a 48 horas o menos de su fecha límite.",
    conditions: [
      {
        title: "Condición 01\nAviso preventivo de devolución",
        given: "Que un Técnico tiene un préstamo con fecha de retorno en menos de 48 horas.",
        when: "Ingresa a la aplicación web.",
        then: "El sistema presenta una notificación amarilla destacando el activo y la fecha de entrega obligatoria."
      },
      {
        title: "Condición 02\nAlerta de equipo en mora",
        given: "Que la fecha de retorno ha sido superada.",
        when: "El usuario consulta su sesión.",
        then: "El sistema despliega una alerta roja persistente indicando estado de mora."
      },
      {
        title: "Condición 03\nNotificación de calibración para Inspector",
        given: "Que herramientas en bodega están a 15 días de vencimiento de calibración.",
        when: "El Inspector ingresa al módulo de inventario.",
        then: "El sistema agrupa los equipos y sugiere la programación de mantenimiento."
      }
    ],
    tasks: [
      "Implementar lógica de cálculo de proximidad de fechas en la capa de servicios.",
      "Exponer query GraphQL getPendingAlerts.",
      "Construir centro de notificaciones y alertas banner en Next.js.",
      "Pruebas de detección de ventanas temporales (48h y 15 días)."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Alertas preventivas y notificaciones en tiempo real"
  },
  {
    code: "HU-022",
    name: "Exportación de Reportes en Formato Excel y PDF",
    complexity: "Media",
    related: "HU-010",
    module: "Reportes (REP)",
    role: "Directora de Logística (ADMIN)",
    require: "Descargar los listados completos de inventario, bitácoras y préstamos en hojas de cálculo Excel (.xlsx) o documentos PDF.",
    benefit: "Compartir reportes con gerencia y entidades regulatorias en formatos ampliamente compatibles.",
    requirement: "El sistema debe generar archivos Excel/PDF estructurados con encabezados corporativos, filtros aplicados y totales calculados.",
    conditions: [
      {
        title: "Condición 01\nDescarga de reporte en Excel",
        given: "Que la Administradora filtra una consulta de inventario o préstamos.",
        when: "Hace clic en 'Exportar a Excel'.",
        then: "El sistema genera y descarga un archivo .xlsx perfectamente formateado con todas las columnas visibles."
      },
      {
        title: "Condición 02\nDescarga de reporte en PDF",
        given: "Que se requiere un comprobante formal imprimible.",
        when: "Se selecciona 'Exportar a PDF'.",
        then: "El sistema produce un PDF con membrete de GlobalNet Telecom y tablas consolidadas."
      },
      {
        title: "Condición 03\nRespeto de filtros aplicados",
        given: "Que la tabla en pantalla tiene aplicados filtros por estado o fechas.",
        when: "Se solicita la exportación.",
        then: "El archivo descargado contiene únicamente los datos que cumplen con los filtros seleccionados."
      }
    ],
    tasks: [
      "Integrar biblioteca XLSX en frontend y Apache POI en backend para generación de reportes.",
      "Implementar exportador de tablas con estilos corporativos y tipografía uniforme.",
      "Vincular botones de descarga en la cabecera de las tablas de inventario y auditoría.",
      "Pruebas de consistencia de datos entre la vista web y el archivo generado."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Exportación multiplataforma de reportes operativos"
  },
  {
    code: "HU-023",
    name: "Gestión de Ubicaciones Físicas y Categorías de Equipos",
    complexity: "Media",
    related: "HU-004",
    module: "Inventario (BOD)",
    role: "Directora de Logística (ADMIN)",
    require: "Crear y administrar las sedes/bodegas físicas (locations) y las categorías técnicas de herramientas (categories).",
    benefit: "Clasificar adecuadamente el inventario y segmentar los activos según su ubicación geográfica y familia técnica.",
    requirement: "El sistema debe permitir al rol ADMIN dar de alta sucursales y categorías con su respectiva vida útil en meses.",
    conditions: [
      {
        title: "Condición 01\nCreación de sucursal/ubicación",
        given: "Que la Administradora ingresa al catálogo de ubicaciones.",
        when: "Registra una nueva sede indicando nombre y tipo.",
        then: "El sistema persiste la ubicación y queda disponible de inmediato para asignar activos."
      },
      {
        title: "Condición 02\nCreación de categoría con vida útil",
        given: "Que se añade una nueva familia de equipos (ej. Fusionadoras de Fibra).",
        when: "Se especifica la vida útil recomendada en meses (ej. 60 meses).",
        then: "El sistema almacena la categoría y utiliza dicho valor para el cálculo automático de depreciación."
      },
      {
        title: "Condición 03\nPrevención de borrado en cascada descontrolado",
        given: "Que se intenta eliminar una categoría o ubicación que contiene activos vinculados.",
        when: "Se confirma el intento de borrado.",
        then: "El sistema impide la eliminación protegiendo la integridad referencial de los activos existentes."
      }
    ],
    tasks: [
      "Modelar las entidades Category y Location en PostgreSQL con restricciones de integridad.",
      "Implementar operaciones CRUD protegidas en Spring Boot.",
      "Construir vistas de administración de catálogos en Next.js.",
      "Pruebas de integridad referencial y validación de vida útil."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Catálogos base de bodegas y familias técnicas"
  },
  {
    code: "HU-024",
    name: "Cancelación Anticipada y Rechazo Justificado de Préstamos",
    complexity: "Media",
    related: "HU-007, HU-008",
    module: "Préstamos (PRE)",
    role: "Técnico de Campo (TECHNICIAN) e Inspector (INSPECTOR)",
    require: "Cancelar una solicitud de préstamo antes de su retiro o registrar un rechazo con justificación obligatoria.",
    benefit: "Liberar inmediatamente las herramientas reservadas para que otros compañeros puedan utilizarlas sin demoras.",
    requirement: "El sistema debe permitir la cancelación por parte del solicitante antes del retiro y exigir motivo obligatorio en caso de rechazo por el Inspector.",
    conditions: [
      {
        title: "Condición 01\nCancelación por el técnico",
        given: "Que un Técnico tiene una solicitud en estado REQUESTED o APPROVED que ya no requiere.",
        when: "Presiona el botón 'Cancelar Solicitud'.",
        then: "El sistema migra la solicitud a CANCELLED y libera el activo inmediatamente a AVAILABLE."
      },
      {
        title: "Condición 02\nRechazo con motivo obligatorio",
        given: "Que el Inspector decide rechazar una solicitud.",
        when: "Intenta enviar el rechazo sin ingresar texto en el campo motivo.",
        then: "El sistema impide el guardado exigiendo que se detalle la causa del rechazo."
      },
      {
        title: "Condición 03\nBloqueo de cancelación en préstamo activo",
        given: "Que un equipo ya fue retirado físicamente (status = ACTIVE).",
        when: "Se intenta cancelar la solicitud.",
        then: "El sistema bloquea la acción informando que un préstamo en custodia solo puede cerrarse mediante devolución formal."
      }
    ],
    tasks: [
      "Implementar mutaciones GraphQL cancelLoanRequest y rejectLoanRequest.",
      "Asegurar la liberación automática del activo asociado a AVAILABLE en una sola transacción.",
      "Diseñar botones de acción y modales de confirmación en la vista de préstamos de Next.js.",
      "Pruebas de cancelación oportuna y verificación de disponibilidad inmediata en catálogo."
    ],
    version: "2.0",
    date: "26/10/2026",
    descVersion: "Liberación inmediata de reservas y control de motivos"
  }
];

// Helper para armar tabla de cada HU exactamente como la plantilla original
function buildHuTable(hu) {
  const cWidths = [1600, 1600, 1600, 1600, 1600, 1600]; // 9600 DXA total
  const rows = [];

  // FILA 0: Encabezado Institucional
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: "SERVICIO NACIONAL DE APRENDIZAJE — SENA", font: fontName, bold: true, size: 20 })
              ]
            })
          ]
        }),
        new TableCell({
          columnSpan: 2,
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [
                new TextRun({ text: `Versión ${hu.version}`, font: fontName, size: 19 })
              ]
            })
          ]
        })
      ]
    })
  );

  // FILA 1: Encabezado HISTORIA DE USUARIO
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          shading: { fill: primaryColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "HISTORIA DE USUARIO", font: fontName, bold: true, size: 22, color: "FFFFFF" })
              ]
            })
          ]
        })
      ]
    })
  );

  // FILA 2: Código y Nombre
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: cWidths[0], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Código:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          width: { size: cWidths[1], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: hu.code, font: fontName, bold: true, size: 19, color: "0B5394" })] })]
        }),
        new TableCell({
          width: { size: cWidths[2], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 3,
          children: [new Paragraph({ children: [new TextRun({ text: hu.name, font: fontName, bold: true, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 3: Complejidad
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Complejidad:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 5,
          children: [new Paragraph({ children: [new TextRun({ text: hu.complexity, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 4: HU Relacionada
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "HU Relacionada:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 5,
          children: [new Paragraph({ children: [new TextRun({ text: hu.related, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 5: Módulo
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Módulo:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 5,
          children: [new Paragraph({ children: [new TextRun({ text: hu.module, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 6: Descripción - Yo como
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          rowSpan: 3,
          children: [new Paragraph({ children: [new TextRun({ text: "Descripción:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Yo como", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ children: [new TextRun({ text: hu.role, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 7: Descripción - Requiero
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Requiero", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ children: [new TextRun({ text: hu.require, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 8: Descripción - Para
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Para", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 4,
          children: [new Paragraph({ children: [new TextRun({ text: hu.benefit, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 9: Requerimiento
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Requerimiento:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 5,
          children: [new Paragraph({ children: [new TextRun({ text: hu.requirement, font: fontName, size: 19 })] })]
        })
      ]
    })
  );

  // FILA 10: Título CRITERIOS DE ACEPTACIÓN
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          shading: { fill: lightGray },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "CRITERIOS DE ACEPTACIÓN", font: fontName, bold: true, size: 20 })
              ]
            })
          ]
        })
      ]
    })
  );

  // FILAS CRITERIOS DE ACEPTACIÓN
  hu.conditions.forEach(cond => {
    const lines = cond.title.split("\n");
    const condTitleParagraphs = lines.map(line => new Paragraph({ children: [new TextRun({ text: line, font: fontName, bold: true, size: 18 })] }));

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            rowSpan: 3,
            children: condTitleParagraphs
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Dado:", font: fontName, bold: true, size: 18 })] })]
          }),
          new TableCell({
            columnSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: cond.given, font: fontName, size: 18 })] })]
          })
        ]
      })
    );

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Cuando:", font: fontName, bold: true, size: 18 })] })]
          }),
          new TableCell({
            columnSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: cond.when, font: fontName, size: 18 })] })]
          })
        ]
      })
    );

    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Entonces:", font: fontName, bold: true, size: 18 })] })]
          }),
          new TableCell({
            columnSpan: 4,
            children: [new Paragraph({ children: [new TextRun({ text: cond.then, font: fontName, size: 18 })] })]
          })
        ]
      })
    );
  });

  // FILA: Título TAREAS
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          shading: { fill: lightGray },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "TAREAS TÉCNICAS DE DESARROLLO", font: fontName, bold: true, size: 20 })
              ]
            })
          ]
        })
      ]
    })
  );

  // Encabezado de tareas
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: cWidths[0], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No.", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 5,
          children: [new Paragraph({ children: [new TextRun({ text: "Descripción", font: fontName, bold: true, size: 19 })] })]
        })
      ]
    })
  );

  // Filas individuales de tareas
  hu.tasks.forEach((task, idx) => {
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${idx + 1}`, font: fontName, size: 18 })] })]
          }),
          new TableCell({
            columnSpan: 5,
            children: [new Paragraph({ children: [new TextRun({ text: task, font: fontName, size: 18 })] })]
          })
        ]
      })
    );
  });

  // FILA: Título CONTROL DE VERSIONES
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          shading: { fill: lightGray },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "CONTROL DE VERSIONES", font: fontName, bold: true, size: 20 })
              ]
            })
          ]
        })
      ]
    })
  );

  // Encabezado tabla control de versiones
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          width: { size: cWidths[0], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Versión", font: fontName, bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: cWidths[1], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Fecha", font: fontName, bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: cWidths[2], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Autor", font: fontName, bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: cWidths[3], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Revisión", font: fontName, bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: cWidths[4], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Descripción", font: fontName, bold: true, size: 18 })] })]
        }),
        new TableCell({
          width: { size: cWidths[5], type: WidthType.DXA },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Aprobador", font: fontName, bold: true, size: 18 })] })]
        })
      ]
    })
  );

  // Fila de datos de control de versiones
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hu.version || "2.0", font: fontName, size: 18 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hu.date || "26/10/2026", font: fontName, size: 18 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Brayan Santiago Cuta Molina", font: fontName, size: 17 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Aprobada", font: fontName, size: 18 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: hu.descVersion, font: fontName, size: 17 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Angie Ramos", font: fontName, size: 18 })] })]
        })
      ]
    })
  );

  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    borders: tableBorders,
    rows: rows
  });
}

// Tabla de Mapeo de Usuarios y Roles Institucional
function buildActorsTable() {
  const cWidths = [1800, 2400, 1800, 3600];
  const headers = ["Nombre Completo", "Correo Corporativo", "Rol en Sistema", "Cargo Operativo / Responsabilidad"];

  const rows = [
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          shading: { fill: primaryColor },
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "MAPEO DE ACTORES Y USUARIOS AUTORIZADOS — ASSETGUARD_2620", font: fontName, bold: true, size: 21, color: "FFFFFF" })
              ]
            })
          ]
        })
      ]
    }),
    new TableRow({
      children: headers.map((h, i) => new TableCell({
        width: { size: cWidths[i], type: WidthType.DXA },
        shading: { fill: lightGray },
        children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: fontName, bold: true, size: 18 })] })]
      }))
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Angie Ramos", font: fontName, bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "admin@globalnet.com", font: fontName, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ADMIN", font: fontName, bold: true, size: 18, color: "0B5394" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Directora de Logística. Gestión global de usuarios, carga masiva transaccional, reportes ejecutivos y finanzas.", font: fontName, size: 17 })] })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ian Sanchez", font: fontName, bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "inspector@globalnet.com", font: fontName, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "INSPECTOR", font: fontName, bold: true, size: 18, color: "0B5394" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Encargado de Bodega. Control físico de inventario (HU-006), escaneo QR (<1s), aprobación/entrega con OTP y recepción.", font: fontName, size: 17 })] })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Brayan Cuta", font: fontName, bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "technician@globalnet.com", font: fontName, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "TECHNICIAN", font: fontName, bold: true, size: 18, color: "0B5394" })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Técnico Especialista de Campo. Solicitud de herramientas, firma digital OTP para custodia y autoconsulta.", font: fontName, size: 17 })] })] })
      ]
    }),
    new TableRow({
      children: [
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Brayan Santiago Cuta Molina", font: fontName, bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "santiago.cuta@globalnet.com", font: fontName, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "FULL STACK DEV", font: fontName, bold: true, size: 18 })] })] }),
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Ingeniero Desarrollador y Autor Técnico de la Arquitectura de Software AssetGuard_2620.", font: fontName, size: 17 })] })] })
      ]
    })
  ];

  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    borders: tableBorders,
    rows: rows
  });
}

// -------------------------------------------------------------
// CONSTRUCCIÓN DEL DOCUMENTO 1: HISTORIAS DE USUARIO
// -------------------------------------------------------------
async function generateHistoriasDeUsuarioDocx() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
          }
        },
        children: [
          // Portada
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "SISTEMA DE GESTIÓN Y CUSTODIA DE ACTIVOS TECNOLÓGICOS", font: fontName, bold: true, size: 28, color: "0B5394" })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "AssetGuard_2620 — GlobalNet Telecom", font: fontName, bold: true, size: 24, color: "595959" })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
              new TextRun({ text: "ESPECIFICACIÓN FORMAL DE HISTORIAS DE USUARIO (HU-001 A HU-024)", font: fontName, bold: true, size: 22 })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({ text: "Versión 2.0 | Fecha: 26 de Octubre de 2026 | Autor: Brayan Santiago Cuta Molina", font: fontName, italic: true, size: 19 })
            ]
          }),

          // Tabla de Actores
          buildActorsTable(),

          new Paragraph({ children: [new PageBreak()] }),

          // Cada una de las 24 Historias de Usuario
          ...husData.flatMap((hu, index) => [
            buildHuTable(hu),
            ...(index < husData.length - 1 ? [new Paragraph({ children: [new PageBreak()] })] : [])
          ])
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(outDir, "HISTORIAS_DE_USUARIO_ASSETGUARD_2620.docx");
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved: ${filePath} (${buffer.length} bytes)`);
}

// -------------------------------------------------------------
// CONSTRUCCIÓN DEL DOCUMENTO 2: ESPECIFICACIÓN RF Y RNF
// -------------------------------------------------------------
async function generateRequerimientosDocx() {
  const rfData = [
    { code: "RF-001", name: "Registro de Usuarios y Hashing Seguro", desc: "El sistema debe registrar cuentas de usuario con correos únicos y contraseñas protegidas con BCrypt (12 rounds).", role: "ADMIN", module: "Autenticación" },
    { code: "RF-002", name: "Autenticación y Generación de Token JWT", desc: "Validación de credenciales en PostgreSQL y emisión de token de sesión con perfil de rol correspondiente.", role: "ADMIN, INSPECTOR, TECH", module: "Autenticación" },
    { code: "RF-003", name: "Edición y Desactivación de Cuentas (Borrado Lógico)", desc: "Actualización de datos y cambio a status = INACTIVE impidiendo futuros accesos al sistema.", role: "ADMIN", module: "Autenticación" },
    { code: "RF-004", name: "Consulta Paginada de Inventario en Base de Datos", desc: "Paginación real nativa SQL con Pageable (LIMIT/OFFSET) para todos los listados de activos.", role: "ADMIN, INSPECTOR, TECH", module: "Inventario" },
    { code: "RF-005", name: "Alta Manual Individual de Activos", desc: "Registro manual de herramientas tecnológicas con validación de serial único y estado inicial AVAILABLE.", role: "ADMIN", module: "Inventario" },
    { code: "RF-006", name: "Carga Masiva Transaccional con Rollback Total", desc: "Importación de archivos Excel/CSV bajo transacción atómica estricta: ante cualquier error en una fila, reversión total.", role: "ADMIN", module: "Inventario" },
    { code: "RF-007", name: "Modificación y Control del Estado Físico de Activos (HU-006)", desc: "El sistema debe permitir al rol INSPECTOR actualizar el atributo status de un activo mediante mutación GraphQL updateAssetStatus, validando transiciones permitidas.", role: "INSPECTOR", module: "Inventario" },
    { code: "RF-008", name: "Escaneo Rápido de Códigos QR Subsegundo (< 1s)", desc: "Lectura óptica de códigos QR mediante cámara web y consulta indexada instantánea en la base de datos.", role: "INSPECTOR", module: "Inventario" },
    { code: "RF-009", name: "Bloqueo Preventivo por Calibración y Ciclos de Uso", desc: "Evaluación de ciclos máximos y días de calibración; si se exceden los límites, migración automática a MAINTENANCE.", role: "INSPECTOR, SISTEMA", module: "Calibración" },
    { code: "RF-010", name: "Solicitud Formal de Préstamo de Herramientas", desc: "Registro de peticiones con motivo y fecha de retorno sobre activos en estado disponible.", role: "TECHNICIAN", module: "Préstamos" },
    { code: "RF-011", name: "Aprobación y Formalización de Préstamos", desc: "Bandeja de autorización de salida de bodega con cambio a RESERVED y despacho de token OTP.", role: "INSPECTOR", module: "Préstamos" },
    { code: "RF-012", name: "Verificación de Custodia con Token OTP y No Repudio", desc: "Firma electrónica de retiro mediante PIN OTP de 6 dígitos (expiración 5 min, máx 3 intentos) y log inmutable.", role: "INSPECTOR, TECH", module: "Seguridad OTP" },
    { code: "RF-013", name: "Automatización Diaria Nocturna de Moras (CRON)", desc: "Tarea programada medianoche (@Scheduled, America/Bogota) que detecta préstamos vencidos y migra a OVERDUE.", role: "SISTEMA", module: "Vencimientos" },
    { code: "RF-014", name: "Autoconsulta de Custodias Personales Aisladas", desc: "Visualización exclusiva de activos bajo custodia del técnico autenticado extraído del token JWT.", role: "TECHNICIAN", module: "Historial" },
    { code: "RF-015", name: "Cálculo Financiero de Depreciación y Mermas", desc: "Depreciación contable en línea recta y cálculo del valor en riesgo por moras usando NUMERIC(14,2).", role: "ADMIN", module: "Finanzas" },
    { code: "RF-016", name: "Bitácora de Auditoría Inmutable (Append-Only)", desc: "Registro inalterable de todos los eventos críticos sin permisos de actualización ni borrado en base de datos.", role: "ADMIN", module: "Auditoría" }
  ];

  const rnfData = [
    { code: "RNF-001", category: "Rendimiento", desc: "El escaneo QR y búsqueda en base de datos debe completarse en menos de 1000 ms (< 1s) aprovechando índices B-Tree." },
    { code: "RNF-002", category: "Integridad y Atomicidad", desc: "La carga masiva y formalización OTP deben ejecutarse bajo aislamiento transaccional estricto con rollback automático." },
    { code: "RNF-003", category: "Arquitectura y Estándares", desc: "Nomenclatura relacional de PostgreSQL (tablas, columnas, restricciones) modelada 100% en estricto inglés." },
    { code: "RNF-004", category: "Seguridad Criptográfica", desc: "Contraseñas resguardadas con BCrypt (12 rounds) y tokens OTP generados con SecureRandom de alta entropía." },
    { code: "RNF-005", category: "Usabilidad y Transiciones", desc: "Interfaz web reactiva en Next.js con transiciones fluidas de página (300ms) y diseño responsivo Tailwind CSS." },
    { code: "RNF-006", category: "Escalabilidad de Consultas", desc: "Paginación real procesada en el motor PostgreSQL para evitar desbordamientos de memoria en el navegador cliente." },
    { code: "RNF-007", category: "Disponibilidad y Resiliencia", desc: "Arquitectura desacoplada backend Spring Boot y frontend Next.js capaz de operar en entornos corporativos de alta demanda." },
    { code: "RNF-008", category: "Trazabilidad y No Repudio", desc: "Bitácora de auditoría inmutable append-only que asegura el valor probatorio de cada entrega de herramientas." },
    { code: "RNF-009", category: "Concurrencia", desc: "Control de concurrencia optimista y transaccionalidad para evitar colisiones en reservas simultáneas de herramientas." },
    { code: "RNF-010", category: "Idempotencia", desc: "La tarea programada CRON diaria de medianoche debe ser estrictamente idempotente ante reejecuciones." },
    { code: "RNF-011", category: "Zona Horaria Corporativa", desc: "Todas las fechas y procesos programados deben sincronizarse con la zona horaria oficial America/Bogota (UTC-5)." },
    { code: "RNF-012", category: "Precisión Contable", desc: "Todos los montos financieros deben procesarse con tipo NUMERIC(14,2) en base de datos y BigDecimal con redondeo HALF_EVEN." }
  ];

  const reData = [
    { code: "RE-001", name: "Aislamiento Estricto de Datos por JWT", desc: "Ningún técnico puede visualizar ni consultar préstamos de otros usuarios mediante inyección de parámetros." },
    { code: "RE-002", name: "Ventana Efímera de Token OTP (5 min)", desc: "El código de formalización de retiro caduca automáticamente a los 300 segundos y se destruye tras 3 intentos fallidos." },
    { code: "RE-003", name: "Reversión Total en Cargas Masivas", desc: "Si un archivo de 1000 activos contiene 1 solo error, se revierten los 1000 sin persistencia parcial." }
  ];

  function buildRfTable() {
    const cWidths = [1200, 2400, 3600, 1200, 1200];
    const rows = [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 5,
            shading: { fill: primaryColor },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MATRIZ DE REQUERIMIENTOS FUNCIONALES (RF-001 A RF-016)", font: fontName, bold: true, size: 20, color: "FFFFFF" })] })]
          })
        ]
      }),
      new TableRow({
        children: ["Código", "Nombre del Requerimiento", "Descripción Detallada", "Rol", "Módulo"].map((h, i) => new TableCell({
          width: { size: cWidths[i], type: WidthType.DXA },
          shading: { fill: lightGray },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: fontName, bold: true, size: 18 })] })]
        }))
      }),
      ...rfData.map(rf => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rf.code, font: fontName, bold: true, size: 18, color: "0B5394" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.name, font: fontName, bold: true, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rf.desc, font: fontName, size: 17 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rf.role, font: fontName, size: 17 })] })] }),
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rf.module, font: fontName, size: 17 })] })] })
        ]
      }))
    ];

    return new Table({ width: { size: 9600, type: WidthType.DXA }, borders: tableBorders, rows: rows });
  }

  function buildRnfTable() {
    const cWidths = [1400, 2200, 6000];
    const rows = [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { fill: darkHeaderColor },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MATRIZ DE REQUERIMIENTOS NO FUNCIONALES (RNF-001 A RNF-012)", font: fontName, bold: true, size: 20, color: "FFFFFF" })] })]
          })
        ]
      }),
      new TableRow({
        children: ["Código", "Categoría / Dimensión", "Criterio Técnico de Calidad"].map((h, i) => new TableCell({
          width: { size: cWidths[i], type: WidthType.DXA },
          shading: { fill: lightGray },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: fontName, bold: true, size: 18 })] })]
        }))
      }),
      ...rnfData.map(rnf => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: rnf.code, font: fontName, bold: true, size: 18, color: "0B5394" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rnf.category, font: fontName, bold: true, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: rnf.desc, font: fontName, size: 17 })] })] })
        ]
      }))
    ];

    return new Table({ width: { size: 9600, type: WidthType.DXA }, borders: tableBorders, rows: rows });
  }

  function buildReTable() {
    const cWidths = [1400, 2600, 5600];
    const rows = [
      new TableRow({
        children: [
          new TableCell({
            columnSpan: 3,
            shading: { fill: primaryColor },
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REQUERIMIENTOS ESPECIALES DE SEGURIDAD Y CONFORMIDAD (RE-001 A RE-003)", font: fontName, bold: true, size: 20, color: "FFFFFF" })] })]
          })
        ]
      }),
      new TableRow({
        children: ["Código", "Nombre del Requerimiento Especial", "Especificación de Cumplimiento"].map((h, i) => new TableCell({
          width: { size: cWidths[i], type: WidthType.DXA },
          shading: { fill: lightGray },
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: h, font: fontName, bold: true, size: 18 })] })]
        }))
      }),
      ...reData.map(re => new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: re.code, font: fontName, bold: true, size: 18, color: "0B5394" })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: re.name, font: fontName, bold: true, size: 18 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: re.desc, font: fontName, size: 17 })] })] })
        ]
      }))
    ];

    return new Table({ width: { size: 9600, type: WidthType.DXA }, borders: tableBorders, rows: rows });
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }
          }
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 200, after: 100 },
            children: [
              new TextRun({ text: "ESPECIFICACIÓN FORMAL DE REQUERIMIENTOS DEL SISTEMA", font: fontName, bold: true, size: 28, color: "0B5394" })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "AssetGuard_2620 — GlobalNet Telecom", font: fontName, bold: true, size: 24, color: "595959" })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            children: [
              new TextRun({ text: "Versión 2.0 | Fecha: 26/10/2026 | Autor: Brayan Santiago Cuta Molina", font: fontName, italic: true, size: 19 })
            ]
          }),

          // Mapeo de Actores
          buildActorsTable(),

          new Paragraph({ spacing: { before: 300, after: 200 }, children: [new TextRun({ text: "1. Requerimientos Funcionales", font: fontName, bold: true, size: 22 })] }),
          buildRfTable(),

          new Paragraph({ children: [new PageBreak()] }),

          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "2. Requerimientos No Funcionales", font: fontName, bold: true, size: 22 })] }),
          buildRnfTable(),

          new Paragraph({ spacing: { before: 400, after: 200 }, children: [new TextRun({ text: "3. Requerimientos Especiales de Seguridad", font: fontName, bold: true, size: 22 })] }),
          buildReTable()
        ]
      }
    ]
  });

  const buffer = await Packer.toBuffer(doc);
  const filePath = path.join(outDir, "ESPECIFICACION_REQUERIMIENTOS_RF_RNF_ASSETGUARD_2620.docx");
  fs.writeFileSync(filePath, buffer);
  console.log(`Saved: ${filePath} (${buffer.length} bytes)`);
}

// -------------------------------------------------------------
// CONSTRUCCIÓN DEL DOCUMENTO 3: RÚBRICA DE EVALUACIÓN
// -------------------------------------------------------------
async function copyAndGenerateRubricaDocx() {
  const downloadRubrica = "C:/Users/maria/Downloads/RUBRICA_DE_EVALUACION_ASSETGUARD_2620.docx";
  const targetRubrica = path.join(outDir, "RUBRICA_DE_EVALUACION_ASSETGUARD_2620.docx");

  if (fs.existsSync(downloadRubrica)) {
    fs.copyFileSync(downloadRubrica, targetRubrica);
    console.log(`Copied Rubrica to: ${targetRubrica}`);
  } else {
    console.log("Downloads rubrica not found, running generation script...");
  }
}

async function main() {
  await generateHistoriasDeUsuarioDocx();
  await generateRequerimientosDocx();
  await copyAndGenerateRubricaDocx();
  console.log("All master documentation generated successfully!");
}

main().catch(console.error);
