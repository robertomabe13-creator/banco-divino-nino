
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import twilio from "twilio";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { cedula } = await request.json();

    if (typeof cedula !== "string" || !/^\d{10}$/.test(cedula)) {
      return NextResponse.json(
        { error: "Datos inválidos." },
        { status: 400 }
      );
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      return NextResponse.json(
        { error: "El servicio SMS todavía no está configurado." },
        { status: 503 }
      );
    }

    const supabase = createAdminClient();

    const { data: socio } = await supabase
      .from("socios")
      .select("id, telefono, estado, pin_configurado")
      .eq("cedula", cedula)
      .maybeSingle();

    if (!socio || socio.estado !== "activo" || socio.pin_configurado) {
      return NextResponse.json(
        { error: "No se puede procesar la solicitud." },
        { status: 400 }
      );
    }

    if (!socio.telefono) {
      return NextResponse.json(
        { error: "Tu registro no tiene un teléfono. Contacta al administrador." },
        { status: 400 }
      );
    }

    const { data: recientes } = await supabase
      .from("recuperacion_pin")
      .select("id")
      .eq("socio_id", socio.id)
      .gte("creado_at", new Date(Date.now() - 10 * 60 * 1000).toISOString());

    if (recientes && recientes.length >= 3) {
      return NextResponse.json(
        { error: "Espera 10 minutos antes de solicitar otro código." },
        { status: 429 }
      );
    }

    let telefono = socio.telefono.replace(/[\s()-]/g, "");

    if (telefono.startsWith("09")) {
      telefono = "+593" + telefono.slice(1);
    } else if (telefono.startsWith("9")) {
      telefono = "+593" + telefono;
    }

    if (!/^\+593\d{9}$/.test(telefono)) {
      return NextResponse.json(
        { error: "El teléfono registrado no tiene un formato válido." },
        { status: 400 }
      );
    }

    const codigo = String(randomInt(100000, 1000000));
    const codigoHash = await bcrypt.hash(codigo, 12);

    const { error: insertarError } = await supabase
      .from("recuperacion_pin")
      .insert({
        socio_id: socio.id,
        codigo_hash: codigoHash,
        expira_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        intentos: 0,
        usado: false,
      });

    if (insertarError) {
      return NextResponse.json(
        { error: "No se pudo generar el código." },
        { status: 500 }
      );
    }

    const cliente = twilio(accountSid, authToken);

    await cliente.messages.create({
      body: `Banco Divino Niño: tu código de verificación es ${codigo}. Vence en 5 minutos. No lo compartas.`,
      from,
      to: telefono,
    });

    return NextResponse.json({
      correcto: true,
      mensaje: "Código enviado al teléfono registrado.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo enviar el código SMS." },
      { status: 500 }
    );
  }
}
