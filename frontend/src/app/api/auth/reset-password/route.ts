import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim().toLowerCase();
    const token = (body?.token || "").trim();
    const newPassword = (body?.newPassword || "").trim();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { message: "Todos los campos son obligatorios." },
        { status: 400 }
      );
    }

    const projectRoot = path.resolve(process.cwd(), "..");
    const classesDir = path.join(projectRoot, "backend", "target", "classes");
    const mailLibsDir = path.join(projectRoot, "backend", "target", "mail-libs", "*");

    const javaBin = process.env.JAVA_BIN || (process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", "java") : "java");

    const { stdout } = await execFileAsync(
      javaBin,
      [
        "-Djava.net.preferIPv4Stack=true",
        "-cp",
        `${classesDir};${mailLibsDir}`,
        "com.globalnet.assetguard.infrastructure.auth.StandaloneRecoveryMailer",
        "RESET",
        token,
        email,
        newPassword,
      ],
      { timeout: 15000 }
    );

    const out = (stdout || "").trim();
    if (out.includes("RESET_OK")) {
      const parts = out.split("RESET_OK:");
      const userName = (parts[1] || email).trim();
      return NextResponse.json({
        message:
          "Contraseña actualizada exitosamente. Se ha notificado al administrador.",
        userName,
      });
    }

    return NextResponse.json(
      { message: "No se pudo actualizar la contraseña." },
      { status: 400 }
    );
  } catch (err: any) {
    const stdout = (err?.stdout || "").toString().trim();
    if (stdout.includes("ERR:")) {
      const msg = stdout.split("ERR:")[1]?.trim() || "Error al actualizar la contraseña.";
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    return NextResponse.json(
      {
        message:
          "El enlace de recuperación es inválido, ya fue utilizado o ha expirado.",
      },
      { status: 400 }
    );
  }
}
