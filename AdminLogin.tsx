import { useState } from "react";
import {
  Shield,
  Lock,
  User,
  Loader2,
  ArrowLeft,
  AlertCircle,
  Eye,
  EyeOff,
  ChevronRight,
} from "lucide-react";

interface AdminLoginProps {
  onLogin: () => void;
  onBack: () => void;
}

const ADMIN_USERNAME = "sscet";
const ADMIN_PASSWORD = "adminsscet@2026";

export default function AdminLogin({ onLogin, onBack }: AdminLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) {
      setError("Please enter your username");
      return;
    }
    if (!password) {
      setError("Please enter your password");
      return;
    }
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (username.trim() === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      onLogin();
    } else {
      setError("Invalid credentials. Please check your username and password.");
    }
    setIsLoading(false);
  };

  const inputStyle = {
    width: "100%",
    padding: "0.75rem 1rem",
    background: "#f8fafc",
    border: "1.5px solid #e2e8f0",
    borderRadius: "10px",
    color: "#1e293b",
    fontSize: "0.875rem",
    outline: "none",
    transition: "all 0.2s ease",
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Blurred background image layer */}
      <div
        style={{
          position: "absolute",
          inset: "-20px",
          backgroundImage: "url('/admin_login_bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          filter: "blur(6px)",
          transform: "scale(1.05)",
          zIndex: 0,
        }}
      />
      {/* Light dark scrim */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(248, 250, 252, 0.42)",
          zIndex: 1,
        }}
      />

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <button
          onClick={onBack}
          className="flex items-center gap-2 mb-6 text-sm font-semibold transition-colors"
          style={{ color: "rgba(15,23,42,0.85)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#4f46e5")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(15,23,42,0.85)")}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Student Login
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
            style={{
              background: "linear-gradient(135deg, #1e40af, #2563eb)",
              boxShadow: "0 8px 24px rgba(37,99,235,0.3)",
            }}
          >
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "#0f172a" }}>
            Admin Portal
          </h1>
          <p className="text-sm" style={{ color: "#475569" }}>
            Secure Administrator Access
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "20px",
            boxShadow:
              "0 4px 6px rgba(0,0,0,0.04), 0 10px 40px rgba(37,99,235,0.08)",
            padding: "2.5rem",
          }}
        >
          <div
            className="mb-6"
            style={{
              height: "2px",
              background:
                "linear-gradient(90deg, transparent, #2563eb, transparent)",
              opacity: 0.2,
            }}
          />

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: "#64748b" }}
              >
                Username
              </label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#2563eb" }}
                />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter admin username"
                  autoComplete="username"
                  style={{ ...inputStyle, paddingLeft: "2.5rem" }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                    e.target.style.background = "#ffffff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#f8fafc";
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                style={{ color: "#64748b" }}
              >
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "#2563eb" }}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  autoComplete="current-password"
                  style={{
                    ...inputStyle,
                    paddingLeft: "2.5rem",
                    paddingRight: "3rem",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "#2563eb";
                    e.target.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.1)";
                    e.target.style.background = "#ffffff";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#e2e8f0";
                    e.target.style.boxShadow = "none";
                    e.target.style.background = "#f8fafc";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "#94a3b8" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = "#2563eb")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#94a3b8")
                  }
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm animate-fade-in"
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fecaca",
                  color: "#dc2626",
                }}
              >
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: "100%",
                padding: "0.875rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.9rem",
                color: "#fff",
                cursor: isLoading ? "not-allowed" : "pointer",
                background: isLoading
                  ? "rgba(37,99,235,0.5)"
                  : "linear-gradient(135deg, #1e40af 0%, #2563eb 100%)",
                border: "none",
                boxShadow: isLoading
                  ? "none"
                  : "0 4px 16px rgba(37,99,235,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                transition: "all 0.2s ease",
                marginTop: "0.5rem",
              }}
              onMouseEnter={(e) => {
                if (!isLoading) {
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    "0 6px 24px rgba(37,99,235,0.4)";
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.boxShadow =
                  "0 4px 16px rgba(37,99,235,0.3)";
                (e.currentTarget as HTMLButtonElement).style.transform = "none";
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" /> Sign In as Admin{" "}
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
