
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserRound,
  CreditCard,
  ArrowLeft,
  ShieldCheck,
  Loader2,
  LockKeyhole,
  Eye,
  EyeOff,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function SociosLoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [cedula, setCedula] = useState("");
  const [pin, setPin] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function continuar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!/^\d{10}$/.test(cedula)) {
      setError("Ingresa una cédula válida de 10 dígitos.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("Ingresa tu PIN de 4 dígitos.");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch("/api/socios/validar-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cedula, pin }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo iniciar sesión.");
        return;
      }

      if (!resultado.token_hash) {
        setError("No se recibió el código de autenticación.");
        return;
      }

      const { error: sesionError } = await supabase.auth.verifyOtp({
        token_hash: resultado.token_hash,
        type: "magiclink",
      });

      if (sesionError) {
        setError("No se pudo establecer la sesión. Contacta al administrador.");
        return;
      }

      router.replace("/socios");
      router.refresh();
    } catch {
      setError("Error de conexión. Inténtalo nuevamente.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#eef1f5] flex justify-center">
      <section className="w-full max-w-[430px] min-h-screen bg-white px-7 py-7 flex flex-col">
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[#092957] text-sm font-semibold"
          >
            <ArrowLeft size={19} />
            Volver
          </Link>

          <span className="text-[10px] font-bold tracking-wider text-gray-400">
            BANCA MÓVIL
          </span>
        </header>

        <div className="flex-1 flex flex-col justify-center">
          <div className="w-16 h-16 rounded-2xl bg-[#fff4b8] text-[#092957] flex items-center justify-center mb-7">
            <UserRound size={32} strokeWidth={1.7} />
          </div>

          <p className="text-xs font-bold tracking-[2px] text-[#b49a00] mb-2">
            ACCESO DE SOCIOS
          </p>

          <h1 className="text-[29px] leading-tight font-extrabold text-[#092957]">
            Bienvenido
          </h1>

          <p className="text-sm text-gray-500 mt-3 leading-6">
            Ingresa tu cédula y tu PIN de seguridad para acceder a tu banca móvil.
          </p>

          <form onSubmit={continuar} className="mt-9">
            <label className="block text-sm font-bold text-[#092957] mb-2">
              Número de cédula
            </label>

            <div className="h-14 border border-gray-200 rounded-xl flex items-center px-4 gap-3 focus-within:border-[#d6b900]">
              <CreditCard size={20} className="text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                autoComplete="username"
                maxLength={10}
                required
                value={cedula}
                onChange={(e) => {
                  setCedula(e.target.value.replace(/\D/g, "").slice(0, 10));
                  setError("");
                }}
                placeholder="Ingresa tu cédula"
                className="w-full outline-none text-[#092957] text-sm bg-transparent"
              />
            </div>

            <label className="block text-sm font-bold text-[#092957] mt-6 mb-2">
              PIN de seguridad
            </label>

            <div className="h-14 border border-gray-200 rounded-xl flex items-center px-4 gap-3 focus-within:border-[#d6b900]">
              <LockKeyhole size={20} className="text-gray-400" />
              <input
                type={mostrarPin ? "text" : "password"}
                inputMode="numeric"
                autoComplete="current-password"
                maxLength={4}
                required
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 4));
                  setError("");
                }}
                placeholder="••••"
                className="w-full outline-none text-[#092957] text-sm bg-transparent tracking-[8px]"
              />
              <button
                type="button"
                onClick={() => setMostrarPin(!mostrarPin)}
                className="text-gray-400"
                aria-label={mostrarPin ? "Ocultar PIN" : "Mostrar PIN"}
              >
                {mostrarPin ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full h-14 mt-6 rounded-xl bg-[#ffdc00] text-[#092957] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#f1ce00] disabled:opacity-60"
            >
              {cargando ? (
                <>
                  <Loader2 size={19} className="animate-spin" />
                  Verificando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>

          <Link
            href="/socios/configurar-pin"
            className="mt-5 flex items-center justify-center gap-2 text-sm font-bold text-[#092957] hover:text-[#b49a00]"
          >
            <KeyRound size={17} />
            ¿Olvidaste tu PIN?
          </Link>

          <div className="mt-7 flex items-start gap-3 rounded-xl bg-[#f7f8fa] p-4">
            <ShieldCheck size={20} className="text-[#092957] shrink-0" />
            <p className="text-xs text-gray-500 leading-5">
              Tu información financiera es privada y está protegida.
            </p>
          </div>
        </div>

        <footer className="text-center pt-5">
          <p className="text-xs font-bold text-[#092957]">BANCO DIVINO NIÑO</p>
          <p className="text-[10px] text-gray-400 mt-1">
            Tu confianza, nuestro compromiso.
          </p>
        </footer>
      </section>
    </main>
  );
}
