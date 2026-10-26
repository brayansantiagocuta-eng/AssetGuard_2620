import fs from "fs";
import path from "path";
import zlib from "zlib";

function encode64(data) {
  let r = "";
  for (let i = 0; i < data.length; i += 3) {
    if (i + 2 === data.length) {
      r += append3bytes(data[i], data[i + 1], 0);
    } else if (i + 1 === data.length) {
      r += append3bytes(data[i], 0, 0);
    } else {
      r += append3bytes(data[i], data[i + 1], data[i + 2]);
    }
  }
  return r;
}

function append3bytes(b1, b2, b3) {
  const c1 = b1 >> 2;
  const c2 = ((b1 & 0x3) << 4) | (b2 >> 4);
  const c3 = ((b2 & 0xF) << 2) | (b3 >> 6);
  const c4 = b3 & 0x3F;
  let r = "";
  r += encode6bit(c1 & 0x3F);
  r += encode6bit(c2 & 0x3F);
  r += encode6bit(c3 & 0x3F);
  r += encode6bit(c4 & 0x3F);
  return r;
}

function encode6bit(b) {
  if (b < 10) return String.fromCharCode(48 + b);
  b -= 10;
  if (b < 26) return String.fromCharCode(65 + b);
  b -= 26;
  if (b < 26) return String.fromCharCode(97 + b);
  b -= 26;
  if (b === 0) return "-";
  if (b === 1) return "_";
  return "?";
}

function plantumlEncode(puml) {
  const deflated = zlib.deflateRawSync(Buffer.from(puml, "utf-8"), { level: 9 });
  return encode64(deflated);
}

