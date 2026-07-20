import { useState, useEffect } from "react";
import {
  ArrowLeft,
  TrendingUp,
  User,
  Calendar,
  Award,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Search,
  Loader2,
  BookOpen,
  Code2
} from "lucide-react";
import { DEPARTMENTS } from "./StudentManagement";
import { getStudents, getExamResults } from "../services/api";
import { toast } from "sonner";
import LeetCodeTracker from "./LeetCodeTracker";

const DEPT_SHORT: Record<string, string> = {
  "Artificial Intelligence and Data Science": "AI & DS",
  "Computer Science": "CSE",
  "Information Technology": "IT",
  "Cyber Security": "CYS",
};

const DEPT_COLORS: Record<
  string,
  { bg: string; text: string; border: string }
> = {
  "Artificial Intelligence and Data Science": {
    bg: "rgba(139,92,246,0.08)",
    text: "#6d28d9",
    border: "rgba(139,92,246,0.15)",
  },
  "Computer Science": {
    bg: "rgba(59,130,246,0.08)",
    text: "#1d4ed8",
    border: "rgba(59,130,246,0.15)",
  },
  "Information Technology": {
    bg: "rgba(16,185,129,0.08)",
    text: "#047857",
    border: "rgba(16,185,129,0.15)",
  },
  "Cyber Security": {
    bg: "rgba(239,68,68,0.08)",
    text: "#b91c1c",
    border: "rgba(239,68,68,0.15)",
  },
};

interface ExamResult {
  student: { name: string; registerNumber: string; department?: string };
  question: string;
  programmingMarks: number;
  mcqMarks: number;
  totalMarks: number;
  maxMarks: number;
  malpractice?: boolean;
  malpracticeReason?: string;
  submittedAt?: string;
  date?: string;
}

interface StudentPerf {
  name: string;
  registerNumber: string;
  department: string;
  exams: ExamResult[];
}

interface Props {
  onBack: () => void;
}

const card = {
  background: "rgba(255, 255, 255, 0.75)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
  borderRadius: "14px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
  backdropFilter: "blur(12px)",
};

const inputStyle = {
  width: "100%",
  padding: "0.625rem 1rem",
  background: "#ffffff",
  border: "1.5px solid #cbd5e1",
  borderRadius: "9px",
  color: "#0f172a",
  fontSize: "0.8rem",
  outline: "none",
  transition: "all 0.2s",
};

