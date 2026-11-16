
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  UserRound,
  Wallet,
  HandCoins,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  LogOut,
  ShieldCheck,
  Loader2,
  History,
  CreditCard,
  Landmark,
} from "lucide-react";
import { createClient } from "@/lib/supabase";

type Socio = {
  id: number;
  numero_socio: number | null;
  turno: number | null;
  nombres: string;
  apellidos: string;
  estado: string;
  fecha_ingreso: string;
};

type Aportacion = {
  id: number;
  monto: number;
  fecha_pago: string;
  semana_inicio: string;
};

type Prestamo = {
  id: number;
  monto: number;
  total_a_pagar: number;
  saldo_pendiente: number;
  fecha_entrega: string | null;
  estado: string;
  ciclo_id: number | null;
};

type Pago = {
  id: number;
  prestamo_id: number;
  monto: number;
  fecha_pago: string;
};

type Ciclo = {
  numero_ciclo: number;
  monto_prestamo: number;
  estado: string;
  fecha_inicio: string | null;
};

const dinero = (cantidad: number) =>
  new Intl.NumberFormat("es-EC", {
    style: "currency",
    currency: "USD",
  }).format(cantidad || 0);

const fecha = (valor: string | null) => {
  if (!valor) return "Sin fecha";

  return new Date(valor.includes("T") ? valor : `${valor}T00:00:00`)
    .toLocaleDateString("es-EC", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
};

export default function SociosPage() {
  const router = useRouter();

  const [socio, setSocio] = useState<Socio | null>(null);
  const [aportaciones, setAportaciones] = useState<Aportacion[]>([]);
  const [prestamos, setPrestamos] = useState<Prestamo[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [ciclo, setCiclo] = useState<Ciclo | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    async function cargarDatos() {
      const supabase = createClient();

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (authError || !authData.user) {
          router.replace("/socios/login");
          return;
        }

        const { data: registro, error: socioError } = await supabase
          .from("socios")
          .select(
            "id,numero_socio,turno,nombres,apellidos,estado,fecha_ingreso"
          )
          .eq("auth_user_id", authData.user.id)
          .maybeSingle();

        if (socioError || !registro) {
          throw new Error(
            "No se encontró tu registro de socio. Contacta al administrador."
          );
        }

        if (!activo) return;

        setSocio(registro as Socio);

        const [
          { data: aportes, error: aportesError },
          { data: prestamosData, error: prestamosError },
          { data: ciclosData },
        ] = await Promise.all([
          supabase
            .from("aportaciones")
            .select("id,monto,fecha_pago,semana_inicio")
            .eq("socio_id", registro.id)
            .order("fecha_pago", { ascending: false }),

          supabase
            .from("prestamos")
            .select(
              "id,monto,total_a_pagar,saldo_pendiente,fecha_entrega,estado,ciclo_id"
            )
            .eq("socio_id", registro.id)
            .order("creado_at", { ascending: false }),

          supabase
            .from("ciclos")
            .select("numero_ciclo,monto_prestamo,estado,fecha_inicio")
            .order("numero_ciclo", { ascending: false })
            .limit(1),
        ]);

        if (aportesError) throw aportesError;
        if (prestamosError) throw prestamosError;

        const listaAportes = (aportes || []) as Aportacion[];
        const listaPrestamos = (prestamosData || []) as Prestamo[];

        let listaPagos: Pago[] = [];

        if (listaPrestamos.length > 0) {
          const ids = listaPrestamos.map((p) => p.id);

          const { data: pagosData, error: pagosError } = await supabase
            .from("pagos_prestamo")
            .select("id,prestamo_id,monto,fecha_pago")
            .in("prestamo_id", ids)
            .order("fecha_pago", { ascending: false });

          if (pagosError) throw pagosError;

          listaPagos = (pagosData || []) as Pago[];
        }

        if (!activo) return;

        setAportaciones(listaAportes);
        setPrestamos(listaPrestamos);
        setPagos(listaPagos);
        setCiclo(
          ciclosData?.length
            ? (ciclosData[0] as Ciclo)
            : null
        );
      } catch (err) {
        if (activo) {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la información."
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
  }, [router]);

  async function cerrarSesion() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/socios/login");
    router.refresh();
  }

  const totalAportado = aportaciones.reduce(
    (total, item) => total + Number(item.monto || 0),
    0
  );

  const totalPrestado = prestamos.reduce(
    (total, item) => total + Number(item.monto || 0),
    0
  );

  const saldoPendiente = prestamos.reduce(
    (total, item) => total + Number(item.saldo_pendiente || 0),
    0
  );

  const totalAbonado = pagos.reduce(
    (total, item) => total + Number(item.monto || 0),
    0
  );

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#eef1f5] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[#092957]">
          <Loader2 size={34} className="animate-spin" />
          <p className="text-sm font-semibold">Cargando tu banca móvil...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#eef1f5] flex justify-center p-5">
        <div className="w-full max-w-[430px] bg-white rounded-3xl p-7 my-auto text-center">
          <ShieldCheck size={38} className="mx-auto text-[#092957]" />
          <h1 className="font-bold text-[#092957] mt-4">
            No se pudo cargar tu cuenta
          </h1>
          <p className="text-sm text-gray-500 mt-3">{error}</p>
          <button
            onClick={() => router.refresh()}
            className="mt-6 bg-[#ffdc00] text-[#092957] font-bold rounded-xl px-6 py-3"
          >
            Volver a intentar
          </button>
          <button
            onClick={cerrarSesion}
            className="block mx-auto mt-4 text-sm text-gray-500"
          >
            Cerrar sesión
          </button>
        </div>
      </main>
    );
  }

  if (!socio) return null;

  return (
    <main className="min-h-screen bg-[#eef1f5] flex justify-center">
      <section className="w-full max-w-[430px] min-h-screen bg-[#f7f8fa] shadow-xl pb-24">
        <header className="bg-[#092957] px-6 pt-8 pb-8 rounded-b-[30px] text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] tracking-[2px] text-yellow-300 font-bold">
                BANCO DIVINO NIÑO
              </p>
              <p className="text-xs text-blue-100 mt-1">Banca móvil</p>
            </div>

            <button
              onClick={cerrarSesion}
              className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center"
              aria-label="Cerrar sesión"
            >
              <LogOut size={19} />
            </button>
          </div>

          <div className="mt-9 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#ffdc00] text-[#092957] flex items-center justify-center">
              <UserRound size={25} />
            </div>

            <div>
              <p className="text-xs text-blue-200">Bienvenido</p>
              <h1 className="text-xl font-extrabold">
                {socio.nombres} {socio.apellidos}
              </h1>
              <p className="text-[11px] text-blue-200 mt-1">
                Socio N.º {socio.numero_socio ?? "Pendiente"}
              </p>
            </div>
          </div>

          <div className="mt-7 bg-white/10 border border-white/10 rounded-2xl p-4 flex justify-between items-center">
            <div>
              <p className="text-[11px] text-blue-200">
                Estado de tu membresía
              </p>
              <p className="text-sm font-bold mt-1 capitalize">
                {socio.estado}
              </p>
            </div>
            <ShieldCheck className="text-yellow-300" size={25} />
          </div>
        </header>

        <div className="px-5 -mt-1">
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-yellow-50 text-[#b49a00] flex items-center justify-center">
                <Wallet size={19} />
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                Total aportado
              </p>
              <p className="text-lg font-extrabold text-[#092957] mt-1">
                {dinero(totalAportado)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#092957] flex items-center justify-center">
                <HandCoins size={19} />
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                Préstamos recibidos
              </p>
              <p className="text-lg font-extrabold text-[#092957] mt-1">
                {dinero(totalPrestado)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <ArrowUpRight size={19} />
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                Saldo pendiente
              </p>
              <p className="text-lg font-extrabold text-[#092957] mt-1">
                {dinero(saldoPendiente)}
              </p>
            </div>

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                <ArrowDownLeft size={19} />
              </div>
              <p className="text-[11px] text-gray-500 mt-3">
                Abonos realizados
              </p>
              <p className="text-lg font-extrabold text-[#092957] mt-1">
                {dinero(totalAbonado)}
              </p>
            </div>
          </div>

          <div className="mt-5 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#fff4b8] text-[#092957] flex items-center justify-center">
                <Landmark size={21} />
              </div>
              <div>
                <h2 className="font-extrabold text-[#092957] text-sm">
                  Ciclo comunitario
                </h2>
                <p className="text-[11px] text-gray-400">
                  Información general del fondo
                </p>
              </div>
            </div>

            {ciclo ? (
              <div className="mt-5 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-gray-400">Último ciclo</p>
                  <p className="text-lg font-extrabold text-[#092957] mt-1">
                    N.º {ciclo.numero_ciclo}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">
                    Monto establecido
                  </p>
                  <p className="text-lg font-extrabold text-[#092957] mt-1">
                    {dinero(Number(ciclo.monto_prestamo))}
                  </p>
                </div>
                <div className="col-span-2 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">
                    Estado: <span className="font-bold text-[#092957] capitalize">{ciclo.estado}</span>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-5">
                Todavía no hay ciclos registrados.
              </p>
            )}
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-extrabold text-[#092957] text-sm">
                Mis aportaciones
              </h2>
              <History size={18} className="text-gray-400" />
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {aportaciones.length > 0 ? (
                aportaciones.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                        <ArrowDownLeft size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#092957]">
                          Aportación semanal
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {fecha(item.fecha_pago)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold text-green-700">
                      +{dinero(Number(item.monto))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="p-5 text-xs text-gray-400 text-center">
                  No tienes aportaciones registradas.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="font-extrabold text-[#092957] text-sm mb-3">
              Mis préstamos
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {prestamos.length > 0 ? (
                prestamos.slice(0, 5).map((item) => (
                  <div key={item.id} className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-[#092957]">
                          Préstamo #{item.id}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          Entregado: {fecha(item.fecha_entrega)}
                        </p>
                      </div>
                      <span className="text-[10px] rounded-full bg-blue-50 text-[#092957] px-3 py-1 capitalize">
                        {item.estado}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <div>
                        <p className="text-[10px] text-gray-400">Recibido</p>
                        <p className="text-xs font-bold text-[#092957] mt-1">
                          {dinero(Number(item.monto))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Total</p>
                        <p className="text-xs font-bold text-[#092957] mt-1">
                          {dinero(Number(item.total_a_pagar))}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400">Pendiente</p>
                        <p className="text-xs font-bold text-orange-600 mt-1">
                          {dinero(Number(item.saldo_pendiente))}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="p-5 text-xs text-gray-400 text-center">
                  No tienes préstamos registrados.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="font-extrabold text-[#092957] text-sm mb-3">
              Mis últimos abonos
            </h2>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {pagos.length > 0 ? (
                pagos.slice(0, 5).map((item) => (
                  <div
                    key={item.id}
                    className="p-4 flex justify-between items-center"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-50 text-green-700 flex items-center justify-center">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#092957]">
                          Abono préstamo #{item.prestamo_id}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">
                          {fecha(item.fecha_pago)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-extrabold text-green-700">
                      {dinero(Number(item.monto))}
                    </p>
                  </div>
                ))
              ) : (
                <p className="p-5 text-xs text-gray-400 text-center">
                  No tienes abonos registrados.
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-gray-400">
            <ShieldCheck size={15} />
            Tu información financiera es privada.
          </div>
        </div>

        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] h-[76px] bg-white border-t border-gray-100 flex justify-around items-center px-3 z-20">
          <div className="flex flex-col items-center gap-1 text-[#092957]">
            <Landmark size={20} />
            <span className="text-[10px] font-bold">Inicio</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <Wallet size={20} />
            <span className="text-[10px]">Aportes</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <HandCoins size={20} />
            <span className="text-[10px]">Préstamos</span>
          </div>
          <div className="flex flex-col items-center gap-1 text-gray-400">
            <CalendarDays size={20} />
            <span className="text-[10px]">Ciclos</span>
          </div>
        </nav>
      </section>
    </main>
  );
}
