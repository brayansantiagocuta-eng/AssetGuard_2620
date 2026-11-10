"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "@apollo/client/react";
import { useAuth, type UserRole } from "@/context/AuthContext";
import { CustomSelect, SelectOption } from "@/components/ui/CustomSelect";
import { GET_USERS_QUERY } from "@/lib/graphql/queries";
import { CREATE_USER_MUTATION, UPDATE_USER_MUTATION } from "@/lib/graphql/mutations";
import { recordAuditEvent } from "@/lib/auditLogger";
import { subscribeToSync, broadcastSyncEvent } from "@/lib/crossTabSync";
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Power,
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

const ALLOWED_PASSWORD_REGEX = /^[a-zA-Z0-9@#$*_!\-%&.?+=/()[\]{}|~^:;<>]*$/;

const USERS_CACHE_KEY = "assetguard_users_cache_v2";

const INITIAL_FALLBACK_USERS: UserRecord[] = [
  { id: "1", fullName: "Angie Ramos", email: "valesotelo.0806@gmail.com", phone: "3001234567", role: "ADMIN", status: "ACTIVE", createdAt: "2026-10-23T08:00:00Z" },
  { id: "2", fullName: "Ian Sanchez", email: "lasanita0204@gmail.com", phone: "3109876543", role: "INSPECTOR", status: "ACTIVE", createdAt: "2026-10-23T09:30:00Z" },
  { id: "3", fullName: "Brayan Cuta", email: "brayansantiagocuta@gmail.com", phone: "3154567890", role: "TECHNICIAN", status: "ACTIVE", createdAt: "2026-10-23T14:20:00Z" },
  { id: "6", fullName: "Johan Muñoz", email: "johan@gml.com", phone: "3000000000", role: "TECHNICIAN", status: "INACTIVE", createdAt: "2026-10-28T09:03:10Z" },
  { id: "8", fullName: "johan castiblanco", email: "johanmunoz342@gmail.com", phone: "3000000000", role: "ADMIN", status: "ACTIVE", createdAt: "2026-10-30T10:45:58Z" },
];

const sanitizeUserRecord = (u: UserRecord): UserRecord => {
  const emailLower = (u.email || "").trim().toLowerCase();
  if (
    u.id === "1" ||
    u.id === "8" ||
    emailLower === "valesotelo.0806@gmail.com" ||
    emailLower === "admin@globalnet.com" ||
    emailLower === "johanmunoz342@gmail.com"
  ) {
    return { ...u, role: "ADMIN", status: "ACTIVE" };
  }
  return u;
};

const ROLE_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "Todos los Roles" },
  { value: "ADMIN", label: "Administrador" },
  { value: "INSPECTOR", label: "Inspector" },
  { value: "TECHNICIAN", label: "Técnico" },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: "ALL", label: "Todos los Estados" },
  { value: "ACTIVE", label: "Activos" },
  { value: "INACTIVE", label: "Inactivos" },
];

const TABLE_ROLES: SelectOption[] = [
  { value: "ADMIN", label: "Administrador" },
  { value: "INSPECTOR", label: "Inspector" },
  { value: "TECHNICIAN", label: "Técnico" },
];

const MODAL_ROLES: SelectOption[] = [
  { value: "TECHNICIAN", label: "Técnico" },
  { value: "INSPECTOR", label: "Inspector" },
  { value: "ADMIN", label: "Administrador" },
];

const formatRoleLabel = (r: UserRole): string =>
  r === "ADMIN" ? "Administrador" : r === "INSPECTOR" ? "Inspector" : "Técnico";

