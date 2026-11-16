
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Landmark, LockKeyhole, Mail } from "lucide-react";

export default function AdminLogin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function iniciarSesion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError) {
        setError(loginError.message);
        return;
      }

      if (!data.user) {
        setError("No se pudo verificar el usuario.");
        return;
      }

      const { data: admin, error: adminError } = await supabase
        .from("admin_fondo")
        .select("usuario_id")
        .eq("usuario_id", data.user.id)
        .eq("activo", true)
        .maybeSingle();

      if (adminError) {
        setError("Error al verificar permisos: " + adminError.message);
        await supabase.auth.signOut();
        return;
      }

      if (!admin) {
        await supabase.auth.signOut();
        setError("Este usuario no tiene permisos de administrador.");
        return;
      }

      router.replace("/admin");
      router.refresh();

    } catch (err) {
      console.error("Error de inicio de sesión:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No se pudo conectar con el servidor."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#F4F6FA",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 410,
          background: "#FFFFFF",
          borderRadius: 22,
          padding: 30,
          boxShadow: "0 8px 30px rgba(20,40,80,0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 20,
              background: "#FFF5CC",
              color: "#D9A500",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Landmark size={34} />
          </div>

          <h1
            style={{
              color: "#142B50",
              fontSize: 23,
              margin: "16px 0 5px",
            }}
          >
            Banco Divino Niño
          </h1>

          <p style={{ color: "#78869B", fontSize: 14 }}>
            Acceso administrativo
          </p>
        </div>

        <form onSubmit={iniciarSesion}>
          <label
            style={{
              color: "#263B5B",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Correo electrónico
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid #E1E6EF",
              borderRadius: 12,
              padding: "0 13px",
              margin: "8px 0 20px",
            }}
          >
            <Mail size={18} color="#8794A8" />
            <input
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu correo"
              style={{
                border: 0,
                outline: 0,
                padding: 14,
                width: "100%",
              }}
            />
          </div>

          <label
            style={{
              color: "#263B5B",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Contraseña
          </label>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "1px solid #E1E6EF",
              borderRadius: 12,
              padding: "0 13px",
              margin: "8px 0 20px",
            }}
          >
            <LockKeyhole size={18} color="#8794A8" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña"
              style={{
                border: 0,
                outline: 0,
                padding: 14,
                width: "100%",
              }}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#D33B3B",
                fontSize: 12,
                marginBottom: 15,
                background: "#FFF1F1",
                padding: 12,
                borderRadius: 10,
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: 15,
              border: 0,
              borderRadius: 12,
              background: "#F4C400",
              color: "#142B50",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Verificando..." : "Ingresar"}
          </button>
        </form>
      </section>
    </main>
  );
}
