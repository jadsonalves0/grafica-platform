import Link from "next/link";

const highlights = [
  "Multiempresa com isolamento de dados por grafica",
  "Usuarios, perfis e permissoes por modulo",
  "Estoque, orcamentos, pedidos e financeiro em uma unica base",
  "Site institucional configuravel para cada cliente",
];

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "48px 24px 72px",
      }}
    >
      <section
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          display: "grid",
          gap: 32,
        }}
      >
        <div
          style={{
            padding: 32,
            border: "1px solid var(--border)",
            borderRadius: 28,
            background: "rgba(255, 250, 244, 0.92)",
            boxShadow: "0 18px 60px rgba(77, 39, 22, 0.08)",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "var(--primary)",
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            Plataforma para Graficas Rapidas
          </p>
          <h1
            style={{
              margin: "16px 0 12px",
              fontFamily: "var(--font-heading)",
              fontSize: "clamp(2.5rem, 6vw, 4.6rem)",
              lineHeight: 1,
              maxWidth: 700,
            }}
          >
            Sistema operacional e site institucional em uma arquitetura unica.
          </h1>
          <p
            style={{
              margin: 0,
              maxWidth: 760,
              fontSize: 18,
              lineHeight: 1.7,
              color: "var(--muted)",
            }}
          >
            Base pensada para transformar a Ponto Print em piloto de uma plataforma robusta,
            escalavel e reutilizavel para outras graficas.
          </p>
          <div
            style={{
              display: "flex",
              gap: 16,
              flexWrap: "wrap",
              marginTop: 28,
            }}
          >
            <Link
              href="/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 50,
                padding: "0 20px",
                borderRadius: 14,
                background: "var(--primary)",
                color: "#fff",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Entrar no sistema
            </Link>
            <Link
              href="/dashboard"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 50,
                padding: "0 20px",
                borderRadius: 14,
                border: "1px solid var(--border)",
                color: "inherit",
                fontWeight: 700,
                textDecoration: "none",
                background: "rgba(255, 255, 255, 0.7)",
              }}
            >
              Acessar painel
            </Link>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {highlights.map((item) => (
            <article
              key={item}
              style={{
                padding: 24,
                borderRadius: 24,
                background: "var(--surface)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  background: "var(--secondary)",
                  marginBottom: 16,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  lineHeight: 1.6,
                }}
              >
                {item}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