// Validaciones puras desacopladas del render
const validateUserEmail = (email: string, userList: UserRecord[]) => {
  const t = email.trim();
  const at = t.split("@");
  const local = at[0] || "";
  const domain = at[1] || "";
  const errs: string[] = [];

  if (!t) return { isValid: false, errors: ["Falta ingresar el correo electrónico corporativo."] };
  if (/\s/.test(email)) errs.push("No se permiten espacios en la dirección de correo.");
  if (at.length !== 2) errs.push("Debe contener un único símbolo '@'.");
  if (local.length < 3) errs.push("El usuario debe tener mínimo 3 caracteres.");
  if (!/^[a-zA-Z0-9._-]+$/.test(local)) errs.push("Sin símbolos prohibidos (#, $, %, &, *, espacios).");
  if (/^\d+$/.test(local)) errs.push("Nombre profesional (mín. 3 letras, no solo números).");
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) errs.push("Sin puntos al inicio, al final ni seguidos (..).");
  if (!domain.includes(".") || domain.startsWith(".") || domain.endsWith(".") || !/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(domain)) {
    errs.push("Dominio seguro con extensión (ej: @globalnet.com, @gmail.com).");
  }
  if (userList.some((u) => u.email.toLowerCase() === t.toLowerCase())) errs.push("Esta dirección ya se encuentra registrada en el sistema.");

  return { isValid: errs.length === 0, errors: errs };
};

