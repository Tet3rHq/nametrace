import { useMemo, useState } from "react";
import axios from "axios";

type Result = {
  platform: string;
  username: string;
  profile_url: string;
  claim_url: string;
  status: "likely_exists" | "not_found" | "uncertain" | "blocked";
  confidence_label: "high" | "medium" | "low";
  http_status: number | null;
  final_url: string;
  reason: string;
  risk_note: string;
  checked_at: string;
};

type ApiResponse = {
  tool_name: string;
  tool_mode: string;
  username: string;
  checked_at: string;
  score: number;
  summary: {
    platforms_checked: number;
    likely_exists: number;
    not_found: number;
    uncertain: number;
    blocked: number;
  };
  disclaimer: string;
  privacy_note: string;
  results: Result[];
};

function App() {
  const [username, setUsername] = useState("");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const summaryText = useMemo(() => {
    if (!data) return "";
    return `You have likely public presence on ${data.summary.likely_exists} platform(s), missing on ${data.summary.not_found}, uncertain on ${data.summary.uncertain}, and blocked on ${data.summary.blocked}.`;
  }, [data]);

  const handleSearch = async () => {
    const clean = username.trim();
    if (!clean) {
      setError("Enter a username first.");
      return;
    }

    setError("");
    setData(null);
    setLoading(true);

    try {
      const res = await axios.post<ApiResponse>(
        "https://nametrace-backend.onrender.com/api/check-username",
        { username: clean }
      );
      setData(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = () => {
    if (!data) return;

    const headers = [
      "platform",
      "username",
      "status",
      "confidence_label",
      "http_status",
      "profile_url",
      "final_url",
      "reason",
      "risk_note",
      "checked_at",
    ];

    const rows = data.results.map((r) => [
      r.platform,
      r.username,
      r.status,
      r.confidence_label,
      r.http_status ?? "",
      r.profile_url,
      r.final_url,
      r.reason,
      r.risk_note,
      r.checked_at,
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${data.username}_nametrace_report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getBadgeStyle = (status: Result["status"]): React.CSSProperties => {
    switch (status) {
      case "likely_exists":
        return { background: "#14532d", color: "#86efac" };
      case "not_found":
        return { background: "#7f1d1d", color: "#fca5a5" };
      case "uncertain":
        return { background: "#78350f", color: "#fcd34d" };
      case "blocked":
        return { background: "#1e3a8a", color: "#93c5fd" };
      default:
        return { background: "#334155", color: "#e2e8f0" };
    }
  };

  const getReadableStatus = (status: Result["status"]) => {
    switch (status) {
      case "likely_exists":
        return "Likely Exists";
      case "not_found":
        return "Not Found";
      case "uncertain":
        return "Uncertain";
      case "blocked":
        return "Blocked";
      default:
        return status;
    }
  };

  return (
    <>
      <style>{`
        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          font-family: Arial, sans-serif;
          background: linear-gradient(180deg, #020617 0%, #0f172a 100%);
        }

        .hero-icon {
          display: inline-block;
          animation: floatSearch 2.4s ease-in-out infinite;
          transform-origin: center;
          filter: drop-shadow(0 0 10px rgba(59,130,246,0.45));
        }

        @keyframes floatSearch {
          0% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
          25% {
            transform: translateY(-3px) rotate(-6deg) scale(1.03);
          }
          50% {
            transform: translateY(0px) rotate(0deg) scale(1.06);
          }
          75% {
            transform: translateY(-2px) rotate(6deg) scale(1.03);
          }
          100% {
            transform: translateY(0px) rotate(0deg) scale(1);
          }
        }

        .nametrace-title {
          background: linear-gradient(90deg, #f8fafc 0%, #cbd5e1 45%, #93c5fd 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .search-btn:hover {
          filter: brightness(1.08);
        }

        .download-btn:hover,
        .profile-link:hover,
        .claim-link:hover {
          filter: brightness(1.08);
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          color: "white",
          padding: "28px 16px 60px",
        }}
      >
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div
            style={{
              background:
                "linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.88) 100%)",
              border: "1px solid #1e293b",
              borderRadius: 24,
              padding: "34px 22px 24px",
              marginBottom: 24,
              boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                marginBottom: 10,
              }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "radial-gradient(circle at 30% 30%, rgba(96,165,250,0.35), rgba(30,41,59,0.1))",
                  border: "1px solid rgba(148,163,184,0.18)",
                }}
              >
                <span
                  className="hero-icon"
                  title="Search"
                  style={{
                    fontSize: 34,
                    lineHeight: 1,
                  }}
                >
                  🔍
                </span>
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: 46,
                  lineHeight: 1.1,
                  fontWeight: 900,
                  letterSpacing: 0.6,
                  textShadow: "0 0 18px rgba(59,130,246,0.18)",
                }}
              >
                <span className="nametrace-title">NameTrace</span>
              </h1>
            </div>

            <p
              style={{
                margin: "0 auto 22px",
                maxWidth: 760,
                color: "#cbd5e1",
                fontSize: 16,
                lineHeight: 1.6,
              }}
            >
              Public Username Audit for creators, brands, freelancers, and
              developers.
            </p>

            <div
              style={{
                background: "rgba(2,6,23,0.55)",
                border: "1px solid #1e293b",
                borderRadius: 18,
                padding: 20,
                maxWidth: 980,
                margin: "0 auto",
              }}
            >
              <p
                style={{
                  marginTop: 0,
                  marginBottom: 16,
                  color: "#e2e8f0",
                  fontSize: 15,
                }}
              >
                Use this tool to audit where a public username appears online
                and spot platforms you may want to claim.
              </p>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    maxWidth: 460,
                    padding: 14,
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: "#020617",
                    color: "white",
                    outline: "none",
                  }}
                />

                <button
                  className="search-btn"
                  onClick={handleSearch}
                  disabled={loading}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 12,
                    border: "none",
                    background: loading ? "#475569" : "#22c55e",
                    color: "white",
                    fontWeight: 800,
                    cursor: loading ? "not-allowed" : "pointer",
                    transition: "0.2s ease",
                  }}
                >
                  {loading ? "Checking..." : "Check Username"}
                </button>

                <button
                  className="download-btn"
                  onClick={downloadCsv}
                  disabled={!data}
                  style={{
                    padding: "14px 18px",
                    borderRadius: 12,
                    border: "1px solid #334155",
                    background: data ? "#111827" : "#1f2937",
                    color: "white",
                    cursor: data ? "pointer" : "not-allowed",
                    transition: "0.2s ease",
                  }}
                >
                  Download CSV
                </button>
              </div>

              <div
                style={{
                  marginTop: 16,
                  fontSize: 14,
                  opacity: 0.9,
                  lineHeight: 1.7,
                  color: "#cbd5e1",
                }}
              >
                <div>
                  <strong>Acceptable use:</strong> Personal branding, public
                  username audits, and brand presence checks only.
                </div>
                <div>
                  This tool does not verify identity, access private data, or
                  bypass platform restrictions.
                </div>
                <div>
                  Some platforms may still require login on their own sites to
                  view a profile.
                </div>
                <div>We do not intentionally store searches in this MVP.</div>
              </div>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "#7f1d1d",
                color: "#fecaca",
                padding: 14,
                borderRadius: 14,
                marginBottom: 20,
                border: "1px solid rgba(248,113,113,0.25)",
              }}
            >
              {error}
            </div>
          )}

          {data && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
                  gap: 16,
                  marginBottom: 22,
                }}
              >
                <div style={cardStyle}>
                  <div style={labelStyle}>Username Score</div>
                  <div style={bigValueStyle}>{data.score}/100</div>
                </div>

                <div style={cardStyle}>
                  <div style={labelStyle}>Platforms Checked</div>
                  <div style={bigValueStyle}>{data.summary.platforms_checked}</div>
                </div>

                <div style={cardStyle}>
                  <div style={labelStyle}>Likely Exists</div>
                  <div style={bigValueStyle}>{data.summary.likely_exists}</div>
                </div>

                <div style={cardStyle}>
                  <div style={labelStyle}>Missing</div>
                  <div style={bigValueStyle}>{data.summary.not_found}</div>
                </div>
              </div>

              <div style={{ ...cardStyle, marginBottom: 20, textAlign: "center" }}>
                <h2 style={{ marginTop: 0, marginBottom: 10, fontSize: 22 }}>
                  Digital Footprint Summary
                </h2>
                <p style={{ margin: 0, opacity: 0.92, fontSize: 16 }}>
                  {summaryText}
                </p>
                <p style={{ marginTop: 10, opacity: 0.75, fontSize: 14 }}>
                  Checked at: {new Date(data.checked_at).toLocaleString()}
                </p>
              </div>

              <div
                style={{
                  ...cardStyle,
                  marginBottom: 20,
                  textAlign: "center",
                  lineHeight: 1.7,
                }}
              >
                <strong>Disclaimer:</strong> {data.disclaimer}
                <div style={{ marginTop: 8, opacity: 0.85 }}>
                  {data.privacy_note}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                  gap: 16,
                }}
              >
                {data.results.map((r) => {
                  const badge = getBadgeStyle(r.status);

                  return (
                    <div key={r.platform} style={cardStyle}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 12,
                        }}
                      >
                        <h3 style={{ margin: 0, fontSize: 22 }}>{r.platform}</h3>
                        <span
                          style={{
                            ...badge,
                            padding: "6px 12px",
                            borderRadius: 999,
                            fontSize: 12,
                            fontWeight: 800,
                          }}
                        >
                          {getReadableStatus(r.status)}
                        </span>
                      </div>

                      <div style={metaRowStyle}>
                        Confidence: <strong>{r.confidence_label}</strong>
                      </div>

                      <div style={metaRowStyle}>
                        HTTP Status: <strong>{r.http_status ?? "N/A"}</strong>
                      </div>

                      <div style={{ ...metaRowStyle, lineHeight: 1.6 }}>
                        Reason: {r.reason}
                      </div>

                      <div
                        style={{
                          marginBottom: 14,
                          opacity: 0.72,
                          fontSize: 13,
                          lineHeight: 1.5,
                          color: "#cbd5e1",
                        }}
                      >
                        Note: {r.risk_note}
                      </div>

                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <a
                          className="profile-link"
                          href={r.profile_url}
                          target="_blank"
                          rel="noreferrer"
                          style={primaryLinkStyle}
                        >
                          Open Public Profile
                        </a>

                        {(r.status === "not_found" || r.status === "uncertain") && (
                          <a
                            className="claim-link"
                            href={r.claim_url}
                            target="_blank"
                            rel="noreferrer"
                            style={secondaryLinkStyle}
                          >
                            Claim Username
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1f2937",
  borderRadius: 18,
  padding: 18,
  boxShadow: "0 10px 28px rgba(0,0,0,0.24)",
};

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.78,
  marginBottom: 8,
  color: "#cbd5e1",
};

const bigValueStyle: React.CSSProperties = {
  fontSize: 30,
  fontWeight: 900,
};

const metaRowStyle: React.CSSProperties = {
  marginBottom: 8,
  opacity: 0.92,
  color: "#e5e7eb",
};

const primaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  background: "#2563eb",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
  transition: "0.2s ease",
};

const secondaryLinkStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "10px 14px",
  borderRadius: 10,
  background: "#1f2937",
  color: "white",
  textDecoration: "none",
  fontWeight: 800,
  border: "1px solid #334155",
  transition: "0.2s ease",
};

export default App;