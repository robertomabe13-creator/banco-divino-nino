
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
} from "lucide-react";

export default function ConfigurarPinPage() {
  const router = useRouter();

  const [cedula, setCedula] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pin, setPin] = useState("");
  const [confirmarPin, setConfirmarPin] = useState("");
  const [mostrarPin, setMostrarPin] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [correcto, setCorrecto] = useState(false);

  async function configurar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!/^\d{10}$/.test(cedula)) {
      setError("Ingresa una cédula válida de 10 dígitos.");
      return;
    }

    if (!/^\d{6}$/.test(codigo)) {
      setError("El código temporal debe tener 6 dígitos.");
      return;
    }

    if (!/^\d{4}$/.test(pin)) {
      setError("El nuevo PIN debe tener 4 dígitos.");
      return;
    }

    if (pin !== confirmarPin) {
      setError("Los PIN no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const respuesta = await fetch("/api/socios/configurar-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ cedula, codigo, pin }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo configurar el PIN.");
      }

      setCorrecto(true);
      setCodigo("");
      setPin("");
      setConfirmarPin("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error."
      );
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6FA] px-3 py-6">
      <div className="w-full max-w-[430px] overflow-hidden rounded-[28px] bg-white shadow-xl">

        <header className="flex items-center gap-3 bg-[#142B50] px-5 py-5 text-white">
          <button
            onClick={() => router.push("/socios/login")}
            className="rounded-full bg-white/10 p-2"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex-1">
            <h1 className="text-sm font-extrabold">
              BANCO DIVINO NIÑO
            </h1>
            <p className="text-[11px] text-blue-100">
              Seguridad de tu cuenta
            </p>
          </div>

          <ShieldCheck size={27} className="text-[#F4C400]" />
        </header>

        <section className="px-6 pb-8 pt-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF5D6]">
            <KeyRound size={32} className="text-[#C69B00]" />
          </div>

          <h2 className="mt-5 text-center text-xl font-extrabold text-[#142B50]">
            {correcto ? "PIN configurado" : "Crear nuevo PIN"}
          </h2>

          <p className="mt-2 text-center text-xs leading-relaxed text-slate-500">
            {correcto
              ? "Tu nuevo PIN fue guardado correctamente."
              : "Ingresa el código temporal que te entregó el administrador para configurar tu PIN de acceso."}
          </p>

          {correcto ? (
            <div className="mt-7">
              <div className="rounded-2xl bg-green-50 p-5 text-center">
                <CheckCircle2
                  size={35}
                  className="mx-auto text-green-600"
                />
                <p className="mt-3 text-sm font-bold text-green-800">
                  Operación completada
                </p>
                <p className="mt-1 text-xs text-green-700">
                  Ya puedes utilizar tu nuevo PIN.
                </p>
              </div>

              <button
                onClick={() => router.replace("/socios/login")}
                className="mt-5 w-full rounded-xl bg-[#142B50] py-4 text-sm font-bold text-white"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <form onSubmit={configurar} className="mt-7 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold text-[#142B50]">
                  Número de cédula
                </label>
                <input
                  value={cedula}
                  onChange={(e) =>
                    setCedula(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Ingresa tus 10 dígitos"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm text-[#142B50] outline-none focus:border-[#D5A900]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#142B50]">
                  Código temporal
                </label>
                <input
                  value={codigo}
                  onChange={(e) =>
                    setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Código de 6 dígitos"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm tracking-widest text-[#142B50] outline-none focus:border-[#D5A900]"
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#142B50]">
                  Nuevo PIN
                </label>
                <div className="relative">
                  <input
                    type={mostrarPin ? "text" : "password"}
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="4 dígitos"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pr-12 text-sm tracking-[8px] text-[#142B50] outline-none focus:border-[#D5A900]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPin(!mostrarPin)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {mostrarPin ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-bold text-[#142B50]">
                  Confirmar nuevo PIN
                </label>
                <input
                  type={mostrarPin ? "text" : "password"}
                  value={confirmarPin}
                  onChange={(e) =>
                    setConfirmarPin(
                      e.target.value.replace(/\D/g, "").slice(0, 4)
                    )
                  }
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="Repite los 4 dígitos"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 text-sm tracking-[8px] text-[#142B50] outline-none focus:border-[#D5A900]"
                  required
                />
              </div>

              {error && (
                <p className="rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={cargando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#142B50] py-4 text-sm font-bold text-white disabled:opacity-50"
              >
                {cargando ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar nuevo PIN"
                )}
              </button>
            </form>
          )}

          <div className="mt-6 rounded-xl bg-[#FFF9E8] p-4">
            <p className="text-[11px] leading-relaxed text-[#80651A]">
              Por seguridad, el código temporal es de un solo uso y vence
              después de 24 horas. Si no tienes uno, solicítalo al administrador.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