const validateUserPassword = (pwd: string): string[] => {
  if (!pwd) return ["Falta ingresar la contraseña."];
  if (pwd.length < 6) return [`Faltan ${6 - pwd.length} caracteres (mínimo 6, máximo 20).`];
  if (!ALLOWED_PASSWORD_REGEX.test(pwd)) return ["Solo se permiten letras, números y símbolos permitidos."];
  if (!/[A-Z]/.test(pwd) || !/[a-z]/.test(pwd) || !/[0-9]/.test(pwd) || !/[@#$*_!\-%&.?+=/()[\]{}|~^:;<>]/.test(pwd)) {
    return ["La contraseña debe combinar mayúsculas (A-Z), minúsculas (a-z), números (0-9) y símbolos especiales."];
  }
  return [];
};

const validateUserPhone = (phone: string): string[] => {
  if (!phone) return ["Falta ingresar el número de teléfono."];
  if (phone.length < 10) return [`Faltan ${10 - phone.length} dígitos (debe tener 10 números).`];
  return [];
};

export default function UsersManagementPage() {
  const { role } = useAuth();

  const { data: usersData, refetch: refetchUsers } = useQuery<any>(GET_USERS_QUERY, {
    variables: { pagination: { page: 0, size: 50 } },
    fetchPolicy: "cache-and-network",
  });
  const [createUserMutation] = useMutation<any>(CREATE_USER_MUTATION);
  const [updateUserMutation] = useMutation<any>(UPDATE_USER_MUTATION);

  const [users, setUsers] = useState<UserRecord[]>(INITIAL_FALLBACK_USERS);

  useEffect(() => {
    const reloadLocalUsers = () => {
      try {
        localStorage.removeItem("assetguard_users_cache_v1");
        const saved = localStorage.getItem(USERS_CACHE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length >= INITIAL_FALLBACK_USERS.length) {
            setUsers(parsed.map(sanitizeUserRecord));
          }
        }
      } catch {}
      if (refetchUsers) void refetchUsers();
    };

    reloadLocalUsers();

    const unsubUsers = subscribeToSync("USERS_SYNC", () => {
      reloadLocalUsers();
    });

    return () => {
      unsubUsers();
    };
  }, [refetchUsers]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Formulario y modal de creación
  const [showModal, setShowModal] = useState(false);
  const [newForm, setNewForm] = useState({ fullName: "", email: "", phone: "", role: "TECHNICIAN" as UserRole, password: "", showPwd: false });
  const [touched, setTouched] = useState({ email: false, phone: false, password: false });
  const [isMounted, setIsMounted] = useState(false);
  const modalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [showModal]);

  useEffect(() => {
    if (usersData?.users?.items?.length) {
      const mapped: UserRecord[] = usersData.users.items.map((u: any) =>
        sanitizeUserRecord({
          id: String(u.id),
          fullName: u.fullName,
          email: u.email,
          phone: "3000000000",
          role: u.role as UserRole,
          status: u.status as "ACTIVE" | "INACTIVE",
          createdAt: u.createdAt || new Date().toISOString(),
        })
      );
      setUsers(mapped);
      try {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(mapped));
      } catch {}
    }
  }, [usersData]);

  useEffect(() => {
    try {
      if (users.length > 0) {
        localStorage.setItem(USERS_CACHE_KEY, JSON.stringify(users));
      }
    } catch {}
  }, [users]);

  const activeAdminsCount = useMemo(() => users.filter((u) => u.role === "ADMIN" && u.status === "ACTIVE").length, [users]);

  const emailValidation = useMemo(() => validateUserEmail(newForm.email, users), [newForm.email, users]);
  const pwdErrors = useMemo(() => validateUserPassword(newForm.password), [newForm.password]);
  const phoneErrors = useMemo(() => validateUserPhone(newForm.phone), [newForm.phone]);

  const handleOpenModal = () => {
    setNewForm({ fullName: "", email: "", phone: "", role: "TECHNICIAN", password: "", showPwd: false });
    setTouched({ email: false, phone: false, password: false });
    setShowModal(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ email: true, phone: true, password: true });

    if (!newForm.fullName.trim() || !emailValidation.isValid || pwdErrors.length || phoneErrors.length) {
      setFeedback({ type: "error", text: "Por favor corrige los campos señalados para cumplir con las condiciones requeridas." });
      return;
    }

    try {
      const res = await createUserMutation({
        variables: {
          input: {
            fullName: newForm.fullName.trim(),
            email: newForm.email.trim().toLowerCase(),
            password: newForm.password,
            role: newForm.role,
          },
        },
      });

      if (res.data?.createUser) {
        const u = res.data.createUser;
        const created: UserRecord = {
          id: String(u.id),
          fullName: u.fullName,
          email: u.email || newForm.email.trim().toLowerCase(),
          phone: newForm.phone.trim() || "3000000000",
          role: (u.role as UserRole) || newForm.role,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
        };
        setUsers((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
        void refetchUsers();
        broadcastSyncEvent("USERS_SYNC");
        recordAuditEvent({
          userName: "Administrador",
          userRole: "Administrador",
          actionCode: "CREATE_USER",
          actionTitle: "Registro de Usuario",
          actionDescription: `Creó la cuenta corporativa de ${u.fullName} (${newForm.email}) con rol ${formatRoleLabel((u.role as UserRole) || newForm.role)}`,
          actionCategory: "USER",
          entityName: "Usuarios",
        });
        setFeedback({ type: "success", text: `Usuario ${u.fullName} (${formatRoleLabel((u.role as UserRole) || newForm.role)}) registrado exitosamente.` });
        setShowModal(false);
      }
    } catch (err: any) {
      setFeedback({ type: "error", text: `Error al registrar usuario: ${err?.graphQLErrors?.[0]?.message || err?.message || "No fue posible guardar."}` });
    }
  };

  const handleUpdateUser = async (target: UserRecord, updates: { role?: UserRole; status?: "ACTIVE" | "INACTIVE" }) => {
    const nextRole = updates.role ?? target.role;
    const nextStatus = updates.status ?? target.status;

    if (target.role === "ADMIN" && nextRole !== "ADMIN") {
      setFeedback({ type: "error", text: "Acción bloqueada: Un Administrador no puede cambiar su rol." });
      return;
    }

    if (target.role === "ADMIN" && target.status === "ACTIVE" && nextStatus !== "ACTIVE" && activeAdminsCount <= 1) {
      setFeedback({ type: "error", text: "Acción bloqueada: Debe mantenerse al menos un Administrador activo en el sistema." });
      return;
    }

    try {
      await updateUserMutation({
        variables: { id: target.id, input: { fullName: target.fullName, role: nextRole, status: nextStatus } },
      });
      await refetchUsers();
    } catch (err: unknown) {
      const errorObj = err as { graphQLErrors?: Array<{ message?: string }>; message?: string };
      const backendMsg = errorObj?.graphQLErrors?.[0]?.message || errorObj?.message;
      if (backendMsg && backendMsg.includes("Administrador")) {
        setFeedback({ type: "error", text: backendMsg });
        return;
      }
    }

    setUsers((prev) => prev.map((u) => (u.id === target.id ? { ...u, role: nextRole, status: nextStatus } : u)));
    broadcastSyncEvent("USERS_SYNC");
    recordAuditEvent({
      userName: "Administrador",
      userRole: "Administrador",
      actionCode: "UPDATE_USER",
      actionTitle: "Actualización de Usuario",
      actionDescription: `Modificó la cuenta de ${target.fullName} (Rol: ${formatRoleLabel(nextRole)}, Estado: ${nextStatus === "ACTIVE" ? "Activo" : "Inactivo"})`,
      actionCategory: "USER",
      entityName: "Usuarios",
    });
    setFeedback({ type: "success", text: `Usuario ${target.fullName} actualizado (${formatRoleLabel(nextRole)} — ${nextStatus === "ACTIVE" ? "ACTIVO" : "INACTIVO"}).` });
  };

  const filteredUsers = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchQ = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchR = roleFilter === "ALL" || u.role === roleFilter;
      const matchS = statusFilter === "ALL" || u.status === statusFilter;
      return matchQ && matchR && matchS;
    });
  }, [users, search, roleFilter, statusFilter]);

  if (role !== "ADMIN") {
    return (
      <div className="max-w-4xl mx-auto p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">Acceso restringido exclusivamente al Administrador del Sistema.</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Cabecera */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-[#AFC8D0]/60 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-[#1995AD]/15 border border-[#1995AD]/30 flex items-center justify-center text-[#1995AD] shrink-0">
            <Users className="h-7 w-7 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="font-title text-3xl sm:text-4xl text-[#172B4D] tracking-tight">Gestión de Usuarios</h1>
            <p className="text-sm text-[#172B4D]/70 mt-0.5">Administración de cuentas corporativas, roles de acceso y credenciales seguras</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleOpenModal}
          className="px-5 py-3 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white font-bold text-sm inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
        >
          <UserPlus className="h-4 w-4" />
          <span>Registrar</span>
        </button>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div className={`rounded-xl p-4 border flex items-center justify-between gap-3 text-sm font-semibold ${feedback.type === "success" ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-red-50 border-red-200 text-red-700"}`}>
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" /> : <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs underline opacity-75 hover:opacity-100 cursor-pointer">Cerrar</button>
        </div>
      )}

      {/* Buscador y Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-[#AFC8D0]/60 flex flex-col sm:flex-row items-center gap-3 relative z-10">
        <div className="relative flex-1 w-full">
          <Search className="h-4 w-4 text-[#1995AD] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar usuario por nombre o correo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#BCBABE]/70 text-sm text-[#172B4D] focus:ring-2 focus:ring-[#1995AD]"
          />
        </div>
        <div className="w-full sm:w-64"><CustomSelect value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} ariaLabel="Filtrar rol" /></div>
        <div className="w-full sm:w-56"><CustomSelect value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} ariaLabel="Filtrar estado" /></div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-[#AFC8D0]/60 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F1F1F2] border-b border-[#AFC8D0]/50 text-xs font-bold uppercase text-[#172B4D]/80">
                <th className="py-3.5 px-5">Usuario</th>
                <th className="py-3.5 px-5">Correo Corporativo</th>
                <th className="py-3.5 px-5">Rol Asignado</th>
                <th className="py-3.5 px-5 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F1F2] text-sm">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#F1F1F2]/40 transition-colors">
                  <td className="py-4 px-5 font-bold text-[#172B4D]">{u.fullName}</td>
                  <td className="py-4 px-5 text-[#172B4D]/80">{u.email}</td>
                  <td className="py-4 px-5">
                    <div className="w-44" title={u.role === "ADMIN" ? "El rol de Administrador es permanente y no puede modificarse" : undefined}>
                      <CustomSelect
                        value={u.role}
                        onChange={(val) => handleUpdateUser(u, { role: val as UserRole })}
                        options={TABLE_ROLES}
                        size="sm"
                        disabled={u.role === "ADMIN"}
                      />
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      type="button"
                      onClick={() => handleUpdateUser(u, { status: u.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
                      title={u.status === "ACTIVE" ? "Activo — Clic para inactivar" : "Inactivo — Clic para activar"}
                      className={`inline-flex items-center justify-center h-8 w-8 rounded-xl transition-all cursor-pointer shadow-xs ${
                        u.status === "ACTIVE"
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25"
                          : "bg-red-500 hover:bg-red-600 text-white shadow-red-500/25"
                      }`}
                    >
                      <Power className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Nuevo Usuario */}
      {isMounted && showModal && createPortal(
        <div onClick={() => setShowModal(false)} className="fixed inset-0 z-[99999] overflow-y-auto bg-slate-900/65 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
          <div onClick={(e) => e.stopPropagation()} className="bg-white w-full max-w-lg rounded-3xl border-2 border-[#1995AD]/50 shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto relative z-10">
            <div className="flex items-center justify-between border-b border-[#F1F1F2] p-5 pb-3 shrink-0">
              <h2 className="font-title text-2xl text-[#172B4D]">Registrar</h2>
              <button type="button" onClick={() => setShowModal(false)} className="p-1.5 rounded-lg text-[#BCBABE] hover:text-[#172B4D] cursor-pointer"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreateUser} noValidate autoComplete="off" data-lpignore="true" className="flex flex-col flex-1 overflow-hidden">
              {/* Campos falsos invisibles para atrapar cualquier intento del gestor de contraseñas de autofill */}
              <input type="text" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />
              <input type="password" style={{ display: "none" }} aria-hidden="true" tabIndex={-1} />

              <div ref={modalBodyRef} className="p-5 sm:p-6 space-y-4 text-sm overflow-y-auto flex-1">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Laura Martínez"
                    value={newForm.fullName}
                    autoComplete="off"
                    name="new_user_fullname_no_auto"
                    onChange={(e) => setNewForm({ ...newForm, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Correo Electrónico Corporativo</label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="email"
                      required
                      placeholder="ej: nombre.apellido@globalnet.com"
                      value={newForm.email}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      name="assetguard_new_email_unique_input"
                      id="assetguard_new_email_input"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                      onBlur={() => setTouched({ ...touched, email: true })}
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D] focus:ring-2 focus:ring-[#1995AD]"
                    />
                  </div>
                  {(touched.email || newForm.email.length > 0) && !emailValidation.isValid && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 space-y-1">
                      {emailValidation.errors.map((err, i) => (
                        <p key={i} className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" /><span>{err}</span>
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                {/* Teléfono & Rol */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Teléfono (10 dígitos)</label>
                    <div className="relative">
                      <Phone className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        placeholder="3001234567"
                        value={newForm.phone}
                        autoComplete="off"
                        name="new_user_phone_no_auto"
                        onChange={(e) => setNewForm({ ...newForm, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                        onBlur={() => setTouched({ ...touched, phone: true })}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D]"
                      />
                    </div>
                    {touched.phone && phoneErrors.length > 0 && <p className="mt-1 text-xs font-semibold text-red-600">{phoneErrors.join(" ")}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Rol del Sistema</label>
                    <CustomSelect value={newForm.role} onChange={(val) => setNewForm({ ...newForm, role: val as UserRole })} options={MODAL_ROLES} size="md" />
                  </div>
                </div>

                {/* Contraseña */}
                <div>
                  <label className="block text-xs font-bold uppercase text-[#172B4D] mb-1">Contraseña Única</label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-[#1995AD] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      maxLength={20}
                      placeholder="Define una contraseña segura"
                      value={newForm.password}
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      name="assetguard_new_password_unique_input"
                      id="assetguard_new_password_input"
                      data-lpignore="true"
                      data-1p-ignore="true"
                      data-form-type="other"
                      style={!newForm.showPwd && newForm.password ? ({ WebkitTextSecurity: "disc" } as React.CSSProperties) : undefined}
                      onChange={(e) => {
                        const clean = e.target.value.split("").filter((ch) => ALLOWED_PASSWORD_REGEX.test(ch)).join("").slice(0, 20);
                        setNewForm({ ...newForm, password: clean });
                      }}
                      onBlur={() => setTouched({ ...touched, password: true })}
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-[#BCBABE] text-sm text-[#172B4D] focus:ring-2 focus:ring-[#1995AD]"
                    />
                    <button type="button" onClick={() => setNewForm({ ...newForm, showPwd: !newForm.showPwd })} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#BCBABE] hover:text-[#1995AD] cursor-pointer">
                      {newForm.showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {(touched.password || newForm.password.length > 0) && pwdErrors.length > 0 && (
                    <div className="mt-1.5 p-2 rounded-xl bg-amber-50 border border-amber-300 text-xs font-semibold text-amber-800 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" /><span>{pwdErrors.join(" ")}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 p-4 bg-[#F8FAFC] border-t border-[#F1F1F2] shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-[#BCBABE] text-sm font-bold text-[#172B4D] cursor-pointer">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#1995AD] hover:bg-[#172B4D] text-white text-sm font-bold cursor-pointer transition-colors shadow-sm">Registrar</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
