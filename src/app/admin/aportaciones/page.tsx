
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Wallet,
  Search,
  ChevronLeft,
  ChevronDown,
  Users,
  CalendarDays,
  RefreshCw,
  Home,
  Settings,
  X,
  Save,
  CheckCircle2,
  CircleDollarSign,
  History,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Socio = {
  id: number;
  numero_socio: number | null;
  nombres: string;
  apellidos: string;
  cedula: string;
  estado: "activo" | "inactivo";
};

type Aportacion = {
  id: number;
  socio_id: number;
  semana_inicio: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  observacion: string | null;
};

function fechaLocal(fecha: Date) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
}

function lunesDeSemana(fecha: Date) {
  const copia = new Date(fecha);
  const dia = copia.getDay();
  copia.setDate(copia.getDate() - (dia === 0 ? 6 : dia - 1));
  return fechaLocal(copia);
}

function formatoFecha(fecha: string) {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

export default function AportacionesPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [socios, setSocios] = useState<Socio[]>([]);
  const [aportaciones, setAportaciones] = useState<Aportacion[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [semana, setSemana] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [socioAbierto, setSocioAbierto] = useState<number | null>(null);
  const [modal, setModal] = useState(false);
  const [socioSeleccionado, setSocioSeleccionado] = useState<Socio | null>(null);

  const [form, setForm] = useState({
    monto: "10",
    fecha_pago: "",
    metodo_pago: "efectivo",
    observacion: "",
  });

  // Inicializar fechas después del montaje para evitar errores de prerenderizado.
  useEffect(() => {
    const hoy = fechaLocal(new Date());

    setSemana(lunesDeSemana(new Date()));
    setForm((actual) => ({
      ...actual,
      fecha_pago: hoy,
    }));
  }, []);

  async function cargarDatos() {
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

    const [resultadoSocios, resultadoAportaciones] = await Promise.all([
      supabase
        .from("socios")
        .select("id, numero_socio, nombres, apellidos, cedula, estado")
        .order("numero_socio", { ascending: true }),

      supabase
        .from("aportaciones")
        .select("*")
        .order("fecha_pago", { ascending: false }),
    ]);

    if (resultadoSocios.error) {
      setError(resultadoSocios.error.message);
    } else if (resultadoAportaciones.error) {
      setError(resultadoAportaciones.error.message);
    } else {
      setSocios((resultadoSocios.data || []) as Socio[]);
      setAportaciones((resultadoAportaciones.data || []) as Aportacion[]);
    }

    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, []);

  const sociosActivos = socios.filter((s) => s.estado === "activo");

  const pagosSemana = aportaciones.filter(
    (a) => a.semana_inicio === semana
  );

  const sociosPagaron = new Set(pagosSemana.map((a) => a.socio_id));

  const pagaron = sociosActivos.filter((s) =>
    sociosPagaron.has(s.id)
  ).length;

  const pendientes = Math.max(0, sociosActivos.length - pagaron);

  const recaudadoSemana = pagosSemana.reduce(
    (total, pago) => total + Number(pago.monto || 0),
    0
  );

  const recaudadoTotal = aportaciones.reduce(
    (total, pago) => total + Number(pago.monto || 0),
    0
  );

  const sociosFiltrados = socios.filter((socio) => {
    const texto =
      `${socio.nombres} ${socio.apellidos} ${socio.cedula} ${socio.numero_socio ?? ""}`;

    const coincideBusqueda = texto
      .toLowerCase()
      .includes(busqueda.toLowerCase());

    const tienePago = sociosPagaron.has(socio.id);

    const coincideFiltro =
      filtro === "todos" ||
      (filtro === "pagaron" && tienePago) ||
      (filtro === "pendientes" &&
        socio.estado === "activo" &&
        !tienePago);

    return coincideBusqueda && coincideFiltro;
  });

  function abrirModal(socio: Socio) {
    if (sociosPagaron.has(socio.id)) return;

    setSocioSeleccionado(socio);
    setForm({
      monto: "10",
      fecha_pago: fechaLocal(new Date()),
      metodo_pago: "efectivo",
      observacion: "",
    });
    setError("");
    setModal(true);
  }

  async function registrarAportacion(e: React.FormEvent) {
    e.preventDefault();

    if (!socioSeleccionado) return;

    setError("");

    const monto = Number(form.monto);

    if (!Number.isFinite(monto) || monto <= 0) {
      setError("Introduce un monto válido.");
      return;
    }

    if (!form.fecha_pago) {
      setError("Selecciona la fecha del pago.");
      return;
    }

    if (form.fecha_pago > fechaLocal(new Date())) {
      setError("La fecha de pago no puede ser futura.");
      return;
    }

    setGuardando(true);

    const { data: existente, error: errorConsulta } = await supabase
      .from("aportaciones")
      .select("id")
      .eq("socio_id", socioSeleccionado.id)
      .eq("semana_inicio", semana)
      .limit(1);

    if (errorConsulta) {
      setError(errorConsulta.message);
      setGuardando(false);
      return;
    }

    if (existente && existente.length > 0) {
      setError("Este socio ya tiene una aportación registrada para esta semana.");
      setGuardando(false);
      return;
    }

    const { data: sesion } = await supabase.auth.getSession();

    const { error: errorInsertar } = await supabase
      .from("aportaciones")
      .insert({
        socio_id: socioSeleccionado.id,
        semana_inicio: semana,
        monto,
        fecha_pago: form.fecha_pago,
        metodo_pago: form.metodo_pago,
        observacion: form.observacion.trim() || null,
        registrado_por: sesion.session?.user.id ?? null,
      });

    if (errorInsertar) {
      setError(errorInsertar.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setModal(false);
    setSocioSeleccionado(null);
    await cargarDatos();
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
                Control de aportaciones
              </p>
            </div>
          </div>

          <Landmark size={27} className="text-[#D6B900]" />
        </header>

        <section className="px-5">
          <div className="rounded-2xl bg-[#092957] p-5 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-blue-100">Administración del fondo</p>
                <h2 className="mt-1 text-xl font-bold">Aportaciones</h2>
              </div>
              <Wallet size={34} className="text-[#FFDC00]" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Recaudado esta semana</p>
                <p className="mt-1 text-xl font-bold">
                  ${recaudadoSemana.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Recaudado histórico</p>
                <p className="mt-1 text-xl font-bold">
                  ${recaudadoTotal.toFixed(2)}
                </p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Socios que pagaron</p>
                <p className="mt-1 text-xl font-bold">{pagaron}</p>
              </div>

              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Pendientes</p>
                <p className="mt-1 text-xl font-bold">{pendientes}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pt-5">
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={18} className="text-[#B49A00]" />
              <p className="text-sm font-bold text-[#092957]">
                Semana de aportación
              </p>
            </div>

            <label className="mb-1 mt-3 block text-[10px] text-slate-400">
              Selecciona el lunes correspondiente
            </label>

            <input
              type="date"
              value={semana}
              onChange={(e) => {
                setSemana(e.target.value);
                setSocioAbierto(null);
              }}
              className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
            />

            <p className="mt-2 text-[10px] text-slate-400">
              Semana seleccionada: {formatoFecha(semana)}
            </p>
          </div>
        </section>

        <section className="px-5 pt-5">
          <h2 className="mb-3 text-base font-bold text-[#092957]">
            Buscar socio
          </h2>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={19} className="text-slate-400" />

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre, cédula o número"
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
              { id: "pagaron", nombre: "Pagaron" },
              { id: "pendientes", nombre: "Pendientes" },
            ].map((opcion) => (
              <button
                key={opcion.id}
                onClick={() => setFiltro(opcion.id)}
                className={`flex-1 rounded-full py-2 text-[10px] font-semibold ${
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
                Registro semanal
              </h2>
              <p className="text-[10px] text-slate-400">
                Toca un socio para ver sus opciones
              </p>
            </div>

            <button
              onClick={cargarDatos}
              className="rounded-full bg-slate-100 p-2 text-[#092957]"
              aria-label="Actualizar"
            >
              <RefreshCw size={17} />
            </button>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando aportaciones...
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
            </div>
          ) : (
            <div className="space-y-2">
              {sociosFiltrados.map((socio) => {
                const pagosSocio = aportaciones
                  .filter((a) => a.socio_id === socio.id)
                  .sort((a, b) =>
                    b.fecha_pago.localeCompare(a.fecha_pago)
                  );

                const pagoSemana = pagosSemana.find(
                  (a) => a.socio_id === socio.id
                );

                const abierto = socioAbierto === socio.id;

                return (
                  <article
                    key={socio.id}
                    className={`overflow-hidden rounded-2xl border transition ${
                      abierto
                        ? "border-[#D6B900] shadow-md"
                        : "border-slate-100 shadow-sm"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setSocioAbierto(abierto ? null : socio.id)
                      }
                      aria-expanded={abierto}
                      className="flex w-full items-center gap-3 p-3.5 text-left"
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        pagoSemana
                          ? "bg-green-50 text-green-600"
                          : "bg-[#FFF7D6] text-[#B49A00]"
                      }`}>
                        {pagoSemana ? (
                          <CheckCircle2 size={21} />
                        ) : (
                          <Users size={20} />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#092957]">
                          {socio.nombres} {socio.apellidos}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Socio N.º {socio.numero_socio ?? "—"}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                          pagoSemana
                            ? "bg-green-50 text-green-700"
                            : socio.estado === "activo"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-100 text-slate-500"
                        }`}>
                          {pagoSemana
                            ? "PAGÓ"
                            : socio.estado === "activo"
                              ? "PENDIENTE"
                              : "INACTIVO"}
                        </span>

                        <ChevronDown
                          size={18}
                          className={`text-[#092957] transition-transform ${
                            abierto ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                    </button>

                    {abierto && (
                      <div className="border-t border-slate-100 bg-[#FAFBFD] p-3.5">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-[9px] text-slate-400">Cédula</p>
                            <p className="text-xs font-semibold text-[#092957]">
                              {socio.cedula}
                            </p>
                          </div>

                          <div>
                            <p className="text-[9px] text-slate-400">Estado</p>
                            <p className="text-xs font-semibold text-[#092957]">
                              {socio.estado === "activo" ? "Activo" : "Inactivo"}
                            </p>
                          </div>
                        </div>

                        {pagoSemana ? (
                          <div className="mt-3 rounded-xl bg-green-50 p-3">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={17} className="text-green-600" />
                              <p className="text-xs font-bold text-green-700">
                                Aportación registrada
                              </p>
                            </div>

                            <p className="mt-2 text-sm font-bold text-green-800">
                              ${Number(pagoSemana.monto).toFixed(2)}
                            </p>

                            <p className="mt-1 text-[10px] text-green-700">
                              Fecha de pago: {formatoFecha(pagoSemana.fecha_pago)}
                            </p>

                            <p className="mt-1 text-[10px] text-green-700">
                              Método: {pagoSemana.metodo_pago || "No especificado"}
                            </p>
                          </div>
                        ) : socio.estado === "activo" ? (
                          <button
                            onClick={() => abrirModal(socio)}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFDC00] py-3 text-xs font-bold text-[#092957] active:scale-[0.98]"
                          >
                            <CircleDollarSign size={17} />
                            Registrar aportación de $10
                          </button>
                        ) : (
                          <p className="mt-3 rounded-xl bg-slate-100 p-3 text-[11px] text-slate-500">
                            Socio inactivo. No se pueden registrar nuevas aportaciones.
                          </p>
                        )}

                        <div className="mt-4 border-t border-slate-200 pt-3">
                          <div className="mb-2 flex items-center gap-2">
                            <History size={16} className="text-[#B49A00]" />
                            <p className="text-xs font-bold text-[#092957]">
                              Historial de aportaciones
                            </p>
                          </div>

                          {pagosSocio.length === 0 ? (
                            <p className="py-3 text-center text-[10px] text-slate-400">
                              Todavía no tiene pagos registrados.
                            </p>
                          ) : (
                            <div className="max-h-44 space-y-2 overflow-y-auto">
                              {pagosSocio.map((pago) => (
                                <div
                                  key={pago.id}
                                  className="flex items-center justify-between rounded-lg bg-white p-2.5"
                                >
                                  <div>
                                    <p className="text-[10px] font-semibold text-[#092957]">
                                      Semana: {formatoFecha(pago.semana_inicio)}
                                    </p>
                                    <p className="mt-1 text-[9px] text-slate-400">
                                      Pago: {formatoFecha(pago.fecha_pago)}
                                    </p>
                                  </div>

                                  <p className="text-xs font-bold text-green-700">
                                    ${Number(pago.monto).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
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
              <CreditCard size={23} className="shrink-0 text-[#B49A00]" />
              <div>
                <p className="text-xs font-bold text-[#092957]">
                  Control de aportaciones
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Cada registro conserva su fecha, semana y monto. Los pagos anteriores no se eliminan al cambiar de semana.
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

          <button
            onClick={() => router.push("/admin/socios")}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400"
          >
            <Users size={21} /> Socios
          </button>

          <button className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#092957]">
            <Wallet size={21} /> Fondo
          </button>

          <button
            onClick={() => router.push("/admin")}
            className="flex flex-col items-center gap-1 text-[10px] text-slate-400"
          >
            <Settings size={21} /> Ajustes
          </button>
        </nav>

        {modal && socioSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">
                    Registrar aportación
                  </h2>
                  <p className="text-xs text-slate-400">
                    {socioSeleccionado.nombres} {socioSeleccionado.apellidos}
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

              <form onSubmit={registrarAportacion} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">
                    Semana correspondiente
                  </label>
                  <input
                    type="date"
                    value={semana}
                    onChange={(e) => setSemana(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">
                    Monto recibido ($)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={form.monto}
                    onChange={(e) =>
                      setForm({ ...form, monto: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">
                    Fecha en que se recibió el dinero
                  </label>
                  <input
                    type="date"
                    required
                    value={form.fecha_pago}
                    onChange={(e) =>
                      setForm({ ...form, fecha_pago: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">
                    Método de pago
                  </label>
                  <select
                    value={form.metodo_pago}
                    onChange={(e) =>
                      setForm({ ...form, metodo_pago: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="deposito">Depósito</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">
                    Observación (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={form.observacion}
                    onChange={(e) =>
                      setForm({ ...form, observacion: e.target.value })
                    }
                    placeholder="Detalle del pago..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957] outline-none focus:border-[#D6B900]"
                  />
                </div>

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
                  {guardando ? "Guardando..." : "Confirmar aportación"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
