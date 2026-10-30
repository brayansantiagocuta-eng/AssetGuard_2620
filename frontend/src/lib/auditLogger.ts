export interface AuditLogData {
  id?: string;
  userName: string;
  userRole?: string;
  actionCode: string;
  actionTitle: string;
  actionDescription: string;
  actionCategory: "LOAN" | "OTP" | "RETURN" | "CRON" | "USER" | "CALIBRATION";
  entityName: string;
  ipAddress?: string;
  createdAt?: string;
}

const STORAGE_KEY_LOCAL_AUDIT = "assetguard_local_audit_logs";

export function recordAuditEvent(event: AuditLogData): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_AUDIT);
    const existing: AuditLogData[] = raw ? JSON.parse(raw) : [];

    const now = new Date();
    const dateFormatted = now.toISOString().replace("T", " ").slice(0, 16);

    const newEntry: AuditLogData = {
      id: event.id || `AUD-EVT-${Date.now().toString().slice(-5)}`,
      userName: event.userName || "Usuario",
      userRole: event.userRole || "Usuario",
      actionCode: event.actionCode,
      actionTitle: event.actionTitle,
      actionDescription: event.actionDescription,
      actionCategory: event.actionCategory,
      entityName: event.entityName || "General",
      ipAddress: event.ipAddress || "192.168.10." + Math.floor(Math.random() * 80 + 10),
      createdAt: event.createdAt || dateFormatted,
    };

    const updated = [newEntry, ...existing].slice(0, 200);
    localStorage.setItem(STORAGE_KEY_LOCAL_AUDIT, JSON.stringify(updated));

    // Despachar evento para que otras pestañas o componentes se sincronicen
    window.dispatchEvent(new CustomEvent("assetguard:audit-updated", { detail: newEntry }));
  } catch (err) {
    console.error("Error al registrar evento de auditoría:", err);
  }
}

export function getLocalAuditEvents(): AuditLogData[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LOCAL_AUDIT);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
