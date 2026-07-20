import { useState, useEffect } from "react";
import {
  ArrowLeft,
  User,
  Mail,
  Hash,
  BookOpen,
  Code2,
  Trophy,
  Loader2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  Zap,
  Flame,
  BarChart3,
} from "lucide-react";
import { fetchLeetCodeStats, LeetCodeStats, getLeetCodeProfileUrl } from "../services/api";

interface StudentProfileProps {
  student: {
    name: string;
    registerNumber: string;
    department: string;
    email?: string;
    leetCodeUsername?: string;
  };
  onBack: () => void;
}

const CARD_STYLE = {
  background: "rgba(255, 255, 255, 0.75)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
  borderRadius: "24px",
  backdropFilter: "blur(16px)",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
};

export default function StudentProfile({ student, onBack }: StudentProfileProps) {
  const [leetStats, setLeetStats] = useState<LeetCodeStats | null>(null);
  const [leetLoading, setLeetLoading] = useState(false);
  const [leetError, setLeetError] = useState("");

  useEffect(() => {
    if (student.leetCodeUsername) {
      loadLeetCode(student.leetCodeUsername);
    }
  }, [student.leetCodeUsername]);

  const loadLeetCode = async (username: string) => {
    setLeetLoading(true);
    setLeetError("");
    setLeetStats(null);
    try {
      const stats = await fetchLeetCodeStats(username);
      setLeetStats(stats);
    } catch (err: any) {
      setLeetError(err.message || "Failed to load LeetCode stats.");
    } finally {
      setLeetLoading(false);
    }
  };

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const difficulties = leetStats
    ? [
        {
          label: "Easy",
          solved: leetStats.easySolved,
          color: "#10b981",
          bg: "rgba(16,185,129,0.1)",
          border: "rgba(16,185,129,0.2)",
          icon: CheckCircle,
        },
        {
          label: "Medium",
          solved: leetStats.mediumSolved,
          color: "#f59e0b",
          bg: "rgba(245,158,11,0.1)",
          border: "rgba(245,158,11,0.2)",
          icon: Zap,
        },
        {
          label: "Hard",
          solved: leetStats.hardSolved,
          color: "#ef4444",
          bg: "rgba(239,68,68,0.1)",
          border: "rgba(239,68,68,0.2)",
          icon: Flame,
        },
      ]
    : [];

  const totalForPct = leetStats
    ? leetStats.easySolved + leetStats.mediumSolved + leetStats.hardSolved
    : 0;

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      {/* ── Header ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.85)",
          borderBottom: "1px solid rgba(99,102,241,0.12)",
          backdropFilter: "blur(12px)"
        }}
      >
        <div className="max-w-3xl mx-auto px-6 py-5">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 text-sm mb-5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="flex items-center gap-5">
            {/* Avatar — LeetCode profile pic if available */}
            <div className="w-20 h-20 rounded-2xl flex-shrink-0 overflow-hidden"
              style={{ border: "2px solid rgba(99,102,241,0.2)" }}>
              {leetStats?.avatar ? (
                <img
                  src={leetStats.avatar}
                  alt={student.name}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-black text-2xl"
                  style={{ background: "#4f46e5" }}>
                  {initials}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-800">{student.name}</h1>
              {leetStats?.realName && leetStats.realName !== student.name && (
                <p className="text-indigo-600/80 text-xs mt-0.5">
                  LeetCode: {leetStats.realName}
                </p>
              )}
              <p className="text-slate-500 text-sm mt-0.5">{student.department}</p>
              <span
                className="inline-block mt-1.5 text-xs font-mono px-3 py-1 rounded-full"
                style={{
                  background: "rgba(99,102,241,0.06)",
                  color: "#4f46e5",
                  border: "1px solid rgba(99,102,241,0.15)",
                }}
              >
                {student.registerNumber}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">
        {/* ── Student Details ── */}
        <div style={{ ...CARD_STYLE, padding: "1.5rem" }}>
          <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-800">
            <User className="w-4 h-4 text-indigo-500" />
            Student Details
          </h2>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { icon: User, label: "Full Name", value: student.name },
              { icon: Mail, label: "Email Address", value: student.email || "Not provided" },
              { icon: Hash, label: "Register Number", value: student.registerNumber, mono: true },
              { icon: BookOpen, label: "Department", value: student.department },
            ].map(({ icon: Icon, label, value, mono }) => (
              <div
                key={label}
                className="flex items-start gap-3 p-3.5 rounded-xl"
                style={{ background: "rgba(241,245,249,0.5)", border: "1px solid rgba(99,102,241,0.08)" }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)" }}>
                  <Icon className="w-4 h-4 text-indigo-550" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium">{label}</p>
                  <p className={`text-sm font-semibold text-slate-700 mt-0.5 truncate ${mono ? "font-mono" : ""}`}>
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── LeetCode Stats ── */}
        <div style={{ ...CARD_STYLE, padding: "1.5rem" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-slate-800">
              <Code2 className="w-4 h-4 text-orange-500" />
              LeetCode Statistics
            </h2>

            <div className="flex items-center gap-2">
              {student.leetCodeUsername && (
                <>
                  <a
                    href={getLeetCodeProfileUrl(student.leetCodeUsername)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    style={{
                      background: "#fff7ed",
                      color: "#ea580c",
                      border: "1px solid rgba(234,88,12,0.2)",
                    }}
                  >
                    <ExternalLink className="w-3 h-3" />
                    View on LeetCode
                  </a>
                  <button
                    onClick={() => loadLeetCode(student.leetCodeUsername!)}
                    disabled={leetLoading}
                    className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                    style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#64748b" }}
                    title="Refresh"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${leetLoading ? "animate-spin" : ""}`} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* No username */}
          {!student.leetCodeUsername && (
            <div
              className="flex flex-col items-center py-10 rounded-xl animate-fade-in"
              style={{ background: "rgba(241,245,249,0.2)", border: "1.5px dashed #cbd5e1" }}
            >
              <Code2 className="w-10 h-10 text-slate-400 mb-3" />
              <p className="text-sm font-semibold text-slate-700">No LeetCode username linked</p>
              <p className="text-xs text-slate-500 mt-1 text-center max-w-xs">
                Register again with your LeetCode username to see your live stats here.
              </p>
            </div>
          )}

          {/* Loading */}
          {student.leetCodeUsername && leetLoading && (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-500">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-white text-lg"
                  style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}>
                  LC
                </div>
                <Loader2 className="w-5 h-5 text-orange-500 animate-spin absolute -bottom-1 -right-1" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-600">Fetching LeetCode stats...</p>
                <p className="text-xs text-slate-400 mt-0.5">Connecting to LeetCode API</p>
              </div>
            </div>
          )}

          {/* Error */}
          {student.leetCodeUsername && !leetLoading && leetError && (
            <div
              className="flex flex-col items-center justify-center p-6 rounded-2xl text-center border transition-all duration-300 hover:shadow-md"
              style={{ 
                background: "rgba(254, 242, 242, 0.95)", 
                borderColor: "#fecaca", 
                color: "#991b1b" 
              }}
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="font-bold text-red-950 text-base">Unable to Load LeetCode Stats</h3>
              <p className="text-xs text-red-800 max-w-sm mt-2 leading-relaxed">
                {leetError.includes("does not exist") 
                  ? "The URL or username linked to this account appears to be invalid on LeetCode. Please verify your profile link."
                  : leetError}
              </p>
              
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => loadLeetCode(student.leetCodeUsername!)}
                  className="text-xs font-bold py-2 px-5 rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  style={{ background: "#ffffff", border: "1px solid #cbd5e1", color: "#475569" }}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-550" />
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Stats Display */}
          {student.leetCodeUsername && !leetLoading && leetStats && (
            <div className="space-y-4">
              {/* LeetCode Profile Banner */}
              <div
                className="flex items-center justify-between p-4 rounded-xl"
                style={{
                  background: "#fff7ed",
                  border: "1px solid #ffedd5",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-white"
                    style={{ background: "linear-gradient(135deg, #f97316, #ea580c)" }}
                  >
                    LC
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">LeetCode</p>
                    <p className="font-bold text-slate-800 text-base">@{leetStats.username}</p>
                  </div>
                </div>
                {leetStats.ranking > 0 && (
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium">Global Ranking</p>
                    <p className="font-black text-orange-600 text-xl" style={{ lineHeight: 1 }}>
                      #{leetStats.ranking.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              {/* Total solved hero */}
              <div
                className="flex items-center justify-center gap-4 py-6 rounded-xl"
                style={{ background: "rgba(241,245,249,0.5)", border: "1px solid rgba(99,102,241,0.08)" }}
              >
                <Trophy className="w-7 h-7 text-yellow-500" />
                <div className="text-center">
                  <p
                    className="text-5xl font-black text-slate-800"
                    style={{ lineHeight: 1 }}
                  >
                    {leetStats.totalSolved}
                  </p>
                  {leetStats.totalQuestions && (
                    <p className="text-xs font-semibold text-slate-550 mt-1">
                      out of {leetStats.totalQuestions.toLocaleString()} problems
                    </p>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-1">
                    Total Problems Solved
                  </p>
                </div>
                <BarChart3 className="w-7 h-7 text-blue-500" />
              </div>

              {/* Difficulty cards */}
              <div className="grid grid-cols-3 gap-3">
                {difficulties.map(({ label, solved, color, bg, border, icon: Icon }) => {
                  const pct = totalForPct > 0 ? Math.round((solved / totalForPct) * 100) : 0;
                  return (
                    <div
                      key={label}
                      className="rounded-xl p-4"
                      style={{ background: bg, border: `1px solid ${border}` }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Icon className="w-4 h-4" style={{ color }} />
                        <span className="text-xs font-bold" style={{ color }}>
                          {pct}%
                        </span>
                      </div>
                      <p className="text-3xl font-black" style={{ color, lineHeight: 1 }}>
                        {solved}
                      </p>
                      <p className="text-xs font-semibold mt-1" style={{ color }}>
                        {label}
                      </p>
                      {/* Mini progress bar */}
                      <div className="mt-2 h-1.5 rounded-full" style={{ background: "rgba(0,0,0,0.06)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
