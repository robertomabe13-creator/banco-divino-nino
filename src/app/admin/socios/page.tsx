
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Users,
  Search,
  UserPlus,
  ChevronLeft,
  ChevronDown,
  Phone,
  CreditCard,
  X,
  Save,
  RefreshCw,
  Home,
  Wallet,
  Settings,
  Pencil,
  UserMinus,
  UserCheck,
  CalendarDays,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Socio = {
  id: number;
  numero_socio: number | null;
  turno: number | null;
  nombres: string;
  apellidos: string;
  cedula: string;
  telefono: string | null;
  fecha_ingreso: string;
  estado: "activo" | "inactivo";
};

const formularioVacio = {
  nombres: "",
  apellidos: "",
  cedula: "",
  telefono: "",
  turno: "",
};

export default function SociosPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [socios, setSocios] = useState<Socio[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [socioEditando, setSocioEditando] = useState<number | null>(null);
  const [socioAbierto, setSocioAbierto] = useState<number | null>(null);
  const [form, setForm] = useState(formularioVacio);

  async function cargarSocios() {
    setCargando(true);
    setError("");

    const { data: sesion } = await supabase.auth.getSession();

    if (!sesion.session) {
      router.replace("/admin/login");
      return;
    }

    const { data: admin, error: errorAdmin } = await supabase
      .from("admin_fondo")
      .select("usuario_id")
      .eq("usuario_id", sesion.session.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (errorAdmin || !admin) {
      await supabase.auth.signOut();
      router.replace("/admin/login");
      return;
    }

    const { data, error } = await supabase
      .from("socios")
      .select("*")
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

  const activos = socios.filter((s) => s.estado === "activo").length;
  const inactivos = socios.filter((s) => s.estado === "inactivo").length;

  const sociosFiltrados = socios.filter((socio) => {
    const texto = `${socio.nombres} ${socio.apellidos} ${socio.cedula} ${socio.numero_socio ?? ""}`;
    const coincideBusqueda = texto.toLowerCase().includes(busqueda.toLowerCase());
    const coincideFiltro = filtro === "todos" || socio.estado === filtro;

    return coincideBusqueda && coincideFiltro;
  });

  function abrirNuevoSocio() {
    setSocioEditando(null);
    setForm(formularioVacio);
    setError("");
    setModal(true);
  }

  function editarSocio(socio: Socio) {
    setSocioEditando(socio.id);
    setForm({
      nombres: socio.nombres,
      apellidos: socio.apellidos,
      cedula: socio.cedula,
      telefono: socio.telefono || "",
      turno: socio.turno?.toString() || "",
    });
    setError("");
    setModal(true);
  }

  async function guardarSocio(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setError("");

    const datos = {
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      cedula: form.cedula.trim(),
      telefono: form.telefono.trim() || null,
      turno: form.turno ? Number(form.turno) : null,
    };

    if (!/^\d{10}$/.test(datos.cedula)) {
      setError("La cédula debe tener exactamente 10 números.");
      setGuardando(false);
      return;
    }

    let resultado;

    if (socioEditando !== null) {
      resultado = await supabase
        .from("socios")
        .update(datos)
        .eq("id", socioEditando);
    } else {
      const siguienteNumero =
        Math.max(0, ...socios.map((s) => s.numero_socio || 0)) + 1;

      resultado = await supabase.from("socios").insert({
        ...datos,
        numero_socio: siguienteNumero,
        fecha_ingreso: new Date().toISOString().slice(0, 10),
        estado: "activo",
      });
    }

    if (resultado.error) {
      setError(
        resultado.error.code === "23505"
          ? "Esta cédula ya está registrada."
          : resultado.error.message
      );
      setGuardando(false);
      return;
    }

    setModal(false);
    setForm(formularioVacio);
    setSocioEditando(null);
    setSocioAbierto(null);
    setGuardando(false);
    await cargarSocios();
  }

  async function cambiarEstado(socio: Socio) {
    const nuevoEstado =
      socio.estado === "activo" ? "inactivo" : "activo";

    const confirmar = window.confirm(
      nuevoEstado === "inactivo"
        ? `¿Confirmas el retiro de ${socio.nombres} ${socio.apellidos}? El historial financiero se conservará.`
        : `¿Deseas reactivar a ${socio.nombres} ${socio.apellidos}?`
    );

    if (!confirmar) return;

    const { error } = await supabase
      .from("socios")
      .update({ estado: nuevoEstado })
      .eq("id", socio.id);

    if (error) {
      setError(error.message);
      return;
    }

    setSocioAbierto(null);
    await cargarSocios();
  }

  function alternarSocio(id: number) {
    setSocioAbierto((actual) => actual === id ? null : id);
  }

  return (
    <main className="min-h-screen bg-[#EEF1F5] px-3 pb-28 pt-4">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-xl sm:rounded-[28px] sm:border sm:border-slate-200">

        <header className="flex items-center justify-between px-5 pb-5 pt-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin")}
              className="rounded-full bg-slate-100 p-2 text-[#092957]"
            >
              <ChevronLeft size={21} />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-[#092957]">
                BANCO DIVINO NIÑO
              </h1>
              <p className="text-[11px] text-slate-500">
                Administración de socios
              </p>
            </div>
          </div>
          <Landmark size={27} className="text-[#D6B900]" />
        </header>

        <section className="px-5">
          <div className="rounded-2xl bg-[#092957] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-100">Directorio general</p>
                <h2 className="mt-1 text-xl font-bold">Nuestros socios</h2>
              </div>
              <Users size={34} className="text-[#FFDC00]" />
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2">
              <div>
                <p className="text-[10px] text-blue-100">Total</p>
                <p className="mt-1 text-2xl font-bold">{socios.length}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-100">Activos</p>
                <p className="mt-1 text-2xl font-bold">{activos}</p>
              </div>
              <div>
                <p className="text-[10px] text-blue-100">Retirados</p>
                <p className="mt-1 text-2xl font-bold">{inactivos}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pt-5">
          <button
            onClick={abrirNuevoSocio}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFDC00] py-3.5 text-sm font-bold text-[#092957] shadow-sm transition active:scale-[0.98]"
          >
            <UserPlus size={19} />
            Registrar nuevo socio
          </button>
        </section>

        <section className="px-5 pt-6">
          <h2 className="mb-3 text-base font-bold text-[#092957]">
            Buscar integrantes
          </h2>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
            <Search size={19} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, cédula o número de socio"
              className="w-full py-3 text-xs text-[#092957] outline-none"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}>
                <X size={17} className="text-slate-400" />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            {[
              { id: "todos", nombre: "Todos" },
              { id: "activo", nombre: "Activos" },
              { id: "inactivo", nombre: "Retirados" },
            ].map((opcion) => (
              <button
                key={opcion.id}
                onClick={() => setFiltro(opcion.id)}
                className={`flex-1 rounded-full py-2 text-[11px] font-semibold transition ${
                  filtro === opcion.id
                    ? "bg-[#092957] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {opcion.nombre}
              </button>
            ))}
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#092957]">
                Lista de socios
              </h2>
              <p className="text-[10px] text-slate-400">
                Toca un socio para ver sus opciones
              </p>
            </div>

            <button
              onClick={cargarSocios}
              className="rounded-full bg-slate-100 p-2 text-[#092957]"
              aria-label="Actualizar"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando integrantes...
            </div>
          ) : error && !modal ? (
            <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          ) : sociosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
              <Users size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-[#092957]">
                No se encontraron socios
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Prueba otra búsqueda o registra un integrante.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sociosFiltrados.map((socio) => {
                const abierto = socioAbierto === socio.id;

                return (
                  <article
                    key={socio.id}
                    className={`overflow-hidden rounded-2xl border transition-all duration-200 ${
                      abierto
                        ? "border-[#D6B900] bg-white shadow-md"
                        : "border-slate-100 bg-white shadow-sm"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => alternarSocio(socio.id)}
                      aria-expanded={abierto}
                      className="flex w-full items-center gap-3 p-3.5 text-left"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        socio.estado === "activo"
                          ? "bg-[#FFF7D6] text-[#B49A00]"
                          : "bg-slate-100 text-slate-400"
                      }`}>
                        <Users size={20} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#092957]">
                          {socio.nombres} {socio.apellidos}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Socio N.º {socio.numero_socio ?? "—"}
                          {socio.turno ? ` · Turno ${socio.turno}` : ""}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                          socio.estado === "activo"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-500"
                        }`}>
                          {socio.estado === "activo" ? "ACTIVO" : "RETIRADO"}
                        </span>

                        <ChevronDown
                          size={18}
                          className={`text-[#092957] transition-transform duration-200 ${
                            abierto ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {abierto && (
                      <div className="border-t border-slate-100 bg-[#FAFBFD] px-3.5 pb-3.5 pt-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <CreditCard size={15} className="shrink-0 text-[#B49A00]" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-400">Cédula</p>
                              <p className="truncate text-xs font-semibold text-[#092957]">
                                {socio.cedula}
                              </p>
                            </div>
                          </div>

                          <div className="flex min-w-0 items-center gap-2">
                            <Phone size={15} className="shrink-0 text-[#B49A00]" />
                            <div className="min-w-0">
                              <p className="text-[9px] text-slate-400">Teléfono</p>
                              <p className="truncate text-xs font-semibold text-[#092957]">
                                {socio.telefono || "Sin teléfono"}
                              </p>
                            </div>
                          </div>

                          <div className="col-span-2 flex items-center gap-2">
                            <CalendarDays size={15} className="text-[#B49A00]" />
                            <p className="text-[10px] text-slate-500">
                              Fecha de ingreso: {socio.fecha_ingreso || "No registrada"}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => editarSocio(socio)}
                            className="flex items-center justify-center gap-2 rounded-xl bg-[#092957] py-3 text-xs font-bold text-white transition active:scale-[0.97]"
                          >
                            <Pencil size={15} />
                            Editar socio
                          </button>

                          <button
                            onClick={() => cambiarEstado(socio)}
                            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition active:scale-[0.97] ${
                              socio.estado === "activo"
                                ? "bg-red-50 text-red-600"
                                : "bg-green-50 text-green-700"
                            }`}
                          >
                            {socio.estado === "activo" ? (
                              <>
                                <UserMinus size={15} />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <UserCheck size={15} />
                                Reactivar
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="px-5 pb-6 pt-5">
          <div className="rounded-xl bg-[#FFF9E8] p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck size={23} className="shrink-0 text-[#B49A00]" />
              <div>
                <p className="text-xs font-bold text-[#092957]">
                  Historial protegido
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Los socios retirados conservan sus aportaciones y préstamos registrados.
                </p>
              </div>
            </div>
          </div>
        </section>

        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t border-slate-200 bg-white px-2 pb-5 pt-3 sm:rounded-b-[28px]">
          <button
            onClick={() => router.push("/admin")}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400"
          >
            <Home size={21} /> Inicio
          </button>

          <button className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#092957]">
            <Users size={21} /> Socios
          </button>

          <button
            onClick={() => router.push("/admin/aportaciones")}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400"
          >
            <Wallet size={21} /> Fondo
          </button>

          <button
            onClick={() => router.push("/admin")}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400"
          >
            <Settings size={21} /> Ajustes
          </button>
        </nav>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">
                    {socioEditando !== null ? "Editar socio" : "Nuevo socio"}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Datos de identificación del integrante
                  </p>
                </div>

                <button
                  onClick={() => {
                    setModal(false);
                    setError("");
                  }}
                  className="rounded-full bg-slate-100 p-2"
                >
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={guardarSocio} className="space-y-4">
                {[
                  { label: "Nombres", key: "nombres", placeholder: "Nombres completos" },
                  { label: "Apellidos", key: "apellidos", placeholder: "Apellidos completos" },
                  { label: "Cédula", key: "cedula", placeholder: "10 dígitos" },
                  { label: "Teléfono", key: "telefono", placeholder: "Número de teléfono" },
                  { label: "Turno", key: "turno", placeholder: "Número de turno" },
                ].map((campo) => (
                  <div key={campo.key}>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">
                      {campo.label}
                    </label>

                    <input
                      required={["nombres", "apellidos", "cedula"].includes(campo.key)}
                      type={campo.key === "turno" ? "number" : "text"}
                      inputMode={
                        campo.key === "cedula" || campo.key === "telefono"
                          ? "numeric"
                          : "text"
                      }
                      maxLength={campo.key === "cedula" ? 10 : undefined}
                      value={form[campo.key as keyof typeof form]}
                      onChange={(e) =>
                        setForm({ ...form, [campo.key]: e.target.value })
                      }
                      placeholder={campo.placeholder}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
                    />
                  </div>
                ))}

                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092957] py-4 text-sm font-bold text-white disabled:opacity-50"
                >
                  <Save size={18} />
                  {guardando
                    ? "Guardando..."
                    : socioEditando !== null
                      ? "Guardar cambios"
                      : "Registrar socio"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
