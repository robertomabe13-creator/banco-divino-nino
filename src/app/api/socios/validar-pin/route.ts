
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import bcrypt from "bcryptjs";


export async function POST(request: Request) {
  try {
    const { cedula, pin } = await request.json();

    if (
      typeof cedula !== "string" ||
      typeof pin !== "string" ||
      !/^\d{10}$/.test(cedula) ||
      !/^\d{4}$/.test(pin)
    ) {
      return NextResponse.json(
        { error: "Cédula o PIN inválido." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: socio, error } = await supabase
      .from("socios")
      .select("id, nombres, apellidos, estado, pin_hash, pin_configurado, pin_intentos, pin_bloqueado_hasta, auth_user_id")
      .eq("cedula", cedula)
      .maybeSingle();

    if (error || !socio || socio.estado !== "activo") {
      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    if (!socio.pin_configurado || !socio.pin_hash) {
      return NextResponse.json(
        { error: "Primero debes configurar tu PIN." },
        { status: 403 }
      );
    }

    if (
      socio.pin_bloqueado_hasta &&
      new Date(socio.pin_bloqueado_hasta).getTime() > Date.now()
    ) {
      return NextResponse.json(
        { error: "Acceso bloqueado temporalmente. Intenta más tarde." },
        { status: 429 }
      );
    }

    const correcto = await bcrypt.compare(pin, socio.pin_hash);

    if (!correcto) {
      const intentos = (socio.pin_intentos ?? 0) + 1;
      const bloqueado = intentos >= 5;

      await supabase
        .from("socios")
        .update({
          pin_intentos: bloqueado ? 0 : intentos,
          pin_bloqueado_hasta: bloqueado
            ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
            : null,
        })
        .eq("id", socio.id);

      return NextResponse.json(
        { error: "Credenciales incorrectas." },
        { status: 401 }
      );
    }

    if (!socio.auth_user_id) {
      return NextResponse.json(
        { error: "Tu cuenta todavía no está vinculada. Contacta al administrador." },
        { status: 403 }
      );
    }

    const { data: usuario, error: usuarioError } =
      await supabase.auth.admin.getUserById(socio.auth_user_id);

    if (usuarioError || !usuario.user?.email) {
      return NextResponse.json(
        { error: "No se encontró la cuenta de acceso." },
        { status: 403 }
      );
    }

    const { data: enlace, error: enlaceError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: usuario.user.email,
      });

    const tokenHash = enlace?.properties?.hashed_token;

    if (enlaceError || !tokenHash) {
      return NextResponse.json(
        { error: "No se pudo iniciar la sesión." },
        { status: 500 }
      );
    }

    await supabase
      .from("socios")
      .update({
        pin_intentos: 0,
        pin_bloqueado_hasta: null,
      })
      .eq("id", socio.id);

    return NextResponse.json({
      token_hash: tokenHash,
      type: "magiclink",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo procesar la solicitud." },
      { status: 500 }
    );
  }
}
