
"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark, Wallet, Users, Search, ChevronLeft, ChevronDown,
  RefreshCw, Home, Settings, X, Save, Plus, HandCoins,
  CircleDollarSign, History, CalendarDays, AlertCircle,
  Pencil, Trash2, Archive, FileClock,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Socio = {
  id: number;
  numero_socio: number | null;
  nombres: string;
  apellidos: string;
  estado: string;
};

type Ciclo = {
  id: number;
  numero_ciclo: number;
  monto_prestamo: number;
  estado: string;
};

type Prestamo = {
  id: number;
  socio_id: number;
  ciclo_id: number | null;
  monto: number;
  total_a_pagar: number;
  saldo_pendiente: number;
  fecha_entrega: string | null;
  plazo_descripcion: string | null;
  observacion: string | null;
  estado: string;
  es_historico: boolean;
  total_abonado_historico: number;
  detalle_historico: string | null;
};

type Cuota = {
  id: number;
  prestamo_id: number;
  numero_cuota: number;
  fecha_vencimiento: string;
  monto: number;
  monto_pagado: number;
  estado: string;
  observacion: string | null;
};

type Pago = {
  id: number;
  prestamo_id: number;
  cuota_id: number | null;
  monto: number;
  fecha_pago: string;
  metodo_pago: string | null;
  observacion: string | null;
};

