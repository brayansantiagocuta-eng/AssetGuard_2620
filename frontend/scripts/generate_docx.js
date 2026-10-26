import fs from "node:fs";
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
  BorderStyle
} from "docx";

// Lista de las 24 Historias de Usuario:
// HU-001 a HU-015 mantienen el orden original exacto del archivo con redacción clara.
// HU-016 a HU-024 son las historias complementarias que desglosan tareas complejas.
const husData = [
  {
    code: "HU-001",
    name: "Crear Cuenta de Usuarios",
    complexity: "Media",
    related: "N/A",
    module: "Autenticación (AUT)",
    role: "ADMIN",
    require: "Registrar un nuevo usuario llenando sus datos y seleccionando su rol.",
    benefit: "Dar de alta a los empleados y asegurarme de que cada uno tenga los permisos correctos en el sistema.",
    requirement: "El sistema debe permitir al Administrador registrar usuarios nuevos mediante un formulario validado, verificando que el correo electrónico sea único y resguardando la contraseña de forma protegida.",
    conditions: [
      {
        title: "Condición 01\nCreación exitosa",
        given: "Que el Administrador está en la sección de usuarios.",
        when: "Ingresa los datos del nuevo usuario (nombre, correo único, contraseña y elige un rol válido).",
        then: "El sistema guarda la cuenta de forma segura y muestra un mensaje de éxito."
      },
      {
        title: "Condición 02\nCorreo duplicado",
        given: "Que el Administrador intenta registrar un usuario.",
        when: "Usa un correo electrónico que ya está registrado en la base de datos.",
        then: "El sistema bloquea el registro y avisa que el correo ya existe."
      },
      {
        title: "Condición 03\nControl de permisos",
        given: "Que un usuario que no es Administrador intenta crear una cuenta.",
        when: "Intenta enviar los datos de registro.",
        then: "El sistema rechaza la acción por falta de permisos."
      }
    ],
    tasks: [
      "Crear la tabla y el modelo de datos para los usuarios en la base de datos.",
      "Programar la lógica del sistema para proteger contraseñas y registrar usuarios.",
      "Configurar la función de registro de cuentas restringida al Administrador.",
      "Diseñar el formulario de registro en la interfaz de usuario con validaciones.",
      "Conectar el formulario de pantalla con el servicio central del sistema.",
      "Realizar pruebas para verificar que el registro funcione correctamente y bloquee correos repetidos."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "Creación de la HU para la creación de cuentas"
  },
  {
    code: "HU-002",
    name: "Iniciar Sesión y Autenticación",
    complexity: "Media",
    related: "HU-001",
    module: "Autenticación (AUT)",
    role: "Usuario del sistema ADMIN, INSPECTOR o TECHNICIAN",
    require: "Ingresar mi correo electrónico y contraseña en la pantalla de inicio de sesión.",
    benefit: "Acceder a la plataforma con las opciones y permisos que corresponden a mi rol.",
    requirement: "El sistema debe validar las credenciales del usuario en la base de datos, generar un comprobante de autenticación seguro y permitir la entrada al aplicativo habilitando solo las pantallas autorizadas según su rol (ADMIN, INSPECTOR, TECHNICIAN).",
    conditions: [
      {
        title: "Condición 01\nInicio de sesión exitoso",
        given: "Que el usuario está en la pantalla de Login.",
        when: "Ingresa un correo y una contraseña correctos registrados en el sistema.",
        then: "El sistema valida sus credenciales, otorga el acceso y lo redirige automáticamente a su panel principal según su rol."
      },
      {
        title: "Condición 02\nCredenciales incorrectas",
        given: "Que el usuario está en la pantalla de Login.",
        when: "Ingresa un correo no registrado o una contraseña errónea.",
        then: "El sistema impide el ingreso y muestra un mensaje claro indicando 'Correo o contraseña incorrectos'."
      },
      {
        title: "Condición 03\nProtección de rutas según el rol",
        given: "Que un usuario de tipo TECHNICIAN o INSPECTOR ha iniciado sesión.",
        when: "Intenta acceder mediante la URL a una pantalla exclusiva de Administrador.",
        then: "El sistema lo bloquea mediante guardias de navegación y lo redirige a su pantalla autorizada."
      }
    ],
    tasks: [
      "Implementar en el sistema la lógica de verificación de contraseñas seguras y generación de la sesión.",
      "Habilitar la función de inicio de sesión para recibir credenciales y retornar la sesión y rol del usuario.",
      "Crear la pantalla de inicio de sesión con controles de acceso y validación de campos.",
      "Configurar la aplicación para guardar la sesión y enviarla en cada petición de datos.",
      "Implementar guardias de navegación para proteger las rutas privadas de la aplicación según el rol.",
      "Probar los flujos de ingreso correcto, credenciales erróneas y redirecciones según el rol."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "Creación de la HU para inicio de sesión y autenticación por roles"
  },
  {
    code: "HU-003",
    name: "Edición y Desactivación de Usuarios",
    complexity: "Media",
    related: "HU-001",
    module: "Autenticación (AUT)",
    role: "Director de Logística (ADMIN)",
    require: "Modificar la información de un usuario registrado (nombre, rol) o cambiar su estado (activo/inactivo).",
    benefit: "Mantener actualizada la información del personal y revocar el acceso a la plataforma a usuarios que ya no laboren en la empresa.",
    requirement: "El sistema debe permitir únicamente al Administrador actualizar los campos editables del usuario y modificar su estado, reflejando de inmediato los cambios en la base de datos.",
    conditions: [
      {
        title: "Condición 01\nEdición exitosa de datos",
        given: "Que el Administrador se encuentra en la vista de detalle de un usuario.",
        when: "Modifica su nombre completo o le asigna un nuevo rol (ADMIN, INSPECTOR, TECHNICIAN) y guarda los cambios.",
        then: "El sistema actualiza los registros en la base de datos y muestra un mensaje confirmando la modificación."
      },
      {
        title: "Condición 02\nDesactivación de un usuario",
        given: "Que el Administrador selecciona un usuario activo.",
        when: "Cambia el estado del usuario a inactivo.",
        then: "El sistema guarda el nuevo estado y bloquea automáticamente cualquier intento futuro de inicio de sesión de ese usuario."
      },
      {
        title: "Condición 03\nRestricción para otros roles",
        given: "Que un usuario con rol INSPECTOR o TECHNICIAN intenta editar o desactivar a otro usuario.",
        when: "Intenta ejecutar la acción de actualización.",
        then: "El sistema bloquea la operación y retorna un mensaje de permisos insuficientes."
      }
    ],
    tasks: [
      "Implementar en la capa de servicios los métodos para actualización y cambio de estado de usuario.",
      "Exponer la función de actualización protegida con verificación de rol ADMIN.",
      "Diseñar la interfaz de edición y el botón de activación/desactivación en el panel de gestión.",
      "Conectar los componentes visuales con la función de actualización de datos.",
      "Ajustar la lógica de inicio de sesión para validar que solo usuarios con estado activo puedan ingresar.",
      "Realizar pruebas para verificar que un usuario desactivado ya no pueda autenticarse."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "Creación de la HU para edición y desactivación de usuarios"
  },
  {
    code: "HU-004",
    name: "Registro Manual y Consulta Paginada de Equipos Tecnológicos",
    complexity: "Alta",
    related: "N/A",
    module: "Inventario (BOD)",
    role: "Administrador (ADMIN) o Inspector de Bodega (INSPECTOR)",
    require: "Registrar equipos tecnológicos de alta gama de forma manual (solo Admin) y consultar el inventario completo mediante listados paginados desde la base de datos.",
    benefit: "Mantener un control riguroso del inventario físico y evitar la sobrecarga de datos en las interfaces del sistema.",
    requirement: "El sistema debe procesar paginación real a nivel de consulta en la base de datos para todos los listados de equipos, validando restricciones de unicidad en el número de serie y asegurando el control de acceso por roles.",
    conditions: [
      {
        title: "Condición 01\nConsulta paginada exitosa de activos",
        given: "Que el usuario se encuentra autenticado en el módulo de inventario de bodega.",
        when: "Solicita una página específica de equipos indicando el número de página y la cantidad de elementos por página (ej. 10 registros).",
        then: "El sistema ejecuta una consulta optimizada con paginación real y retorna un subconjunto exacto de equipos junto con los metadatos de paginación."
      },
      {
        title: "Condición 02\nRegistro manual de activo (Rol ADMIN)",
        given: "Que el usuario con rol ADMIN accede al formulario de creación de un nuevo activo de alta gama.",
        when: "Ingresa los datos obligatorios (número de serie único, modelo, valor estimado, fecha de adquisición y estado inicial) y guarda.",
        then: "El sistema valida que el número de serie no exista previamente, almacena el equipo con estado 'Disponible' y emite una confirmación de éxito."
      },
      {
        title: "Condición 03\nValidación de número de serie duplicado",
        given: "Que el Administrador intenta registrar un equipo de forma manual.",
        when: "Introduce un número de serie que ya se encuentra registrado en el sistema.",
        then: "El sistema cancela la inserción en la base de datos y arroja un error controlado indicando que el activo ya está inventariado."
      },
      {
        title: "Condición 04\nRestricción operativa para Inspectores y Técnicos",
        given: "Que un usuario con rol INSPECTOR o TECHNICIAN intenta registrar un nuevo activo.",
        when: "Ejecuta la acción de creación de activos.",
        then: "El sistema bloquea la operación por falta de privilegios correspondientes a su rol."
      }
    ],
    tasks: [
      "Diseñar y configurar la entidad y modelo de datos mapeada a la tabla de activos con sus restricciones.",
      "Implementar la lógica de paginación a nivel de repositorio y servicios centrales utilizando paginación nativa.",
      "Exponer las funciones para el listado paginado y la operación para el alta individual de equipos.",
      "Desarrollar los componentes de interfaz para la visualización tabular del inventario y los controles dinámicos de paginación.",
      "Programar el formulario de alta manual de activos asegurando validaciones de campos obligatorios en tiempo real.",
      "Ejecutar pruebas unitarias y de integración para validar el funcionamiento del paginador y el bloqueo de duplicados."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para consulta paginada y alta manual de activos"
  },
  {
    code: "HU-005",
    name: "Carga Masiva Transaccional de Activos vía Archivo Excel o CSV",
    complexity: "Alta",
    related: "HU-004",
    module: "Inventario (BOD)",
    role: "Administrador (ADMIN)",
    require: "Subir un archivo masivo en formato Excel o CSV con el inventario de herramientas críticas de alta tecnología.",
    benefit: "Realizar altas masivas de activos de forma rápida y automatizada, evitando la captura manual elemento por elemento.",
    requirement: "El sistema debe procesar el registro fila por fila bajo un esquema de transaccionalidad completa, asegurando un rollback total de la base de datos si se detecta una sola fila corrupta o un error de almacenamiento.",
    conditions: [
      {
        title: "Condición 01\nCarga masiva exitosa sin errores",
        given: "Que el Administrador selecciona un archivo Excel/CSV con datos correctos y estructurados de nuevos equipos.",
        when: "Carga el archivo a través de la interfaz y ejecuta la importación masiva.",
        then: "El sistema procesa todas las filas, valida que no existan duplicados, inserta los registros en la base de datos y retorna un reporte con el total de activos creados exitosamente."
      },
      {
        title: "Condición 02\nRollback total ante una fila corrupta o duplicada",
        given: "Que el Administrador carga un archivo donde una o varias filas contienen errores de formato, campos vacíos o números de serie ya existentes.",
        when: "El motor ejecuta el procesamiento masivo de datos.",
        then: "El sistema identifica la anomalía, aborta la transacción completa aplicando un rollback estricto (sin guardar ninguna fila del lote) y devuelve una alerta con la fila exacta del fallo."
      },
      {
        title: "Condición 03\nRestricción absoluta por roles",
        given: "Que un usuario con perfil INSPECTOR o TECHNICIAN intenta acceder a la funcionalidad de carga masiva.",
        when: "Intenta enviar un archivo o invocar la función correspondiente.",
        then: "El sistema deniega el acceso de forma estricta por medio de las políticas de seguridad del sistema."
      }
    ],
    tasks: [
      "Desarrollar el lector de archivos para leer y mapear las filas del archivo Excel y CSV.",
      "Implementar la lógica de validación exhaustiva fila por fila aplicando control transaccional estricto con reversión automática.",
      "Exponer la función encargada de recibir el lote de datos asegurando la restricción al rol ADMIN.",
      "Diseñar el componente interactivo con zona de arrastre (drag-and-drop) y retroalimentación de estados de carga.",
      "Desarrollar el manejo de respuestas para mostrar claramente los mensajes de éxito o las alertas específicas en caso de reversión.",
      "Realizar pruebas exhaustivas simulando archivos limpios y archivos con errores intencionales."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para carga masiva transaccional con validación de filas"
  },
  {
    code: "HU-006",
    name: "Modificación y Control del Estado Físico de Activos",
    complexity: "Media",
    related: "HU-004",
    module: "Inventario (BOD)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Modificar el estado físico de los equipos tecnológicos (disponible, en préstamo, mantenimiento).",
    benefit: "Reflejar en tiempo real la disponibilidad operativa de las herramientas y controlar qué dispositivos requieren revisión técnica o están fuera de servicio.",
    requirement: "El sistema debe permitir al rol INSPECTOR actualizar el estado de un activo específico validando las transiciones de estado permitidas y restringiendo esta acción para perfiles no autorizados.",
    conditions: [
      {
        title: "Condición 01\nActualización exitosa a mantenimiento o disponible",
        given: "Que el Inspector de Bodega se encuentra autenticado y visualiza el detalle de un equipo en la sucursal.",
        when: "Selecciona un activo y cambia su estado físico a 'En mantenimiento' o 'Disponible' guardando los cambios.",
        then: "El sistema actualiza el registro en la base de datos y muestra un aviso de confirmación exitosa."
      },
      {
        title: "Condición 02\nRestricción de cambio a estado 'En préstamo' manual",
        given: "Que el Inspector intenta cambiar manualmente el estado de un equipo a 'En préstamo'.",
        when: "Intenta forzar el estado sin una solicitud de préstamo aprobada.",
        then: "El sistema bloquea la acción indicando que los estados de préstamo se gestionan automáticamente a través del módulo de solicitudes."
      },
      {
        title: "Condición 03\nBloqueo de permisos para Técnicos",
        given: "Que un usuario con rol TECHNICIAN intenta modificar el estado físico de un equipo.",
        when: "Envía la petición de actualización de estado.",
        then: "El sistema rechaza la operación por falta de privilegios."
      }
    ],
    tasks: [
      "Programar la lógica de negocio para validar las reglas de transición de estados de los activos.",
      "Exponer la función de actualización de estado restringida exclusivamente a los roles ADMIN e INSPECTOR.",
      "Diseñar el componente con los selectores de estado interactivos para el panel del inspector.",
      "Conectar la interfaz de usuario para refrescar la tabla de inventario en tiempo real tras la actualización.",
      "Implementar pruebas para verificar que los técnicos no puedan alterar los estados de los equipos."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para el control y modificación del estado físico de equipos"
  },
  {
    code: "HU-007",
    name: "Creación de Solicitud de Préstamo de Herramientas",
    complexity: "Alta",
    related: "HU-006",
    module: "Préstamos (PRE)",
    role: "Técnico de Campo (TECHNICIAN)",
    require: "Realizar peticiones formales de préstamo para herramientas de alta gama que se encuentren con estado disponible.",
    benefit: "Solicitar la custodia temporal de los equipos necesarios para ejecutar las labores técnicas en terreno.",
    requirement: "El sistema debe permitir al rol TECHNICIAN registrar una solicitud de préstamo vinculando su usuario con herramientas disponibles, asegurando que no se puedan solicitar equipos ocupados o en mantenimiento.",
    conditions: [
      {
        title: "Condición 01\nCreación exitosa de la solicitud de préstamo",
        given: "Que el técnico está autenticado y consulta el catálogo de equipos con estado 'Disponible'.",
        when: "Selecciona un activo y envía una petición formal de préstamo especificando motivo y fecha estimada.",
        then: "El sistema registra la solicitud en el módulo de préstamos con un estado inicial 'Pendiente' y la vincula al usuario del técnico."
      },
      {
        title: "Condición 02\nIntento de solicitar equipo no disponible",
        given: "Que el técnico intenta solicitar un equipo cuyo estado actual es 'En préstamo' o 'En mantenimiento'.",
        when: "Intenta adjuntarlo a su solicitud de préstamo.",
        then: "El sistema rechaza la selección y muestra una alerta informando que el activo no se encuentra disponible para préstamo."
      },
      {
        title: "Condición 03\nRestricción para roles administrativos en la solicitud",
        given: "Que un usuario con rol ADMIN o INSPECTOR intenta realizar una autocaptura de préstamo como si fuera técnico.",
        when: "Intenta ejecutar la función de solicitud de préstamo de campo.",
        then: "El sistema deniega la acción por no corresponder a las funciones de su perfil operativo."
      }
    ],
    tasks: [
      "Diseñar y crear la entidad relacional en la base de datos para gestionar los préstamos relacionando usuarios y activos.",
      "Implementar la lógica de negocio para verificar la disponibilidad del activo antes de permitir la creación de la solicitud.",
      "Exponer la función de solicitud de préstamo protegida para el rol TECHNICIAN.",
      "Desarrollar la vista donde el técnico puede filtrar equipos disponibles y enviar su solicitud de préstamo.",
      "Configurar las validaciones del formulario en la pantalla para impedir seleccionar equipos no aptos.",
      "Ejecutar pruebas de integración para validar la correcta asignación de relaciones en la base de datos."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para la solicitud formal de préstamos por parte de técnicos"
  },
  {
    code: "HU-008",
    name: "Gestión de Aprobación, Rechazo y Devolución Física de Herramientas",
    complexity: "Alta",
    related: "HU-007",
    module: "Préstamos (PRE)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Aprobar o rechazar las solicitudes de préstamo enviadas por los técnicos y registrar la devolución física de los equipos al finalizar la custodia.",
    benefit: "Controlar la salida y el retorno de los activos de alto valor, asegurando que ningún equipo sea entregado sin autorización y actualizando automáticamente su disponibilidad en la bodega.",
    requirement: "El sistema debe permitir al rol INSPECTOR procesar las solicitudes pendientes, modificando de forma transaccional el estado del préstamo y cambiando el estado del activo asociado según corresponda.",
    conditions: [
      {
        title: "Condición 01\nAprobación exitosa de la solicitud de préstamo",
        given: "Que el Inspector visualiza una solicitud de préstamo en estado 'Pendiente'.",
        when: "Selecciona la opción de aprobar la solicitud.",
        then: "El sistema cambia el estado del préstamo a 'Aprobado', actualiza el estado del equipo vinculado a 'Reservado' y habilita el retiro."
      },
      {
        title: "Condición 02\nRechazo de la solicitud de préstamo",
        given: "Que el Inspector revisa una solicitud de préstamo pendiente.",
        when: "Decide rechazarla (por falta de stock o justificación inválida).",
        then: "El sistema actualiza el estado del préstamo a 'Rechazado' y el equipo mantiene su estado físico como 'Disponible' para otros usuarios."
      },
      {
        title: "Condición 03\nRegistro de devolución física del equipo",
        given: "Que un técnico entrega físicamente un equipo que tenía en custodia.",
        when: "El Inspector registra la recepción y devolución en el sistema.",
        then: "El sistema marca el préstamo como 'Devuelto' y restituye el estado físico del activo a 'Disponible'."
      },
      {
        title: "Condición 04\nBloqueo de operaciones para Técnicos",
        given: "Que un usuario con rol TECHNICIAN intenta aprobar o rechazar solicitudes de préstamos ajenos.",
        when: "Ejecuta la función de gestión de préstamos.",
        then: "El sistema deniega la ejecución por falta de privilegios."
      }
    ],
    tasks: [
      "Programar la lógica de transacciones para actualizar simultáneamente el estado del préstamo y el estado físico del activo.",
      "Exponer las funciones para aprobar, rechazar y registrar devoluciones de préstamos, restringidas a los roles autorizados.",
      "Desarrollar los componentes de interfaz para que el inspector gestione la bandeja de solicitudes entrantes y el registro de retornos.",
      "Conectar los botones de acción (Aprobar, Rechazar, Devolver) con los servicios centrales del sistema.",
      "Implementar pruebas de integración para verificar la consistencia de los datos al cambiar los estados de los equipos y préstamos."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para la aprobación, rechazo y devolución de préstamos"
  },
  {
    code: "HU-009",
    name: "Autoconsulta de Historial Personal de Custodias (Técnico)",
    complexity: "Media",
    related: "HU-007",
    module: "Reportes y Auditoría (REP)",
    role: "Técnico de Campo (TECHNICIAN)",
    require: "Visualizar mi historial personal de custodias activas y finalizadas (herramientas asignadas o que tuve en el pasado).",
    benefit: "Llevar un control transparente de las herramientas bajo mi responsabilidad y auditar mis propios movimientos ante cualquier revisión operativa.",
    requirement: "El sistema debe permitir al rol TECHNICIAN consultar únicamente sus propias transacciones de préstamo filtrado por su usuario autenticado a nivel de base de datos, garantizando la privacidad de los datos frente a otros técnicos.",
    conditions: [
      {
        title: "Condición 01\nVisualización correcta del historial personal",
        given: "Que el técnico se encuentra autenticado en el sistema.",
        when: "Ingresa a su sección de autoconsulta de custodias.",
        then: "El sistema muestra una lista con los equipos que tiene actualmente en custodia activa y el histórico de los préstamos ya devueltos en pestañas separadas."
      },
      {
        title: "Condición 02\nAislamiento de datos entre técnicos",
        given: "Que un técnico realiza una consulta de su historial de préstamos.",
        when: "El sistema procesa la petición.",
        then: "El sistema inyecta automáticamente la identidad de su sesión para retornar exclusivamente los registros de ese usuario, impidiendo ver herramientas de otros compañeros."
      },
      {
        title: "Condición 03\nRestricción de acceso para usuarios no técnicos",
        given: "Que los roles ADMIN e INSPECTOR también pueden consultar historiales generales.",
        when: "Un técnico accede a esta vista de autoconsulta.",
        then: "Solo visualiza su propia información de autoconsulta delimitada por sus permisos específicos."
      }
    ],
    tasks: [
      "Implementar la consulta optimizada para filtrar los préstamos y custodias asociadas al usuario autenticado en la base de datos.",
      "Exponer la consulta segura que extraiga la identidad del usuario desde la sesión de acceso.",
      "Diseñar la interfaz de usuario con pestañas para separar custodias activas e historiales finalizados del técnico.",
      "Conectar el componente de pantalla asegurando una visualización limpia y responsiva.",
      "Realizar pruebas de seguridad para comprobar que un técnico no pueda acceder al historial de otro usuario alterando parámetros."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para la autoconsulta del historial de custodias del técnico"
  },
  {
    code: "HU-010",
    name: "Visualización de Reportes Globales de Pérdidas, Mermas y Auditoría",
    complexity: "Alta",
    related: "HU-008, HU-009",
    module: "Reportes y Auditoría (REP)",
    role: "Director de Logística (ADMIN)",
    require: "Visualizar reportes globales de pérdidas o mermas de equipos de alta tecnología y auditar los registros históricos completos de custodia.",
    benefit: "Tomar decisiones financieras informadas, deslindar responsabilidades legales u operativas ante extravíos y supervisar el comportamiento del inventario en todas las sucursales.",
    requirement: "El sistema debe procesar consultas y métricas consolidadas a nivel global mediante funciones agregadas en la base de datos, permitiendo al rol ADMIN auditar movimientos históricos y filtrar reportes de mermas con total seguridad.",
    conditions: [
      {
        title: "Condición 01\nGeneración de reportes globales de pérdidas",
        given: "Que el Administrador se encuentra en el módulo de reportes y auditoría del sistema.",
        when: "Selecciona un rango de fechas o filtros específicos para consultar mermas, equipos extraviados o con retrasos críticos en devoluciones.",
        then: "El sistema procesa la consulta y genera un reporte consolidado con el valor estimado de pérdidas y el listado de equipos involucrados."
      },
      {
        title: "Condición 02\nAuditoría completa de registros de custodia",
        given: "Que el Administrador requiere rastrear el historial operativo de un equipo o técnico en particular.",
        when: "Solicita la auditoría global de movimientos en la plataforma.",
        then: "El sistema despliega un registro cronológico auditable con todos los cambios de estado, asignaciones, préstamos y devoluciones asociadas."
      },
      {
        title: "Condición 03\nRestricción de acceso a reportes gerenciales",
        given: "Que un usuario con rol INSPECTOR o TECHNICIAN intenta acceder a los reportes globales de pérdidas o auditorías gerenciales.",
        when: "Intenta ejecutar la consulta correspondiente.",
        then: "El sistema bloquea el acceso de inmediato debido a las restricciones de seguridad de su perfil."
      }
    ],
    tasks: [
      "Programar las consultas agregadas y optimizadas para calcular métricas de mermas, pérdidas financieras y auditoría de custodias.",
      "Exponer las consultas de reportes gerenciales globales protegiéndolas de forma exclusiva para el rol ADMIN.",
      "Desarrollar las vistas de gráficos y tablas de reportes utilizando componentes visuales adaptados para el análisis gerencial.",
      "Conectar los filtros de fecha y sucursal de la pantalla con las consultas del servidor.",
      "Realizar pruebas de rendimiento y seguridad para asegurar que la generación de reportes masivos no afecte la velocidad general de la plataforma."
    ],
    version: "1.0",
    date: "14/10/2026",
    descVersion: "HU para reportes globales de pérdidas, mermas y auditoría"
  },
  {
    code: "HU-011",
    name: "Escaneo y Verificación Rápida de Activos mediante Código QR",
    complexity: "Media",
    related: "HU-004, HU-008",
    module: "Escaneo QR (QR)",
    role: "INSPECTOR (Encargado de Bodega)",
    require: "Escanear el código QR grabado en las herramientas tecnológicas utilizando la cámara del dispositivo en la interfaz web.",
    benefit: "Agilizar las operaciones de entrega y recepción en bodega eliminando errores humanos de digitación manual del número de serie.",
    requirement: "El sistema debe integrar la lectura de cámara desde el navegador, decodificar el identificador QR mapeado al número de serie y cargar la información del equipo en menos de 1 segundo, gestionando el ciclo de la cámara y aplicando una pausa de 2 segundos contra lecturas duplicadas.",
    conditions: [
      {
        title: "Condición 01\nLectura exitosa de QR",
        given: "Que el Inspector se encuentra en la vista de control de bodega.",
        when: "Escanea un código QR válido impreso en un activo.",
        then: "El sistema reconoce instantáneamente el número de serie, consulta sus datos y despliega la ficha del equipo en menos de 1 segundo."
      },
      {
        title: "Condición 02\nQR no registrado en sistema",
        given: "Que el Inspector escanea un código QR no inventariado en la base de datos.",
        when: "El sistema procesa el código.",
        then: "El sistema muestra una alerta clara indicando 'Activo no registrado en el inventario'."
      },
      {
        title: "Condición 03\nPermiso de cámara denegado",
        given: "Que el navegador no tiene acceso a la cámara o el usuario niega el permiso.",
        when: "El Inspector abre el módulo de escaneo.",
        then: "El sistema informa la situación y habilita la entrada manual del número de serie como método alternativo."
      },
      {
        title: "Condición 04\nLectura duplicada o ilegible",
        given: "Que el mismo QR permanece frente a la cámara o la imagen es capturada continuamente.",
        when: "El decodificador captura el mismo contenido varias veces.",
        then: "El sistema bloquea lecturas repetidas durante 2 segundos y no dispara consultas adicionales."
      }
    ],
    tasks: [
      "Instalar e integrar la librería de escaneo QR compatible con la cámara del navegador web.",
      "Crear el componente visual con control de cámara y liberación de recursos al cerrar la pantalla.",
      "Implementar el servicio que mapea el texto decodificado al número de serie y ejecuta la consulta del equipo.",
      "Añadir un control de pausa de 2 segundos y bloqueo de lecturas repetidas.",
      "Diseñar la entrada manual de respaldo y el manejo de errores (permiso denegado, cámara ocupada, QR no registrado).",
      "Probar el rendimiento de lectura del escáner en dispositivos móviles y de escritorio, verificando tiempo menor a 1 segundo."
    ],
    version: "2.0",
    date: "19/10/2026",
    descVersion: "Control de lecturas duplicadas, mapeo a serial_number y tiempo sub-segundo"
  },
  {
    code: "HU-012",
    name: "Bloqueo y Control Preventivo por Calibración y Ciclos de Uso",
    complexity: "Alta",
    related: "HU-006, HU-008",
    module: "Calibración (CAL)",
    role: "INSPECTOR (Encargado de Bodega)",
    require: "Recibir bloqueos automáticos al intentar prestar equipos cuyo periodo de calibración o límite de ciclos de uso se encuentre vencido.",
    benefit: "Prevenir fallas técnicas en terreno y asegurar que los equipos de alta gama cumplan con los estándares de fábrica.",
    requirement: "El sistema debe validar los atributos de uso y la fecha de mantenimiento de los activos antes de permitir la aprobación de un préstamo; si los ciclos superan el tope o la fecha límite caducó, bloquea el préstamo, pasa el activo a Mantenimiento y registra la alerta técnica.",
    conditions: [
      {
        title: "Condición 01\nAprobación rechazada por calibración vencida",
        given: "Que una herramienta supera los ciclos de uso o la fecha límite de calibración.",
        when: "El Inspector intenta aprobar una solicitud de préstamo sobre ese equipo.",
        then: "El sistema rechaza la transacción, emite el mensaje 'Equipo en Mantenimiento Preventivo Requerido' y actualiza su estado a Mantenimiento."
      },
      {
        title: "Condición 02\nCalibración vigente permite el préstamo",
        given: "Que un equipo se encuentra dentro de sus parámetros operativos normales.",
        when: "El Inspector procesa el préstamo.",
        then: "La validación aprueba la operación sin interrupciones y el flujo continúa hacia la entrega."
      },
      {
        title: "Condición 03\nLímite de ciclos de uso alcanzado",
        given: "Que un equipo alcanza su número máximo de ciclos de uso, aunque su fecha siga vigente.",
        when: "El Inspector intenta aprobar el préstamo.",
        then: "El sistema bloquea la operación, indica el motivo 'Límite de ciclos de uso alcanzado' y pasa el activo a Mantenimiento."
      },
      {
        title: "Condición 04\nRegistro de mantenimiento reinicia el control",
        given: "Que el equipo en Mantenimiento recibe el servicio y se registra una nueva calibración.",
        when: "El Inspector guarda el registro de calibración.",
        then: "El sistema actualiza la fecha, reinicia los ciclos de uso a cero y devuelve el activo a 'Disponible'."
      }
    ],
    tasks: [
      "Agregar al modelo de datos de activos los campos de control de calibración y ciclos de uso.",
      "Programar el servicio de validación de estado técnico previo a la autorización de préstamos.",
      "Implementar el cambio automático de estado a Mantenimiento y la escritura en el historial técnico.",
      "Exponer la consulta de estado de calibración con el semáforo visual por activo.",
      "Diseñar en la interfaz las alertas visuales de advertencia en el panel de inventario.",
      "Implementar el registro de mantenimiento que reinicia ciclos y recalcula la próxima fecha de calibración.",
      "Probar los escenarios de calibración vencida, calibración vigente, límite de ciclos y reinicio por mantenimiento."
    ],
    version: "2.0",
    date: "19/10/2026",
    descVersion: "Actualización de campos de control técnico, máquina de estados y semáforo visual"
  },
  {
    code: "HU-013",
    name: "Verificación de Custodia mediante Código OTP de Seguridad",
    complexity: "Alta",
    related: "HU-007, HU-008",
    module: "Seguridad OTP (OTP)",
    role: "ADMIN (Director de Logística)",
    require: "Exigir una confirmación mediante código de un solo uso (OTP/PIN de 6 dígitos) aceptado por el Técnico al recibir un equipo en bodega.",
    benefit: "Garantizar el no repudio, asegurando la responsabilidad legal e individual sobre herramientas de alto valor económico.",
    requirement: "El sistema debe generar un código PIN temporal de 6 dígitos con generador seguro asociado a la solicitud, almacenando su valor protegido con una vigencia de 5 minutos, máximo 3 intentos y uso único; la entrega física solo se formaliza a estado Activo cuando el código es validado exitosamente.",
    conditions: [
      {
        title: "Condición 01\nValidación exitosa del OTP",
        given: "Que el Inspector inicia la entrega del equipo en bodega.",
        when: "El Técnico digita correctamente su PIN OTP recibido en su panel.",
        then: "El sistema formaliza el préstamo a 'Activo', cambia el activo a 'En Préstamo' e inserta la firma digital en la bitácora de auditoría."
      },
      {
        title: "Condición 02\nPIN incorrecto o expirado",
        given: "Que se ingresa un PIN erróneo o fuera del tiempo de vigencia.",
        when: "Se intenta confirmar la entrega.",
        then: "El sistema cancela la confirmación, mantiene el activo retenido en bodega y contabiliza el intento fallido."
      },
      {
        title: "Condición 03\nLímite de intentos y reenvío",
        given: "Que el Técnico agotó los 3 intentos permitidos o requiere un nuevo código.",
        when: "Solicita el reenvío del OTP.",
        then: "El sistema invalida el código anterior, genera uno nuevo tras el tiempo de espera definido y reinicia el contador de intentos."
      },
      {
        title: "Condición 04\nUso único del OTP",
        given: "Que un OTP ya fue consumido correctamente en una entrega.",
        when: "Se intenta reutilizar el mismo código.",
        then: "El sistema rechaza la validación por OTP ya consumido y no altera el estado del préstamo."
      }
    ],
    tasks: [
      "Implementar el servicio de generación de OTP con algoritmo aleatorio seguro y expiración controlada.",
      "Persistir el valor protegido del PIN con vigencia, intentos y marca de consumo.",
      "Exponer la función de validación de código con validación de vigencia, intentos y uso único.",
      "Formalizar la entrega atómica (préstamo Activo y activo En Préstamo) e insertar la firma en auditoría.",
      "Crear en la pantalla el componente modal de ingreso del PIN con temporizador de cuenta regresiva.",
      "Implementar el reenvío del OTP con límite de intentos y control de espera.",
      "Registrar y probar los escenarios de PIN válido, incorrecto, expirado, reutilizado y bloqueo por intentos."
    ],
    version: "2.0",
    date: "19/10/2026",
    descVersion: "Especificación de vigencia de 5 minutos, tope de 3 intentos y componente modal"
  },
  {
    code: "HU-014",
    name: "Automatización de Detección de Moras y Tareas Programadas",
    complexity: "Alta",
    related: "HU-008, HU-010",
    module: "Control de Vencimientos (CRON)",
    role: "ADMIN (Director de Logística)",
    require: "Que el sistema detecte automáticamente todos los días los préstamos cuyo plazo de devolución se haya vencido.",
    benefit: "Eliminar revisiones manuales, cambiando los estados a Vencido y registrando las trazas de auditoría sin intervención humana.",
    requirement: "El sistema debe ejecutar una tarea programada diaria a la medianoche que compare la fecha actual contra la fecha de devolución, migrando automáticamente a estado Vencido de forma idempotente y registrando la corrida en el log de tareas.",
    conditions: [
      {
        title: "Condición 01\nEjecución automática del Cron Job",
        given: "Que un préstamo superó la fecha límite de devolución sin ser devuelto.",
        when: "El proceso programado se ejecuta a la medianoche.",
        then: "El sistema actualiza el estado a 'Vencido' e inserta un evento automático en la tabla de auditoría."
      },
      {
        title: "Condición 02\nVisibilidad de alertas inmediatas",
        given: "Que existen préstamos en mora procesados por la tarea automática.",
        when: "El Administrador o el Inspector ingresan a la plataforma.",
        then: "Visualizan un indicador de mora resaltado en rojo en sus paneles con el número de préstamos vencidos."
      },
      {
        title: "Condición 03\nIdempotencia de la ejecución",
        given: "Que la tarea ya se ejecutó correctamente durante el día.",
        when: "Se ejecuta nuevamente o se dispara de forma manual.",
        then: "El sistema no duplica los eventos de auditoría ni reprocesa préstamos ya marcados como vencidos."
      },
      {
        title: "Condición 04\nFallo durante la ejecución",
        given: "Que ocurre un error durante el procesamiento.",
        when: "La tarea programada se ejecuta.",
        then: "La transacción se revierte por completo, se registra el fallo en el log del sistema y se alerta al Administrador sin dejar estados parciales."
      }
    ],
    tasks: [
      "Configurar la programación automática de tareas periódicas en el servidor con expresión diaria.",
      "Programar la consulta masiva que actualiza a estado Vencido comparando fechas de devolución.",
      "Registrar automáticamente las inserciones de auditoría en la bitácora inalterable.",
      "Implementar la idempotencia de la tarea y el registro de ejecuciones en la tabla de control.",
      "Exponer una función de ejecución manual del proceso restringida al rol ADMIN.",
      "Construir en la interfaz el indicador visual de mora en los paneles de ADMIN e INSPECTOR.",
      "Probar la ejecución automática, la idempotencia y la reversión ante errores."
    ],
    version: "2.0",
    date: "19/10/2026",
    descVersion: "Actualización de módulo a CRON, idempotencia y registro de ejecuciones"
  },
  {
    code: "HU-015",
    name: "Cálculo y Proyección de Mermas y Depreciación Financiera",
    complexity: "Media",
    related: "HU-004, HU-010",
    module: "Finanzas y Mermas (FIN)",
    role: "ADMIN (Director de Logística)",
    require: "Visualizar el valor contable depreciado del inventario y las pérdidas acumuladas por activos retenidos o extraviados.",
    benefit: "Reducir gastos operativos evitando la compra innecesaria de herramientas de reemplazo.",
    requirement: "El sistema debe procesar consultas con fórmulas de depreciación financiera en línea recta sobre el valor estimado, calculando el valor residual (nunca inferior a cero) y el costo total en riesgo por equipos en mora, para presentarlo en gráficos gerenciales con precisión exacta.",
    conditions: [
      {
        title: "Condición 01\nReporte financiero consolidado",
        given: "Que el Administrador accede a la sección de finanzas.",
        when: "Solicita la proyección de mermas del mes.",
        then: "El sistema calcula y muestra la suma total en dinero retenido fuera de plazo y el valor residual actualizado del inventario."
      },
      {
        title: "Condición 02\nDepreciación por activo",
        given: "Que un activo tiene fecha de adquisición y valor estimado registrados.",
        when: "El Administrador consulta su ficha financiera.",
        then: "El sistema aplica la fórmula de línea recta, muestra la depreciación acumulada y un valor residual nunca inferior a cero."
      },
      {
        title: "Condición 03\nSin datos o valores inválidos",
        given: "Que no existen préstamos en mora o el periodo seleccionado no registra movimientos.",
        when: "El Administrador genera la proyección.",
        then: "El sistema muestra el valor en cero e indica que no hay mermas registradas para el periodo."
      }
    ],
    tasks: [
      "Definir en el modelo de datos los campos financieros (valor estimado con precisión decimal, fecha de compra y vida útil).",
      "Implementar la fórmula de depreciación en línea recta con control de valor residual mínimo en cero.",
      "Calcular el costo total en riesgo sumando el valor estimado de los préstamos en estado Vencido.",
      "Exponer la consulta de resumen financiero restringida al rol ADMIN.",
      "Construir en la interfaz el tablero financiero con tarjetas de indicadores y gráficos de moneda.",
      "Implementar la exportación del reporte financiero a formato de hoja de cálculo.",
      "Probar los cálculos con valores conocidos, el caso sin mermas y los valores límite de depreciación."
    ],
    version: "2.0",
    date: "19/10/2026",
    descVersion: "Actualización de módulo a FIN, fórmula de línea recta y tablero interactivo"
  },
  {
    code: "HU-016",
    name: "Desactivación y Suspensión de Cuentas de Usuario",
    complexity: "Media",
    related: "HU-003",
    module: "Autenticación (AUT)",
    role: "Director de Logística (ADMIN)",
    require: "Inactivar la cuenta de un colaborador para revocar su acceso sin borrar su historial.",
    benefit: "Revocar de inmediato el acceso a la plataforma a personal desvinculado manteniendo la trazabilidad histórica.",
    requirement: "El sistema debe aplicar un cambio de estado a inactivo en la cuenta del usuario, revocando sus credenciales de acceso activas y garantizando que el último administrador activo no pueda ser desactivado.",
    conditions: [
      {
        title: "Condición 01\nInactivación de cuenta",
        given: "Que el Administrador selecciona un usuario activo en el listado.",
        when: "Confirma la acción de desactivar cuenta.",
        then: "El sistema cambia su estado a inactivo, revoca sus sesiones y muestra la cuenta con distintivo inactivo."
      },
      {
        title: "Condición 02\nProtección de último administrador",
        given: "Que existe un único Administrador activo en el sistema.",
        when: "Se intenta desactivarlo o degradarlo.",
        then: "El sistema bloquea la acción por seguridad impidiendo dejar el aplicativo sin administradores."
      },
      {
        title: "Condición 03\nReactivación de cuenta",
        given: "Que un usuario se encuentra inactivo.",
        when: "El Administrador selecciona la opción de reactivar cuenta.",
        then: "El sistema restablece el estado activo y permite nuevamente su ingreso regular."
      }
    ],
    tasks: [
      "Programar la función de borrado lógico de usuarios preservando registros históricos.",
      "Implementar la regla de seguridad que protege la última cuenta administrativa.",
      "Diseñar el botón de cambio de estado en la tabla de colaboradores.",
      "Realizar pruebas verificando que una cuenta desactivada no pueda autenticarse."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para desactivación y reactivación de cuentas"
  },
  {
    code: "HU-017",
    name: "Búsqueda y Filtrado Dinámico de Equipos",
    complexity: "Media",
    related: "HU-004",
    module: "Inventario (BOD)",
    role: "ADMIN, INSPECTOR o TECHNICIAN",
    require: "Buscar herramientas por número de serie, modelo o filtrar por su estado operativo.",
    benefit: "Localizar rápidamente las herramientas exactas en bodega o catálogo sin recorrer todas las páginas.",
    requirement: "El sistema debe incorporar filtros dinámicos por estado y campo de búsqueda por texto que recalculen los resultados en pantalla en tiempo real.",
    conditions: [
      {
        title: "Condición 01\nBúsqueda por texto",
        given: "Que el usuario escribe un número de serie o modelo en la barra de búsqueda.",
        when: "Se aplica el criterio.",
        then: "La tabla se actualiza mostrando únicamente los equipos que coincidan con el texto."
      },
      {
        title: "Condición 02\nFiltro por estado operativo",
        given: "Que el usuario selecciona el filtro 'Disponible'.",
        when: "Se actualiza el filtro.",
        then: "La tabla muestra únicamente los equipos listos para ser asignados."
      },
      {
        title: "Condición 03\nBúsqueda sin coincidencias",
        given: "Que se busca un criterio que no coincide con ningún equipo.",
        when: "Se ejecuta la consulta.",
        then: "El sistema presenta un aviso indicando que no se encontraron activos para ese criterio."
      }
    ],
    tasks: [
      "Programar filtros combinados en las consultas del repositorio de datos.",
      "Diseñar la barra de búsqueda y selectores de estado en la parte superior del inventario.",
      "Conectar los controles de filtro con la actualización reactiva de la tabla.",
      "Probar búsquedas por coincidencia parcial y filtros combinados."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para búsqueda y filtrado dinámico de inventario"
  },
  {
    code: "HU-018",
    name: "Validación y Reversión Total ante Errores en Carga Masiva",
    complexity: "Alta",
    related: "HU-005",
    module: "Inventario (BOD)",
    role: "Director de Logística (ADMIN)",
    require: "Que ante cualquier anomalía en el archivo de carga masiva se anule la operación completa.",
    benefit: "Asegurar que la base de datos nunca quede con información parcial o inconsistente.",
    requirement: "El sistema debe procesar la carga masiva bajo un esquema de todo o nada, cancelando todas las inserciones del lote e informando la línea exacta causante de la anomalía.",
    conditions: [
      {
        title: "Condición 01\nReversión por fila inválida",
        given: "Que un archivo contiene un número de serie repetido o campo obligatorio en blanco.",
        when: "El motor ejecuta la validación masiva.",
        then: "El sistema aborta la operación completa, no guarda ningún registro y devuelve una alerta con la fila exacta del error."
      },
      {
        title: "Condición 02\nFormato no correspondiente",
        given: "Que el archivo subido no coincide con las columnas requeridas.",
        when: "Se inicia la carga.",
        then: "El sistema rechaza el archivo antes del procesamiento."
      },
      {
        title: "Condición 03\nReporte de fallos",
        given: "Que ocurre un rechazo de lote.",
        when: "Finaliza el análisis.",
        then: "La pantalla muestra un reporte claro explicando la causa del fallo para su corrección."
      }
    ],
    tasks: [
      "Implementar la validación preventiva fila por fila antes de guardar la información.",
      "Configurar el control transaccional estricto con reversión automática ante excepciones.",
      "Diseñar la alerta de error que indica la fila y columna causante del fallo.",
      "Probar escenarios de estrés inyectando errores intencionados en archivos grandes."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para validación transaccional y reversión de carga masiva"
  },
  {
    code: "HU-019",
    name: "Rechazo Justificado de Solicitudes de Préstamo",
    complexity: "Baja",
    related: "HU-008",
    module: "Préstamos (PRE)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Rechazar solicitudes de préstamo que no procedan e indicar el motivo de la decisión.",
    benefit: "Liberar inmediatamente las herramientas para otros técnicos y notificar la causa del rechazo al solicitante.",
    requirement: "El sistema debe permitir denegar solicitudes pendientes solicitando obligatoriamente una justificación, marcando el préstamo como 'Rechazado' y manteniendo el activo disponible.",
    conditions: [
      {
        title: "Condición 01\nRechazo de solicitud",
        given: "Que el Inspector revisa una solicitud de préstamo pendiente improcedente.",
        when: "Decide rechazarla por falta de stock o justificación inválida.",
        then: "El sistema actualiza el estado a 'Rechazado' y el equipo mantiene su estado físico como 'Disponible'."
      },
      {
        title: "Condición 02\nJustificación requerida",
        given: "Que el Inspector intenta rechazar sin escribir el motivo.",
        when: "Presiona confirmar rechazo.",
        then: "El sistema impide la acción hasta que se ingrese una justificación válida."
      },
      {
        title: "Condición 03\nNotificación en panel",
        given: "Que una solicitud fue rechazada.",
        when: "El técnico revisa su bandeja de solicitudes.",
        then: "Visualiza el estado rechazado acompañado del motivo ingresado por bodega."
      }
    ],
    tasks: [
      "Programar la función de rechazo de solicitudes con almacenamiento del motivo.",
      "Diseñar el diálogo modal de confirmación de rechazo con campo de texto obligatorio.",
      "Conectar el botón de rechazo con los servicios del sistema.",
      "Probar el rechazo y comprobar la restitución del equipo al catálogo disponible."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para rechazo motivado de solicitudes"
  },
  {
    code: "HU-020",
    name: "Registro de Devolución Física y Revisión de Estado",
    complexity: "Media",
    related: "HU-008",
    module: "Préstamos (PRE)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Registrar la recepción física de las herramientas en bodega y calificar su estado de conservación.",
    benefit: "Cerrar la custodia a nombre del técnico y restituir el equipo a disponible o enviarlo a mantenimiento.",
    requirement: "El sistema debe registrar la fecha y hora real de devolución, cerrar el préstamo como 'Devuelto', incrementar el contador de ciclos de uso y cambiar el estado del equipo según su condición.",
    conditions: [
      {
        title: "Condición 01\nDevolución en buen estado",
        given: "Que el técnico entrega físicamente una herramienta que tenía en custodia.",
        when: "El Inspector registra la recepción en buen estado.",
        then: "El sistema marca el préstamo como 'Devuelto', suma un ciclo de uso y restituye el equipo a 'Disponible'."
      },
      {
        title: "Condición 02\nDevolución con averías",
        given: "Que el equipo es devuelto con daños evidentes o averías.",
        when: "El Inspector registra la devolución marcando la opción de daño con nota descriptiva.",
        then: "El sistema finaliza el préstamo pero deja el activo en 'Mantenimiento' para peritaje técnico."
      },
      {
        title: "Condición 03\nConstancia cronológica",
        given: "Que se asienta una devolución.",
        when: "Se consulta el histórico de movimientos.",
        then: "Queda registrada la fecha exacta, estado final y el inspector que recibió el equipo."
      }
    ],
    tasks: [
      "Programar la lógica transaccional de cierre de préstamo y restitución del equipo.",
      "Exponer la función de registro de devoluciones restringida a roles autorizados.",
      "Diseñar la interfaz de recepción con selectores de condición física del activo.",
      "Probar devoluciones normales y devoluciones con reporte de averías."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para recepción y revisión de devoluciones"
  },
  {
    code: "HU-021",
    name: "Entrada Manual de Respaldo para Escaneo QR",
    complexity: "Baja",
    related: "HU-011",
    module: "Escaneo QR (QR)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Contar con un campo de texto para digitar el número de serie cuando no haya cámara disponible.",
    benefit: "Garantizar la continuidad operativa de la bodega ante fallas de hardware o códigos deteriorados.",
    requirement: "El sistema debe proveer una casilla de entrada manual de número de serie dentro de la herramienta de escaneo como método alternativo con búsqueda instantánea de la ficha técnica.",
    conditions: [
      {
        title: "Condición 01\nConsulta manual de respaldo",
        given: "Que el Inspector no cuenta con cámara o el código impreso está dañado.",
        when: "Digita el número de serie y presiona buscar.",
        then: "El sistema localiza la herramienta y despliega su información completa."
      },
      {
        title: "Condición 02\nPermiso de cámara denegado",
        given: "Que el navegador no tiene permiso de acceso a la cámara.",
        when: "El Inspector abre el módulo de escaneo.",
        then: "El sistema informa la situación y habilita automáticamente la entrada manual."
      },
      {
        title: "Condición 03\nSerial no encontrado",
        given: "Que se ingresa un número de serie erróneo.",
        when: "Se ejecuta la búsqueda manual.",
        then: "El sistema notifica que el equipo no existe en el catálogo."
      }
    ],
    tasks: [
      "Diseñar la entrada manual de respaldo en la vista de escaneo.",
      "Programar la detección y manejo de errores de permisos de cámara.",
      "Conectar la búsqueda manual con la consulta de activos.",
      "Probar la consulta manual con datos válidos e inválidos."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para entrada manual de respaldo en escaneo"
  },
  {
    code: "HU-022",
    name: "Registro de Mantenimiento Preventivo y Recalibración",
    complexity: "Media",
    related: "HU-012",
    module: "Calibración (CAL)",
    role: "Inspector de Bodega (INSPECTOR)",
    require: "Registrar la nueva calibración y servicio técnico realizado a una herramienta en mantenimiento.",
    benefit: "Reiniciar los ciclos de uso, actualizar la vigencia de calibración y devolver el equipo a Disponible.",
    requirement: "El sistema debe permitir registrar los datos de la nueva calibración, actualizando la fecha de vigencia, reiniciando los ciclos de uso y retornando el activo a estado 'Disponible'.",
    conditions: [
      {
        title: "Condición 01\nReinicio por calibración exitosa",
        given: "Que un equipo en Mantenimiento recibe certificación técnica aprobada.",
        when: "El Inspector guarda el registro de calibración.",
        then: "El sistema actualiza la fecha, reinicia los ciclos de uso a cero y devuelve el activo a 'Disponible'."
      },
      {
        title: "Condición 02\nHistorial técnico inalterable",
        given: "Que se completa el registro de calibración.",
        when: "Se consulta la ficha del equipo.",
        then: "Queda guardado el historial permanente con fecha, técnico responsable y resultado."
      },
      {
        title: "Condición 03\nCalibración no satisfactoria",
        given: "Que el equipo no supera las pruebas del laboratorio.",
        when: "Se asienta el resultado negativo.",
        then: "El sistema mantiene el equipo en Mantenimiento o permite darlo de baja."
      }
    ],
    tasks: [
      "Crear la tabla y modelo de datos para el historial de calibraciones.",
      "Programar la operación de registro de calibración con reinicio de contadores.",
      "Diseñar el formulario de registro de servicio técnico en la interfaz.",
      "Probar el reinicio de ciclos y restitución de disponibilidad."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para registro y reinicio de calibración técnica"
  },
  {
    code: "HU-023",
    name: "Generación y Reenvío de Código Temporal (PIN OTP)",
    complexity: "Media",
    related: "HU-013",
    module: "Seguridad OTP (OTP)",
    role: "ADMIN",
    require: "Exigir una confirmación mediante código de un solo uso de 6 dígitos para la entrega física de herramientas.",
    benefit: "Garantizar el no repudio de la custodia de herramientas costosas mediante una clave intransferible.",
    requirement: "El sistema debe generar un PIN numérico aleatorio seguro de 6 dígitos asociado a la solicitud, con vigencia máxima de 5 minutos, resguardado de forma protegida y con límite de hasta 3 intentos de validación.",
    conditions: [
      {
        title: "Condición 01\nGeneración de PIN seguro",
        given: "Que una solicitud de préstamo ha sido aprobada.",
        when: "El técnico consulta su solicitud en su panel.",
        then: "Visualiza un código PIN de 6 dígitos con un temporizador regresivo de 5 minutos."
      },
      {
        title: "Condición 02\nCódigo expirado",
        given: "Que transcurren más de 5 minutos desde la generación del código.",
        when: "Se intenta validar en bodega.",
        then: "El sistema rechaza el código por expiración de vigencia."
      },
      {
        title: "Condición 03\nReenvío de nuevo código",
        given: "Que el código expiró antes de retirar el equipo.",
        when: "El técnico solicita un reenvío del código.",
        then: "El sistema invalida el código anterior y genera un nuevo PIN de 6 dígitos con otros 5 minutos de vigencia."
      }
    ],
    tasks: [
      "Implementar el servicio de generación de claves aleatorias de 6 dígitos con tiempo de expiración.",
      "Persistir el valor protegido del código en la base de datos con vigencia e intentos.",
      "Diseñar el componente visual en la interfaz con temporizador regresivo de 5 minutos.",
      "Probar la generación, expiración y reenvío controlado del PIN temporal."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para generación y reenvío de claves OTP"
  },
  {
    code: "HU-024",
    name: "Control de Navegación y Permisos por Perfil",
    complexity: "Media",
    related: "HU-002",
    module: "Autenticación (AUT)",
    role: "Colaborador del sistema",
    require: "Contar con menús y opciones de navegación visualmente delimitadas y protegidas según mi perfil operativo.",
    benefit: "Evitar confusiones operativas y prevenir el acceso no autorizado a módulos confidenciales o ajenos a mi función.",
    requirement: "El sistema debe filtrar las opciones de menú y proteger todas las pantallas de la aplicación, bloqueando de manera automática cualquier intento de navegación manual hacia secciones no autorizadas según el rol del usuario.",
    conditions: [
      {
        title: "Condición 01\nVisualización segmentada",
        given: "Que un usuario con perfil TECHNICIAN inicia sesión.",
        when: "Carga su menú de navegación.",
        then: "Solo se despliegan las opciones de consulta de equipos, solicitud de préstamos y su historial personal."
      },
      {
        title: "Condición 02\nIntento de acceso indebido",
        given: "Que un Técnico o un Inspector intenta acceder escribiendo directamente la dirección web del panel administrativo.",
        when: "El sistema procesa la solicitud de pantalla.",
        then: "El sistema intercepta la petición, bloquea el acceso y redirige al usuario a su pantalla autorizada con un aviso de advertencia."
      },
      {
        title: "Condición 03\nCierre de sesión seguro",
        given: "Que un usuario decide cerrar voluntariamente su sesión.",
        when: "Selecciona la opción de salida.",
        then: "El sistema destruye el comprobante de sesión y redirige inmediatamente a la pantalla de bienvenida."
      }
    ],
    tasks: [
      "Diseñar las barras de navegación dinámicas que se ajustan al perfil activo del usuario.",
      "Programar guardianes de navegación que protegen cada ruta del sistema ante accesos manuales.",
      "Implementar la regla de cierre de sesión y limpieza de credenciales en el navegador.",
      "Realizar pruebas cruzadas navegando con usuarios de cada perfil hacia pantallas restringidas."
    ],
    version: "1.0",
    date: "22/10/2026",
    descVersion: "Creación de la HU para protección de navegación y control de acceso por perfil"
  }
];

// Función para construir la tabla idéntica en formato, orden y fuentes (Arial)
function buildOriginalExactTable(hu) {
  const rows = [];
  const blackBorder = { style: BorderStyle.SINGLE, size: 4, color: "000000" };

  const tableBorders = {
    top: blackBorder,
    bottom: blackBorder,
    left: blackBorder,
    right: blackBorder,
    insideHorizontal: blackBorder,
    insideVertical: blackBorder
  };

  // 6 columnas estándar proporcionales a la plantilla original:
  // Col 0: 1600 dxa (~2.8 cm) - Etiquetas izquierda
  // Col 1: 1400 dxa (~2.5 cm) - Código / Sub-etiquetas (Yo como, Dado)
  // Col 2: 2400 dxa (~4.2 cm) - Nombre / Autor
  // Col 3: 1400 dxa (~2.5 cm) - Revisión
  // Col 4: 1600 dxa (~2.8 cm) - Descripción
  // Col 5: 1200 dxa (~2.1 cm) - Aprobador
  // Total = 9600 dxa
  const cWidths = [1600, 1400, 2400, 1400, 1600, 1200];
  const fontName = "Arial";

  // FILA 0: Banner SENA (idéntico al encabezado original)
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 4,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "SERVICIO NACIONAL DE APRENDIZAJE", font: fontName, bold: true, size: 20 })
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
                new TextRun({ text: "Versión 1.0", font: fontName, size: 19 })
              ]
            })
          ]
        })
      ]
    })
  );

  // FILA 1: Encabezado de Sección HISTORIA DE USUARIO
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          columnSpan: 6,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "HISTORIA DE USUARIO", font: fontName, bold: true, size: 21 })
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
          children: [new Paragraph({ children: [new TextRun({ text: hu.code, font: fontName, size: 19 })] })]
        }),
        new TableCell({
          width: { size: cWidths[2], type: WidthType.DXA },
          children: [new Paragraph({ children: [new TextRun({ text: "Nombre:", font: fontName, bold: true, size: 19 })] })]
        }),
        new TableCell({
          columnSpan: 3,
          children: [new Paragraph({ children: [new TextRun({ text: hu.name, font: fontName, size: 19 })] })]
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
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({ text: "TAREAS", font: fontName, bold: true, size: 20 })
              ]
            })
          ]
        })
      ]
    })
  );

  // Encabezado columnas de tareas
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "No", font: fontName, bold: true, size: 19 })] })]
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
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hu.version || "1.0", font: fontName, size: 18 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: hu.date || "14/10/2026", font: fontName, size: 18 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Brayan Santiago Cuta Molina", font: fontName, size: 17 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "pendiente", font: fontName, size: 18 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: hu.descVersion || `Creación de la HU para ${hu.name.toLowerCase()}`, font: fontName, size: 17 })] })]
        }),
        new TableCell({
          children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "pendiente", font: fontName, size: 18 })] })]
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

// Armar el documento exacto sin alterar orden ni tablas ni tipo de letra (Arial)
const doc = new Document({
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: 1000,
            bottom: 1000,
            left: 1000,
            right: 1000
          }
        }
      },
      children: [
        ...husData.flatMap((hu) => [
          buildOriginalExactTable(hu),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 240, after: 240 },
            children: [
              new TextRun({ text: "__________________________________________________________________", font: "Arial", size: 18 })
            ]
          })
        ])
      ]
    }
  ]
});

async function run() {
  const buffer = await Packer.toBuffer(doc);
  const outPath1 = "C:\\Users\\maria\\OneDrive\\HAG_2620\\Historias_de_Usuario_AssetGuard_2620.docx";
  const outPath2 = "C:\\Users\\maria\\OneDrive\\Escritorio\\AssetGuard_2620\\docs\\Historias_de_Usuario_AssetGuard_2620.docx";

  fs.writeFileSync(outPath1, buffer);
  fs.writeFileSync(outPath2, buffer);
  console.log("Documento generado exitosamente respetando 100% el orden original, tablas y fuente Arial.");
}

run().catch(err => {
  console.error("Error al generar:", err);
  process.exit(1);
});
