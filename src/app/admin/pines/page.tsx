
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  ShieldCheck,
  KeyRound,
  RefreshCw,
  Copy,
  CheckCircle2,
  AlertCircle,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Socio = {
  id: number;
  nombres: string;
  apellidos: string;
  cedula: string;
  estado: string;
  pin_configurado: boolean;
};

export default function PinesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [socios, setSocios] = useState<Socio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [codigoGenerado, setCodigoGenerado] = useState("");
  const [socioSeleccionado, setSocioSeleccionado] = useState("");

  async function cargarSocios() {
    setCargando(true);
    setError("");

    const { data: sesion } = await supabase.auth.getSession();

    if (!sesion.session) {
      router.replace("/admin/login");
      return;
    }

    const { data: admin } = await supabase
      .from("admin_fondo")
      .select("usuario_id")
      .eq("usuario_id", sesion.session.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (!admin) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    const { data, error } = await supabase
      .from("socios")
      .select("id, nombres, apellidos, cedula, estado, pin_configurado")
      .order("numero_socio", { ascending: true });

    if (error) {
      setError(error.message);
    } else {
      setSocios((data || []) as Socio[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarSocios();
  }, []);

  async function restablecerPin(socio: Socio) {
    const confirmar = window.confirm(
      `¿Restablecer el PIN de ${socio.nombres} ${socio.apellidos}? El PIN anterior dejará de funcionar.`
    );

    if (!confirmar) return;

    setProcesando(socio.id);
    setError("");
    setCodigoGenerado("");

    try {
      const { data: sesion } = await supabase.auth.getSession();
      const token = sesion.session?.access_token;

      if (!token) {
        router.replace("/admin/login");
        return;
      }

      const respuesta = await fetch("/api/admin/socios/restablecer-pin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ socio_id: socio.id }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(resultado.error || "No se pudo restablecer el PIN.");
      }

      setCodigoGenerado(resultado.codigo);
      setSocioSeleccionado(resultado.socio);
      await cargarSocios();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Ocurrió un error."
      );
    } finally {
      setProcesando(null);
    }
  }

  const sociosFiltrados = socios.filter((socio) => {
    const texto =
      `${socio.nombres} ${socio.apellidos} ${socio.cedula}`.toLowerCase();

    return texto.includes(busqueda.toLowerCase());
  });

  async function copiarCodigo() {
    await navigator.clipboard.writeText(codigoGenerado);
  }

  return (
    <main className="min-h-screen bg-[#F4F6FA] px-3 pb-10 pt-4">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-xl sm:rounded-[28px] sm:border sm:border-slate-200">

        <header className="flex items-center gap-3 px-5 py-5">
          <button
            onClick={() => router.push("/admin")}
            className="rounded-full bg-slate-100 p-2 text-[#142B50]"
          >
            <ArrowLeft size={21} />
          </button>

          <div className="flex-1">
            <h1 className="text-base font-extrabold text-[#142B50]">
              BANCO DIVINO NIÑO
            </h1>
            <p className="text-[11px] text-slate-500">
              Administración de PIN
            </p>
          </div>

          <ShieldCheck size={27} className="text-[#D5A900]" />
        </header>

        <section className="px-5">
          <div className="rounded-2xl bg-[#142B50] p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <KeyRound size={27} className="text-[#F4C400]" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Gestión de PIN</h2>
                <p className="text-xs text-blue-100">
                  Recuperación de acceso de socios
                </p>
              </div>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-blue-100">
              Genera códigos temporales para que los socios puedan crear
              un nuevo PIN de cuatro dígitos.
            </p>
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 p-4">
              <Users size={21} className="text-[#C69B00]" />
              <p className="mt-2 text-xs text-slate-500">Socios registrados</p>
              <p className="mt-1 text-2xl font-bold text-[#142B50]">
                {socios.length}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 p-4">
              <KeyRound size={21} className="text-[#C69B00]" />
              <p className="mt-2 text-xs text-slate-500">PIN configurados</p>
              <p className="mt-1 text-2xl font-bold text-[#142B50]">
                {socios.filter((s) => s.pin_configurado).length}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 pt-6">
          <h2 className="mb-3 text-lg font-bold text-[#142B50]">
            Buscar socio
          </h2>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={19} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o cédula"
              className="w-full py-3 text-sm text-[#142B50] outline-none"
            />
          </div>
        </section>

        {error && (
          <div className="mx-5 mt-4 flex gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-600">
            <AlertCircle size={17} className="shrink-0" />
            {error}
          </div>
        )}

        <section className="px-5 pb-8 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#142B50]">
              Lista de socios
            </h2>

            <button
              onClick={cargarSocios}
              className="rounded-full bg-slate-100 p-2 text-[#142B50]"
              aria-label="Actualizar"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {cargando ? (
            <p className="py-10 text-center text-sm text-slate-400">
              Cargando socios...
            </p>
          ) : sociosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
              <Users size={30} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">
                No se encontraron socios.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sociosFiltrados.map((socio) => (
                <article
                  key={socio.id}
                  className="rounded-xl border border-slate-100 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-[#142B50]">
                        {socio.nombres} {socio.apellidos}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Cédula: {socio.cedula}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                        socio.estado === "activo"
                          ? "bg-green-50 text-green-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {socio.estado === "activo" ? "ACTIVO" : "RETIRADO"}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs text-slate-500">
                      {socio.pin_configurado
                        ? "PIN configurado"
                        : "PIN pendiente"}
                    </span>

                    <button
                      disabled={
                        socio.estado !== "activo" ||
                        procesando === socio.id
                      }
                      onClick={() => restablecerPin(socio)}
                      className="flex items-center gap-2 rounded-lg bg-[#142B50] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-40"
                    >
                      <KeyRound size={14} />
                      {procesando === socio.id
                        ? "Procesando..."
                        : "Restablecer PIN"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {codigoGenerado && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#142B50]/50 p-4">
            <div className="w-full max-w-[390px] rounded-3xl bg-white p-6 shadow-xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
                <CheckCircle2 size={30} className="text-green-600" />
              </div>

              <h2 className="mt-4 text-center text-lg font-bold text-[#142B50]">
                Código generado
              </h2>

              <p className="mt-2 text-center text-xs text-slate-500">
                Código de recuperación para {socioSeleccionado}
              </p>

              <div className="my-5 rounded-2xl bg-[#F4F6FA] p-5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                  Código temporal
                </p>
                <p className="mt-2 text-3xl font-extrabold tracking-[8px] text-[#142B50]">
                  {codigoGenerado}
                </p>
                <p className="mt-2 text-[10px] text-slate-400">
                  Válido durante 24 horas
                </p>
              </div>

              <button
                onClick={copiarCodigo}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F4C400] py-3.5 text-sm font-bold text-[#142B50]"
              >
                <Copy size={17} />
                Copiar código
              </button>

              <p className="mt-4 rounded-xl bg-amber-50 p-3 text-[11px] leading-relaxed text-amber-800">
                Entrega este código únicamente al socio después de verificar
                su identidad. No lo compartas con terceros.
              </p>

              <button
                onClick={() => setCodigoGenerado("")}
                className="mt-4 w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-[#142B50]"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
