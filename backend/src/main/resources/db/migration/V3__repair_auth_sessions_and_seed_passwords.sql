-- =============================================================================
-- ASSETGUARD_2620 - V3: REPARACION DE INTEGRIDAD Y SEMILLAS
-- 1) Restaura la clave foranea auth_sessions.user_id -> users.id que el script
--    manual database/assetguard_schema_and_seeds.sql elimino con DROP CASCADE.
-- 2) Corrige los hashes de las cuentas semilla: el hash anterior no correspondia
--    a la contrasena documentada (Password123!).
-- 3) Invalida las sesiones emitidas antes de la correccion.
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'auth_sessions_user_id_fkey'
    ) THEN
        ALTER TABLE auth_sessions
            ADD CONSTRAINT auth_sessions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END $$;

UPDATE users
SET password_hash = '$2a$10$.jWEMfq4mYpa2lzV0DUFPeezS65eRSANFPaRGb/o5IhP815UhhR1K',
    updated_at = NOW()
WHERE password_hash = '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lR0e0v11gX7Pq/h6Kx7v0F1i0vYiq';

-- Las sesiones creadas antes de restaurar la FK no son confiables.
DELETE FROM auth_sessions;