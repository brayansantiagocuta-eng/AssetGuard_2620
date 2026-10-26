# AssetGuard_2620

Aplicacion organizada como monorepo con un backend Java/Spring Boot y un frontend Next.js para **GlobalNet Telecom**.

## Estructura

- `backend/`: API GraphQL en Java 25 (LTS) o superior, con capas para dominio, aplicacion e infraestructura. Usa Spring JDBC (`JdbcTemplate`), Flyway para el esquema, Apache POI para la carga masiva y tareas programadas para los vencimientos.
- `frontend/`: Next.js App Router. El codigo de la aplicacion vive en `frontend/src/`; pnpm es el unico gestor de paquetes admitido.
- `database/`: script manual de esquema y semillas, idempotente y no destructivo.

## Requisitos

- Java 25 (LTS) o superior y Maven 3.9 o superior.
- Node.js compatible con Next.js 16 y pnpm.
- PostgreSQL para ejecutar el backend.

## Frontend

Desde `frontend/`:

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Scripts disponibles: `pnpm dev`, `pnpm build`, `pnpm start` y `pnpm lint`.

## Backend

El backend usa PostgreSQL y Flyway. En desarrollo local, asegúrate de tener PostgreSQL iniciado y crea la base de datos una vez con el usuario administrador (el nombre debe coincidir con `DB_URL`):

```powershell
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE \"AssetGuard_2620\";"
```

Copia `.env.example` a `.env` y establece la contraseña local de PostgreSQL. El archivo `.env` está excluido de Git y no debe compartirse.

```powershell
Copy-Item .env.example .env
# Edita .env y reemplaza los valores de ejemplo antes de iniciar el backend.
mvn -f backend/pom.xml spring-boot:run
```

### Esquema y datos

Flyway aplica las migraciones de `backend/src/main/resources/db/migration` en el arranque:

- `V1__initial_schema.sql`: tablas, indices y semillas (roles, usuarios, categorias, ubicaciones y activos).
- `V2__authentication_sessions.sql`: sesiones revocables en base de datos.
- `V3__repair_auth_sessions_and_seed_passwords.sql`: restaura la clave foranea `auth_sessions.user_id`, corrige los hashes de las cuentas semilla e invalida las sesiones anteriores.

`database/assetguard_schema_and_seeds.sql` es el mismo esquema para ejecucion manual. Es idempotente (`CREATE TABLE IF NOT EXISTS`, `ON CONFLICT DO NOTHING`) y **no contiene `DROP`, `TRUNCATE` ni `DELETE`**: se puede ejecutar sobre una base con datos sin perderlos.

### Cuentas semilla

| Nombre | Correo | Rol | Contraseña |
| --- | --- | --- | --- |
| Angie Ramos | `admin@globalnet.com` | ADMIN | `Password123!` |
| Ian Sanchez | `inspector@globalnet.com` | INSPECTOR | `Password123!` |
| Brayan Cuta | `technician@globalnet.com` | TECHNICIAN | `Password123!` |

Son cuentas de demostracion: cambia las credenciales antes de desplegar.

### Bootstrap del administrador

Si `BOOTSTRAP_ADMIN_EMAIL` y `BOOTSTRAP_ADMIN_PASSWORD` estan definidos, al arrancar se crea esa cuenta **solo si no existe**. Si ya existe, no se modifica su contraseña ni su estado. Cuando la cuenta debe crearse desde cero, la contraseña debe tener entre 12 y 20 caracteres.

### API

- GraphQL: `POST /graphql` (contrato en `backend/src/main/resources/graphql/schema.graphqls`).
- GraphiQL: `GET /graphiql` (se desactiva con `GRAPHIQL_ENABLED=false` en produccion).
- Autenticacion REST: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` y `GET /api/auth/database`.
- La gestion de usuarios (`users`, `userById`, `createUser`, `updateUser`) y el resto de operaciones del sistema se exponen por GraphQL con control de roles ADMIN, INSPECTOR y TECHNICIAN.

La sesion viaja en una cookie `HttpOnly` con `SameSite=Strict`; el backend valida el origen de las peticiones que cambian estado y limita los intentos fallidos de inicio de sesion (5 por correo e IP cada 10 minutos). `GET /api/auth/database` requiere una sesion autenticada.

La tarea `DAILY_OVERDUE_JOB` se ejecuta a la medianoche de Bogota y migra a `OVERDUE` los prestamos vencidos; cada ejecucion queda registrada en `job_executions`. Tambien puede dispararse manualmente con la mutacion `runDailyOverdueJob` (solo ADMIN).

### Pruebas

```powershell
mvn -f backend/pom.xml test
```

En producción, configura `SESSION_COOKIE_SECURE=true`, `GRAPHIQL_ENABLED=false` y `APP_ORIGIN` con el origen HTTPS del frontend.
