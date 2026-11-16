
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowLeft,
  Wallet,
  HandCoins,
  AlertCircle,
  RefreshCw,
  Settings,
  X,
  Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Socio = {
  id: string;
  nombres: string;
  apellidos: string;
  estado: string;
};

type Aportacion = {
  id: string;
  socio_id: string;
  semana_inicio: string;
  monto: number;
  fecha_pago: string;
};

type Cuota = {
  id: string;
  prestamo_id: string;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  estado: string;
};

type Prestamo = {
  id: string;
  socio_id: string;
};

type Configuracion = {
  monto: number;
  dia_cobro: number;
  fecha_inicio: string;
};

type Evento = {
  id: string;
  tipo: "aportacion" | "prestamo";
  titulo: string;
  descripcion: string;
  estado: string;
  monto: number;
  socio: string;
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril",
  "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

const DIAS_COMPLETOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function fechaLocal(fecha: Date) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fechaDesdeTexto(valor: string) {
  const [y, m, d] = valor.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dinero(valor: number) {
  return new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(valor || 0);
}

export default function CalendarioPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  // Valores iniciales fijos para evitar el error de prerenderizado de Next.js.
  const [inicializado, setInicializado] = useState(false);
  const [fechaHoy, setFechaHoy] = useState("2000-01-01");
  const [mesActual, setMesActual] = useState(() => new Date(2000, 0, 1));
  const [diaSeleccionado, setDiaSeleccionado] = useState("2000-01-01");

  const [socios, setSocios] = useState<Socio[]>([]);
  const [aportaciones, setAportaciones] = useState<Aportacion[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);

  const [configuracion, setConfiguracion] = useState<Configuracion>({
    monto: 10,
    dia_cobro: 1,
    fecha_inicio: "2000-01-01",
  });

  const [modalConfiguracion, setModalConfiguracion] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(true);

  // La fecha actual se obtiene después de montar el componente en el navegador.
  useEffect(() => {
    const hoy = fechaLocal(new Date());
    const fecha = fechaDesdeTexto(hoy);

    setFechaHoy(hoy);
    setMesActual(
      new Date(fecha.getFullYear(), fecha.getMonth(), 1)
    );
    setDiaSeleccionado(hoy);

    setConfiguracion((actual) => ({
      ...actual,
      fecha_inicio:
        actual.fecha_inicio === "2000-01-01"
          ? hoy
          : actual.fecha_inicio,
    }));

    setInicializado(true);
  }, []);

  const primerDia = new Date(
    mesActual.getFullYear(),
    mesActual.getMonth(),
    1
  );

  const ultimoDia = new Date(
    mesActual.getFullYear(),
    mesActual.getMonth() + 1,
    0
  );

  const inicioMes = fechaLocal(primerDia);

  // Límite exclusivo: incluye todos los pagos del último día del mes.
  const inicioMesSiguiente = fechaLocal(
    new Date(
      mesActual.getFullYear(),
      mesActual.getMonth() + 1,
      1
    )
  );

  useEffect(() => {
    if (!inicializado) return;

    let activo = true;

    async function cargarDatos() {
      setCargando(true);
      setError("");

      try {
        const [
          resultadoSocios,
          resultadoAportaciones,
          resultadoCuotas,
          resultadoConfiguracion,
        ] = await Promise.all([
          supabase
            .from("socios")
            .select("id,nombres,apellidos,estado")
            .eq("estado", "activo"),

          supabase
            .from("aportaciones")
            .select("id,socio_id,semana_inicio,monto,fecha_pago")
            .gte("fecha_pago", inicioMes)
            .lt("fecha_pago", inicioMesSiguiente),

          supabase
            .from("cuotas_prestamo")
            .select(
              "id,prestamo_id,numero_cuota,fecha_vencimiento,monto,monto_pagado,estado"
            )
            .gte("fecha_vencimiento", inicioMes)
            .lt("fecha_vencimiento", inicioMesSiguiente),

          supabase
            .from("configuracion_aportaciones")
            .select("monto,dia_cobro,fecha_inicio")
            .eq("clave", "principal")
            .maybeSingle(),
        ]);

        if (resultadoSocios.error) throw resultadoSocios.error;
        if (resultadoAportaciones.error) throw resultadoAportaciones.error;
        if (resultadoCuotas.error) throw resultadoCuotas.error;
        if (resultadoConfiguracion.error) {
          throw resultadoConfiguracion.error;
        }

        const listaSocios = (resultadoSocios.data || []) as Socio[];
        const listaAportaciones =
          (resultadoAportaciones.data || []) as Aportacion[];
        const listaCuotas = (resultadoCuotas.data || []) as Cuota[];

        const idsPrestamos = [
          ...new Set(listaCuotas.map((cuota) => cuota.prestamo_id)),
        ];

        let listaPrestamos: Prestamo[] = [];

        if (idsPrestamos.length > 0) {
          const resultadoPrestamos = await supabase
            .from("prestamos")
            .select("id,socio_id")
            .in("id", idsPrestamos);

          if (resultadoPrestamos.error) throw resultadoPrestamos.error;

          listaPrestamos = (resultadoPrestamos.data || []) as Prestamo[];
        }

        if (!activo) return;

        setSocios(listaSocios);
        setAportaciones(listaAportaciones);
        setCuotas(listaCuotas);
        setPrestamos(listaPrestamos);

        if (resultadoConfiguracion.data) {
          setConfiguracion({
            monto: Number(resultadoConfiguracion.data.monto),
            dia_cobro: Number(resultadoConfiguracion.data.dia_cobro),
            fecha_inicio: resultadoConfiguracion.data.fecha_inicio,
          });
        }
      } catch (e) {
        console.error(e);

        if (activo) {
          setError(
            "No se pudieron cargar los datos. Comprueba los permisos y la configuración de Supabase."
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [inicializado, inicioMes, inicioMesSiguiente, supabase]);

  async function guardarConfiguracion() {
    if (!Number.isFinite(configuracion.monto) || configuracion.monto <= 0) {
      setMensaje("Ingresa un monto válido mayor que cero.");
      return;
    }

    if (
      !Number.isInteger(configuracion.dia_cobro) ||
      configuracion.dia_cobro < 0 ||
      configuracion.dia_cobro > 6
    ) {
      setMensaje("Selecciona un día de cobro válido.");
      return;
    }

    if (!configuracion.fecha_inicio) {
      setMensaje("Selecciona la fecha de inicio.");
      return;
    }

    setGuardando(true);
    setMensaje("");

    try {
      const { error: errorGuardar } = await supabase
        .from("configuracion_aportaciones")
        .upsert(
          {
            clave: "principal",
            monto: configuracion.monto,
            dia_cobro: configuracion.dia_cobro,
            dias_cobro: [configuracion.dia_cobro],
            fecha_inicio: configuracion.fecha_inicio,
            activo: true,
            actualizado_at: new Date().toISOString(),
          },
          { onConflict: "clave" }
        );

      if (errorGuardar) throw errorGuardar;

      setModalConfiguracion(false);
      setMensaje("Configuración guardada correctamente.");
    } catch (e) {
      console.error(e);
      setMensaje(
        "No se pudo guardar. Comprueba que tu usuario tenga permisos de administrador."
      );
    } finally {
      setGuardando(false);
    }
  }

  const eventosPorDia = useMemo(() => {
    const resultado: Record<string, Evento[]> = {};

    function agregar(fecha: string, evento: Evento) {
      if (!resultado[fecha]) resultado[fecha] = [];
      resultado[fecha].push(evento);
    }

    // Días semanales de cobro configurados.
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
      const fecha = new Date(
        mesActual.getFullYear(),
        mesActual.getMonth(),
        dia
      );

      const clave = fechaLocal(fecha);

      if (
        fecha.getDay() === configuracion.dia_cobro &&
        clave >= configuracion.fecha_inicio
      ) {
        agregar(clave, {
          id: `aporte-${clave}`,
          tipo: "aportacion",
          titulo: "Día de aportación semanal",
          descripcion: `Aportación prevista: ${dinero(configuracion.monto)} por socio`,
          estado: "programado",
          monto: configuracion.monto,
          socio: "",
        });
      }
    }

    // Pagos registrados: se muestran en la fecha real de recepción.
    aportaciones.forEach((aporte) => {
      const socio = socios.find((s) => s.id === aporte.socio_id);

      if (!socio) return;

      const fechaReal = aporte.fecha_pago.slice(0, 10);

      agregar(fechaReal, {
        id: aporte.id,
        tipo: "aportacion",
        titulo: "Aportación registrada",
        descripcion: `Pago recibido: ${dinero(Number(aporte.monto))}`,
        estado: "pagado",
        monto: Number(aporte.monto),
        socio: `${socio.nombres} ${socio.apellidos}`,
      });
    });

    // Cuotas de préstamos.
    cuotas.forEach((cuota) => {
      const prestamo = prestamos.find(
        (p) => p.id === cuota.prestamo_id
      );

      const socio = socios.find(
        (s) => s.id === prestamo?.socio_id
      );

      const pendiente = Math.max(
        0,
        Number(cuota.monto) - Number(cuota.monto_pagado || 0)
      );

      const fecha = cuota.fecha_vencimiento.slice(0, 10);
      const vencida = fecha < fechaHoy && pendiente > 0;

      let estado = cuota.estado;

      if (pendiente <= 0) estado = "pagado";
      else if (Number(cuota.monto_pagado) > 0) estado = "parcial";
      else if (vencida) estado = "atrasado";
      else estado = "pendiente";

      agregar(fecha, {
        id: cuota.id,
        tipo: "prestamo",
        titulo: `Cuota #${cuota.numero_cuota}`,
        descripcion: `Pendiente: ${dinero(pendiente)}`,
        estado,
        monto: pendiente,
        socio: socio
          ? `${socio.nombres} ${socio.apellidos}`
          : "Socio",
      });
    });

    return resultado;
  }, [
    mesActual,
    socios,
    aportaciones,
    cuotas,
    prestamos,
    configuracion,
    fechaHoy,
    ultimoDia,
  ]);

  const diasCalendario = useMemo(() => {
    const primerDiaSemana = (primerDia.getDay() + 6) % 7;
    const totalDias = ultimoDia.getDate();

    const resultado: (number | null)[] = [];

    for (let i = 0; i < primerDiaSemana; i++) {
      resultado.push(null);
    }

    for (let dia = 1; dia <= totalDias; dia++) {
      resultado.push(dia);
    }

    while (resultado.length % 7 !== 0) {
      resultado.push(null);
    }

    return resultado;
  }, [mesActual]);

  const eventosSeleccionados =
    eventosPorDia[diaSeleccionado] || [];

  const totalAportes = eventosSeleccionados
    .filter((e) => e.tipo === "aportacion" && e.estado === "pagado")
    .reduce((total, e) => total + e.monto, 0);

  const totalCuotas = eventosSeleccionados
    .filter((e) => e.tipo === "prestamo" && e.estado !== "pagado")
    .reduce((total, e) => total + e.monto, 0);

  function cambiarMes(direccion: number) {
    const nuevoMes = new Date(
      mesActual.getFullYear(),
      mesActual.getMonth() + direccion,
      1
    );

    setMesActual(nuevoMes);
    setDiaSeleccionado(fechaLocal(nuevoMes));
  }

  function seleccionarDia(dia: number) {
    const fecha = new Date(
      mesActual.getFullYear(),
      mesActual.getMonth(),
      dia
    );

    setDiaSeleccionado(fechaLocal(fecha));
  }

  function esHoy(dia: number) {
    return fechaLocal(
      new Date(
        mesActual.getFullYear(),
        mesActual.getMonth(),
        dia
      )
    ) === fechaHoy;
  }

  function colorEstado(estado: string) {
    if (estado === "pagado") return "bg-green-100 text-green-700";
    if (estado === "parcial") return "bg-yellow-100 text-yellow-800";
    if (estado === "atrasado") return "bg-red-100 text-red-700";
    if (estado === "pendiente") return "bg-orange-100 text-orange-700";
    return "bg-blue-100 text-blue-700";
  }

  return (
    <main className="min-h-screen bg-[#EEF1F5] pb-8">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-white shadow-xl">

        <header className="bg-[#092957] px-5 pb-6 pt-7 text-white">
          <button
            onClick={() => router.push("/admin")}
            className="mb-5 flex items-center gap-2 text-sm text-white/80"
          >
            <ArrowLeft size={18} />
            Volver al panel
          </button>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFDC00] text-[#092957]">
                <CalendarDays size={25} />
              </div>

              <div>
                <h1 className="text-xl font-bold">Calendario</h1>
                <p className="text-xs text-blue-100">
                  Aportaciones y cuotas de préstamos
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setMensaje("");
                setModalConfiguracion(true);
              }}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white"
              title="Configurar cobros"
            >
              <Settings size={20} />
            </button>
          </div>

          <div className="mt-4 rounded-2xl bg-white/10 p-3">
            <p className="text-xs text-blue-100">
              Día de cobro semanal
            </p>
            <p className="mt-1 font-bold">
              {DIAS_COMPLETOS[configuracion.dia_cobro]} ·{" "}
              {dinero(configuracion.monto)} por socio
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <Wallet size={15} />
                Aportaciones del día
              </div>
              <p className="mt-2 text-xl font-bold">
                {dinero(totalAportes)}
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 p-3">
              <div className="flex items-center gap-2 text-xs text-blue-100">
                <HandCoins size={15} />
                Cuotas pendientes
              </div>
              <p className="mt-2 text-xl font-bold">
                {dinero(totalCuotas)}
              </p>
            </div>
          </div>
        </header>

        <section className="px-4 pt-5">

          {mensaje && !modalConfiguracion && (
            <div className="mb-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800">
              {mensaje}
            </div>
          )}

          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => cambiarMes(-1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF1F5] text-[#092957]"
            >
              <ChevronLeft size={21} />
            </button>

            <div className="text-center">
              <h2 className="text-lg font-bold text-[#092957]">
                {MESES[mesActual.getMonth()]} {mesActual.getFullYear()}
              </h2>
              <p className="text-xs text-gray-500">
                Selecciona un día para ver sus movimientos
              </p>
            </div>

            <button
              onClick={() => cambiarMes(1)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF1F5] text-[#092957]"
            >
              <ChevronRight size={21} />
            </button>
          </div>

          <div className="rounded-2xl border border-gray-100 p-3 shadow-sm">
            <div className="mb-2 grid grid-cols-7">
              {DIAS.map((dia, i) => (
                <div
                  key={i}
                  className="py-2 text-center text-xs font-bold text-gray-400"
                >
                  {dia}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-2">
              {diasCalendario.map((dia, i) => {
                if (!dia) {
                  return <div key={`vacio-${i}`} />;
                }

                const fecha = fechaLocal(
                  new Date(
                    mesActual.getFullYear(),
                    mesActual.getMonth(),
                    dia
                  )
                );

                const eventos = eventosPorDia[fecha] || [];
                const seleccionado = fecha === diaSeleccionado;
                const hoy = esHoy(dia);

                const tieneAporte = eventos.some(
                  (e) => e.tipo === "aportacion"
                );

                const tienePrestamo = eventos.some(
                  (e) => e.tipo === "prestamo"
                );

                return (
                  <button
                    key={dia}
                    onClick={() => seleccionarDia(dia)}
                    className={`relative mx-auto flex h-11 w-10 flex-col items-center justify-center rounded-xl transition ${
                      seleccionado
                        ? "bg-[#092957] text-white shadow-md"
                        : hoy
                        ? "bg-[#FFF5C2] text-[#092957]"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <span className="text-sm font-semibold">{dia}</span>

                    <div className="mt-1 flex gap-1">
                      {tieneAporte && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            seleccionado ? "bg-[#FFDC00]" : "bg-[#D6B900]"
                          }`}
                        />
                      )}

                      {tienePrestamo && (
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            seleccionado ? "bg-white" : "bg-blue-500"
                          }`}
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 px-1 text-[11px] text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#D6B900]" />
              Aportaciones
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500" />
              Cuotas de préstamos
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#FFF0B0]" />
              Hoy
            </div>
          </div>

          <div className="mb-3 mt-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-[#092957]">
                Detalle del día
              </h3>
              <p className="text-xs text-gray-500">
                {fechaDesdeTexto(diaSeleccionado).toLocaleDateString(
                  "es-EC",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </p>
            </div>

            <span className="rounded-full bg-[#FFF5C2] px-3 py-1 text-xs font-bold text-[#092957]">
              {eventosSeleccionados.length} movimientos
            </span>
          </div>

          {cargando ? (
            <div className="flex flex-col items-center py-10 text-gray-400">
              <RefreshCw className="mb-2 animate-spin" size={24} />
              <p className="text-sm">Cargando calendario...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mb-2" size={20} />
              {error}
            </div>
          ) : eventosSeleccionados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center">
              <CalendarDays
                className="mx-auto mb-2 text-gray-300"
                size={30}
              />
              <p className="text-sm font-semibold text-gray-500">
                Sin movimientos registrados
              </p>
              <p className="mt-1 text-xs text-gray-400">
                No hay cuotas ni aportaciones registradas para este día.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {eventosSeleccionados.map((evento) => (
                <div
                  key={evento.id}
                  className="rounded-2xl border border-gray-100 p-4 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                        evento.tipo === "aportacion"
                          ? "bg-[#FFF5C2] text-[#092957]"
                          : "bg-blue-50 text-blue-700"
                      }`}
                    >
                      {evento.tipo === "aportacion" ? (
                        <Wallet size={19} />
                      ) : (
                        <HandCoins size={19} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-bold text-[#092957]">
                          {evento.titulo}
                        </p>

                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ${colorEstado(evento.estado)}`}
                        >
                          {evento.estado === "programado"
                            ? "Día de cobro"
                            : evento.estado}
                        </span>
                      </div>

                      {evento.socio && (
                        <p className="mt-1 text-xs text-gray-600">
                          {evento.socio}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-gray-500">
                        {evento.descripcion}
                      </p>

                      {evento.tipo === "prestamo" && (
                        <p className="mt-2 text-sm font-bold text-[#092957]">
                          {dinero(evento.monto)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {modalConfiguracion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 px-3 py-4 sm:items-center">
          <div className="w-full max-w-[410px] rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#092957]">
                  Configurar aportaciones
                </h2>
                <p className="text-xs text-gray-500">
                  Programa el cobro semanal del fondo
                </p>
              </div>

              <button
                onClick={() => setModalConfiguracion(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-gray-600"
              >
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Día de cobro semanal
                </label>

                <select
                  value={configuracion.dia_cobro}
                  onChange={(e) =>
                    setConfiguracion((actual) => ({
                      ...actual,
                      dia_cobro: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-800 outline-none focus:border-[#092957]"
                >
                  {DIAS_COMPLETOS.map((dia, i) => (
                    <option key={i} value={i}>
                      {dia}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Aportación por socio (USD)
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={configuracion.monto}
                  onChange={(e) =>
                    setConfiguracion((actual) => ({
                      ...actual,
                      monto: Number(e.target.value),
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#092957]"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">
                  Fecha desde la que se aplica
                </label>

                <input
                  type="date"
                  value={configuracion.fecha_inicio}
                  onChange={(e) =>
                    setConfiguracion((actual) => ({
                      ...actual,
                      fecha_inicio: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-[#092957]"
                />
              </div>

              <div className="rounded-xl bg-[#FFF8D6] p-3 text-xs leading-5 text-[#735D00]">
                Esta configuración solo establece el día y el monto previsto.
                Los pagos reales se registran desde el módulo Aportaciones,
                usando la fecha en que el socio entrega el dinero.
              </div>

              {mensaje && (
                <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700">
                  {mensaje}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setModalConfiguracion(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-600"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarConfiguracion}
                  disabled={guardando}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#092957] py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {guardando ? (
                    <RefreshCw size={17} className="animate-spin" />
                  ) : (
                    <Save size={17} />
                  )}
                  {guardando ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
