import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || "").trim().toLowerCase();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { message: "Debe ingresar un correo electrónico válido." },
        { status: 400 }
      );
    }

    const backendUrl = process.env.BACKEND_URL || "http://localhost:8080";

    // 1. Solicitar al backend Spring Boot la creación del token y auditoría
    const backendRes = await fetch(`${backendUrl}/api/auth/password-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null);

    if (backendRes && backendRes.status === 404) {
      const errData = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { message: errData.message || "No se encontró ninguna cuenta registrada con ese correo electrónico." },
        { status: 404 }
      );
    }

    // 2. Ejecutar el despachador SMTP (verifica si el backend ya lo envió y, de no ser así, lo envía en el acto)
    const projectRoot = path.resolve(process.cwd(), "..");
    const classesDir = path.join(projectRoot, "backend", "target", "classes");
    const mailLibsDir = path.join(projectRoot, "backend", "target", "mail-libs", "*");

    const defaultJavaPath = "C:\\Users\\maria\\AppData\\Local\\Programs\\Eclipse Adoptium\\jdk-25.0.3.9-hotspot\\bin\\java.exe";
    const javaBin = fs.existsSync(defaultJavaPath) ? defaultJavaPath : "java";

    const { stdout } = await execFileAsync(
      javaBin,
      [
        "-Djava.net.preferIPv4Stack=true",
        "-cp",
        `${classesDir};${mailLibsDir}`,
        "com.globalnet.assetguard.infrastructure.auth.StandaloneRecoveryMailer",
        email,
      ],
      { timeout: 20000 }
    );

    const out = (stdout || "").trim();
    if (out.includes("USER_NOT_FOUND")) {
      return NextResponse.json(
        { message: "No se encontró ninguna cuenta registrada con ese correo electrónico." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Hemos enviado un enlace de recuperación a tu correo electrónico. Por favor revisa tu bandeja de entrada o spam.",
    });
  } catch (err: any) {
    const stdout = (err?.stdout || "").toString();
    if (stdout.includes("USER_NOT_FOUND")) {
      return NextResponse.json(
        { message: "No se encontró ninguna cuenta registrada con ese correo electrónico." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { message: "No se pudo enviar el correo de recuperación. Verifica tu conexión a internet." },
      { status: 500 }
    );
  }
}
