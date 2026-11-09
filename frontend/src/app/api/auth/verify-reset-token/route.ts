import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";

const execFileAsync = promisify(execFile);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = (searchParams.get("token") || "").trim();
    const email = (searchParams.get("email") || "").trim().toLowerCase();

    if (!token || !email) {
      return NextResponse.json(
        { valid: false, message: "Faltan parámetros del enlace de recuperación." },
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
        "VERIFY",
        token,
        email,
      ],
      { timeout: 10000 }
    );

    const out = (stdout || "").trim();
    if (out.includes("TOKEN_VALID")) {
      return NextResponse.json({
        valid: true,
        message: "Enlace verificado correctamente.",
      });
    }

    return NextResponse.json(
      {
        valid: false,
        message:
          "El enlace de recuperación es inválido, ya fue utilizado o ha expirado.",
      },
      { status: 403 }
    );
  } catch {
    return NextResponse.json(
      {
        valid: false,
        message:
          "El enlace de recuperación es inválido, ya fue utilizado o ha expirado.",
      },
      { status: 403 }
    );
  }
}
