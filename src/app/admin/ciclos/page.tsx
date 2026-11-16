
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Search,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Save,
  CheckCircle2,
  History,
  Wallet,
  HandCoins,
  Archive,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Ciclo = {
  id: string;
  numero_ciclo: number;
  monto_prestamo: number;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: string;
  creado_at: string;
};

type Prestamo = {
  id: string;
  socio_id: string;
  ciclo_id: string | null;
  monto: number;
  total_a_pagar: number;
  saldo_pendiente: number;
  fecha_entrega: string | null;
  estado: string;
  observacion: string | null;
};

type Socio = {
  id: string;
  numero_socio: number;
  nombres: string;
  apellidos: string;
  estado: string;
};

const dinero = (valor: number) =>
  Number(valor || 0).toLocaleString("es-EC", {
    style: "currency",
    currency: "USD",
  });

const fechaLocal = (fecha: Date) => {
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");
  return `${año}-${mes}-${dia}`;
};

const fechaBonita = (fecha: string | null) => {
  if (!fecha) return "Sin fecha";

  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "es-EC",
    { day: "2-digit", month: "short", year: "numeric" }
  );
};

export default function CiclosPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [socios, setSocios] = useState<Socio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState("todos");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<string | null>(null);

  const [formulario, setFormulario] = useState({
    numero_ciclo: "",
    monto_prestamo: "500",
    fecha_inicio: "",
    fecha_fin: "",
    estado: "en_curso",
  });

  // La fecha actual se establece después del montaje para evitar
  // errores de prerenderizado en Next.js.
  useEffect(() => {
    setFormulario((actual) => ({
      ...actual,
      fecha_inicio: actual.fecha_inicio || fechaLocal(new Date()),
    }));
  }, []);

  const cargarDatos = async () => {
    setCargando(true);
    setError("");

    try {
      const [ciclosRes, prestamosRes, sociosRes] = await Promise.all([
        supabase
          .from("ciclos")
          .select("*")
          .order("numero_ciclo", { ascending: false }),

        supabase
          .from("prestamos")
          .select(
            "id,socio_id,ciclo_id,monto,total_a_pagar,saldo_pendiente,fecha_entrega,estado,observacion"
          ),

        supabase
          .from("socios")
          .select("id,numero_socio,nombres,apellidos,estado")
          .order("numero_socio", { ascending: true }),
      ]);

      if (ciclosRes.error) throw ciclosRes.error;
      if (prestamosRes.error) throw prestamosRes.error;
      if (sociosRes.error) throw sociosRes.error;

      setCiclos((ciclosRes.data || []) as Ciclo[]);
      setPrestamos((prestamosRes.data || []) as Prestamo[]);
      setSocios((sociosRes.data || []) as Socio[]);
    } catch (e) {
      console.error(e);
      setError(
        "No se pudieron cargar los ciclos. Comprueba los permisos de Supabase."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const ciclosFiltrados = ciclos.filter((c) => {
    const coincideBusqueda = `ciclo ${c.numero_ciclo}`.includes(
      busqueda.toLowerCase()
    );

    const coincideSeccion =
      seccion === "todos" ||
      (seccion === "actuales" &&
        ["en_curso", "activo", "pendiente"].includes(c.estado)) ||
      (seccion === "anteriores" &&
        ["finalizado", "completado", "cerrado"].includes(c.estado));

    return coincideBusqueda && coincideSeccion;
  });

  const prestamosDelCiclo = (cicloId: string) =>
    prestamos.filter((p) => p.ciclo_id === cicloId);

  const socioNombre = (id: string) => {
    const socio = socios.find((s) => s.id === id);

    return socio
      ? `${socio.nombres} ${socio.apellidos}`
      : "Socio no encontrado";
  };

  const abrirNuevo = () => {
    const siguiente =
      Math.max(0, ...ciclos.map((c) => Number(c.numero_ciclo))) + 1;

    const ultimo = [...ciclos].sort(
      (a, b) => b.numero_ciclo - a.numero_ciclo
    )[0];

    const montoSiguiente = ultimo
      ? Number(ultimo.monto_prestamo) * 2
      : 500;

    setEditando(null);
    setFormulario({
      numero_ciclo: String(siguiente),
      monto_prestamo: String(montoSiguiente),
      fecha_inicio: fechaLocal(new Date()),
      fecha_fin: "",
      estado: "en_curso",
    });

    setError("");
    setModal(true);
  };

  const abrirEditar = (ciclo: Ciclo) => {
    setEditando(ciclo.id);

    setFormulario({
      numero_ciclo: String(ciclo.numero_ciclo),
      monto_prestamo: String(ciclo.monto_prestamo),
      fecha_inicio: ciclo.fecha_inicio || "",
      fecha_fin: ciclo.fecha_fin || "",
      estado: ciclo.estado,
    });

    setError("");
    setModal(true);
  };

  const guardarCiclo = async (e: FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError("");
    setMensaje("");

    const numero = Number(formulario.numero_ciclo);
    const monto = Number(formulario.monto_prestamo);

    if (
      !Number.isInteger(numero) ||
      numero < 1 ||
      !Number.isFinite(monto) ||
      monto <= 0
    ) {
      setError("Revisa el número y el monto del ciclo.");
      setGuardando(false);
      return;
    }

    if (
      ciclos.some(
        (c) => c.numero_ciclo === numero && c.id !== editando
      )
    ) {
      setError("Ya existe un ciclo con ese número.");
      setGuardando(false);
      return;
    }

    const datos = {
      numero_ciclo: numero,
      monto_prestamo: monto,
      fecha_inicio: formulario.fecha_inicio || null,
      fecha_fin: formulario.fecha_fin || null,
      estado: formulario.estado,
    };

    try {
      const resultado = editando
        ? await supabase.from("ciclos").update(datos).eq("id", editando)
        : await supabase.from("ciclos").insert(datos);

      if (resultado.error) throw resultado.error;

      setModal(false);
      setMensaje(editando ? "Ciclo actualizado." : "Ciclo creado.");
      await cargarDatos();
    } catch (e) {
      console.error(e);
      setError(
        "No se pudo guardar el ciclo. Revisa la configuración de Supabase."
      );
    } finally {
      setGuardando(false);
    }
  };

  const finalizarCiclo = async (ciclo: Ciclo) => {
    const asociados = prestamosDelCiclo(ciclo.id);

    const pendientes = asociados.filter(
      (p) =>
        Number(p.saldo_pendiente || 0) > 0 &&
        !["pagado", "cancelado", "finalizado"].includes(
          p.estado.toLowerCase()
        )
    );

    if (pendientes.length > 0) {
      const confirmar = window.confirm(
        `Este ciclo tiene ${pendientes.length} préstamo(s) con saldo pendiente. ¿Deseas finalizarlo de todas formas? El historial se conservará.`
      );

      if (!confirmar) return;
    } else {
      if (
        !window.confirm(
          `¿Finalizar el ciclo ${ciclo.numero_ciclo}? Sus registros se conservarán.`
        )
      ) {
        return;
      }
    }

    setError("");
    setMensaje("");

    const { error } = await supabase
      .from("ciclos")
      .update({
        estado: "finalizado",
        fecha_fin: fechaLocal(new Date()),
      })
      .eq("id", ciclo.id);

    if (error) {
      setError("No se pudo finalizar el ciclo.");
      return;
    }

    setMensaje("Ciclo finalizado. Su historial se ha conservado.");
    await cargarDatos();
  };

  const totalEntregado = (lista: Prestamo[]) =>
    lista.reduce((total, p) => total + Number(p.monto || 0), 0);

  const totalPendiente = (lista: Prestamo[]) =>
    lista.reduce(
      (total, p) => total + Number(p.saldo_pendiente || 0),
      0
    );

  const totalPrestamos = prestamos.length;

  const totalCiclosAnteriores = ciclos.filter((c) =>
    ["finalizado", "completado", "cerrado"].includes(c.estado)
  ).length;

  const estadoBonito = (estado: string) => {
    if (["finalizado", "completado", "cerrado"].includes(estado))
      return "Finalizado";

    if (["en_curso", "activo"].includes(estado)) return "En curso";

    return "Pendiente";
  };

  return (
    <main className="min-h-screen bg-[#EEF1F5] text-[#172B4D]">
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-white shadow-xl">
        <header className="bg-[#092957] px-5 pb-6 pt-5 text-white">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/admin")}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-right">
              <p className="text-xs text-blue-100">BANCO DIVINO NIÑO</p>
              <p className="text-sm font-semibold">Panel administrativo</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-2 text-blue-100">
            <History size={19} />
            <span className="text-sm">Administración del fondo</span>
          </div>

          <h1 className="mt-1 text-2xl font-bold">Ciclos</h1>

          <p className="mt-1 text-sm text-blue-100">
            Control de ciclos actuales y anteriores
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-blue-100">Ciclos registrados</p>
              <p className="mt-1 text-2xl font-bold">{ciclos.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3">
              <p className="text-xs text-blue-100">Ciclos finalizados</p>
              <p className="mt-1 text-2xl font-bold">
                {totalCiclosAnteriores}
              </p>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-4 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <HandCoins size={17} />
                <span className="text-xs">Préstamos registrados</span>
              </div>

              <p className="mt-2 text-xl font-bold">{totalPrestamos}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 p-3">
              <div className="flex items-center gap-2 text-slate-500">
                <Wallet size={17} />
                <span className="text-xs">Total entregado</span>
              </div>

              <p className="mt-2 text-lg font-bold">
                {dinero(totalEntregado(prestamos))}
              </p>
            </div>
          </div>

          <button
            onClick={abrirNuevo}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#FFDC00] font-bold text-[#092957] shadow-sm"
          >
            <Plus size={19} />
            Crear nuevo ciclo
          </button>

          {mensaje && (
            <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
              {mensaje}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "todos", nombre: "Todos" },
              { id: "actuales", nombre: "Actuales" },
              { id: "anteriores", nombre: "Anteriores" },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setSeccion(item.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold ${
                  seccion === item.id
                    ? "bg-[#092957] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.nombre}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={17} className="text-slate-400" />

            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar número de ciclo..."
              className="h-11 w-full bg-transparent text-sm outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold">
                {seccion === "anteriores"
                  ? "Ciclos anteriores"
                  : seccion === "actuales"
                    ? "Ciclos actuales"
                    : "Todos los ciclos"}
              </h2>

              <p className="text-xs text-slate-500">
                {ciclosFiltrados.length} ciclos encontrados
              </p>
            </div>

            <button
              onClick={cargarDatos}
              disabled={cargando}
              className="rounded-lg bg-slate-100 p-2 text-slate-600"
            >
              <RefreshCw
                size={17}
                className={cargando ? "animate-spin" : ""}
              />
            </button>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-sm text-slate-400">
              <RefreshCw size={24} className="mx-auto animate-spin" />
              <p className="mt-2">Cargando ciclos...</p>
            </div>
          ) : ciclosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
              <Archive size={30} className="mx-auto text-slate-300" />

              <p className="mt-2 text-sm font-semibold text-slate-600">
                No hay ciclos registrados
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Crea un ciclo para comenzar.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {ciclosFiltrados.map((ciclo) => {
                const lista = prestamosDelCiclo(ciclo.id);
                const entregado = totalEntregado(lista);
                const pendiente = totalPendiente(lista);
                const abierto = expandido === ciclo.id;

                const finalizado = [
                  "finalizado",
                  "completado",
                  "cerrado",
                ].includes(ciclo.estado);

                return (
                  <div
                    key={ciclo.id}
                    className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm"
                  >
                    <div className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FFF8D7] text-[#092957]">
                              <CalendarDays size={19} />
                            </span>

                            <div>
                              <h3 className="font-bold">
                                Ciclo {ciclo.numero_ciclo}
                              </h3>

                              <p className="text-[11px] text-slate-500">
                                {fechaBonita(ciclo.fecha_inicio)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <span
                          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            finalizado
                              ? "bg-slate-100 text-slate-600"
                              : ciclo.estado === "pendiente"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {estadoBonito(ciclo.estado)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-500">
                            Monto por préstamo
                          </p>

                          <p className="mt-1 text-base font-bold">
                            {dinero(Number(ciclo.monto_prestamo))}
                          </p>
                        </div>

                        <div className="rounded-xl bg-slate-50 p-2">
                          <p className="text-[10px] text-slate-500">
                            Total entregado
                          </p>

                          <p className="mt-1 text-base font-bold">
                            {dinero(entregado)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                          {lista.length} préstamos registrados
                        </span>

                        <span className="font-semibold text-orange-700">
                          Pendiente: {dinero(pendiente)}
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => abrirEditar(ciclo)}
                          className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-2 text-xs font-semibold"
                        >
                          <Pencil size={14} />
                          Editar
                        </button>

                        {!finalizado && (
                          <button
                            onClick={() => finalizarCiclo(ciclo)}
                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#092957] py-2 text-xs font-semibold text-white"
                          >
                            <CheckCircle2 size={14} />
                            Finalizar
                          </button>
                        )}

                        <button
                          onClick={() =>
                            setExpandido(abierto ? null : ciclo.id)
                          }
                          className="flex items-center justify-center gap-1 rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold"
                        >
                          {abierto ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                          Ver
                        </button>
                      </div>
                    </div>

                    {abierto && (
                      <div className="border-t border-slate-100 bg-slate-50 p-3">
                        <h4 className="mb-3 text-sm font-bold">
                          Préstamos de este ciclo
                        </h4>

                        {lista.length === 0 ? (
                          <p className="py-4 text-center text-xs text-slate-400">
                            Todavía no hay préstamos asociados.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {[...lista]
                              .sort(
                                (a, b) =>
                                  new Date(
                                    a.fecha_entrega || "9999-12-31"
                                  ).getTime() -
                                  new Date(
                                    b.fecha_entrega || "9999-12-31"
                                  ).getTime()
                              )
                              .map((p) => (
                                <div
                                  key={p.id}
                                  className="rounded-xl border border-slate-100 bg-white p-3"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-xs font-bold">
                                        {socioNombre(p.socio_id)}
                                      </p>

                                      <p className="mt-1 text-[10px] text-slate-400">
                                        Entrega: {fechaBonita(p.fecha_entrega)}
                                      </p>
                                    </div>

                                    <div className="shrink-0 text-right">
                                      <p className="text-xs font-bold">
                                        {dinero(Number(p.monto))}
                                      </p>

                                      <p className="mt-1 text-[10px] text-orange-700">
                                        Saldo:{" "}
                                        {dinero(Number(p.saldo_pendiente))}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}

                        <div className="mt-3 rounded-xl bg-white p-3 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">
                              Fecha de inicio
                            </span>

                            <span className="font-semibold">
                              {fechaBonita(ciclo.fecha_inicio)}
                            </span>
                          </div>

                          <div className="mt-2 flex justify-between">
                            <span className="text-slate-500">
                              Fecha de finalización
                            </span>

                            <span className="font-semibold">
                              {fechaBonita(ciclo.fecha_fin)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {modal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 px-0 sm:items-center sm:px-4">
            <div className="max-h-[90vh] w-full max-w-[480px] overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">
                    {editando ? "Editar ciclo" : "Nuevo ciclo"}
                  </h2>

                  <p className="text-xs text-slate-500">
                    Configuración del ciclo de préstamos
                  </p>
                </div>

                <button
                  onClick={() => setModal(false)}
                  className="rounded-full bg-slate-100 p-2"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={guardarCiclo} className="space-y-4">
                <label className="block text-xs font-semibold text-slate-600">
                  Número de ciclo

                  <input
                    type="number"
                    min="1"
                    required
                    value={formulario.numero_ciclo}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        numero_ciclo: e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  Monto por préstamo ($)

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={formulario.monto_prestamo}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        monto_prestamo: e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  Fecha de inicio

                  <input
                    type="date"
                    value={formulario.fecha_inicio}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        fecha_inicio: e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  Fecha de finalización

                  <input
                    type="date"
                    value={formulario.fecha_fin}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        fecha_fin: e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  />
                </label>

                <label className="block text-xs font-semibold text-slate-600">
                  Estado

                  <select
                    value={formulario.estado}
                    onChange={(e) =>
                      setFormulario({
                        ...formulario,
                        estado: e.target.value,
                      })
                    }
                    className="mt-1 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_curso">En curso</option>
                    <option value="finalizado">Finalizado</option>
                  </select>
                </label>

                {error && (
                  <p className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={guardando}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#092957] font-bold text-white disabled:opacity-50"
                >
                  {guardando ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}

                  {guardando ? "Guardando..." : "Guardar ciclo"}
                </button>
              </form>
            </div>
          </div>
        )}

        <footer className="border-t border-slate-100 px-5 py-4 text-center">
          <p className="text-[10px] text-slate-400">
            BANCO DIVINO NIÑO · ADMINISTRACIÓN DE CICLOS
          </p>
        </footer>
      </div>
    </main>
  );
}
