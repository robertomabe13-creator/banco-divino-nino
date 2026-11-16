
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Banco Divino Niño | Banca Móvil",
  description: "Banca móvil Banco Divino Niño",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
