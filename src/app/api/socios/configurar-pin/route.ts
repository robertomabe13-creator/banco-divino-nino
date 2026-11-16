
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { cedula, codigo, pin } = await request.json();

    if (
      typeof cedula !== "string" ||
      typeof codigo !== "string" ||
      typeof pin !== "string" ||
      !/^\d{10}$/.test(cedula) ||
      !/^\d{6}$/.test(codigo) ||
      !/^\d{4}$/.test(pin)
    ) {
      return NextResponse.json(
        { error: "Los datos ingresados no son válidos." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: socio, error: socioError } = await supabase
      .from("socios")
      .select("id, estado")
      .eq("cedula", cedula)
      .maybeSingle();

    if (socioError || !socio || socio.estado !== "activo") {
      return NextResponse.json(
        { error: "No se pudo verificar tu registro." },
        { status: 400 }
      );
    }

    const { data: recuperacion, error: codigoError } = await supabase
      .from("recuperacion_pin")
      .select("id, codigo_hash, intentos, expira_at")
      .eq("socio_id", socio.id)
      .eq("usado", false)
      .order("creado_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      codigoError ||
      !recuperacion ||
      new Date(recuperacion.expira_at).getTime() <= Date.now() ||
      recuperacion.intentos >= 5
    ) {
      return NextResponse.json(
        { error: "Código inválido o vencido. Solicita uno nuevo al administrador." },
        { status: 400 }
      );
    }

    const codigoCorrecto = await bcrypt.compare(
      codigo,
      recuperacion.codigo_hash
    );

    if (!codigoCorrecto) {
      const intentos = recuperacion.intentos + 1;

      await supabase
        .from("recuperacion_pin")
        .update({
          intentos,
          usado: intentos >= 5,
        })
        .eq("id", recuperacion.id)
        .eq("usado", false);

      return NextResponse.json(
        { error: "Código incorrecto." },
        { status: 400 }
      );
    }

    const pinHash = await bcrypt.hash(pin, 12);

    const { data: actualizado, error: actualizarError } = await supabase
      .from("socios")
      .update({
        pin_hash: pinHash,
        pin_configurado: true,
        pin_intentos: 0,
        pin_bloqueado_hasta: null,
        pin_actualizado_at: new Date().toISOString(),
      })
      .eq("id", socio.id)
      .eq("estado", "activo")
      .select("id")
      .maybeSingle();

    if (actualizarError || !actualizado) {
      return NextResponse.json(
        { error: "No se pudo guardar el nuevo PIN." },
        { status: 500 }
      );
    }

    const { error: consumirError } = await supabase
      .from("recuperacion_pin")
      .update({ usado: true })
      .eq("id", recuperacion.id)
      .eq("usado", false);

    if (consumirError) {
      return NextResponse.json(
        { error: "El PIN fue actualizado, pero no se pudo cerrar el código. Contacta al administrador." },
        { status: 500 }
      );
    }

    return NextResponse.json({ correcto: true });
  } catch {
    return NextResponse.json(
      { error: "No se pudo configurar el PIN." },
      { status: 500 }
    );
  }
}
