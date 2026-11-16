
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  CalendarDays,
  Filter,
  HandCoins,
  Users,
  Receipt,
  ChevronDown,
  ChevronUp,
  CircleDollarSign,
  Landmark,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Movimiento = {
  id: string;
  tipo: "aportacion" | "abono" | "prestamo";
  concepto: string;
  socio: string;
  monto: number;
  fecha: string;
  metodo: string;
  observacion: string;
};

type Socio = {
  id: string;
  nombres: string;
  apellidos: string;
};

type AportacionRow = {
  id: string;
  socio_id: string;
  monto: number | string | null;
  fecha_pago: string | null;
  metodo_pago: string | null;
  observacion: string | null;
};

type PagoPrestamoRow = {
  id: string;
  prestamo_id: string;
  monto: number | string | null;
  fecha_pago: string | null;
  metodo_pago: string | null;
  observacion: string | null;
};

type PrestamoRow = {
  id: string;
  socio_id: string;
  monto: number | string | null;
  fecha_entrega: string | null;
  observacion: string | null;
};

const dinero = (valor: number) =>
  valor.toLocaleString("es-EC", {
    style: "currency",
    currency: "USD",
  });

const fechaBonita = (fecha: string) => {
  if (!fecha) return "Sin fecha";

  return new Date(`${fecha.slice(0, 10)}T12:00:00`).toLocaleDateString(
    "es-EC",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

export default function MovimientosPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [error, setError] = useState("");

  const cargarMovimientos = async () => {
    setCargando(true);
    setError("");

    try {
      const [
        sociosRes,
        aportacionesRes,
        pagosRes,
        prestamosRes,
      ] = await Promise.all([
        supabase
          .from("socios")
          .select("id,nombres,apellidos"),

        supabase
          .from("aportaciones")
          .select("id,socio_id,monto,fecha_pago,metodo_pago,observacion")
          .order("fecha_pago", { ascending: false }),

        supabase
          .from("pagos_prestamo")
          .select("id,prestamo_id,monto,fecha_pago,metodo_pago,observacion")
          .order("fecha_pago", { ascending: false }),

        supabase
          .from("prestamos")
          .select("id,socio_id,monto,fecha_entrega,observacion")
          .order("fecha_entrega", { ascending: false }),
      ]);

      if (sociosRes.error) throw sociosRes.error;
      if (aportacionesRes.error) throw aportacionesRes.error;
      if (pagosRes.error) throw pagosRes.error;
      if (prestamosRes.error) throw prestamosRes.error;

      const socios = (sociosRes.data || []) as Socio[];

      const buscarSocio = (id: string) => {
        const socio = socios.find((s: Socio) => s.id === id);
        return socio
          ? `${socio.nombres} ${socio.apellidos}`
          : "Socio no encontrado";
      };

      const aportaciones = (aportacionesRes.data || []) as AportacionRow[];
      const pagos = (pagosRes.data || []) as PagoPrestamoRow[];
      const prestamos = (prestamosRes.data || []) as PrestamoRow[];

      const lista: Movimiento[] = [];

      aportaciones.forEach((p: AportacionRow) => {
        if (!p.fecha_pago) return;

        lista.push({
          id: `aportacion-${p.id}`,
          tipo: "aportacion",
          concepto: "Aportación de socio",
          socio: buscarSocio(p.socio_id),
          monto: Number(p.monto || 0),
          fecha: p.fecha_pago,
          metodo: p.metodo_pago || "No especificado",
          observacion: p.observacion || "",
        });
      });

      pagos.forEach((p: PagoPrestamoRow) => {
        if (!p.fecha_pago) return;

        const prestamo = prestamos.find(
          (item: PrestamoRow) => item.id === p.prestamo_id
        );

        lista.push({
          id: `abono-${p.id}`,
          tipo: "abono",
          concepto: "Abono de préstamo",
          socio: prestamo
            ? buscarSocio(prestamo.socio_id)
            : "Socio no encontrado",
          monto: Number(p.monto || 0),
          fecha: p.fecha_pago,
          metodo: p.metodo_pago || "No especificado",
          observacion: p.observacion || "",
        });
      });

      prestamos.forEach((p: PrestamoRow) => {
        if (!p.fecha_entrega) return;

        lista.push({
          id: `prestamo-${p.id}`,
          tipo: "prestamo",
          concepto: "Préstamo entregado",
          socio: buscarSocio(p.socio_id),
          monto: Number(p.monto || 0),
          fecha: p.fecha_entrega,
          metodo: "Entrega de dinero",
          observacion: p.observacion || "",
        });
      });

      lista.sort(
        (a, b) =>
          new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );

      setMovimientos(lista);
    } catch (e) {
      console.error(e);
      setError(
        "No se pudieron cargar los movimientos. Comprueba la conexión y los permisos de Supabase."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const movimientosFiltrados = movimientos.filter((m) => {
    const texto = `${m.concepto} ${m.socio} ${m.metodo}`.toLowerCase();
    const coincideTexto = texto.includes(busqueda.toLowerCase());
    const coincideTipo = filtro === "todos" || m.tipo === filtro;
    const fecha = m.fecha.slice(0, 10);
    const coincideInicio = !fechaInicio || fecha >= fechaInicio;
    const coincideFin = !fechaFin || fecha <= fechaFin;

    return (
      coincideTexto &&
      coincideTipo &&
      coincideInicio &&
      coincideFin
    );
  });

  const ingresos = movimientosFiltrados
    .filter((m) => m.tipo !== "prestamo")
    .reduce((total: number, m: Movimiento) => total + m.monto, 0);

  const salidas = movimientosFiltrados
    .filter((m) => m.tipo === "prestamo")
    .reduce((total: number, m: Movimiento) => total + m.monto, 0);

  const balance = ingresos - salidas;

  const cantidadAportes = movimientosFiltrados.filter(
    (m) => m.tipo === "aportacion"
  ).length;

  const cantidadAbonos = movimientosFiltrados.filter(
    (m) => m.tipo === "abono"
  ).length;

  const cantidadPrestamos = movimientosFiltrados.filter(
    (m) => m.tipo === "prestamo"
  ).length;

  const estiloTipo = (tipo: Movimiento["tipo"]) => {
    if (tipo === "aportacion") {
      return {
        icono: <Users size={18} />,
        color: "bg-blue-50 text-blue-700",
        signo: "+",
      };
    }

    if (tipo === "abono") {
      return {
        icono: <HandCoins size={18} />,
        color: "bg-emerald-50 text-emerald-700",
        signo: "+",
      };
    }

    return {
      icono: <ArrowUpRight size={18} />,
      color: "bg-orange-50 text-orange-700",
      signo: "-",
    };
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

          <div className="mt-6">
            <div className="flex items-center gap-2 text-blue-100">
              <Receipt size={19} />
              <span className="text-sm">Control financiero</span>
            </div>
            <h1 className="mt-1 text-2xl font-bold">Movimientos</h1>
            <p className="mt-1 text-sm text-blue-100">
              Historial de ingresos y salidas del fondo
            </p>
          </div>

          <div className="mt-5 rounded-2xl bg-white/10 p-4">
            <p className="text-xs text-blue-100">Balance de los movimientos filtrados</p>
            <p className="mt-1 text-3xl font-bold">
              {dinero(balance)}
            </p>
            <div className="mt-3 flex items-center gap-2 text-xs text-blue-100">
              <Landmark size={15} />
              <span>Ingresos menos préstamos entregados</span>
            </div>
          </div>
        </header>

        <section className="space-y-4 px-4 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
              <div className="flex items-center gap-2 text-emerald-700">
                <TrendingUp size={17} />
                <span className="text-xs font-medium">Ingresos</span>
              </div>
              <p className="mt-2 text-lg font-bold text-emerald-800">
                {dinero(ingresos)}
              </p>
              <p className="mt-1 text-[11px] text-emerald-700">
                Aportaciones y abonos
              </p>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-orange-50 p-3">
              <div className="flex items-center gap-2 text-orange-700">
                <TrendingDown size={17} />
                <span className="text-xs font-medium">Salidas</span>
              </div>
              <p className="mt-2 text-lg font-bold text-orange-800">
                {dinero(salidas)}
              </p>
              <p className="mt-1 text-[11px] text-orange-700">
                Préstamos entregados
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-bold">Resumen de registros</p>
              <CircleDollarSign size={19} className="text-[#D6B900]" />
            </div>

            <div className="grid grid-cols-3 divide-x divide-slate-100">
              <div className="text-center">
                <p className="text-xl font-bold">{cantidadAportes}</p>
                <p className="text-[10px] text-slate-500">Aportaciones</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{cantidadAbonos}</p>
                <p className="text-[10px] text-slate-500">Abonos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold">{cantidadPrestamos}</p>
                <p className="text-[10px] text-slate-500">Préstamos</p>
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-slate-100 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter size={17} />
                <p className="text-sm font-bold">Filtrar movimientos</p>
              </div>

              <button
                onClick={cargarMovimientos}
                disabled={cargando}
                className="flex items-center gap-1 text-xs font-semibold text-[#164477]"
              >
                <RefreshCw
                  size={14}
                  className={cargando ? "animate-spin" : ""}
                />
                Actualizar
              </button>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
              <Search size={17} className="text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar socio o movimiento..."
                className="h-11 w-full bg-transparent text-sm outline-none"
              />
            </div>

            <select
              value={filtro}
              onChange={(e) => setFiltro(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
            >
              <option value="todos">Todos los movimientos</option>
              <option value="aportacion">Aportaciones</option>
              <option value="abono">Abonos de préstamos</option>
              <option value="prestamo">Préstamos entregados</option>
            </select>

            <div className="grid grid-cols-2 gap-2">
              <label className="text-xs text-slate-500">
                Desde
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-xs"
                />
              </label>

              <label className="text-xs text-slate-500">
                Hasta
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-2 text-xs"
                />
              </label>
            </div>

            <button
              onClick={() => {
                setBusqueda("");
                setFiltro("todos");
                setFechaInicio("");
                setFechaFin("");
              }}
              className="text-left text-xs font-semibold text-[#164477]"
            >
              Limpiar filtros
            </button>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold">Historial</h2>
                <p className="text-xs text-slate-500">
                  {movimientosFiltrados.length} movimientos encontrados
                </p>
              </div>
              <CalendarDays size={20} className="text-slate-400" />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {cargando ? (
              <div className="flex flex-col items-center py-12 text-slate-400">
                <RefreshCw size={25} className="animate-spin" />
                <p className="mt-2 text-sm">Cargando movimientos...</p>
              </div>
            ) : movimientosFiltrados.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
                <Wallet size={30} className="mx-auto text-slate-300" />
                <p className="mt-2 text-sm font-semibold text-slate-600">
                  No hay movimientos
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Los registros aparecerán aquí automáticamente.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {movimientosFiltrados.map((m) => {
                  const estilo = estiloTipo(m.tipo);
                  const abierto = expandido === m.id;

                  return (
                    <div
                      key={m.id}
                      className="overflow-hidden rounded-2xl border border-slate-100 bg-white"
                    >
                      <button
                        onClick={() =>
                          setExpandido(abierto ? null : m.id)
                        }
                        className="flex w-full items-center gap-3 p-3 text-left"
                      >
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${estilo.color}`}
                        >
                          {estilo.icono}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {m.concepto}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {m.socio}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {fechaBonita(m.fecha)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <p
                            className={`text-sm font-bold ${
                              m.tipo === "prestamo"
                                ? "text-orange-700"
                                : "text-emerald-700"
                            }`}
                          >
                            {estilo.signo} {dinero(m.monto)}
                          </p>
                          <div className="mt-1 flex justify-end text-slate-400">
                            {abierto ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )}
                          </div>
                        </div>
                      </button>

                      {abierto && (
                        <div className="space-y-2 border-t border-slate-100 bg-slate-50 px-3 py-3 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Tipo</span>
                            <span className="font-semibold">
                              {m.tipo === "aportacion"
                                ? "Aportación"
                                : m.tipo === "abono"
                                  ? "Abono de préstamo"
                                  : "Préstamo entregado"}
                            </span>
                          </div>

                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Método</span>
                            <span className="font-semibold">{m.metodo}</span>
                          </div>

                          <div className="flex justify-between gap-3">
                            <span className="text-slate-500">Fecha</span>
                            <span className="font-semibold">
                              {fechaBonita(m.fecha)}
                            </span>
                          </div>

                          {m.observacion && (
                            <div className="border-t border-slate-200 pt-2">
                              <p className="text-slate-500">Observación</p>
                              <p className="mt-1 font-medium">
                                {m.observacion}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-slate-100 px-5 py-4 text-center">
          <p className="text-[10px] text-slate-400">
            BANCO DIVINO NIÑO · CONTROL DE MOVIMIENTOS
          </p>
        </footer>
      </div>
    </main>
  );
}