const dinero = (n: number) =>
  `$${Number(n || 0).toLocaleString("es-EC", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fechaBonita = (fecha: string | null) => {
  if (!fecha) return "Sin fecha";
  const [y, m, d] = fecha.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export default function PrestamosPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [socios, setSocios] = useState<Socio[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [cuotas, setCuotas] = useState<Cuota[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [fechaHoy, setFechaHoy] = useState("");

  const [busqueda, setBusqueda] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [apartado, setApartado] = useState<"actuales" | "anteriores">("actuales");
  const [socioAbierto, setSocioAbierto] = useState<number | null>(null);
  const [prestamoAbierto, setPrestamoAbierto] = useState<number | null>(null);

  const [modalPrestamo, setModalPrestamo] = useState(false);
  const [modalHistorico, setModalHistorico] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalCuota, setModalCuota] = useState(false);
  const [modalPago, setModalPago] = useState(false);

  const [prestamoSeleccionado, setPrestamoSeleccionado] =
    useState<Prestamo | null>(null);
  const [cuotaSeleccionada, setCuotaSeleccionada] =
    useState<Cuota | null>(null);

  const [formPrestamo, setFormPrestamo] = useState({
    socio_id: "",
    ciclo_id: "",
    monto: "500",
    total_a_pagar: "500",
    fecha_entrega: "",
    plazo_descripcion: "",
    observacion: "",
  });

  const [formHistorico, setFormHistorico] = useState({
    socio_id: "",
    monto: "",
    total_a_pagar: "",
    total_abonado: "0",
    fecha_entrega: "",
    plazo_descripcion: "",
    detalle: "",
  });

  const [formEditar, setFormEditar] = useState({
    monto: "",
    total_a_pagar: "",
    fecha_entrega: "",
    plazo_descripcion: "",
    observacion: "",
    total_abonado_historico: "",
  });

  const [formCuota, setFormCuota] = useState({
    fecha_vencimiento: "",
    monto: "",
    observacion: "",
  });

  const [formPago, setFormPago] = useState({
    monto: "",
    fecha_pago: "",
    metodo_pago: "efectivo",
    observacion: "",
  });

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

    const [rSocios, rCiclos, rPrestamos, rCuotas, rPagos] =
      await Promise.all([
        supabase.from("socios")
          .select("id, numero_socio, nombres, apellidos, estado")
          .order("numero_socio", { ascending: true }),

        supabase.from("ciclos")
          .select("id, numero_ciclo, monto_prestamo, estado")
          .order("numero_ciclo", { ascending: true }),

        supabase.from("prestamos")
          .select("*")
          .order("creado_at", { ascending: false }),

        supabase.from("cuotas_prestamo")
          .select("*")
          .order("numero_cuota", { ascending: true }),

        supabase.from("pagos_prestamo")
          .select("*")
          .order("fecha_pago", { ascending: false }),
      ]);

    const fallo =
      rSocios.error || rCiclos.error || rPrestamos.error ||
      rCuotas.error || rPagos.error;

    if (fallo) {
      setError(fallo.message);
      setCargando(false);
      return;
    }

    setSocios((rSocios.data || []) as Socio[]);
    setCiclos((rCiclos.data || []) as Ciclo[]);
    setPrestamos((rPrestamos.data || []) as Prestamo[]);
    setCuotas((rCuotas.data || []) as Cuota[]);
    setPagos((rPagos.data || []) as Pago[]);
    setCargando(false);
  }

  useEffect(() => {
    cargarDatos();
  }, [supabase]);

  useEffect(() => {
    const d = new Date();
    const fecha = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setFechaHoy(fecha);
    setFormPrestamo((actual) => ({
      ...actual,
      fecha_entrega: actual.fecha_entrega || fecha,
    }));
    setFormPago((actual) => ({
      ...actual,
      fecha_pago: actual.fecha_pago || fecha,
    }));
  }, []);

  const prestamosActuales = prestamos.filter((p) => !p.es_historico);
  const prestamosAnteriores = prestamos.filter((p) => p.es_historico);

  const totalEntregado = prestamos.reduce(
    (s, p) => s + Number(p.monto || 0), 0
  );

  const totalPendiente = prestamos.reduce(
    (s, p) => s + Number(p.saldo_pendiente || 0), 0
  );

  const totalAbonado = prestamos.reduce((s, p) => {
    const pagosNuevos = pagos
      .filter((x) => x.prestamo_id === p.id)
      .reduce((a, x) => a + Number(x.monto || 0), 0);

    return s + Number(p.total_abonado_historico || 0) + pagosNuevos;
  }, 0);

  const activos = prestamos.filter(
    (p) => Number(p.saldo_pendiente) > 0
  ).length;

  const prestamosVisibles =
    apartado === "actuales" ? prestamosActuales : prestamosAnteriores;

  const sociosFiltrados = socios.filter((socio) => {
    const texto =
      `${socio.nombres} ${socio.apellidos} ${socio.numero_socio ?? ""}`;

    const coincide = texto.toLowerCase().includes(busqueda.toLowerCase());

    const susPrestamos = prestamosVisibles.filter(
      (p) => p.socio_id === socio.id
    );

    const tieneActivo = susPrestamos.some(
      (p) => Number(p.saldo_pendiente) > 0
    );

    const tieneLiquidado =
      susPrestamos.length > 0 &&
      susPrestamos.every((p) => Number(p.saldo_pendiente) <= 0);

    const coincideFiltro =
      filtro === "todos" ||
      (filtro === "activos" && tieneActivo) ||
      (filtro === "liquidados" && tieneLiquidado) ||
      (filtro === "sin" && susPrestamos.length === 0);

    return coincide && coincideFiltro;
  });

  function abrirNuevoPrestamo(socioId = "") {
    setError("");
    setFormPrestamo({
      socio_id: socioId,
      ciclo_id: "",
      monto: "500",
      total_a_pagar: "500",
      fecha_entrega: "",
      plazo_descripcion: "",
      observacion: "",
    });
    setModalPrestamo(true);
  }

  async function guardarPrestamo(e: FormEvent) {
    e.preventDefault();
    setError("");

    const socioId = Number(formPrestamo.socio_id);
    const monto = Number(formPrestamo.monto);
    const total = Number(formPrestamo.total_a_pagar);

    if (!socios.some((s) => s.id === socioId && s.estado === "activo")) {
      setError("Selecciona un socio activo.");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0 ||
        !Number.isFinite(total) || total < monto) {
      setError("Revisa el monto entregado y el total a pagar.");
      return;
    }

    if (!formPrestamo.fecha_entrega || formPrestamo.fecha_entrega > fechaHoy) {
      setError("La fecha de entrega no puede ser futura.");
      return;
    }

    if (!formPrestamo.plazo_descripcion.trim()) {
      setError("Escribe el plazo acordado con el socio.");
      return;
    }

    setGuardando(true);
    const { data: sesion } = await supabase.auth.getSession();

    const { error: insertarError } = await supabase
      .from("prestamos")
      .insert({
        socio_id: socioId,
        ciclo_id: formPrestamo.ciclo_id
          ? Number(formPrestamo.ciclo_id) : null,
        monto,
        total_a_pagar: total,
        saldo_pendiente: total,
        fecha_entrega: formPrestamo.fecha_entrega,
        plazo_descripcion: formPrestamo.plazo_descripcion.trim(),
        observacion: formPrestamo.observacion.trim() || null,
        estado: "activo",
        es_historico: false,
        total_abonado_historico: 0,
        registrado_por: sesion.session?.user.id ?? null,
      });

    if (insertarError) {
      setError(insertarError.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setModalPrestamo(false);
    setSocioAbierto(socioId);
    await cargarDatos();
  }

  function abrirNuevoHistorico(socioId = "") {
    setError("");
    setFormHistorico({
      socio_id: socioId,
      monto: "",
      total_a_pagar: "",
      total_abonado: "0",
      fecha_entrega: "",
      plazo_descripcion: "",
      detalle: "",
    });
    setModalHistorico(true);
  }

  async function guardarHistorico(e: FormEvent) {
    e.preventDefault();
    setError("");

    const socioId = Number(formHistorico.socio_id);
    const monto = Number(formHistorico.monto);
    const total = Number(formHistorico.total_a_pagar);
    const abonado = Number(formHistorico.total_abonado);

    if (!socios.some((s) => s.id === socioId)) {
      setError("Selecciona un socio válido.");
      return;
    }

    if (!Number.isFinite(monto) || monto <= 0 ||
        !Number.isFinite(total) || total < monto ||
        !Number.isFinite(abonado) || abonado < 0 || abonado > total) {
      setError("Revisa los montos. Los pagos acumulados no pueden superar el total.");
      return;
    }

    if (formHistorico.fecha_entrega &&
        formHistorico.fecha_entrega > fechaHoy) {
      setError("La fecha de entrega no puede ser futura.");
      return;
    }

    setGuardando(true);
    const { data: sesion } = await supabase.auth.getSession();

    const { error: insertarError } = await supabase
      .from("prestamos")
      .insert({
        socio_id: socioId,
        ciclo_id: null,
        monto,
        total_a_pagar: total,
        saldo_pendiente: Math.max(0, total - abonado),
        fecha_entrega: formHistorico.fecha_entrega || null,
        plazo_descripcion:
          formHistorico.plazo_descripcion.trim() || "Préstamo anterior",
        observacion: formHistorico.detalle.trim() || null,
        estado: total - abonado <= 0 ? "pagado" : "activo",
        es_historico: true,
        total_abonado_historico: abonado,
        detalle_historico: formHistorico.detalle.trim() || null,
        registrado_por: sesion.session?.user.id ?? null,
      });

    if (insertarError) {
      setError(insertarError.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setModalHistorico(false);
    setApartado("anteriores");
    setSocioAbierto(socioId);
    await cargarDatos();
  }

  function abrirEditarPrestamo(prestamo: Prestamo) {
    setPrestamoSeleccionado(prestamo);
    setFormEditar({
      monto: String(prestamo.monto),
      total_a_pagar: String(prestamo.total_a_pagar),
      fecha_entrega: prestamo.fecha_entrega || "",
      plazo_descripcion: prestamo.plazo_descripcion || "",
      observacion: prestamo.observacion || "",
      total_abonado_historico: String(prestamo.total_abonado_historico || 0),
    });
    setError("");
    setModalEditar(true);
  }

  async function actualizarPrestamo(e: FormEvent) {
    e.preventDefault();
    if (!prestamoSeleccionado) return;

    setError("");

    const monto = Number(formEditar.monto);
    const total = Number(formEditar.total_a_pagar);
    const historico = Number(formEditar.total_abonado_historico || 0);

    const pagosNuevos = pagos
      .filter((p) => p.prestamo_id === prestamoSeleccionado.id)
      .reduce((s, p) => s + Number(p.monto || 0), 0);

    const totalPagado = historico + pagosNuevos;

    if (!Number.isFinite(monto) || monto <= 0 ||
        !Number.isFinite(total) || total < monto) {
      setError("Revisa el monto entregado y el total acordado.");
      return;
    }

    if (prestamoSeleccionado.es_historico &&
        (!Number.isFinite(historico) || historico < 0)) {
      setError("El total abonado anterior no es válido.");
      return;
    }

    if (total < totalPagado) {
      setError("El total acordado no puede ser menor a los pagos ya registrados.");
      return;
    }

    if (formEditar.fecha_entrega &&
        formEditar.fecha_entrega > fechaHoy) {
      setError("La fecha de entrega no puede ser futura.");
      return;
    }

    const nuevoSaldo = Math.max(0, total - totalPagado);

    setGuardando(true);

    const { error: errorActualizar } = await supabase
      .from("prestamos")
      .update({
        monto,
        total_a_pagar: total,
        saldo_pendiente: nuevoSaldo,
        fecha_entrega: formEditar.fecha_entrega || null,
        plazo_descripcion: formEditar.plazo_descripcion.trim() || null,
        observacion: formEditar.observacion.trim() || null,
        ...(prestamoSeleccionado.es_historico
          ? { total_abonado_historico: historico,
              detalle_historico: formEditar.observacion.trim() || null }
          : {}),
        estado: nuevoSaldo <= 0 ? "pagado" : "activo",
      })
      .eq("id", prestamoSeleccionado.id);

    if (errorActualizar) {
      setError(errorActualizar.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setModalEditar(false);
    setPrestamoSeleccionado(null);
    await cargarDatos();
  }

  async function eliminarPrestamo(prestamo: Prestamo) {
    const tienePagos = pagos.some((p) => p.prestamo_id === prestamo.id);
    const tieneCuotas = cuotas.some((c) => c.prestamo_id === prestamo.id);

    if (tienePagos || tieneCuotas) {
      setError(
        "No se puede eliminar este préstamo porque tiene cuotas o pagos registrados. Puedes editarlo, pero se debe conservar su historial."
      );
      return;
    }

    const confirmar = window.confirm(
      `¿Eliminar definitivamente el préstamo #${prestamo.id}? Esta acción no se puede deshacer.`
    );

    if (!confirmar) return;

    setGuardando(true);
    setError("");

    const { error: borrarError } = await supabase
      .from("prestamos")
      .delete()
      .eq("id", prestamo.id);

    if (borrarError) {
      setError(borrarError.message);
      setGuardando(false);
      return;
    }

    setPrestamoAbierto(null);
    setPrestamoSeleccionado(null);
    setGuardando(false);
    await cargarDatos();
  }

  function abrirNuevaCuota(prestamo: Prestamo) {
    setPrestamoSeleccionado(prestamo);
    setFormCuota({
      fecha_vencimiento: "",
      monto: "",
      observacion: "",
    });
    setError("");
    setModalCuota(true);
  }

  async function guardarCuota(e: FormEvent) {
    e.preventDefault();
    if (!prestamoSeleccionado) return;

    setError("");

    const monto = Number(formCuota.monto);
    const fecha = formCuota.fecha_vencimiento;

    if (!Number.isFinite(monto) || monto <= 0 || !fecha) {
      setError("Introduce un monto y una fecha válidos.");
      return;
    }

    const cuotasDelPrestamo = cuotas.filter(
      (c) => c.prestamo_id === prestamoSeleccionado.id
    );

    const totalProgramado = cuotasDelPrestamo.reduce(
      (s, c) => s + Number(c.monto), 0
    );

    if (totalProgramado + monto >
        Number(prestamoSeleccionado.total_a_pagar) + 0.001) {
      setError("Las cuotas superarían el total del préstamo.");
      return;
    }

    const numero = Math.max(
      0, ...cuotasDelPrestamo.map((c) => c.numero_cuota)
    ) + 1;

    setGuardando(true);

    const { error: insertarError } = await supabase
      .from("cuotas_prestamo")
      .insert({
        prestamo_id: prestamoSeleccionado.id,
        numero_cuota: numero,
        fecha_vencimiento: fecha,
        monto,
        monto_pagado: 0,
        estado: "pendiente",
        observacion: formCuota.observacion.trim() || null,
      });

    if (insertarError) {
      setError(insertarError.message);
      setGuardando(false);
      return;
    }

    setGuardando(false);
    setModalCuota(false);
    await cargarDatos();
  }

  function abrirPago(prestamo: Prestamo, cuota: Cuota) {
    setPrestamoSeleccionado(prestamo);
    setCuotaSeleccionada(cuota);

    const restante =
      Number(cuota.monto) - Number(cuota.monto_pagado || 0);

    setFormPago({
      monto: Math.max(0, restante).toFixed(2),
      fecha_pago: "",
      metodo_pago: "efectivo",
      observacion: "",
    });

    setError("");
    setModalPago(true);
  }

  async function registrarPago(e: FormEvent) {
    e.preventDefault();

    if (!prestamoSeleccionado || !cuotaSeleccionada) return;

    setError("");

    const monto = Number(formPago.monto);
    const pagadoCuota = Number(cuotaSeleccionada.monto_pagado || 0);
    const restanteCuota = Number(cuotaSeleccionada.monto) - pagadoCuota;
    const saldoPrestamo = Number(prestamoSeleccionado.saldo_pendiente);

    if (!Number.isFinite(monto) || monto <= 0 ||
        monto > restanteCuota + 0.001 ||
        monto > saldoPrestamo + 0.001) {
      setError("El abono supera el saldo disponible o no es válido.");
      return;
    }

    if (!formPago.fecha_pago || formPago.fecha_pago > fechaHoy) {
      setError("La fecha del pago no puede ser futura.");
      return;
    }

    setGuardando(true);
    const { data: sesion } = await supabase.auth.getSession();

    const { error: errorInsertar } = await supabase
      .from("pagos_prestamo")
      .insert({
        prestamo_id: prestamoSeleccionado.id,
        cuota_id: cuotaSeleccionada.id,
        monto,
        fecha_pago: formPago.fecha_pago,
        metodo_pago: formPago.metodo_pago,
        observacion: formPago.observacion.trim() || null,
        registrado_por: sesion.session?.user.id ?? null,
      });

    if (errorInsertar) {
      setError(errorInsertar.message);
      setGuardando(false);
      return;
    }

    const nuevoPagado = pagadoCuota + monto;
    const nuevaCuotaEstado =
      nuevoPagado >= Number(cuotaSeleccionada.monto) - 0.001
        ? "pagada" : "parcial";

    const { error: errorCuota } = await supabase
      .from("cuotas_prestamo")
      .update({
        monto_pagado: nuevoPagado,
        estado: nuevaCuotaEstado,
      })
      .eq("id", cuotaSeleccionada.id);

    if (errorCuota) {
      setError(
        "El pago se registró, pero no se pudo actualizar la cuota. Actualiza los datos antes de continuar. " +
        errorCuota.message
      );
      setGuardando(false);
      await cargarDatos();
      return;
    }

    const nuevoSaldo = Math.max(0, saldoPrestamo - monto);

    const { error: errorPrestamo } = await supabase
      .from("prestamos")
      .update({
        saldo_pendiente: nuevoSaldo,
        estado: nuevoSaldo <= 0 ? "pagado" : "activo",
      })
      .eq("id", prestamoSeleccionado.id);

    if (errorPrestamo) {
      setError(
        "El pago y la cuota se guardaron, pero no se pudo actualizar el saldo. " +
        errorPrestamo.message
      );
      setGuardando(false);
      await cargarDatos();
      return;
    }

    setGuardando(false);
    setModalPago(false);
    setCuotaSeleccionada(null);
    setPrestamoSeleccionado(null);
    await cargarDatos();
  }

  function estadoCuota(cuota: Cuota) {
    const restante =
      Number(cuota.monto) - Number(cuota.monto_pagado || 0);

    if (restante <= 0.001) return "pagada";
    if (Number(cuota.monto_pagado || 0) > 0) return "parcial";
    if (cuota.fecha_vencimiento < fechaHoy) return "atrasada";
    return "pendiente";
  }

  function etiquetaEstado(estado: string) {
    const estilos: Record<string, string> = {
      pagada: "bg-green-50 text-green-700",
      parcial: "bg-blue-50 text-blue-700",
      atrasada: "bg-red-50 text-red-700",
      pendiente: "bg-amber-50 text-amber-700",
    };

    const nombres: Record<string, string> = {
      pagada: "PAGADA",
      parcial: "PARCIAL",
      atrasada: "ATRASADA",
      pendiente: "PENDIENTE",
    };

    return (
      <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${estilos[estado] || estilos.pendiente}`}>
        {nombres[estado] || estado.toUpperCase()}
      </span>
    );
  }

  return (
    <main className="min-h-screen bg-[#EEF1F5] px-3 pb-28 pt-4">
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-white shadow-xl sm:rounded-[28px] sm:border sm:border-slate-200">

        <header className="flex items-center justify-between px-5 pb-5 pt-5">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/admin")}
              className="rounded-full bg-slate-100 p-2 text-[#092957]">
              <ChevronLeft size={21} />
            </button>
            <div>
              <h1 className="text-base font-extrabold text-[#092957]">
                BANCO DIVINO NIÑO
              </h1>
              <p className="text-[11px] text-slate-500">
                Administración de préstamos
              </p>
            </div>
          </div>
          <Landmark size={27} className="text-[#D6B900]" />
        </header>

        <section className="px-5">
          <div className="rounded-2xl bg-[#092957] p-5 text-white">
            <p className="text-xs text-blue-100">Resumen de préstamos</p>
            <h2 className="mt-1 text-2xl font-bold">{dinero(totalPendiente)}</h2>
            <p className="text-[10px] text-blue-100">Saldo pendiente por recuperar</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Entregado</p>
                <p className="mt-1 text-lg font-bold">{dinero(totalEntregado)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Abonado</p>
                <p className="mt-1 text-lg font-bold">{dinero(totalAbonado)}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Con deuda</p>
                <p className="mt-1 text-lg font-bold">{activos}</p>
              </div>
              <div className="rounded-xl bg-white/10 p-3">
                <p className="text-[10px] text-blue-100">Socios</p>
                <p className="mt-1 text-lg font-bold">{socios.length}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pt-5">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => abrirNuevoPrestamo()}
              className="flex items-center justify-center gap-2 rounded-xl bg-[#FFDC00] px-2 py-3.5 text-xs font-bold text-[#092957]"
            >
              <Plus size={17} /> Nuevo préstamo
            </button>
            <button
              onClick={() => abrirNuevoHistorico()}
              className="flex items-center justify-center gap-2 rounded-xl border border-[#092957] bg-white px-2 py-3.5 text-xs font-bold text-[#092957]"
            >
              <Archive size={17} /> Préstamo anterior
            </button>
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
              onClick={() => {
                setApartado("actuales");
                setSocioAbierto(null);
                setPrestamoAbierto(null);
                setFiltro("todos");
                setError("");
              }}
              className={`rounded-lg py-3 text-[11px] font-bold ${
                apartado === "actuales"
                  ? "bg-white text-[#092957] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <HandCoins size={15} className="mr-1 inline" />
              Préstamos actuales ({prestamosActuales.length})
            </button>
            <button
              onClick={() => {
                setApartado("anteriores");
                setSocioAbierto(null);
                setPrestamoAbierto(null);
                setFiltro("todos");
                setError("");
              }}
              className={`rounded-lg py-3 text-[11px] font-bold ${
                apartado === "anteriores"
                  ? "bg-white text-[#092957] shadow-sm"
                  : "text-slate-500"
              }`}
            >
              <History size={15} className="mr-1 inline" />
              Anteriores ({prestamosAnteriores.length})
            </button>
          </div>

          {apartado === "anteriores" && (
            <div className="mt-3 rounded-xl bg-[#FFF9E8] p-3">
              <div className="flex gap-2">
                <FileClock size={18} className="shrink-0 text-[#B49A00]" />
                <p className="text-[10px] text-[#725D00]">
                  Aquí se guardan los préstamos realizados antes de usar la aplicación.
                  Los pagos anteriores se registran como un total acumulado, sin inventar fechas.
                </p>
              </div>
            </div>
          )}
        </section>

        <section className="px-5 pt-5">
          <h2 className="mb-3 text-base font-bold text-[#092957]">Buscar socio</h2>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search size={19} className="text-slate-400" />
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Nombre o número de socio"
              className="w-full py-3 text-xs text-[#092957] outline-none"
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}>
                <X size={17} className="text-slate-400" />
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {[
              { id: "todos", nombre: "Todos" },
              { id: "activos", nombre: "Con deuda" },
              { id: "liquidados", nombre: "Liquidados" },
              { id: "sin", nombre: "Sin préstamo" },
            ].map((op) => (
              <button
                key={op.id}
                onClick={() => setFiltro(op.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-[10px] font-semibold ${
                  filtro === op.id
                    ? "bg-[#092957] text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {op.nombre}
              </button>
            ))}
          </div>
        </section>

        <section className="px-5 pt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#092957]">
                {apartado === "actuales" ? "Socios y préstamos" : "Historial anterior"}
              </h2>
              <p className="text-[10px] text-slate-400">
                Toca un socio para consultar su información
              </p>
            </div>
            <button onClick={cargarDatos}
              className="rounded-full bg-slate-100 p-2 text-[#092957]">
              <RefreshCw size={17} />
            </button>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-sm text-slate-400">
              Cargando información...
            </div>
          ) : error && !modalPrestamo && !modalHistorico && !modalEditar && !modalCuota && !modalPago ? (
            <div className="mb-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">
              {error}
              <button onClick={() => setError("")} className="ml-2 font-bold">Cerrar</button>
            </div>
          ) : sociosFiltrados.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
              <Users size={32} className="mx-auto text-slate-300" />
              <p className="mt-3 text-sm font-semibold text-[#092957]">
                {apartado === "anteriores"
                  ? "Todavía no hay préstamos anteriores"
                  : "No se encontraron socios"}
              </p>
              {apartado === "anteriores" && (
                <button
                  onClick={() => abrirNuevoHistorico()}
                  className="mt-3 rounded-lg bg-[#FFDC00] px-4 py-2 text-xs font-bold text-[#092957]"
                >
                  Registrar préstamo anterior
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sociosFiltrados.map((socio) => {
                const susPrestamos = prestamosVisibles.filter(
                  (p) => p.socio_id === socio.id
                );

                const deudaSocio = susPrestamos.reduce(
                  (s, p) => s + Number(p.saldo_pendiente || 0), 0
                );

                const abierto = socioAbierto === socio.id;

                return (
                  <article key={socio.id}
                    className={`overflow-hidden rounded-2xl border ${
                      abierto ? "border-[#D6B900] shadow-md" : "border-slate-100 shadow-sm"
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSocioAbierto(abierto ? null : socio.id);
                        setPrestamoAbierto(null);
                      }}
                      className="flex w-full items-center gap-3 p-3.5 text-left"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFF4C2] text-[#092957]">
                        <Users size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#092957]">
                          {socio.nombres} {socio.apellidos}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          Socio #{socio.numero_socio ?? socio.id} · {susPrestamos.length} préstamo(s)
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-slate-400">Debe</p>
                        <p className="text-xs font-bold text-[#092957]">{dinero(deudaSocio)}</p>
                      </div>
                      <ChevronDown size={18}
                        className={`text-[#092957] transition-transform ${abierto ? "rotate-180" : ""}`}
                      />
                    </button>

                    {abierto && (
                      <div className="border-t border-slate-100 bg-[#FAFBFD] p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-bold text-[#092957]">
                            Información financiera
                          </p>
                          <span className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                            socio.estado === "activo"
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-500"
                          }`}>
                            {socio.estado.toUpperCase()}
                          </span>
                        </div>

                        <div className="mb-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[9px] text-slate-400">Préstamos entregados</p>
                            <p className="mt-1 text-sm font-bold text-[#092957]">
                              {dinero(susPrestamos.reduce((s, p) => s + Number(p.monto || 0), 0))}
                            </p>
                          </div>
                          <div className="rounded-xl bg-white p-3">
                            <p className="text-[9px] text-slate-400">Saldo pendiente</p>
                            <p className="mt-1 text-sm font-bold text-red-600">{dinero(deudaSocio)}</p>
                          </div>
                        </div>

                        {apartado === "actuales" ? (
                          <button
                            onClick={() => abrirNuevoPrestamo(String(socio.id))}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#FFDC00] py-2.5 text-xs font-bold text-[#092957]"
                          >
                            <Plus size={16} /> Nuevo préstamo para este socio
                          </button>
                        ) : (
                          <button
                            onClick={() => abrirNuevoHistorico(String(socio.id))}
                            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[#092957] bg-white py-2.5 text-xs font-bold text-[#092957]"
                          >
                            <Archive size={16} /> Añadir otro préstamo anterior
                          </button>
                        )}

                        {susPrestamos.length === 0 ? (
                          <p className="rounded-xl bg-white p-4 text-center text-xs text-slate-400">
                            Este socio todavía no tiene préstamos en este apartado.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {susPrestamos.map((prestamo) => {
                              const susCuotas = cuotas.filter(
                                (c) => c.prestamo_id === prestamo.id
                              );

                              const susPagos = pagos.filter(
                                (p) => p.prestamo_id === prestamo.id
                              );

                              const ciclo = ciclos.find(
                                (c) => c.id === prestamo.ciclo_id
                              );

                              const saldo = Number(prestamo.saldo_pendiente || 0);
                              const abiertoPrestamo = prestamoAbierto === prestamo.id;
                              const abonadoNuevo = susPagos.reduce(
                                (s, p) => s + Number(p.monto || 0), 0
                              );
                              const abonadoHistorico = Number(prestamo.total_abonado_historico || 0);
                              const abonado = abonadoNuevo + abonadoHistorico;

                              return (
                                <div key={prestamo.id}
                                  className="overflow-hidden rounded-xl border border-slate-100 bg-white"
                                >
                                  <button
                                    onClick={() => setPrestamoAbierto(
                                      abiertoPrestamo ? null : prestamo.id
                                    )}
                                    className="flex w-full items-center gap-2 p-3 text-left"
                                  >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FFF4C2] text-[#B49A00]">
                                      {prestamo.es_historico
                                        ? <History size={18} />
                                        : <HandCoins size={18} />}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-[#092957]">
                                        Préstamo #{prestamo.id}
                                      </p>
                                      <p className="mt-1 text-[9px] text-slate-400">
                                        {prestamo.es_historico
                                          ? "Registro anterior"
                                          : ciclo ? `Ciclo ${ciclo.numero_ciclo}` : "Sin ciclo"}
                                        {" · "}{fechaBonita(prestamo.fecha_entrega)}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-xs font-bold text-[#092957]">
                                        {dinero(Number(prestamo.monto))}
                                      </p>
                                      <p className="text-[9px] text-slate-400">
                                        {saldo <= 0 ? "Liquidado" : "Con deuda"}
                                      </p>
                                    </div>
                                    <ChevronDown size={17}
                                      className={`text-[#092957] transition-transform ${abiertoPrestamo ? "rotate-180" : ""}`}
                                    />
                                  </button>

                                  {abiertoPrestamo && (
                                    <div className="border-t border-slate-100 bg-[#FAFBFD] p-3">
                                      {prestamo.es_historico && (
                                        <div className="mb-3 rounded-lg bg-[#FFF9E8] p-2 text-[10px] text-[#725D00]">
                                          Este préstamo pertenece al historial anterior al sistema.
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 gap-3">
                                        <div>
                                          <p className="text-[9px] text-slate-400">Monto entregado</p>
                                          <p className="text-xs font-bold text-[#092957]">
                                            {dinero(Number(prestamo.monto))}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] text-slate-400">Total acordado</p>
                                          <p className="text-xs font-bold text-[#092957]">
                                            {dinero(Number(prestamo.total_a_pagar))}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] text-slate-400">
                                            {prestamo.es_historico ? "Pagos anteriores" : "Total abonado"}
                                          </p>
                                          <p className="text-xs font-bold text-green-700">
                                            {dinero(abonado)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-[9px] text-slate-400">Saldo pendiente</p>
                                          <p className="text-xs font-bold text-red-600">{dinero(saldo)}</p>
                                        </div>
                                      </div>

                                      <div className="mt-3 rounded-xl bg-white p-3">
                                        <p className="text-[9px] text-slate-400">Plazo y condiciones</p>
                                        <p className="mt-1 text-xs font-semibold text-[#092957]">
                                          {prestamo.plazo_descripcion || "No especificado"}
                                        </p>
                                        {(prestamo.detalle_historico || prestamo.observacion) && (
                                          <p className="mt-2 text-[10px] text-slate-500">
                                            {prestamo.detalle_historico || prestamo.observacion}
                                          </p>
                                        )}
                                      </div>

                                      <div className="mt-3 grid grid-cols-2 gap-2">
                                        <button
                                          onClick={() => abrirEditarPrestamo(prestamo)}
                                          className="flex items-center justify-center gap-2 rounded-lg bg-[#092957] py-2.5 text-[10px] font-bold text-white"
                                        >
                                          <Pencil size={14} /> Editar préstamo
                                        </button>
                                        <button
                                          onClick={() => eliminarPrestamo(prestamo)}
                                          disabled={guardando}
                                          className="flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2.5 text-[10px] font-bold text-red-600 disabled:opacity-50"
                                        >
                                          <Trash2 size={14} /> Eliminar
                                        </button>
                                      </div>

                                      {!prestamo.es_historico && (
                                        <>
                                          <div className="mt-4 flex items-center justify-between">
                                            <div>
                                              <p className="text-xs font-bold text-[#092957]">Calendario de cuotas</p>
                                              <p className="text-[9px] text-slate-400">Fechas e importes acordados</p>
                                            </div>
                                            {saldo > 0 && (
                                              <button
                                                onClick={() => abrirNuevaCuota(prestamo)}
                                                className="flex items-center gap-1 rounded-lg bg-[#092957] px-3 py-2 text-[10px] font-bold text-white"
                                              >
                                                <Plus size={14} /> Añadir cuota
                                              </button>
                                            )}
                                          </div>

                                          {susCuotas.length === 0 ? (
                                            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center">
                                              <CalendarDays size={24} className="mx-auto text-slate-300" />
                                              <p className="mt-2 text-xs font-semibold text-[#092957]">Sin cuotas programadas</p>
                                              <p className="mt-1 text-[9px] text-slate-400">
                                                Añade las fechas y cantidades acordadas con el socio.
                                              </p>
                                            </div>
                                          ) : (
                                            <div className="mt-3 space-y-2">
                                              {susCuotas.map((cuota) => {
                                                const estado = estadoCuota(cuota);
                                                const restante = Number(cuota.monto) - Number(cuota.monto_pagado || 0);

                                                return (
                                                  <div key={cuota.id} className="rounded-xl border border-slate-100 bg-white p-3">
                                                    <div className="flex items-center justify-between">
                                                      <div>
                                                        <p className="text-xs font-bold text-[#092957]">Cuota {cuota.numero_cuota}</p>
                                                        <p className="mt-1 text-[9px] text-slate-400">
                                                          Vence: {fechaBonita(cuota.fecha_vencimiento)}
                                                        </p>
                                                      </div>
                                                      {etiquetaEstado(estado)}
                                                    </div>
                                                    <div className="mt-3 grid grid-cols-3 gap-2">
                                                      <div>
                                                        <p className="text-[8px] text-slate-400">Cuota</p>
                                                        <p className="text-[10px] font-bold text-[#092957]">{dinero(Number(cuota.monto))}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-[8px] text-slate-400">Abonado</p>
                                                        <p className="text-[10px] font-bold text-green-700">{dinero(Number(cuota.monto_pagado || 0))}</p>
                                                      </div>
                                                      <div>
                                                        <p className="text-[8px] text-slate-400">Restante</p>
                                                        <p className="text-[10px] font-bold text-red-600">{dinero(Math.max(0, restante))}</p>
                                                      </div>
                                                    </div>
                                                    {cuota.observacion && (
                                                      <p className="mt-2 text-[9px] text-slate-400">{cuota.observacion}</p>
                                                    )}
                                                    {restante > 0.001 && saldo > 0 && (
                                                      <button
                                                        onClick={() => abrirPago(prestamo, cuota)}
                                                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-[#FFF4C2] py-2.5 text-[10px] font-bold text-[#092957]"
                                                      >
                                                        <CircleDollarSign size={15} /> Registrar abono a esta cuota
                                                      </button>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </>
                                      )}

                                      <div className="mt-4 border-t border-slate-200 pt-3">
                                        <div className="mb-2 flex items-center gap-2">
                                          <History size={15} className="text-[#B49A00]" />
                                          <p className="text-xs font-bold text-[#092957]">
                                            {prestamo.es_historico ? "Resumen de pagos anteriores" : "Historial de movimientos"}
                                          </p>
                                        </div>

                                        {prestamo.es_historico && abonadoHistorico > 0 && (
                                          <div className="mb-2 flex items-center justify-between rounded-lg bg-[#FFF9E8] p-3">
                                            <div>
                                              <p className="text-[10px] font-semibold text-[#725D00]">Pagos acumulados anteriores</p>
                                              <p className="mt-1 text-[9px] text-slate-500">Sin fechas individuales registradas</p>
                                            </div>
                                            <p className="text-xs font-bold text-green-700">
                                              {dinero(abonadoHistorico)}
                                            </p>
                                          </div>
                                        )}

                                        {susPagos.length === 0 ? (
                                          <p className="rounded-lg bg-white p-3 text-center text-[10px] text-slate-400">
                                            No hay pagos nuevos registrados.
                                          </p>
                                        ) : (
                                          <div className="max-h-40 space-y-2 overflow-y-auto">
                                            {susPagos.map((pago) => (
                                              <div key={pago.id} className="flex items-center justify-between rounded-lg bg-white p-3">
                                                <div>
                                                  <p className="text-[10px] font-semibold text-[#092957]">
                                                    {fechaBonita(pago.fecha_pago)}
                                                  </p>
                                                  <p className="mt-1 text-[9px] text-slate-400">
                                                    {pago.metodo_pago || "Sin método"}
                                                  </p>
                                                </div>
                                                <p className="text-xs font-bold text-green-700">
                                                  +{dinero(Number(pago.monto))}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
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
            <div className="flex items-start gap-3">
              <AlertCircle size={21} className="shrink-0 text-[#B49A00]" />
              <div>
                <p className="text-xs font-bold text-[#092957]">Condiciones personalizadas</p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Cada socio puede tener plazos, fechas e importes diferentes. El calendario se registra manualmente según el acuerdo.
                </p>
              </div>
            </div>
          </div>
        </section>

        <nav className="fixed bottom-0 left-1/2 z-40 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t border-slate-200 bg-white px-2 pb-5 pt-3 sm:rounded-b-[28px]">
          <button onClick={() => router.push("/admin")} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
            <Home size={21} /> Inicio
          </button>
          <button onClick={() => router.push("/admin/socios")} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
            <Users size={21} /> Socios
          </button>
          <button onClick={() => router.push("/admin/aportaciones")} className="flex flex-col items-center gap-1 text-[10px] text-slate-400">
            <Wallet size={21} /> Fondo
          </button>
          <button className="flex flex-col items-center gap-1 text-[10px] font-bold text-[#092957]">
            <Settings size={21} /> Préstamos
          </button>
        </nav>

        {modalPrestamo && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">Registrar préstamo</h2>
                  <p className="text-xs text-slate-400">Define las condiciones acordadas</p>
                </div>
                <button onClick={() => { setModalPrestamo(false); setError(""); }} className="rounded-full bg-slate-100 p-2">
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={guardarPrestamo} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Socio</label>
                  <select required value={formPrestamo.socio_id}
                    onChange={(e) => setFormPrestamo({ ...formPrestamo, socio_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]">
                    <option value="">Seleccionar socio</option>
                    {socios.filter((s) => s.estado === "activo").map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.numero_socio ?? s.id} · {s.nombres} {s.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Ciclo (opcional)</label>
                  <select value={formPrestamo.ciclo_id}
                    onChange={(e) => {
                      const ciclo = ciclos.find((c) => c.id === Number(e.target.value));
                      setFormPrestamo({
                        ...formPrestamo,
                        ciclo_id: e.target.value,
                        ...(ciclo ? {
                          monto: String(ciclo.monto_prestamo),
                          total_a_pagar: String(ciclo.monto_prestamo),
                        } : {}),
                      });
                    }}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]">
                    <option value="">Sin ciclo asignado</option>
                    {ciclos.map((c) => (
                      <option key={c.id} value={c.id}>
                        Ciclo {c.numero_ciclo} · {dinero(Number(c.monto_prestamo))}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Monto entregado ($)</label>
                    <input type="number" min="0.01" step="0.01" required value={formPrestamo.monto}
                      onChange={(e) => setFormPrestamo({ ...formPrestamo, monto: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Total a pagar ($)</label>
                    <input type="number" min="0.01" step="0.01" required value={formPrestamo.total_a_pagar}
                      onChange={(e) => setFormPrestamo({ ...formPrestamo, total_a_pagar: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957]" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Plazo y frecuencia acordados</label>
                  <input required value={formPrestamo.plazo_descripcion}
                    onChange={(e) => setFormPrestamo({ ...formPrestamo, plazo_descripcion: e.target.value })}
                    placeholder="Ej. 8 meses, pagos cada 15 días"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Fecha de entrega</label>
                  <input type="date" required max={fechaHoy} value={formPrestamo.fecha_entrega}
                    onChange={(e) => setFormPrestamo({ ...formPrestamo, fecha_entrega: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Observaciones</label>
                  <textarea rows={2} value={formPrestamo.observacion}
                    onChange={(e) => setFormPrestamo({ ...formPrestamo, observacion: e.target.value })}
                    placeholder="Acuerdos o condiciones adicionales..."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}

                <button type="submit" disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092957] py-4 text-sm font-bold text-white disabled:opacity-50">
                  <Save size={18} /> {guardando ? "Guardando..." : "Guardar préstamo"}
                </button>
              </form>
            </div>
          </div>
        )}

        {modalHistorico && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">Préstamo anterior</h2>
                  <p className="text-xs text-slate-400">Registrar un préstamo realizado anteriormente</p>
                </div>
                <button onClick={() => { setModalHistorico(false); setError(""); }} className="rounded-full bg-slate-100 p-2">
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={guardarHistorico} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Socio</label>
                  <select required value={formHistorico.socio_id}
                    onChange={(e) => setFormHistorico({ ...formHistorico, socio_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]">
                    <option value="">Seleccionar socio</option>
                    {socios.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.numero_socio ?? s.id} · {s.nombres} {s.apellidos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Monto recibido ($)</label>
                    <input type="number" min="0.01" step="0.01" required value={formHistorico.monto}
                      onChange={(e) => setFormHistorico({ ...formHistorico, monto: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Total acordado ($)</label>
                    <input type="number" min="0.01" step="0.01" required value={formHistorico.total_a_pagar}
                      onChange={(e) => setFormHistorico({ ...formHistorico, total_a_pagar: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957]" />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Total abonado anteriormente ($)</label>
                  <input type="number" min="0" step="0.01" required value={formHistorico.total_abonado}
                    onChange={(e) => setFormHistorico({ ...formHistorico, total_abonado: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                  <p className="mt-1 text-[9px] text-slate-400">Escribe la suma de los pagos que ya realizó antes de usar el sistema.</p>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Fecha de entrega (si la conoces)</label>
                  <input type="date" max={fechaHoy} value={formHistorico.fecha_entrega}
                    onChange={(e) => setFormHistorico({ ...formHistorico, fecha_entrega: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Plazo acordado (opcional)</label>
                  <input value={formHistorico.plazo_descripcion}
                    onChange={(e) => setFormHistorico({ ...formHistorico, plazo_descripcion: e.target.value })}
                    placeholder="Ej. 6 meses"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Observaciones o referencia</label>
                  <textarea rows={3} value={formHistorico.detalle}
                    onChange={(e) => setFormHistorico({ ...formHistorico, detalle: e.target.value })}
                    placeholder="Información del cuaderno, acuerdos, etc."
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}

                <button type="submit" disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092957] py-4 text-sm font-bold text-white disabled:opacity-50">
                  <Save size={18} /> {guardando ? "Guardando..." : "Guardar préstamo anterior"}
                </button>
              </form>
            </div>
          </div>
        )}

        {modalEditar && prestamoSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="max-h-[90vh] w-full max-w-[430px] overflow-y-auto rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">Editar préstamo</h2>
                  <p className="text-xs text-slate-400">Préstamo #{prestamoSeleccionado.id}</p>
                </div>
                <button onClick={() => { setModalEditar(false); setError(""); }} className="rounded-full bg-slate-100 p-2">
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={actualizarPrestamo} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Monto entregado ($)</label>
                    <input type="number" min="0.01" step="0.01" required value={formEditar.monto}
                      onChange={(e) => setFormEditar({ ...formEditar, monto: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957]" />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Total acordado ($)</label>
                    <input type="number" min="0.01" step="0.01" required value={formEditar.total_a_pagar}
                      onChange={(e) => setFormEditar({ ...formEditar, total_a_pagar: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm text-[#092957]" />
                  </div>
                </div>

                {prestamoSeleccionado.es_historico && (
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#092957]">Pagos anteriores acumulados ($)</label>
                    <input type="number" min="0" step="0.01" required value={formEditar.total_abonado_historico}
                      onChange={(e) => setFormEditar({ ...formEditar, total_abonado_historico: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Fecha de entrega</label>
                  <input type="date" max={fechaHoy} value={formEditar.fecha_entrega}
                    onChange={(e) => setFormEditar({ ...formEditar, fecha_entrega: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Plazo y condiciones</label>
                  <input value={formEditar.plazo_descripcion}
                    onChange={(e) => setFormEditar({ ...formEditar, plazo_descripcion: e.target.value })}
                    placeholder="Ej. 8 meses, pagos mensuales"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Observaciones</label>
                  <textarea rows={3} value={formEditar.observacion}
                    onChange={(e) => setFormEditar({ ...formEditar, observacion: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>

                {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}

                <button type="submit" disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092957] py-4 text-sm font-bold text-white disabled:opacity-50">
                  <Save size={18} /> {guardando ? "Guardando..." : "Guardar cambios"}
                </button>
              </form>
            </div>
          </div>
        )}

        {modalCuota && prestamoSeleccionado && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">Añadir cuota</h2>
                  <p className="text-xs text-slate-400">Préstamo #{prestamoSeleccionado.id}</p>
                </div>
                <button onClick={() => { setModalCuota(false); setError(""); }} className="rounded-full bg-slate-100 p-2">
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={guardarCuota} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Fecha de vencimiento</label>
                  <input type="date" required value={formCuota.fecha_vencimiento}
                    onChange={(e) => setFormCuota({ ...formCuota, fecha_vencimiento: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Importe de la cuota ($)</label>
                  <input type="number" min="0.01" step="0.01" required value={formCuota.monto}
                    onChange={(e) => setFormCuota({ ...formCuota, monto: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Observación</label>
                  <textarea rows={2} value={formCuota.observacion}
                    onChange={(e) => setFormCuota({ ...formCuota, observacion: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>
                {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}
                <button type="submit" disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092957] py-4 text-sm font-bold text-white">
                  <Save size={18} /> {guardando ? "Guardando..." : "Guardar cuota"}
                </button>
              </form>
            </div>
          </div>
        )}

        {modalPago && prestamoSeleccionado && cuotaSeleccionada && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#092957]/40 p-0 sm:items-center sm:p-4">
            <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-6 sm:rounded-3xl">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#092957]">Registrar abono</h2>
                  <p className="text-xs text-slate-400">
                    Cuota {cuotaSeleccionada.numero_cuota} · Restante:{" "}
                    {dinero(Number(cuotaSeleccionada.monto) - Number(cuotaSeleccionada.monto_pagado || 0))}
                  </p>
                </div>
                <button onClick={() => { setModalPago(false); setError(""); }} className="rounded-full bg-slate-100 p-2">
                  <X size={19} />
                </button>
              </div>

              <form onSubmit={registrarPago} className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Monto del abono ($)</label>
                  <input type="number" min="0.01" step="0.01" required
                    max={Number(cuotaSeleccionada.monto) - Number(cuotaSeleccionada.monto_pagado || 0)}
                    value={formPago.monto}
                    onChange={(e) => setFormPago({ ...formPago, monto: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Fecha del pago</label>
                  <input type="date" required max={fechaHoy} value={formPago.fecha_pago}
                    onChange={(e) => setFormPago({ ...formPago, fecha_pago: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Método de pago</label>
                  <select value={formPago.metodo_pago}
                    onChange={(e) => setFormPago({ ...formPago, metodo_pago: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]">
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="deposito">Depósito</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#092957]">Observación</label>
                  <textarea rows={2} value={formPago.observacion}
                    onChange={(e) => setFormPago({ ...formPago, observacion: e.target.value })}
                    className="w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm text-[#092957]" />
                </div>
                {error && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{error}</p>}
                <button type="submit" disabled={guardando}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#092957] py-4 text-sm font-bold text-white">
                  <Save size={18} /> {guardando ? "Guardando..." : "Confirmar abono"}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