async function downloadPng(encoded, outPath) {
  const url = `http://www.plantuml.com/plantuml/png/${encoded}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(outPath, Buffer.from(arrayBuffer));
  console.log(`Saved PNG: ${outPath} (${arrayBuffer.byteLength} bytes)`);
}

const outDir = "C:/Users/maria/OneDrive/Escritorio/Documentacion.err/Diagramas";
fs.mkdirSync(outDir, { recursive: true });

// 1. BPMN 2.0
const pumlBpmn = `@startuml BPMN_AssetGuard_2620
title Proceso de Préstamo y Custodia de Activos (BPMN 2.0) — AssetGuard_2620
skinparam backgroundColor #FFFFFF
skinparam shadowing true
skinparam swimlaneBorderColor #4A5568
skinparam swimlaneTitleFontStyle bold
skinparam ActivityBackgroundColor #EDF2F7
skinparam ActivityBorderColor #2B6CB0
skinparam DiamondBackgroundColor #FEFCBF
skinparam DiamondBorderColor #D69E2E

|#EBF8FF|SOLICITANTE\\n(Técnico de Campo - Brayan Cuta)|
start
:Necesidad de herramienta tecnológica;
:Consultar catálogo de inventario en Next.js;
:Registrar solicitud formal de préstamo\\n(con motivo y fecha de retorno);

|#F7FAFC|ALMACÉN\\n(Inspector de Bodega - Ian Sanchez)|
:Recibir solicitud en bandeja de préstamos;
:Escanear código QR del activo (< 1s);

|#EDF2F7|SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
:Evaluar disponibilidad física (status = AVAILABLE);
:Evaluar ciclos de uso y vigencia de calibración\\n(usage_cycles < max_usage_cycles AND\\nlast_calibration_date + interval >= today);

if (¿Activo y calibración válidos?) then (no / no apto)
  :Cambiar estado del activo a MAINTENANCE;
  :Insertar alerta en calibration_records;
  |SOLICITANTE\\n(Técnico de Campo - Brayan Cuta)|
  :Recibir aviso de equipo no apto;
  stop
else (sí / apto)
endif

|ALMACÉN\\n(Inspector de Bodega - Ian Sanchez)|
if (¿Inspector aprueba la solicitud?) then (rechazar)
  :Registrar motivo de rechazo;
  |SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
  :Marcar solicitud como REJECTED;
  stop
else (aprobar)
  :Aprobar entrega de herramienta;
endif

|SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
:Cambiar activo a RESERVED y solicitud a APPROVED;
:Generar PIN OTP de 6 dígitos (SecureRandom);
:Almacenar hash BCrypt con vigencia de 5 min\\ny contador de intentos (máx 3);

|SOLICITANTE\\n(Técnico de Campo - Brayan Cuta)|
:Visualizar PIN OTP en panel seguro;
:Presentarse en bodega para retiro físico;
:Digitar PIN OTP en la interfaz web;

|SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
repeat
  if (¿PIN OTP válido, no expirado y < 3 intentos?) then (sí)
    :Transacción @Transactional:
    - Préstamo pasa a ACTIVE
    - Activo pasa a ON_LOAN
    - Registrar firma electrónica en audit_logs;
    break
  else (no)
    :Incrementar contador de intentos fallidos;
    if (¿Intentos >= 3 o expirado?) then (sí)
      :Bloquear entrega y revocar OTP;
      stop
    else (no)
      :Solicitar reingreso de PIN;
    endif
  endif
repeat while (intento pendiente)

|ALMACÉN\\n(Inspector de Bodega - Ian Sanchez)|
:Entregar físicamente el equipo de alta tecnología;

|SOLICITANTE\\n(Técnico de Campo - Brayan Cuta)|
:Asumir custodia física y operativa en terreno;

|SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
fork
  |SOLICITANTE\\n(Técnico de Campo - Brayan Cuta)|
  :Finalizar labores en terreno;
  :Presentarse en bodega para devolución física;
  
  |ALMACÉN\\n(Inspector de Bodega - Ian Sanchez)|
  :Inspección técnica de recepción;
  if (¿Equipo devuelto en buen estado?) then (con daños / merma)
    :Registrar novedad y pasar a MAINTENANCE (HU-006);
    |SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
    :Registrar merma en financial_movements;
  else (óptimo estado)
    :Confirmar recepción conforme;
  endif
  |SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
  :Transacción: Préstamo RETURNED, Activo AVAILABLE\\ny recalcular ciclos de uso (+1);
  :Registrar cierre de custodia en audit_logs;
  stop

fork again
  |SISTEMA AUTOMATIZADO\\n(Spring Boot & PostgreSQL)|
  :Tarea Programada CRON Diaria\\nMedianoche: 0 0 0 * * *;
  :Detectar préstamos con fecha retorno vencida;
  :Migrar estado a OVERDUE;
  :Registrar ejecución en job_executions\\ny emitir alertas en bitácora;
  stop
end fork
@enduml`;

// 2. CASOS DE USO UML
const pumlUseCase = `@startuml Casos_de_Uso_AssetGuard_2620
title Diagrama General de Casos de Uso (UML 2.5) — AssetGuard_2620
left to right direction
skinparam packageStyle rectangle
skinparam shadowing true
skinparam actorBackgroundColor #E2E8F0
skinparam actorBorderColor #2D3748
skinparam usecaseBackgroundColor #EDF2F7
skinparam usecaseBorderColor #2B6CB0

actor "Administrador (ADMIN)\\nAngie Ramos" as Admin #EBF8FF
actor "Inspector de Bodega (INSPECTOR)\\nIan Sanchez" as Inspector #F7FAFC
actor "Técnico de Campo (TECHNICIAN)\\nBrayan Cuta" as Technician #FEFCBF
actor "Sistema Automatizado\\nSpring Boot / CRON" as System #EDF2F7

rectangle "Sistema AssetGuard_2620 (GlobalNet Telecom)" {
  package "Autenticación y Usuarios (AUT)" {
    usecase "AUT-CU-001\\nIniciar Sesión y JWT" as UC_Login
    usecase "AUT-CU-002\\nCrear Cuentas de Usuario" as UC_CreateUser
    usecase "AUT-CU-003\\nEditar y Desactivar Usuarios" as UC_ManageUsers
  }

  package "Inventario y Bodega (BOD)" {
    usecase "BOD-CU-004\\nAlta Manual de Activo" as UC_CreateAsset
    usecase "BOD-CU-005\\nCarga Masiva Transaccional" as UC_BulkLoad
    usecase "BOD-AN-CU-002\\nConsultar Inventario Paginado" as UC_ListAssets
    usecase "BOD-CU-006\\nModificación y Control Estado Físico (HU-006)" as UC_UpdateStatus
    usecase "BOD-CU-007\\nEscaneo Rápido de Código QR (< 1s)" as UC_ScanQR
  }

  package "Préstamos y Custodia (PRE)" {
    usecase "PRE-AN-CU-003\\nSolicitar Préstamo de Activo" as UC_RequestLoan
    usecase "PRE-CU-008\\nAprobar / Rechazar Préstamo" as UC_ManageLoan
    usecase "PRE-CU-011\\nValidar Custodia con PIN OTP" as UC_ValidateOTP
    usecase "PRE-CU-012\\nRegistrar Devolución e Inspección" as UC_ReturnLoan
  }

  package "Reportes y Calibración (REP/CAL)" {
    usecase "REP-AN-CU-004\\nAutoconsultar Custodias Propias" as UC_MyLoans
    usecase "REP-CU-010\\nReportes Gerenciales y Auditoría" as UC_Reports
    usecase "CAL-CU-013\\nValidar Ciclos y Calibración" as UC_CalibCheck
    usecase "SYS-CU-014\\nDetector Nocturno de Moras (CRON)" as UC_CronOverdue
  }
}

Admin --> UC_CreateUser
Admin --> UC_ManageUsers
Admin --> UC_CreateAsset
Admin --> UC_BulkLoad
Admin --> UC_Reports

Inspector --> UC_ListAssets
Inspector --> UC_UpdateStatus
Inspector --> UC_ScanQR
Inspector --> UC_ManageLoan
Inspector --> UC_ValidateOTP
Inspector --> UC_ReturnLoan

Technician --> UC_ListAssets
Technician --> UC_RequestLoan
Technician --> UC_ValidateOTP
Technician --> UC_MyLoans

System --> UC_CalibCheck
System --> UC_CronOverdue

Admin --|> UC_Login
Inspector --|> UC_Login
Technician --|> UC_Login

UC_ManageLoan ..> UC_CalibCheck : <<include>>
UC_ManageLoan ..> UC_ValidateOTP : <<include>>
UC_ReturnLoan ..> UC_UpdateStatus : <<extend>>
UC_ScanQR ..> UC_ListAssets : <<extend>>
@enduml`;

// 3. ERD 3FN
const pumlErd = `@startuml Modelo_ERD_AssetGuard_2620
title Modelo Relacional Físico Normalizado (3FN) — AssetGuard_2620
hide circle
skinparam linetype ortho
skinparam roundcorner 5
skinparam class {
  BackgroundColor #FFFFFF
  ArrowColor #2B6CB0
  BorderColor #4A5568
}

entity "roles" as roles {
  * **id** : INT <<PK, generated>>
  --
  * **name** : VARCHAR(50) <<UK>>
  * description : VARCHAR(255)
}

entity "users" as users {
  * **id** : BIGINT <<PK, generated>>
  --
  * role_id : INT <<FK>>
  * full_name : VARCHAR(150)
  * **email** : VARCHAR(100) <<UK>>
  * password_hash : VARCHAR(255)
  * status : VARCHAR(20)
  * created_at : TIMESTAMPTZ
  * updated_at : TIMESTAMPTZ
}

entity "categories" as categories {
  * **id** : INT <<PK, generated>>
  --
  * **name** : VARCHAR(100) <<UK>>
  * useful_life_months : INT
}

entity "locations" as locations {
  * **id** : INT <<PK, generated>>
  --
  * **name** : VARCHAR(100) <<UK>>
  * type : VARCHAR(50)
}

entity "assets" as assets {
  * **id** : BIGINT <<PK, generated>>
  --
  * category_id : INT <<FK>>
  * location_id : INT <<FK>>
  * **serial_number** : VARCHAR(100) <<UK>>
  * **qr_code** : VARCHAR(100) <<UK>>
  * model : VARCHAR(150)
  * estimated_value : NUMERIC(14,2)
  * acquisition_date : DATE
  * status : VARCHAR(30)
  * usage_cycles : INT
  * max_usage_cycles : INT
  * last_calibration_date : DATE
  * calibration_interval_days : INT
  * created_at : TIMESTAMPTZ
  * updated_at : TIMESTAMPTZ
}

entity "loan_requests" as loan_requests {
  * **id** : BIGINT <<PK, generated>>
  --
  * technician_id : BIGINT <<FK>>
  * asset_id : BIGINT <<FK>>
  * request_date : TIMESTAMPTZ
  * required_date : DATE
  * expected_return_date : DATE
  * motive : VARCHAR(255)
  * status : VARCHAR(30)
  * created_at : TIMESTAMPTZ
}

entity "otp_tokens" as otp_tokens {
  * **id** : BIGINT <<PK, generated>>
  --
  * loan_request_id : BIGINT <<FK>>
  * pin_hash : VARCHAR(255)
  * expires_at : TIMESTAMPTZ
  * attempts : SMALLINT
  * used : BOOLEAN
  * created_at : TIMESTAMPTZ
}

entity "loans" as loans {
  * **id** : BIGINT <<PK, generated>>
  --
  * **loan_request_id** : BIGINT <<FK, UK>>
  * asset_id : BIGINT <<FK>>
  * delivery_date : TIMESTAMPTZ
  * actual_return_date : TIMESTAMPTZ
  * status : VARCHAR(30)
  * notes : TEXT
}

entity "calibration_records" as calibration_records {
  * **id** : BIGINT <<PK, generated>>
  --
  * asset_id : BIGINT <<FK>>
  * calibration_date : DATE
  * due_date : DATE
  * result : VARCHAR(20)
  * technician_name : VARCHAR(150)
  * notes : TEXT
  * created_at : TIMESTAMPTZ
}

entity "financial_movements" as financial_movements {
  * **id** : BIGINT <<PK, generated>>
  --
  * asset_id : BIGINT <<FK>>
  * user_id : BIGINT <<FK>>
  * type : VARCHAR(50)
  * amount : NUMERIC(14,2)
  * movement_date : DATE
  * justification : VARCHAR(255)
  * created_at : TIMESTAMPTZ
}

entity "audit_logs" as audit_logs {
  * **id** : BIGINT <<PK, generated>>
  --
  * user_id : BIGINT <<FK>>
  * action : VARCHAR(100)
  * entity_name : VARCHAR(100)
  * entity_id : BIGINT
  * old_value : TEXT
  * new_value : TEXT
  * ip_address : VARCHAR(45)
  * created_at : TIMESTAMPTZ
}

entity "job_executions" as job_executions {
  * **id** : BIGINT <<PK, generated>>
  --
  * job_name : VARCHAR(100)
  * executed_at : TIMESTAMPTZ
  * status : VARCHAR(20)
  * records_processed : INT
  * details : TEXT
}

roles ||--o{ users : "has"
users ||--o{ loan_requests : "requests"
users ||--o{ audit_logs : "triggers"
users ||--o{ financial_movements : "creates"

categories ||--o{ assets : "categorizes"
locations ||--o{ assets : "houses"
assets ||--o{ loan_requests : "requested_in"
assets ||--o{ loans : "loaned_in"
assets ||--o{ calibration_records : "calibrated_in"
assets ||--o{ financial_movements : "impacted_in"

loan_requests ||--o{ otp_tokens : "secured_by"
loan_requests ||--|| loans : "formalized_as"
@enduml`;

// 4. SECUENCIA OTP
const pumlOtp = `@startuml Secuencia_OTP_AssetGuard_2620
title Protocolo Criptográfico OTP con No Repudio (UML) — AssetGuard_2620
autonumber
skinparam responseMessageBelowArrow true
skinparam BoxPadding 10
skinparam ParticipantPadding 10

actor "Técnico de Campo\\n(Brayan Cuta)" as Tech #EBF8FF
actor "Inspector de Bodega\\n(Ian Sanchez)" as Insp #F7FAFC
participant "Frontend\\n(Next.js)" as UI #FFFFFF
participant "API GraphQL\\n(Spring Boot)" as API #EDF2F7
participant "Security Engine\\n(BCrypt / SecureRandom)" as SEC #E2E8F0
database "Base de Datos\\n(PostgreSQL 3FN)" as DB #CBD5E0

== 1. Aprobación y Generación de PIN OTP ==
Insp -> UI : Aprobar solicitud de préstamo
UI -> API : mutation approveLoanRequest(requestId)
API -> SEC : SecureRandom.getInstanceStrong() (6 dígitos)
SEC --> API : PIN en claro: "849201"
API -> SEC : BCrypt.hashpw(PIN, 12 rounds)
SEC --> API : pin_hash "$2a$12$..."
API -> DB : INSERT INTO otp_tokens (expires_at = now()+5min, attempts = 0)
API -> DB : UPDATE assets SET status = 'RESERVED'
API --> UI : Solicitud aprobada con éxito
API -> Tech : Notificación con PIN de 6 dígitos (Vigencia 5 min)

== 2. Entrega Física y Validación OTP en Bodega ==
Tech -> Insp : Se presenta físicamente en bodega
Tech -> UI : Ingresa PIN OTP ("849201")
UI -> API : mutation validateDeliveryOtp(requestId, pin)
API -> DB : SELECT * FROM otp_tokens WHERE loan_request_id = ? AND used = false

alt PIN expirado (> 5 min) o Intentos >= 3
  API -> DB : UPDATE otp_tokens SET attempts = attempts + 1
  API --> UI : Error: "Código OTP inválido o expirado"
  UI --> Tech : Bloqueo de entrega
else PIN válido (< 5 min y <= 3 intentos)
  API -> SEC : BCrypt.checkpw(pin, pin_hash)
  SEC --> API : true (coincidencia criptográfica)
  
  group Transacción Atómica @Transactional [Isolation = SERIALIZABLE]
    API -> DB : UPDATE otp_tokens SET used = true
    API -> DB : UPDATE assets SET status = 'ON_LOAN'
    API -> DB : INSERT INTO loans (status = 'ACTIVE', delivery_date = now())
    API -> DB : INSERT INTO audit_logs (action = 'VALIDATE_OTP_DELIVERY', non_repudiation = true)
  end
  
  API --> UI : Entrega formalizada exitosamente
  UI --> Insp : Pantalla verde: Custodia formalizada
  Insp -> Tech : Entrega física de la herramienta
end
@enduml`;

// 5. DIAGRAMA DE CLASES UML
const pumlClass = `@startuml Clases_UML_AssetGuard_2620
title Diagrama de Clases de Dominio (Arquitectura Hexagonal) — AssetGuard_2620
skinparam classAttributeIconSize 0
skinparam classBackgroundColor #FFFFFF
skinparam classBorderColor #2B6CB0

enum RoleType {
  ADMIN
  INSPECTOR
  TECHNICIAN
}

enum AssetStatus {
  AVAILABLE
  RESERVED
  ON_LOAN
  MAINTENANCE
  RETIRED
}

enum LoanStatus {
  ACTIVE
  RETURNED
  OVERDUE
}

class User {
  - Long id
  - RoleType role
  - String fullName
  - String email
  - String passwordHash
  - Boolean active
  + boolean canApproveLoans()
  + boolean canRegisterAssets()
}

class Asset {
  - Long id
  - String serialNumber
  - String qrCode
  - String model
  - BigDecimal estimatedValue
  - LocalDate acquisitionDate
  - AssetStatus status
  - int usageCycles
  - int maxUsageCycles
  - LocalDate lastCalibrationDate
  - int calibrationIntervalDays
  + boolean isAvailable()
  + boolean isCalibrationValid()
  + void registerUsageCycle()
  + void updatePhysicalStatus(AssetStatus newStatus)
}

class LoanRequest {
  - Long id
  - Long technicianId
  - Long assetId
  - LocalDate requiredDate
  - LocalDate expectedReturnDate
  - String status
  + boolean isPending()
}

class Loan {
  - Long id
  - Long loanRequestId
  - Long assetId
  - Instant deliveryDate
  - Instant actualReturnDate
  - LoanStatus status
  + boolean isOverdue(Instant now)
  + void markReturned()
}

class OtpToken {
  - Long id
  - Long loanRequestId
  - String pinHash
  - Instant expiresAt
  - int attempts
  - boolean used
  + boolean isValid(String plainPin)
}

class AuditLog {
  - Long id
  - Long userId
  - String action
  - String entityName
  - Long entityId
  - Instant createdAt
}

User "1" *-- "many" LoanRequest : submits
LoanRequest "1" *-- "0..1" Loan : formalizes
LoanRequest "1" *-- "many" OtpToken : secures
Asset "1" *-- "many" Loan : involved in
User "1" *-- "many" AuditLog : triggers
@enduml`;

const diagrams = [
  { name: "01_Diagrama_Proceso_BPMN_2_0", puml: pumlBpmn },
  { name: "02_Diagrama_Casos_de_Uso_UML", puml: pumlUseCase },
  { name: "03_Modelo_Entidad_Relacion_ERD_3FN", puml: pumlErd },
  { name: "04_Diagrama_Secuencia_Validacion_OTP", puml: pumlOtp },
  { name: "05_Diagrama_Clases_UML_Hexagonal", puml: pumlClass }
];

async function main() {
  for (const d of diagrams) {
    const pumlPath = path.join(outDir, `${d.name}.puml`);
    fs.writeFileSync(pumlPath, d.puml, "utf-8");
    console.log(`Saved PUML: ${pumlPath}`);

    const encoded = plantumlEncode(d.puml);
    const pngPath = path.join(outDir, `${d.name}.png`);
    try {
      await downloadPng(encoded, pngPath);
    } catch (err) {
      console.error(`Failed to download PNG for ${d.name}:`, err.message);
    }
  }

  // Also write the comprehensive markdown guide with Bizagi instructions and Mermaid
  const mdContent = `# Catálogo de Diagramas de Ingeniería de Software — AssetGuard_2620
**GlobalNet Telecom — Coordinación de Tecnología e Innovación**  
**Elaboró:** Brayan Santiago Cuta Molina (Desarrollador Full Stack)  
**Fecha:** 26/10/2026 | **Versión:** 2.0 Corregida y Actualizada  

---

## Estructura de Roles y Usuarios Actualizada
* **Administrador (ADMIN):** Angie Ramos (\`admin@globalnet.com\`) — Directora de Logística
* **Inspector de Bodega (INSPECTOR):** Ian Sanchez (\`inspector@globalnet.com\`) — Encargado de Bodega
* **Técnico de Campo (TECHNICIAN):** Brayan Cuta (\`technician@globalnet.com\`) — Técnico Especialista de Campo
* **Sistema Automatizado:** Spring Boot 3.3.4, PostgreSQL 16, Tareas CRON medianoche

---

## 1. Diagrama de Procesos de Negocio BPMN 2.0
* **Archivo de imagen:** \`01_Diagrama_Proceso_BPMN_2_0.png\`
* **Archivo de código fuente:** \`01_Diagrama_Proceso_BPMN_2_0.puml\`
* **Importación en Bizagi Modeler:**
  1. Abrir Bizagi Modeler.
  2. Crear un proceso con 3 carriles (Lanes):
     - **Carril 1 (Superior):** Técnico de Campo (Solicitante - Brayan Cuta).
     - **Carril 2 (Intermedio):** Inspector de Bodega (Almacén - Ian Sanchez).
     - **Carril 3 (Inferior):** Sistema Automatizado (Spring Boot Backend / DB).
  3. Mapear las compuertas exclusivas de calibración/ciclos, aprobación y validación de OTP con 3 intentos máximos.

---

## 2. Diagrama General de Casos de Uso (UML 2.5)
* **Archivo de imagen:** \`02_Diagrama_Casos_de_Uso_UML.png\`
* **Archivo de código fuente:** \`02_Diagrama_Casos_de_Uso_UML.puml\`
* **Casos Destacados:**
  - **BOD-CU-006 (HU-006):** Modificación y Control del Estado Físico de Activos (Exclusivo para INSPECTOR y ADMIN).
  - **BOD-CU-007:** Escaneo rápido de código QR (< 1s con cámara web).
  - **PRE-CU-011:** Firma y validación electrónica de entrega mediante OTP.

---

## 3. Modelo Relacional Físico Normalizado (3FN)
* **Archivo de imagen:** \`03_Modelo_Entidad_Relacion_ERD_3FN.png\`
* **Archivo de código fuente:** \`03_Modelo_Entidad_Relacion_ERD_3FN.puml\`
* **13 Tablas en Estricto Inglés:** \`roles\`, \`users\`, \`categories\`, \`locations\`, \`assets\`, \`loan_requests\`, \`otp_tokens\`, \`loans\`, \`calibration_records\`, \`financial_movements\`, \`audit_logs\`, \`job_executions\`.
* **Tipos de datos clave:** \`NUMERIC(14,2)\` para montos financieros, \`TIMESTAMPTZ\` para auditoría inmutable.

---

## 4. Diagrama de Secuencia de Validación OTP con No Repudio
* **Archivo de imagen:** \`04_Diagrama_Secuencia_Validacion_OTP.png\`
* **Archivo de código fuente:** \`04_Diagrama_Secuencia_Validacion_OTP.puml\`
* **Garantía Criptográfica:** SecureRandom + BCrypt 12 rounds, ventana de 5 minutos, límite de 3 intentos y aislamiento serializable en PostgreSQL.

---

## 5. Diagrama de Clases UML (Arquitectura Hexagonal)
* **Archivo de imagen:** \`05_Diagrama_Clases_UML_Hexagonal.png\`
* **Archivo de código fuente:** \`05_Diagrama_Clases_UML_Hexagonal.puml\`
* **Entidades de Dominio:** \`User\`, \`Asset\`, \`LoanRequest\`, \`Loan\`, \`OtpToken\`, \`AuditLog\`.
`;

  fs.writeFileSync(path.join(outDir, "MANUAL_Y_CODIGOS_DIAGRAMAS_ASSETGUARD_2620.md"), mdContent, "utf-8");
  console.log("Diagram manual written successfully!");
}

main().catch(console.error);
