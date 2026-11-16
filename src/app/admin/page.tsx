
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  Users,
  Wallet,
  HandCoins,
  CalendarDays,
  ArrowUpRight,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LogOut,
  House,
  Settings,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Resumen = {
  socios: number;
  sociosActivos: number;
  aportaciones: number;
  prestamos: number;
  prestamosActivos: number;
  pagosPrestamos: number;
  saldo: number;
  ciclo: number;
};

type SocioResumen = {
  id: string;
  estado: string | null;
};

type MontoResumen = {
  monto: number | string | null;
};

type PrestamoResumen = {
  monto: number | string | null;
  saldo_pendiente: number | string | null;
  estado: string | null;
};

type CicloResumen = {
  numero_ciclo: number | null;
};

const dinero = (valor: number): string =>
  valor.toLocaleString("es-EC", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

const accesos = [
  { nombre: "Socios", icono: Users, ruta: "/admin/socios" },
  { nombre: "Aportes", icono: Wallet, ruta: "/admin/aportaciones" },
  { nombre: "Préstamos", icono: HandCoins, ruta: "/admin/prestamos" },
  { nombre: "Calendario", icono: CalendarDays, ruta: "/admin/calendario" },
  { nombre: "Movimientos", icono: ClipboardList, ruta: "/admin/movimientos" },
  { nombre: "Ciclos", icono: CircleDollarSign, ruta: "/admin/ciclos" },
  { nombre: "PIN", icono: Settings, ruta: "/admin/pines" },
];

export default function AdminPage() {
  const router = useRouter();

  const [seccion, setSeccion] = useState<string>("Inicio");
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const [resumen, setResumen] = useState<Resumen>({
    socios: 0,
    sociosActivos: 0,
    aportaciones: 0,
    prestamos: 0,
    prestamosActivos: 0,
    pagosPrestamos: 0,
    saldo: 0,
    ciclo: 0,
  });

  async function cargarResumen(): Promise<void> {
    setCargando(true);
    setError("");

    try {
      const supabase = createClient();

      const { data: usuario, error: authError } =
        await supabase.auth.getUser();

      if (authError || !usuario.user) {
        router.replace("/admin/login");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_fondo")
        .select("usuario_id")
        .eq("usuario_id", usuario.user.id)
        .eq("activo", true)
        .maybeSingle();

      if (adminError || !admin) {
        router.replace("/admin/login");
        return;
      }

      const [
        sociosRes,
        aportacionesRes,
        prestamosRes,
        pagosRes,
        ciclosRes,
      ] = await Promise.all([
        supabase.from("socios").select("id, estado"),
        supabase.from("aportaciones").select("monto"),
        supabase.from("prestamos").select("monto, saldo_pendiente, estado"),
        supabase.from("pagos_prestamo").select("monto"),
        supabase.from("ciclos").select("numero_ciclo"),
      ]);

      // Comprobar errores de las consultas sin usar callbacks sin tipo.
      if (sociosRes.error) throw new Error(sociosRes.error.message);
      if (aportacionesRes.error) throw new Error(aportacionesRes.error.message);
      if (prestamosRes.error) throw new Error(prestamosRes.error.message);
      if (pagosRes.error) throw new Error(pagosRes.error.message);
      if (ciclosRes.error) throw new Error(ciclosRes.error.message);

      const socios: SocioResumen[] =
        (sociosRes.data || []) as SocioResumen[];

      const aportaciones: MontoResumen[] =
        (aportacionesRes.data || []) as MontoResumen[];

      const prestamos: PrestamoResumen[] =
        (prestamosRes.data || []) as PrestamoResumen[];

      const pagos: MontoResumen[] =
        (pagosRes.data || []) as MontoResumen[];

      const ciclos: CicloResumen[] =
        (ciclosRes.data || []) as CicloResumen[];

      const totalAportaciones = aportaciones.reduce(
        (total: number, item: MontoResumen): number => {
          return total + Number(item.monto || 0);
        },
        0
      );

      const totalPrestamos = prestamos.reduce(
        (total: number, item: PrestamoResumen): number => {
          return total + Number(item.monto || 0);
        },
        0
      );

      const totalPagos = pagos.reduce(
        (total: number, item: MontoResumen): number => {
          return total + Number(item.monto || 0);
        },
        0
      );

      const prestamosActivos = prestamos.filter(
        (item: PrestamoResumen): boolean => {
          const estado = (item.estado || "").toLowerCase();

          return ![
            "pagado",
            "cancelado",
            "terminado",
            "finalizado",
          ].includes(estado);
        }
      );

      const cicloActual = ciclos.reduce(
        (mayor: number, item: CicloResumen): number => {
          return Math.max(mayor, Number(item.numero_ciclo || 0));
        },
        0
      );

      const sociosActivos = socios.filter(
        (item: SocioResumen): boolean => item.estado === "activo"
      ).length;

      setResumen({
        socios: socios.length,
        sociosActivos,
        aportaciones: totalAportaciones,
        prestamos: totalPrestamos,
        prestamosActivos: prestamosActivos.length,
        pagosPrestamos: totalPagos,
        saldo: totalAportaciones - totalPrestamos + totalPagos,
        ciclo: cicloActual,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar el resumen del fondo."
      );
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    void cargarResumen();
  }, []);

  async function cerrarSesion(): Promise<void> {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  return (
    <main className="min-h-screen bg-[#eef1f5] px-3 pb-28 pt-4">
      <div className="mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-white shadow-xl sm:rounded-[28px] sm:border sm:border-slate-200">

        {/* ENCABEZADO */}
        <header className="flex items-center justify-between px-5 pb-5 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fff4b8] text-[#092957]">
              <Landmark size={24} />
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-[#092957]">
                BANCO DIVINO NIÑO
              </h1>
              <p className="text-[10px] text-slate-500">
                Panel administrativo
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={cargarResumen}
              aria-label="Actualizar"
              className="rounded-full bg-slate-50 p-2.5 text-[#092957]"
            >
              <RefreshCw
                size={18}
                className={cargando ? "animate-spin" : ""}
              />
            </button>

            <button
              onClick={cerrarSesion}
              aria-label="Cerrar sesión"
              className="rounded-full bg-slate-50 p-2.5 text-[#092957]"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* PRESENTACIÓN */}
        <section className="px-5 pb-5">
          <p className="text-[11px] font-bold tracking-wider text-[#b49a00]">
            PANEL DE CONTROL
          </p>
          <h2 className="mt-1 text-2xl font-extrabold text-[#092957]">
            Resumen general
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Administra los recursos de tu fondo comunitario.
          </p>
        </section>

        {/* SALDO */}
        <section className="px-5">
          <div className="relative overflow-hidden rounded-[23px] bg-[#092957] p-5 text-white">
            <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full border-[22px] border-white/5" />

            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-[11px] text-blue-100">
                  DISPONIBILIDAD DEL FONDO
                </p>
                <p className="mt-1 text-xs text-blue-100">
                  Saldo calculado
                </p>
              </div>
              <div className="rounded-xl bg-white/10 p-3 text-[#ffdc00]">
                <Landmark size={25} />
              </div>
            </div>

            <p className="relative mt-5 text-[29px] font-extrabold">
              {cargando ? "Cargando..." : dinero(resumen.saldo)}
            </p>

            <div className="relative mt-4 flex items-center gap-2 border-t border-white/15 pt-3">
              <ShieldCheck size={15} className="text-[#ffdc00]" />
              <p className="text-[10px] text-blue-100">
                Basado en los movimientos registrados
              </p>
            </div>
          </div>
        </section>

        {error && (
          <div className="mx-5 mt-4 rounded-xl bg-red-50 p-3 text-xs text-red-700">
            Error al cargar: {error}
          </div>
        )}

        {/* ESTADO DEL FONDO */}
        <section className="pt-7">
          <div className="mb-3 flex items-center justify-between px-5">
            <h2 className="text-[16px] font-extrabold text-[#092957]">
              Estado del fondo
            </h2>
            <span className="text-[10px] text-slate-400">Desliza</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              {
                nombre: "Socios",
                valor: cargando ? "—" : String(resumen.socios),
                detalle: `${resumen.sociosActivos} activos`,
                icono: Users,
                color: "bg-[#fff4b8] text-[#092957]",
              },
              {
                nombre: "Préstamos activos",
                valor: cargando ? "—" : String(resumen.prestamosActivos),
                detalle: dinero(resumen.prestamos),
                icono: HandCoins,
                color: "bg-[#eaf1fc] text-[#315b91]",
              },
              {
                nombre: "Aportaciones",
                valor: cargando ? "—" : dinero(resumen.aportaciones),
                detalle: "Total registrado",
                icono: Wallet,
                color: "bg-[#eaf7f0] text-[#29945c]",
              },
              {
                nombre: "Ciclo actual",
                valor: cargando ? "—" : String(resumen.ciclo || "—"),
                detalle: "Último ciclo registrado",
                icono: CalendarDays,
                color: "bg-[#fff0e7] text-[#d66b25]",
              },
            ].map((item) => {
              const Icono = item.icono;

              return (
                <div
                  key={item.nombre}
                  className="flex min-w-[155px] shrink-0 items-center gap-3 rounded-xl border border-slate-100 p-3"
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color}`}>
                    <Icono size={18} />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[10px] text-slate-500">
                      {item.nombre}
                    </p>
                    <p className="truncate text-[15px] font-extrabold text-[#092957]">
                      {item.valor}
                    </p>
                    <p className="truncate text-[9px] text-slate-400">
                      {item.detalle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* MÓDULOS ADMINISTRATIVOS */}
        <section className="px-5 pt-7">
          <div className="mb-3">
            <h2 className="text-[16px] font-extrabold text-[#092957]">
              Módulos administrativos
            </h2>
            <p className="mt-1 text-[10px] text-slate-400">
              Accede a las herramientas de administración
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {accesos.map((item) => {
              const Icono = item.icono;

              return (
                <button
                  key={item.nombre}
                  onClick={() => router.push(item.ruta)}
                  className="flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm transition active:scale-95 hover:border-[#d6b900] hover:bg-[#fffdf4]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff4b8] text-[#092957]">
                    <Icono size={21} />
                  </div>
                  <span className="text-center text-[11px] font-bold text-[#092957]">
                    {item.nombre}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* MOVIMIENTO FINANCIERO */}
        <section className="pt-7">
          <div className="mb-3 flex items-center justify-between px-5">
            <h2 className="text-[16px] font-extrabold text-[#092957]">
              Movimiento financiero
            </h2>
            <span className="text-[10px] text-slate-400">Desliza</span>
          </div>

          <div className="flex gap-2.5 overflow-x-auto px-5 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="min-w-[165px] shrink-0 rounded-xl border border-slate-100 p-3">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf7f0] text-[#29945c]">
                <TrendingUp size={18} />
              </div>
              <p className="text-[10px] text-slate-500">Aportaciones</p>
              <p className="mt-1 text-sm font-extrabold text-[#092957]">
                {cargando ? "—" : dinero(resumen.aportaciones)}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Total registrado
              </p>
            </div>

            <div className="min-w-[165px] shrink-0 rounded-xl border border-slate-100 p-3">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#fff0e7] text-[#d66b25]">
                <HandCoins size={18} />
              </div>
              <p className="text-[10px] text-slate-500">
                Préstamos entregados
              </p>
              <p className="mt-1 text-sm font-extrabold text-[#092957]">
                {cargando ? "—" : dinero(resumen.prestamos)}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Total registrado
              </p>
            </div>

            <div className="min-w-[165px] shrink-0 rounded-xl border border-slate-100 p-3">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#eaf1fc] text-[#315b91]">
                <Wallet size={18} />
              </div>
              <p className="text-[10px] text-slate-500">
                Abonos de préstamos
              </p>
              <p className="mt-1 text-sm font-extrabold text-[#092957]">
                {cargando ? "—" : dinero(resumen.pagosPrestamos)}
              </p>
              <p className="mt-1 text-[9px] text-slate-400">
                Total registrado
              </p>
            </div>
          </div>
        </section>

        {/* AVISO */}
        <section className="mx-5 mb-6 mt-6 rounded-xl bg-[#fff9e8] p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white p-2 text-[#c69b00]">
              <ArrowUpRight size={19} />
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold text-[#092957]">
                Control del fondo
              </p>
              <p className="mt-1 text-[10px] leading-4 text-slate-500">
                Mantén actualizados los registros de tu comunidad.
              </p>
            </div>

            <ChevronRight size={17} className="text-slate-400" />
          </div>
        </section>

        {/* NAVEGACIÓN INFERIOR */}
        <nav className="fixed bottom-0 left-1/2 z-50 flex w-full max-w-[430px] -translate-x-1/2 justify-around border-t border-slate-200 bg-white px-2 pb-5 pt-3 sm:rounded-b-[28px]">
          {[
            { nombre: "Inicio", icono: House, ruta: "/admin" },
            { nombre: "Socios", icono: Users, ruta: "/admin/socios" },
            { nombre: "Fondo", icono: Wallet, ruta: "/admin/aportaciones" },
            { nombre: "Ajustes", icono: Settings, ruta: "/admin/pines" },
          ].map((item) => {
            const Icono = item.icono;
            const activo = seccion === item.nombre;

            return (
              <button
                key={item.nombre}
                onClick={() => {
                  setSeccion(item.nombre);

                  if (item.nombre !== "Inicio") {
                    router.push(item.ruta);
                  }
                }}
                className={`flex min-w-[65px] flex-col items-center gap-1 text-[10px] ${
                  activo
                    ? "font-bold text-[#092957]"
                    : "text-slate-400"
                }`}
              >
                <Icono size={20} />
                {item.nombre}
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}
