
import { UserRound, ShieldCheck, Landmark } from "lucide-react";

export default function Home() {
  return (
    <main style={{
      minHeight: "100svh",
      background: "#e9edf4",
      display: "flex",
      justifyContent: "center",
      fontFamily: "Arial, sans-serif",
      color: "#092957",
      padding: "0",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "430px",
        minHeight: "100svh",
        background: "linear-gradient(160deg, #ffffff 55%, #f5f7fb 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "38px 25px 24px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
      }}>

        {/* DECORACIÓN */}
        <div style={{
          position: "absolute",
          width: "260px",
          height: "260px",
          borderRadius: "50%",
          background: "#fff8d8",
          top: "90px",
          right: "-150px",
          opacity: 0.65,
        }} />

        <div style={{
          position: "absolute",
          width: "190px",
          height: "190px",
          borderRadius: "50%",
          background: "#eaf1fa",
          top: "390px",
          left: "-125px",
          opacity: 0.8,
        }} />

        {/* ENCABEZADO */}
        <header style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "relative",
          zIndex: 1,
        }}>
          <span style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "1.5px",
            color: "#092957",
          }}>
            BANCA MÓVIL
          </span>

          <span style={{
            fontSize: "9px",
            fontWeight: 700,
            color: "#52718e",
            background: "#edf3f9",
            padding: "7px 10px",
            borderRadius: "20px",
          }}>
            ● ACCESO SEGURO
          </span>
        </header>

        {/* IDENTIDAD DEL BANCO */}
        <section style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          marginTop: "100px",
          position: "relative",
          zIndex: 1,
        }}>
          <div style={{
            width: "91px",
            height: "91px",
            background: "linear-gradient(145deg, #ffe84a, #f5ce00)",
            color: "#092957",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "23px",
            marginBottom: "22px",
            boxShadow: "0 10px 24px #d6b40035, inset 0 1px 0 #ffffff99",
            border: "1px solid #f2d13b",
          }}>
            <Landmark size={55} strokeWidth={1.6} />
          </div>

          <h1 style={{
            fontSize: "27px",
            fontWeight: 900,
            letterSpacing: "4px",
            margin: 0,
            color: "#092957",
          }}>
            BANCO
          </h1>

          <h2 style={{
            fontSize: "27px",
            fontWeight: 900,
            letterSpacing: "0.5px",
            margin: "3px 0 0",
            color: "#092957",
          }}>
            DIVINO NIÑO
          </h2>

          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            marginTop: "15px",
          }}>
            <div style={{ width: "22px", height: "3px", background: "#f5ce00", borderRadius: "5px" }} />
            <span style={{
              fontSize: "10px",
              letterSpacing: "3px",
              fontWeight: 800,
              color: "#55718e",
            }}>
              BANCA MÓVIL
            </span>
            <div style={{ width: "22px", height: "3px", background: "#f5ce00", borderRadius: "5px" }} />
          </div>
        </section>

        {/* BIENVENIDA */}
        <section style={{
          textAlign: "center",
          marginTop: "78px",
          marginBottom: "28px",
          position: "relative",
          zIndex: 1,
        }}>
          <h3 style={{
            fontSize: "21px",
            fontWeight: 800,
            margin: 0,
            color: "#092957",
          }}>
            ¡Bienvenido!
          </h3>

          <p style={{
            color: "#8492a3",
            fontSize: "13px",
            marginTop: "9px",
          }}>
            Selecciona tu tipo de acceso
          </p>
        </section>

        {/* BOTONES */}
        <section style={{
          display: "flex",
          justifyContent: "center",
          gap: "13px",
          width: "100%",
          maxWidth: "285px",
          position: "relative",
          zIndex: 1,
        }}>

          <a href="/socios/login" style={{
            flex: 1,
            height: "105px",
            background: "linear-gradient(160deg, #ffffff, #fafbfd)",
            border: "1px solid #dce3ec",
            borderBottom: "3px solid #f2cf00",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            color: "#092957",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 700,
            boxShadow: "0 6px 18px #0929570c",
          }}>
            <UserRound size={26} strokeWidth={1.8} />
            <span>Socios</span>
          </a>

          <a href="/admin/login" style={{
            flex: 1,
            height: "105px",
            background: "linear-gradient(160deg, #ffffff, #fafbfd)",
            border: "1px solid #dce3ec",
            borderBottom: "3px solid #f2cf00",
            borderRadius: "15px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: "10px",
            color: "#092957",
            textDecoration: "none",
            fontSize: "13px",
            fontWeight: 700,
            boxShadow: "0 6px 18px #0929570c",
          }}>
            <ShieldCheck size={26} strokeWidth={1.8} />
            <span>Administración</span>
          </a>
        </section>

        {/* PIE DE PÁGINA */}
        <footer style={{
          marginTop: "auto",
          paddingTop: "55px",
          textAlign: "center",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}>
          <div style={{
            width: "35px",
            height: "3px",
            background: "#f2cf00",
            borderRadius: "5px",
            marginBottom: "5px",
          }} />

          <strong style={{
            color: "#092957",
            fontSize: "12px",
          }}>
            Banco Divino Niño
          </strong>

          <small style={{
            color: "#8a98a9",
            fontSize: "11px",
          }}>
            Tu confianza, nuestro compromiso.
          </small>

          <small style={{
            color: "#aab3bf",
            fontSize: "10px",
            marginTop: "5px",
          }}>
            Versión 1.0.0
          </small>
        </footer>

      </div>
    </main>
  );
}
