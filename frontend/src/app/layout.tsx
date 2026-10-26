import type { Metadata } from "next";
import { Doppio_One } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/AppProviders";
import { Navbar } from "@/components/layout/Navbar";

const doppioOne = Doppio_One({
  weight: "400",
  variable: "--font-doppio-one",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AssetGuard_2620 - GlobalNet Telecom | Control y Custodia de Activos",
  description:
    "Plataforma integral de inventario, préstamo con OTP, escaneo QR y control de activos para GlobalNet Telecom",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${doppioOne.variable} h-full antialiased`}
    >
      <body className="min-h-full flex bg-[#F1F1F2] text-[#172B4D] font-sans">
        <AppProviders>
          <div className="flex min-h-screen w-full bg-[#F1F1F2]">
            {/* Barra lateral izquierda (solo íconos, muestra el nombre al pasar el mouse) */}
            <Navbar />

            {/* Contenido principal a la derecha de la barra lateral */}
            <div className="flex-1 flex flex-col min-w-0">
              <main className="flex-1 flex flex-col bg-[#F1F1F2]">{children}</main>
            </div>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}
