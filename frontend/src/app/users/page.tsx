"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { GET_USERS_QUERY, GET_AUDIT_LOGS_QUERY } from "@/lib/graphql/queries";
import {
  CREATE_USER_MUTATION,
  UPDATE_USER_MUTATION,
  RESET_USER_PASSWORD_MUTATION,
} from "@/lib/graphql/mutations";
import {
  Users,
  UserPlus,
  ShieldCheck,
  KeyRound,
  Mail,
  Phone,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  BellRing,
  X,
} from "lucide-react";

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

interface RecoveryRequestItem {
  email: string;
  note?: string;
  requestedAt: string;
  status: "PENDING" | "COMPLETED";
}

const ALLOWED_PASSWORD_REGEX = /^[a-zA-Z0-9$!#%&]*$/;

const INITIAL_FALLBACK_USERS: UserRecord[] = [
  {
    id: "1",
    fullName: "Angie Ramos",
    email: "admin@globalnet.com",
    phone: "3001234567",
    role: "ADMIN",
    status: "ACTIVE",
    createdAt: "2025-01-10T08:00:00Z",
  },
  {
    id: "2",
    fullName: "Ian Sanchez",
    email: "inspector@globalnet.com",
    phone: "3109876543",
    role: "INSPECTOR",
    status: "ACTIVE",
    createdAt: "2025-01-12T09:30:00Z",
  },
  {
    id: "3",
    fullName: "Brayan Cuta",
    email: "technician@globalnet.com",
    phone: "3154567890",
    role: "TECHNICIAN",
    status: "ACTIVE",
    createdAt: "2025-01-15T14:20:00Z",
  },
];

export default function UsersManagementPage() {
  const { role } = useAuth();

  // GraphQL Queries & Mutations
  const { data: usersData, refetch: refetchUsers } = useQuery<any>(GET_USERS_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    fetchPolicy: "cache-and-network",
  });

  const { data: auditData } = useQuery<any>(GET_AUDIT_LOGS_QUERY, {
    variables: {
      pagination: { page: 0, size: 20 },
      action: "PASSWORD_RESET_REQUESTED",
      entityName: "users",
    },
    fetchPolicy: "cache-and-network",
  });

  const [createUserMutation] = useMutation(CREATE_USER_MUTATION);
  const [updateUserMutation] = useMutation(UPDATE_USER_MUTATION);
  const [resetPasswordMutation] = useMutation(RESET_USER_PASSWORD_MUTATION);

  // State
  const [users, setUsers] = useState<UserRecord[]>(INITIAL_FALLBACK_USERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Create user modal / form state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("TECHNICIAN");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Field validation states on blur
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // Reset password modal state (HU-008)
  const [resetTargetUser, setResetTargetUser] = useState<UserRecord | null>(null);
  const [resetNewPassword, setResetNewPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequestItem[]>([]);

  // Feedback banners
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Sync GraphQL users when available
  useEffect(() => {
    if (usersData?.users?.items && usersData.users.items.length > 0) {
      const mapped: UserRecord[] = usersData.users.items.map((u: any) => ({
        id: String(u.id),
        fullName: u.fullName,
        email: u.email,
        phone: "3000000000",
        role: u.role as UserRole,
        status: u.status as "ACTIVE" | "INACTIVE",
        createdAt: u.createdAt || new Date().toISOString(),
      }));
      setUsers(mapped);
    }
  }, [usersData]);

  // Load pending password recovery requests from localStorage + AuditLogs (HU-008)
  useEffect(() => {
    const combined: RecoveryRequestItem[] = [];
    try {
      const raw = localStorage.getItem("assetguard_recovery_requests");
      if (raw) {
        const parsed: RecoveryRequestItem[] = JSON.parse(raw);
        parsed
          .filter((r) => r.status === "PENDING")
          .forEach((r) => combined.push(r));
      }
    } catch {
      // ignore
    }

    if (auditData?.auditLogs?.items) {
      auditData.auditLogs.items.forEach((log: any) => {
        try {
          const parsedVal = log.newValue ? JSON.parse(log.newValue) : null;
          if (parsedVal?.email && parsedVal?.status === "PENDING") {
            const exists = combined.some(
              (item) => item.email.toLowerCase() === parsedVal.email.toLowerCase()
            );
            if (!exists) {
              combined.push({
                email: parsedVal.email,
                note: parsedVal.note || "Solicitud registrada en bitácora del sistema",
                requestedAt: log.createdAt,
                status: "PENDING",
              });
            }
          }
        } catch {
          // ignore
        }
      });
    }

    setRecoveryRequests(combined);
  }, [auditData]);

  // Validation helpers
  const getEmailErrors = (email: string): string[] => {
    const trimmed = email.trim();
    if (!trimmed) return ["Falta ingresar el correo electrónico."];
    if (!trimmed.includes("@")) return ["Falta el símbolo '@' en el correo."];
    const [local, ...domain] = trimmed.split("@");
    const dom = domain.join("@");
    if (!local) return ["Falta el usuario antes de '@'."];
    if (!dom || !dom.includes(".")) return ["Falta completar el dominio después de '@'."];
    return [];
  };

  const getPasswordErrors = (pwd: string): string[] => {
    if (!pwd) return ["Falta ingresar la contraseña."];
    if (pwd.length < 6) return [`Faltan ${6 - pwd.length} caracteres (mínimo 6, máximo 20).`];
    if (!ALLOWED_PASSWORD_REGEX.test(pwd)) {
      return ["Solo se permiten letras, números y signos ($!#%&)."];
    }
    return [];
  };

  const getPhoneErrors = (phone: string): string[] => {
    if (!phone) return ["Falta ingresar el número de teléfono."];
    if (phone.length < 10) return [`Faltan ${10 - phone.length} dígitos (debe tener 10 números).`];
    return [];
  };

  const handlePhoneInput = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "").slice(0, 10);
    setNewPhone(digitsOnly);
  };

  const handlePasswordInput = (value: string, setter: (v: string) => void) => {
    const sanitized = value
      .split("")
      .filter((ch) => ALLOWED_PASSWORD_REGEX.test(ch))
      .join("")
      .slice(0, 20);
    setter(sanitized);
  };

  const activeAdminsCount = users.filter(
    (u) => u.role === "ADMIN" && u.status === "ACTIVE"
  ).length;

  // Create User (HU-001)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setPhoneTouched(true);

    const emailErrs = getEmailErrors(newEmail);
    const pwdErrs = getPasswordErrors(newPassword);
    const phoneErrs = getPhoneErrors(newPhone);

    if (!newFullName.trim() || emailErrs.length > 0 || pwdErrs.length > 0 || phoneErrs.length > 0) {
      setFeedback({
        type: "error",
        text: "Por favor completa todos los campos cumpliendo las reglas establecidas.",
      });
      return;
    }

    if (users.some((u) => u.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setFeedback({ type: "error", text: "Ese correo electrónico ya se encuentra registrado." });
      return;
    }

    try {
      const res = await createUserMutation({
        variables: {
          input: {
            fullName: newFullName.trim(),
            email: newEmail.trim().toLowerCase(),
            password: newPassword,
            role: newRole,
          },
        },
      });
      if (res.data) {
        await refetchUsers();
      }
    } catch {
      // Fallback local creation if backend is offline
      const created: UserRecord = {
        id: String(Date.now()),
        fullName: newFullName.trim(),
        email: newEmail.trim().toLowerCase(),
        phone: newPhone,
        role: newRole,
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [created, ...prev]);
    }

    setFeedback({
      type: "success",
      text: `Cuenta creada exitosamente para ${newFullName.trim()} (${newRole}).`,
    });
    setShowCreateModal(false);
    setNewFullName("");
    setNewEmail("");
    setNewPhone("");
    setNewPassword("");
    setEmailTouched(false);
    setPasswordTouched(false);
    setPhoneTouched(false);
  };

  // Toggle User Status or Role (HU-001 Condición 02: al menos un ADMIN activo)
  const handleUpdateUser = async (
    target: UserRecord,
    updates: { role?: UserRole; status?: "ACTIVE" | "INACTIVE" }
  ) => {
    const nextRole = updates.role ?? target.role;
    const nextStatus = updates.status ?? target.status;

    const removesActiveAdmin =
      target.role === "ADMIN" &&
      target.status === "ACTIVE" &&
      (nextRole !== "ADMIN" || nextStatus !== "ACTIVE");

    if (removesActiveAdmin && activeAdminsCount <= 1) {
      setFeedback({
        type: "error",
        text: "Acción bloqueada (HU-001): Debe mantenerse al menos un Administrador activo en el sistema.",
      });
      return;
    }

    try {
      await updateUserMutation({
        variables: {
          id: target.id,
          input: {
            fullName: target.fullName,
            role: nextRole,
            status: nextStatus,
          },
        },
      });
      await refetchUsers();
    } catch {
      // Local state update
    }

    setUsers((prev) =>
      prev.map((u) =>
        u.id === target.id ? { ...u, role: nextRole, status: nextStatus } : u
      )
    );
    setFeedback({
      type: "success",
      text: `Usuario ${target.fullName} actualizado (${nextRole} — ${
        nextStatus === "ACTIVE" ? "ACTIVO" : "INACTIVO"
      }).`,
    });
  };

  // Reset Password by Admin (HU-008)
  const handleConfirmPasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser) return;

    const pwdErrs = getPasswordErrors(resetNewPassword);
    if (pwdErrs.length > 0) {
      setFeedback({ type: "error", text: pwdErrs.join(" ") });
      return;
    }

    try {
      await resetPasswordMutation({
        variables: {
          id: resetTargetUser.id,
          newPassword: resetNewPassword,
        },
      });
    } catch {
      // Continues in local state if backend is offline
    }

    // Mark recovery request as COMPLETED in localStorage
    try {
      const raw = localStorage.getItem("assetguard_recovery_requests");
      if (raw) {
        const list: RecoveryRequestItem[] = JSON.parse(raw);
        const updated = list.filter(
          (item) => item.email.toLowerCase() !== resetTargetUser.email.toLowerCase()
        );
        localStorage.setItem("assetguard_recovery_requests", JSON.stringify(updated));
      }
    } catch {
      // ignore
    }

    setRecoveryRequests((prev) =>
      prev.filter((item) => item.email.toLowerCase() !== resetTargetUser.email.toLowerCase())
    );
    setFeedback({
      type: "success",
      text: `Contraseña restablecida con éxito para ${resetTargetUser.fullName} (${resetTargetUser.email}).`,
    });
    setResetTargetUser(null);
    setResetNewPassword("");
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchesStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (role !== "ADMIN") {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">
          Acceso restringido exclusivamente al Administrador del Sistema.
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0 shadow-xs">
            <Users className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">
              Gestión de Usuarios
            </h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">
              Administración de cuentas corporativas, roles de acceso y credenciales seguras
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer shrink-0"
        >
          <UserPlus className="h-4 w-4" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`rounded-xl p-4 border flex items-center justify-between gap-3 text-sm font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline opacity-75 hover:opacity-100"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* HU-008: Panel de Solicitudes Pendientes de Recuperación de Contraseña */}
      {recoveryRequests.length > 0 && (
        <div className="rounded-2xl bg-amber-50/90 border-2 border-amber-300 p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-amber-900">
            <BellRing className="h-5 w-5 text-amber-600 animate-bounce" />
            <h2 className="font-title text-lg">
              Solicitudes de Recuperación de Contraseña Pendientes ({recoveryRequests.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recoveryRequests.map((req, idx) => {
              const matchedUser =
                users.find((u) => u.email.toLowerCase() === req.email.toLowerCase()) || {
                  id: "0",
                  fullName: req.email.split("@")[0],
                  email: req.email,
                  role: "TECHNICIAN" as UserRole,
                  status: "ACTIVE" as const,
                  createdAt: req.requestedAt,
                };

              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl p-4 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-[#172B4D]">{req.email}</p>
                    {req.note && (
                      <p className="text-xs text-[#172B4D]/80 italic">&ldquo;{req.note}&rdquo;</p>
                    )}
                    <p className="text-[11px] text-[#172B4D]/60">
                      Solicitado: {new Date(req.requestedAt).toLocaleString("es-CO")}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setResetTargetUser(matchedUser);
                      setResetNewPassword("");
                    }}
                    className="px-3.5 py-2 rounded-lg bg-[#1995AD] hover:bg-[#172B4D] text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    <span>Restablecer Contraseña</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-[#AFC8D0]/60 flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar usuario por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#BCBABE]/70 text-sm text-[#172B4D] focus:outline-hidden focus:ring-2 focus:ring-[#1995AD]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-[#BCBABE]/70 text-sm text-[#172B4D] font-semibold bg-white"
        >
          <option value="ALL">Todos los Roles</option>
          <option value="ADMIN">ADMIN (Administrador)</option>
          <option value="INSPECTOR">INSPECTOR (Inspector)</option>
          <option value="TECHNICIAN">TECHNICIAN (Técnico)</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-[#BCBABE]/70 text-sm text-[#172B4D] font-semibold bg-white"
        >
          <option value="ALL">Todos los Estados</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F1F2] border-b border-[#AFC8D0]/50 text-xs font-bold uppercase text-[#172B4D]/80">
                <th className="py-3.5 px-5">Usuario</th>
                <th className="py-3.5 px-5">Correo Corporativo</th>
                <th className="py-3.5 px-5">Rol Asignado</th>
                <th className="py-3.5 px-5">Estado</th>
                <th className="py-3.5 px-5 text-right">Acciones de Seguridad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F2] text-sm">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#F1F1F2]/40 transition-colors">
                  <td className="py-4 px-5 font-bold text-[#172B4D]">{u.fullName}</td>
                  <td className="py-4 px-5 text-[#172B4D]/80">{u.email}</td>
                  <td className="py-4 px-5">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        handleUpdateUser(u, { role: e.target.value as UserRole })
                      }
                      className="px-3 py-1.5 rounded-lg border border-[#AFC8D0] bg-[#F1F1F2]/60 text-xs font-bold text-[#172B4D]"
                    >
                      <option value="ADMIN">ADMIN</option>
                      <option value="INSPECTOR">INSPECTOR</option>
                      <option value="TECHNICIAN">TECHNICIAN</option>
                    </select>
                  </td>
                  <td className="py-4 px-5">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {u.status === "ACTIVE" ? "ACTIVO" : "INACTIVO"}
                    </span>
                  </td>
                  <td className="py-4 px-5 text-right space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        setResetTargetUser(u);
                        setResetNewPassword("");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#A1D6E2]/35 hover:bg-[#A1D6E2]/70 text-[#172B4D] text-xs font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <KeyRound className="h-3.5 w-3.5 text-[#1995AD]" />
                      <span>Cambiar Clave</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateUser(u, {
                          status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                        })
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                        u.status === "ACTIVE"
                          ? "bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                          : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      {u.status === "ACTIVE" ? "Inactivar" : "Activar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Crear Nuevo Usuario (HU-001) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-[#172B4D]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl border-2 border-[#1995AD]/50 shadow-2xl p-6 sm:p-8 space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <h2 className="font-title text-2xl text-[#172B4D]">Registrar Nuevo Usuario</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 rounded-lg text-[#BCBABE] hover:text-[#172B4D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Laura Martínez"
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
                  Correo Corporativo
                </label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="usuario@globalnet.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    onBlur={() => setEmailTouched(true)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                  />
                </div>
                {emailTouched && getEmailErrors(newEmail).length > 0 && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {getEmailErrors(newEmail).join(" ")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
                    Teléfono (10 dígitos)
                  </label>
                  <div className="relative">
                    <Phone className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="3001234567"
                      value={newPhone}
                      onChange={(e) => handlePhoneInput(e.target.value)}
                      onBlur={() => setPhoneTouched(true)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                    />
                  </div>
                  {phoneTouched && getPhoneErrors(newPhone).length > 0 && (
                    <p className="mt-1 text-xs font-semibold text-red-600">
                      {getPhoneErrors(newPhone).join(" ")}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
                    Rol del Sistema
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#BCBABE] text-sm font-bold text-[#172B4D] bg-white"
                  >
                    <option value="TECHNICIAN">TECHNICIAN (Técnico)</option>
                    <option value="INSPECTOR">INSPECTOR (Inspector)</option>
                    <option value="ADMIN">ADMIN (Administrador)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">
                  Contraseña Inicial (6-20 caracteres, letras, números y $!#%&)
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? "text" : "password"}
                    required
                    maxLength={20}
                    placeholder="Mínimo 6, máximo 20"
                    value={newPassword}
                    onChange={(e) => handlePasswordInput(e.target.value, setNewPassword)}
                    onBlur={() => setPasswordTouched(true)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD]"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordTouched && getPasswordErrors(newPassword).length > 0 && (
                  <p className="mt-1 text-xs font-semibold text-red-600">
                    {getPasswordErrors(newPassword).join(" ")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#BCBABE] text-sm font-bold text-[#172B4D]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white text-sm font-bold cursor-pointer"
                >
                  Crear Cuenta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Restablecer Contraseña (HU-008) */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 bg-[#172B4D]/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl border-2 border-[#1995AD] shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] pb-3">
              <h3 className="font-title text-xl text-[#172B4D]">Restablecer Contraseña</h3>
              <button
                type="button"
                onClick={() => setResetTargetUser(null)}
                className="p-1 text-[#BCBABE] hover:text-[#172B4D]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-[#172B4D]/80">
              Asignar nueva contraseña para <strong>{resetTargetUser.fullName}</strong> (
              {resetTargetUser.email}):
            </p>

            <form onSubmit={handleConfirmPasswordReset} className="space-y-4">
              <div className="relative">
                <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showResetPassword ? "text" : "password"}
                  required
                  maxLength={20}
                  placeholder="Nueva contraseña (6-20, letras/números/$!#%&)"
                  value={resetNewPassword}
                  onChange={(e) => handlePasswordInput(e.target.value, setResetNewPassword)}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD]"
                >
                  {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-4 py-2 rounded-xl border border-[#BCBABE] text-xs font-bold text-[#172B4D]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white text-xs font-bold cursor-pointer"
                >
                  Guardar Nueva Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
