
import { NextResponse } from "next/server";
import { randomBytes, randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json(
        { error: "Sesión no autorizada." },
        { status: 401 }
      );
    }

    const supabase = createAdminClient();

    const { data: usuario, error: authError } =
      await supabase.auth.getUser(token);

    if (authError || !usuario.user) {
      return NextResponse.json(
        { error: "Sesión inválida." },
        { status: 401 }
      );
    }

    const { data: admin } = await supabase
      .from("admin_fondo")
      .select("usuario_id")
      .eq("usuario_id", usuario.user.id)
      .eq("activo", true)
      .maybeSingle();

    if (!admin) {
      return NextResponse.json(
        { error: "No tienes permisos administrativos." },
        { status: 403 }
      );
    }

    const { socio_id } = await request.json();

    if (!Number.isInteger(socio_id) || socio_id <= 0) {
      return NextResponse.json(
        { error: "Socio no válido." },
        { status: 400 }
      );
    }

    const { data: socio, error: socioError } = await supabase
      .from("socios")
      .select("id, nombres, apellidos, estado, auth_user_id")
      .eq("id", socio_id)
      .maybeSingle();

    if (socioError || !socio || socio.estado !== "activo") {
      return NextResponse.json(
        { error: "No se encontró un socio activo." },
        { status: 404 }
      );
    }

    let authUserId = socio.auth_user_id;

    // Crear cuenta de Supabase si todavía no existe.
    if (!authUserId) {
      const correoInterno =
        `socio-${socio.id}@socios.bancodivinonino.com`;

      const { data: nuevaCuenta, error: crearError } =
        await supabase.auth.admin.createUser({
          email: correoInterno,
          password: randomBytes(32).toString("hex"),
          email_confirm: true,
          user_metadata: {
            tipo_cuenta: "socio",
            socio_id: socio.id,
          },
        });

      if (crearError || !nuevaCuenta.user) {
        return NextResponse.json(
          {
            error: "No se pudo crear la cuenta de acceso.",
            detalle: crearError?.message || "Supabase no devolvió el usuario.",
          },
          { status: 500 }
        );
      }

      authUserId = nuevaCuenta.user.id;

      // Vincular la cuenta al socio.
      const { data: vinculado, error: vincularError } = await supabase
        .from("socios")
        .update({ auth_user_id: authUserId })
        .eq("id", socio.id)
        .is("auth_user_id", null)
        .select("id, auth_user_id")
        .maybeSingle();

      if (vincularError || !vinculado) {
        await supabase.auth.admin.deleteUser(authUserId);

        return NextResponse.json(
          {
            error: "No se pudo vincular la cuenta al socio.",
            detalle: vincularError?.message || "No se actualizó el registro.",
          },
          { status: 500 }
        );
      }
    }

    // Generar código temporal de recuperación.
    const codigo = randomInt(100000, 1000000).toString();
    const codigoHash = await bcrypt.hash(codigo, 12);
    const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Invalidar códigos anteriores.
    const { error: invalidarError } = await supabase
      .from("recuperacion_pin")
      .update({ usado: true })
      .eq("socio_id", socio.id)
      .eq("usado", false);

    if (invalidarError) {
      return NextResponse.json(
        { error: "No se pudieron invalidar los códigos anteriores." },
        { status: 500 }
      );
    }

    const { error: insertarError } = await supabase
      .from("recuperacion_pin")
      .insert({
        socio_id: socio.id,
        codigo_hash: codigoHash,
        expira_at: expiracion.toISOString(),
        intentos: 0,
        usado: false,
      });

    if (insertarError) {
      return NextResponse.json(
        { error: "No se pudo generar el código temporal." },
        { status: 500 }
      );
    }

    const { error: actualizarError } = await supabase
      .from("socios")
      .update({
        pin_hash: null,
        pin_configurado: false,
        pin_intentos: 0,
        pin_bloqueado_hasta: null,
      })
      .eq("id", socio.id)
      .eq("estado", "activo");

    if (actualizarError) {
      await supabase
        .from("recuperacion_pin")
        .update({ usado: true })
        .eq("socio_id", socio.id)
        .eq("codigo_hash", codigoHash);

      return NextResponse.json(
        { error: "La cuenta se vinculó, pero no se pudo restablecer el PIN." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      correcto: true,
      codigo,
      socio: `${socio.nombres} ${socio.apellidos}`,
      expira_en: "24 horas",
    });
  } catch (error) {
    console.error("Error al restablecer PIN:", error);

    return NextResponse.json(
      { error: "Error interno al restablecer el PIN." },
      { status: 500 }
    );
  }
}