export default function StudentPerformance({ onBack }: Props) {
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedStudents, setExpandedStudents] = useState<
    Record<string, boolean>
  >({});
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"exams" | "leetcode">("exams");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [results, studentsList] = await Promise.all([
        getExamResults(),
        getStudents(),
      ]);
      setAllResults(results);
      setRegisteredStudents(studentsList);
    } catch (error: any) {
      toast.error("Failed to load performance data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStudentMap = (): StudentPerf[] => {
    const map: Record<string, StudentPerf> = {};
    for (const s of registeredStudents) {
      map[s.registerNumber] = {
        name: s.name,
        registerNumber: s.registerNumber,
        department: s.department,
        exams: [],
      };
    }
    for (const r of allResults) {
      const key = r.student.registerNumber;
      if (!map[key]) {
        map[key] = {
          name: r.student.name,
          registerNumber: key,
          department: r.student.department || "Unknown",
          exams: [],
        };
      }
      map[key].exams.push(r);
    }
    return Object.values(map);
  };

  const students = getStudentMap().filter((s) => {
    const deptOk = selectedDept === "all" || s.department === selectedDept;
    const searchOk =
      !searchTerm ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.registerNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return deptOk && searchOk;
  });

  const toggleStudent = (reg: string) => {
    setExpandedStudents((prev) => ({ ...prev, [reg]: !prev[reg] }));
  };

  const formatDate = (r: ExamResult) => {
    const raw = r.submittedAt || r.date;
    if (!raw) return "N/A";
    return new Date(raw).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const avgScore = (exams: ExamResult[]) => {
    if (!exams.length) return null;
    return (
      exams.reduce(
        (sum, e) => sum + ((e.programmingMarks || 0) + (e.mcqMarks || 0)),
        0,
      ) / exams.length
    ).toFixed(1);
  };

  const getQuestionStats = () => {
    const stats: Record<string, { totalScore: number; attempts: number }> = {};
    for (const r of allResults) {
      if (!stats[r.question])
        stats[r.question] = { totalScore: 0, attempts: 0 };
      stats[r.question].totalScore +=
        (r.programmingMarks || 0) + (r.mcqMarks || 0);
      stats[r.question].attempts += 1;
    }
    return Object.entries(stats)
      .map(([question, data]) => ({
        question,
        attempts: data.attempts,
        avgScore: data.totalScore / data.attempts,
      }))
      .sort((a, b) => a.avgScore - b.avgScore)
      .slice(0, 10); // Hardest 10
  };
  const hardestQuestions = getQuestionStats();

  const bestScore = (exams: ExamResult[]) => {
    if (!exams.length) return null;
    return Math.max(
      ...exams.map((e) => (e.programmingMarks || 0) + (e.mcqMarks || 0)),
    );
  };

  const hasMalpractice = (exams: ExamResult[]) =>
    exams.some((e) => e.malpractice);

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between mb-5 animate-fade-in"
          style={{
            ...card,
            background: "rgba(255, 255, 255, 0.75)",
            padding: "1rem 1.5rem",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-semibold transition-colors text-slate-650 hover:text-slate-800"
            >
              <ArrowLeft style={{ width: "0.875rem", height: "0.875rem" }} />
              Back
            </button>
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "rgba(15,23,42,0.08)",
              }}
            />
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                boxShadow: "0 4px 10px rgba(99,102,241,0.3)",
              }}
            >
              <TrendingUp
                style={{ width: "1rem", height: "1rem", color: "#ffffff" }}
              />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-800">
                Student Performance
              </h1>
              <p className="text-xs text-slate-500">
                Track exam history & progress
              </p>
            </div>
          </div>
          <p className="text-xs font-bold text-slate-850">
            {students.length} student{students.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* ── Tabs ── */}
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setActiveTab("exams")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "exams" 
                ? "bg-indigo-600 text-white shadow-md" 
                : "bg-white text-slate-650 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <BookOpen className="w-4 h-4" /> Exam Performance
          </button>
          <button
            onClick={() => setActiveTab("leetcode")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
              activeTab === "leetcode" 
                ? "bg-orange-500 text-white shadow-md" 
                : "bg-white text-slate-650 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Code2 className="w-4 h-4" /> LeetCode Attendance
          </button>
        </div>

        {activeTab === "leetcode" ? (
          <LeetCodeTracker />
        ) : (
          <>
            {/* ── Filters ── */}
            <div
              style={{ ...card, padding: "1rem", marginBottom: "1.25rem" }}
              className="animate-fade-in"
            >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "#64748b" }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or register number..."
                style={{ ...inputStyle, paddingLeft: "2.2rem" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#4f46e5";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>
            <div className="md:w-64">
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                style={{
                  ...inputStyle,
                  appearance: "none" as const,
                  cursor: "pointer",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "#4f46e5")
                }
                onBlur={(e) => (e.target.style.borderColor = "#cbd5e1")}
              >
                <option value="all">All Departments</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ── Question Difficulty Stats ── */}
        {hardestQuestions.length > 0 && (
          <div
            style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}
            className="animate-fade-in"
          >
            <h4
              className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
              style={{ color: "#4f46e5" }}
            >
              <BookOpen style={{ width: "0.9rem", height: "0.9rem" }} />
              Hardest Questions (Lowest Avg Score)
            </h4>
            <div className="overflow-x-auto">
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(15,23,42,0.05)",
                      background: "#f1f5f9",
                    }}
                  >
                    <th
                      style={{
                        padding: "0.5rem 1rem",
                        textAlign: "left",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#4f46e5",
                      }}
                    >
                      Question
                    </th>
                    <th
                      style={{
                        padding: "0.5rem 1rem",
                        textAlign: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#4f46e5",
                      }}
                    >
                      Attempts
                    </th>
                    <th
                      style={{
                        padding: "0.5rem 1rem",
                        textAlign: "center",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "#4f46e5",
                      }}
                    >
                      Avg Score / 50
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {hardestQuestions.map((q, idx) => (
                    <tr
                      key={q.question}
                      style={{
                        borderBottom: "1px solid rgba(15,23,42,0.05)",
                        background:
                          idx < 3 ? "rgba(239,68,68,0.08)" : "transparent",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.75rem",
                          color: "#1e293b",
                          fontWeight: idx < 3 ? 600 : 400,
                        }}
                      >
                        {q.question}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.75rem",
                          color: "#64748b",
                          textAlign: "center",
                        }}
                      >
                        {q.attempts}
                      </td>
                      <td
                        style={{
                          padding: "0.5rem 1rem",
                          fontSize: "0.75rem",
                          color: "#dc2626",
                          fontWeight: 700,
                          textAlign: "center",
                        }}
                      >
                        {q.avgScore.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Student Cards ── */}
        {isLoading ? (
          <div
            style={{ ...card, padding: "4rem 2rem" }}
            className="text-center animate-fade-in"
          >
            <Loader2
              className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400"
            />
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Loading performance reports...
            </p>
          </div>
        ) : students.length === 0 ? (
          <div
            style={{ ...card, padding: "4rem 2rem" }}
            className="text-center animate-fade-in"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "#f8fafc", border: "1.5px solid #cbd5e1" }}
            >
              <User className="w-7 h-7" style={{ color: "#64748b" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "#64748b" }}>
              No students found
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map((student) => {
              const expanded = expandedStudents[student.registerNumber];
              const avg = avgScore(student.exams);
              const best = bestScore(student.exams);
              const malpracticeFlag = hasMalpractice(student.exams);
              const dc = DEPT_COLORS[student.department];

              return (
                <div
                  key={student.registerNumber}
                  style={{ ...card, overflow: "hidden" }}
                  className="animate-fade-in"
                >
                  {/* Student Row */}
                  <div
                    className="flex items-center justify-between px-5 py-3.5 cursor-pointer transition-colors"
                    onClick={() => toggleStudent(student.registerNumber)}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "rgba(99,102,241,0.04)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <div className="flex items-center gap-3">
                      {expanded ? (
                        <ChevronDown
                          className="w-4 h-4 text-indigo-550"
                        />
                      ) : (
                        <ChevronRight
                          className="w-4 h-4 text-slate-500"
                        />
                      )}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{
                          background: "rgba(99,102,241,0.08)",
                          color: "#4f46e5",
                        }}
                      >
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-800">
                            {student.name}
                          </span>
                          {malpracticeFlag && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold"
                              style={{
                                background: "rgba(239,68,68,0.06)",
                                color: "#dc2626",
                                border: "1px solid rgba(239,68,68,0.15)"
                              }}
                            >
                              <AlertTriangle
                                style={{ width: "0.6rem", height: "0.6rem" }}
                              />
                              Malpractice
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span
                            className="text-xs font-mono"
                            style={{
                              color: "#475569",
                              letterSpacing: "0.04em",
                            }}
                          >
                            {student.registerNumber}
                          </span>
                          {dc && (
                            <span
                              className="text-xs font-bold px-1.5 py-0.5 rounded"
                              style={{
                                background: dc.bg,
                                color: dc.text,
                                border: `1px solid ${dc.border}`,
                              }}
                            >
                              {DEPT_SHORT[student.department] ||
                                student.department}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-5 text-center">
                      <div>
                        <p className="text-xs" style={{ color: "#64748b" }}>
                          Exams
                        </p>
                        <p className="text-sm font-bold text-slate-700">
                          {student.exams.length}
                        </p>
                      </div>
                      {avg !== null && (
                        <div>
                          <p className="text-xs" style={{ color: "#64748b" }}>
                            Avg
                          </p>
                          <p
                            className="text-sm font-bold"
                            style={{ color: "#4f46e5" }}
                          >
                            {avg}
                          </p>
                        </div>
                      )}
                      {best !== null && (
                        <div>
                          <p className="text-xs" style={{ color: "#64748b" }}>
                            Best
                          </p>
                          <p
                            className="text-sm font-bold"
                            style={{ color: "#059669" }}
                          >
                            {best}/50
                          </p>
                        </div>
                      )}
                      {student.exams.length === 0 && (
                        <span
                          className="text-xs italic"
                          style={{ color: "#64748b" }}
                        >
                          No exams yet
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Exam History */}
                  {expanded && student.exams.length > 0 && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(15,23,42,0.05)",
                        background: "#f8fafc",
                        padding: "1rem 1.5rem",
                      }}
                    >
                      <h4
                        className="text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2"
                        style={{ color: "#64748b" }}
                      >
                        <Calendar
                          style={{ width: "0.8rem", height: "0.8rem" }}
                        />
                        Exam History ({student.exams.length} session
                        {student.exams.length !== 1 ? "s" : ""})
                      </h4>
                      <div className="overflow-x-auto">
                        <table
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}>
                              {[
                                "Date",
                                "Question",
                                "Prog.",
                                "MCQ",
                                "Total",
                                "%",
                                "Status",
                              ].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: "0.5rem 0.75rem",
                                    textAlign:
                                      h === "Date" || h === "Question"
                                        ? "left"
                                        : "center",
                                    fontSize: "0.65rem",
                                    fontWeight: 700,
                                    letterSpacing: "0.08em",
                                    textTransform: "uppercase",
                                    color: "#4f46e5",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...student.exams].reverse().map((exam, idx) => {
                              const computedTotal =
                                (exam.programmingMarks || 0) +
                                (exam.mcqMarks || 0);
                              const pct = (
                                (computedTotal / (exam.maxMarks || 50)) *
                                100
                              ).toFixed(1);
                              return (
                                <tr
                                  key={idx}
                                  style={{
                                    borderBottom: "1px solid rgba(15,23,42,0.05)",
                                    background: exam.malpractice
                                      ? "rgba(239,68,68,0.08)"
                                      : "transparent",
                                  }}
                                  onMouseEnter={(e) =>
                                    (e.currentTarget.style.background =
                                      "rgba(99,102,241,0.04)")
                                  }
                                  onMouseLeave={(e) =>
                                    (e.currentTarget.style.background =
                                      exam.malpractice
                                        ? "rgba(239,68,68,0.08)"
                                        : "transparent")
                                  }
                                >
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      fontSize: "0.75rem",
                                      color: "#64748b",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {formatDate(exam)}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      fontSize: "0.75rem",
                                      color: "#1e293b",
                                      maxWidth: "200px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                    title={exam.question}
                                  >
                                    {exam.question || "N/A"}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      color: "#4f46e5",
                                      textAlign: "center",
                                    }}
                                  >
                                    {exam.programmingMarks || 0}/30
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      fontSize: "0.75rem",
                                      fontWeight: 700,
                                      color: "#4f46e5",
                                      textAlign: "center",
                                    }}
                                  >
                                    {exam.mcqMarks || 0}/20
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      fontSize: "0.8rem",
                                      fontWeight: 800,
                                      color: "#4f46e5",
                                      textAlign: "center",
                                    }}
                                  >
                                    {computedTotal}/{exam.maxMarks || 50}
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      textAlign: "center",
                                    }}
                                  >
                                    <div className="flex flex-col items-center justify-center gap-1">
                                      <span
                                        style={{
                                          padding: "0.15rem 0.5rem",
                                          borderRadius: "999px",
                                          fontWeight: 700,
                                          background:
                                            parseFloat(pct) >= 70
                                              ? "rgba(16,185,129,0.1)"
                                              : parseFloat(pct) >= 50
                                                ? "rgba(245,158,11,0.1)"
                                                : "rgba(239,68,68,0.1)",
                                          color:
                                            parseFloat(pct) >= 70
                                              ? "#059669"
                                              : parseFloat(pct) >= 50
                                                ? "#d97706"
                                                : "#dc2626",
                                          border: `1px solid ${
                                            parseFloat(pct) >= 70
                                              ? "rgba(16,185,129,0.2)"
                                              : parseFloat(pct) >= 50
                                                ? "rgba(245,158,11,0.2)"
                                                : "rgba(239,68,68,0.2)"
                                          }`,
                                          fontSize: "0.7rem",
                                        }}
                                      >
                                        {pct}%
                                      </span>
                                      {exam.malpractice && (
                                        <span
                                          style={{
                                            padding: "0.1rem 0.4rem",
                                            borderRadius: "4px",
                                            fontWeight: 700,
                                            background: "rgba(239,68,68,0.1)",
                                            color: "#dc2626",
                                            border: "1px solid rgba(239,68,68,0.2)",
                                            fontSize: "0.6rem",
                                          }}
                                        >
                                          Malpractice
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      textAlign: "center",
                                    }}
                                  >
                                    {exam.malpractice ? (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold"
                                        style={{
                                          background: "rgba(239,68,68,0.06)",
                                          color: "#dc2626",
                                          border: "1px solid rgba(239,68,68,0.15)"
                                        }}
                                      >
                                        <AlertTriangle
                                          style={{
                                            width: "0.6rem",
                                            height: "0.6rem",
                                          }}
                                        />{" "}
                                        Flag
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold"
                                        style={{
                                          background: "rgba(16,185,129,0.1)",
                                          color: "#059669",
                                          border:
                                            "1px solid rgba(16,185,129,0.2)",
                                        }}
                                      >
                                        <Award
                                          style={{
                                            width: "0.6rem",
                                            height: "0.6rem",
                                          }}
                                        />{" "}
                                        Done
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {student.exams.length > 1 && (
                        <div className="mt-3 flex gap-3">
                          {[
                            {
                              label: "Average",
                              val: `${avg}/50`,
                              color: "#4f46e5",
                              bg: "rgba(99,102,241,0.08)",
                            },
                            {
                              label: "Best",
                              val: `${best}/50`,
                              color: "#059669",
                              bg: "rgba(16,185,129,0.08)",
                            },
                            {
                              label: "Sessions",
                              val: String(student.exams.length),
                              color: "#d97706",
                              bg: "rgba(245,158,11,0.08)",
                            },
                          ].map(({ label, val, color, bg }) => (
                            <div
                              key={label}
                              style={{
                                background: bg,
                                borderRadius: "8px",
                                padding: "0.5rem 0.875rem",
                                textAlign: "center",
                                border: `1px solid ${color}22`
                              }}
                            >
                              <p
                                className="text-xs"
                                style={{ color: `${color}` }}
                              >
                                {label}
                              </p>
                              <p
                                className="text-sm font-bold"
                                style={{ color }}
                              >
                                {val}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {expanded && student.exams.length === 0 && (
                    <div
                      style={{
                        borderTop: "1px solid rgba(15,23,42,0.05)",
                        background: "#f8fafc",
                        padding: "1.5rem",
                      }}
                      className="text-center"
                    >
                      <p className="text-xs" style={{ color: "#64748b" }}>
                        This student has not taken any exams yet.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-center text-xs" style={{ color: "#64748b" }}>
          Showing {students.length} student{students.length !== 1 ? "s" : ""} ·
          SSCET Exam DB
        </p>
        </>
        )}
      </div>
    </div>
  );
}
