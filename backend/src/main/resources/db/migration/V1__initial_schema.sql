-- =============================================================================
-- ASSETGUARD_2620 - DATABASE SCHEMA DDL (V1)
-- Database Engine: PostgreSQL 15+
-- Naming Convention: Strict English (RNF-003)
-- Monetary Precision: NUMERIC(14,2) (RNF-012)
-- =============================================================================

-- 1. ROLES
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(200)
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);

-- 3. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(80) NOT NULL UNIQUE,
    useful_life_months INT NOT NULL DEFAULT 60 CHECK (useful_life_months > 0)
);

-- 4. LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL
);

-- 5. ASSETS
CREATE TABLE IF NOT EXISTS assets (
    id BIGSERIAL PRIMARY KEY,
    category_id INT REFERENCES categories(id) ON DELETE SET NULL,
    location_id INT REFERENCES locations(id) ON DELETE SET NULL,
    serial_number VARCHAR(100) NOT NULL UNIQUE,
    qr_code VARCHAR(100) UNIQUE,
    model VARCHAR(100) NOT NULL,
    estimated_value NUMERIC(14,2) NOT NULL CHECK (estimated_value >= 0),
    acquisition_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'AVAILABLE' 
        CHECK (status IN ('AVAILABLE', 'RESERVED', 'ON_LOAN', 'MAINTENANCE', 'RETIRED')),
    usage_cycles INT NOT NULL DEFAULT 0 CHECK (usage_cycles >= 0),
    max_usage_cycles INT NOT NULL DEFAULT 500 CHECK (max_usage_cycles > 0),
    last_calibration_date DATE NOT NULL DEFAULT CURRENT_DATE,
    calibration_interval_days INT NOT NULL DEFAULT 180 CHECK (calibration_interval_days > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON assets(serial_number);
CREATE INDEX IF NOT EXISTS idx_assets_qr_code ON assets(qr_code);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_assets_category_id ON assets(category_id);

-- 6. LOAN_REQUESTS
CREATE TABLE IF NOT EXISTS loan_requests (
    id BIGSERIAL PRIMARY KEY,
    technician_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    request_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    required_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    motive VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'REQUESTED' 
        CHECK (status IN ('REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_requests_technician ON loan_requests(technician_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_asset ON loan_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_loan_requests_status ON loan_requests(status);

-- 7. OTP_TOKENS
CREATE TABLE IF NOT EXISTS otp_tokens (
    id BIGSERIAL PRIMARY KEY,
    loan_request_id BIGINT NOT NULL REFERENCES loan_requests(id) ON DELETE CASCADE,
    pin_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts SMALLINT NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_tokens_request ON otp_tokens(loan_request_id);

-- 8. LOANS
CREATE TABLE IF NOT EXISTS loans (
    id BIGSERIAL PRIMARY KEY,
    loan_request_id BIGINT NOT NULL UNIQUE REFERENCES loan_requests(id) ON DELETE RESTRICT,
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE RESTRICT,
    delivery_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actual_return_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('ACTIVE', 'RETURNED', 'OVERDUE')),
    notes VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_loans_status ON loans(status);
CREATE INDEX IF NOT EXISTS idx_loans_asset ON loans(asset_id);

-- 9. CALIBRATION_RECORDS
CREATE TABLE IF NOT EXISTS calibration_records (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    calibration_date DATE NOT NULL,
    due_date DATE NOT NULL,
    result VARCHAR(20) NOT NULL CHECK (result IN ('PASS', 'FAIL')),
    technician_name VARCHAR(120) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calibration_records_asset ON calibration_records(asset_id);

-- 10. FINANCIAL_MOVEMENTS
CREATE TABLE IF NOT EXISTS financial_movements (
    id BIGSERIAL PRIMARY KEY,
    asset_id BIGINT REFERENCES assets(id) ON DELETE SET NULL,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    type VARCHAR(30) NOT NULL 
        CHECK (type IN ('DEPRECIATION', 'LOSS', 'DAMAGE', 'MAINTENANCE_COST')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
    movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
    justification VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_movements_asset ON financial_movements(asset_id);
CREATE INDEX IF NOT EXISTS idx_financial_movements_date ON financial_movements(movement_date);

-- 11. AUDIT_LOGS (Append-only)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    old_value TEXT,
    new_value TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 12. JOB_EXECUTIONS (CRON Audit)
CREATE TABLE IF NOT EXISTS job_executions (
    id BIGSERIAL PRIMARY KEY,
    job_name VARCHAR(80) NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('SUCCESS', 'FAILED')),
    records_processed INT NOT NULL DEFAULT 0,
    details TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_executions_name_date ON job_executions(job_name, executed_at);

-- =============================================================================
-- SEED DATA
-- Default Passwords:
-- Admin: lasanita
-- Inspector: #12345!
-- Technician: 123456
-- =============================================================================

INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Directora de Logistica - Control total del sistema'),
(2, 'INSPECTOR', 'Encargado de Bodega - Inspeccion y entrega de activos'),
(3, 'TECHNICIAN', 'Tecnico Especialista de Campo - Solicitud y custodia')
ON CONFLICT (id) DO UPDATE SET description = EXCLUDED.description;

INSERT INTO users (id, role_id, full_name, email, password_hash, status) VALUES
(1, 1, 'Angie Ramos', 'valesotelo.0806@gmail.com', '$2a$10$hiR.kFIQNwuboattDIKUqOKXP0DvbRNGXJ6vYHoqJPvXNGpY7NHPK', 'ACTIVE'),
(2, 2, 'Ian Sanchez', 'lasanita0204@gmail.com', '$2a$10$nmtBgSLrgCv/eBwZawAvX.cpW5tEVmo2mYRYMFdFciEc6nHgj0Ayi', 'ACTIVE'),
(3, 3, 'Brayan Cuta', 'brayansantiagocuta@gmail.com', '$2a$10$nYioptVB1Ep2ZJFis8eZU.tATD8fv0T6RSpwFElt8jRIM73bn6D2C', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (id, name, useful_life_months) VALUES
(1, 'Fusion Splicer (Fusionadora)', 60),
(2, 'Spectrum Analyzer (Analizador de Espectro)', 48),
(3, 'Network Certifier (Certificador de Red)', 48)
ON CONFLICT (id) DO NOTHING;

INSERT INTO locations (id, name, type) VALUES
(1, 'Bodega Central Bogota - Calle 26', 'MAIN_WAREHOUSE'),
(2, 'Sucursal Operativa Medellin - Poblado', 'BRANCH_OFFICE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO assets (
    id, category_id, location_id, serial_number, qr_code, model, 
    estimated_value, acquisition_date, status, usage_cycles, 
    max_usage_cycles, last_calibration_date, calibration_interval_days
) VALUES
(
    1, 1, 1, 'FS-70S-99201', 'QR-FS-70S-99201', 'Fujikura 70S+ Core-Alignment Fusion Splicer',
    18500000.00, '2025-01-15', 'AVAILABLE', 45, 500, CURRENT_DATE - INTERVAL '30 days', 180
),
(
    2, 2, 1, 'SA-MS2090A-102', 'QR-SA-MS2090A-102', 'Anritsu Field Master Pro MS2090A 54 GHz',
    42000000.00, '2024-06-20', 'AVAILABLE', 12, 300, CURRENT_DATE - INTERVAL '15 days', 180
),
(
    3, 3, 2, 'NC-DSX8000-551', 'QR-NC-DSX8000-551', 'Fluke Networks DSX-8000 CableAnalyzer Cat 8',
    34500000.00, '2023-11-10', 'AVAILABLE', 150, 400, CURRENT_DATE - INTERVAL '60 days', 180),
(
    4, 1, 1, 'FS-90S-33412', 'QR-FS-90S-33412', 'Fujikura 90S+ High Precision Splicer',
    24000000.00, '2024-03-01', 'MAINTENANCE', 505, 500, CURRENT_DATE - INTERVAL '210 days', 180
)
ON CONFLICT (serial_number) DO NOTHING;

SELECT setval('roles_id_seq', COALESCE((SELECT MAX(id) FROM roles), 1));
SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1));
SELECT setval('categories_id_seq', COALESCE((SELECT MAX(id) FROM categories), 1));
SELECT setval('locations_id_seq', COALESCE((SELECT MAX(id) FROM locations), 1));
SELECT setval('assets_id_seq', COALESCE((SELECT MAX(id) FROM assets), 1));
