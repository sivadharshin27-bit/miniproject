import { useState, useEffect } from "react";
import {
  Shield,
  ArrowLeft,
  Users,
  FileText,
  Download,
  Search,
  TrendingUp,
  BookOpen,
  UserPlus,
  BarChart2,
  Loader2,
  AlertCircle,
  CheckCircle,
  X,
  RefreshCw,
  Calendar,
  PieChart as PieChartIcon,
  Clock,
  Trash2,
} from "lucide-react";
import { DEPARTMENTS } from "./StudentManagement";
import {
  getExamResults,
  clearAllExamData,
  deleteExamResult,
  checkServerHealth,
  syncLocalExamResultsToSupabase,
} from "../services/api";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import * as XLSX from "xlsx";

interface AdminPanelProps {
  onBack: () => void;
  onManageQuestions: () => void;
  onManageStudents: () => void;
  onViewPerformance: () => void;
  onDailyTracker: () => void;
}

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
    bg: "rgba(126,34,206,0.08)",
    text: "#6d28d9",
    border: "rgba(126,34,206,0.15)",
  },
  "Computer Science": {
    bg: "rgba(29,78,216,0.08)",
    text: "#1d4ed8",
    border: "rgba(29,78,216,0.15)",
  },
  "Information Technology": {
    bg: "rgba(4,120,87,0.08)",
    text: "#047857",
    border: "rgba(4,120,87,0.15)",
  },
  "Cyber Security": {
    bg: "rgba(185,28,28,0.08)",
    text: "#b91c1c",
    border: "rgba(185,28,28,0.15)",
  },
};

const card = {
  background: "rgba(255, 255, 255, 0.75)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
  borderRadius: "14px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
  backdropFilter: "blur(12px)",
};

const navBtn = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  padding: "0.5rem 0.875rem",
  borderRadius: "8px",
  fontSize: "0.8rem",
  fontWeight: 600,
  cursor: "pointer",
  background: "#ffffff",
  border: "1px solid #cbd5e1",
  color: "#475569",
  transition: "all 0.2s ease",
};

export default function AdminPanel({
  onBack,
  onManageQuestions,
  onManageStudents,
  onViewPerformance,
  onDailyTracker,
}: AdminPanelProps) {
  const [results, setResults] = useState<any[]>([]);
  const [filteredResults, setFilteredResults] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDept, setFilterDept] = useState("all");
  const [filterQuestion, setFilterQuestion] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);
  const [totalRegisteredStudents, setTotalRegisteredStudents] = useState(0);
  const [schedule, setSchedule] = useState({ start: "", end: "" });



  useEffect(() => {
    const init = async () => {
      await syncLocalExamResultsToSupabase();
      await loadDashboardData();
    };
    init();

    checkServerHealth().then((isOnline) => setIsServerOffline(!isOnline));

    const savedSchedule = localStorage.getItem("exam_schedule");
    if (savedSchedule) {
      try {
        setSchedule(JSON.parse(savedSchedule));
      } catch (e) {}
    }
  }, []);
  useEffect(() => {
    filterResults();
  }, [searchTerm, filterDept, filterQuestion, results]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const { getStudents } = await import("../services/api");
      const [data, students] = await Promise.all([
        getExamResults(),
        getStudents()
      ]);
      setResults(data);
      setTotalRegisteredStudents(students.length);
    } catch (error: any) {
      toast.error("Failed to load dashboard data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const filterResults = () => {
    let filtered = [...results];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.student.name.toLowerCase().includes(term) ||
          r.student.registerNumber.toLowerCase().includes(term),
      );
    }
    if (filterDept !== "all")
      filtered = filtered.filter(
        (r) => (r.student.department || "") === filterDept,
      );
    if (filterQuestion !== "all")
      filtered = filtered.filter((r) => r.question === filterQuestion);
    setFilteredResults(filtered);
  };

  const exportAllResults = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Exam_Results_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported as JSON successfully");
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      results.map((r) => ({
        "Student Name": r.student.name,
        "Register Number": r.student.registerNumber,
        Department: r.student.department,
        "LeetCode Username": r.student.leetCodeUsername || "N/A",
        "Question Title": r.question,
        "Programming Marks (30)": r.programmingMarks,
        "MCQ Marks (20)": r.mcqMarks,
        "Total Marks (50)": (r.programmingMarks || 0) + (r.mcqMarks || 0),
        Percentage:
          (
            (((r.programmingMarks || 0) + (r.mcqMarks || 0)) /
              (r.maxMarks || 50)) *
            100
          ).toFixed(2) + "%",
        "Time Spent (s)": r.timeSpent,
        Malpractice: r.malpractice ? "Yes" : "No",
        "Malpractice Reason": r.malpracticeReason || "",
        "Submitted At": new Date(r.submittedAt).toLocaleString(),
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exam Results");
    XLSX.writeFile(
      wb,
      `Exam_Results_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success("Results exported to Excel successfully");
  };

  const clearAllResults = async () => {
    if (
      confirm(
        "Are you sure you want to clear ALL exam results and student assignments? This cannot be undone.",
      )
    ) {
      try {
        await clearAllExamData();
        toast.success("All exam data cleared successfully");
        setResults([]);
        setFilteredResults([]);
      } catch (error: any) {
        toast.error("Failed to clear data: " + error.message);
      }
    }
  };

  const handleDeleteResult = async (id: number | string) => {
    if (confirm("Are you sure you want to delete this specific student's attempt?")) {
      try {
        await deleteExamResult(id);
        toast.success("Exam attempt deleted successfully");
        loadDashboardData();
      } catch (error: any) {
        toast.error("Failed to delete attempt: " + error.message);
      }
    }
  };

  const saveSchedule = () => {
    localStorage.setItem("exam_schedule", JSON.stringify(schedule));
    toast.success("Exam schedule updated successfully");
  };

  const questions = [...new Set(results.map((r) => r.question))];
  const totalStudents = totalRegisteredStudents; // Display actual registered students count
  const avgScore =
    results.length > 0
      ? (
          results.reduce(
            (s, r) => s + ((r.programmingMarks || 0) + (r.mcqMarks || 0)),
            0,
          ) / results.length
        ).toFixed(1)
      : "0.0";
  const malpracticeCount = results.filter((r) => r.malpractice).length;
  const deptStats = DEPARTMENTS.map((dept) => {
    const deptResults = results.filter((r) => r.student.department === dept);
    const count = deptResults.length;
    const avg =
      count > 0
        ? deptResults.reduce(
            (s, r) => s + ((r.programmingMarks || 0) + (r.mcqMarks || 0)),
            0,
          ) / count
        : 0;
    const passCount = deptResults.filter(
      (r) =>
        (r.programmingMarks || 0) + (r.mcqMarks || 0) >=
        (r.maxMarks || 50) * 0.5,
    ).length;
    const passRate = count > 0 ? (passCount / count) * 100 : 0;
    return {
      dept: DEPT_SHORT[dept] || dept,
      fullDept: dept,
      count,
      avgScore: Number(avg.toFixed(1)),
      passRate: Number(passRate.toFixed(1)),
    };
  });

  const selectStyle = {
    width: "100%",
    padding: "0.625rem 1rem",
    background: "#ffffff",
    border: "1.5px solid #cbd5e1",
    borderRadius: "9px",
    color: "#0f172a",
    fontSize: "0.8rem",
    appearance: "none" as const,
    outline: "none",
    cursor: "pointer",
    transition: "all 0.2s",
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      <div className="max-w-7xl mx-auto">
        {isServerOffline && (
          <div className="mb-4 p-3 rounded-xl flex items-center gap-2 text-sm font-medium" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            Running in <b>&nbsp;Local Browser Mode</b>. Data is stored in this
            browser. Connect Supabase for multi-device cloud sync.
          </div>
        )}

        {/* ── Top Nav ── */}
        <div className="rounded-2xl overflow-hidden mb-5 animate-fade-in" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
          <div style={{ height: "4px", background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                <Shield style={{ width: "1.1rem", height: "1.1rem", color: "#ffffff" }} />
              </div>
              <div>
                <h1 className="text-base font-bold" style={{ color: "#0f172a" }}>Admin Dashboard</h1>
                <p className="text-xs" style={{ color: "#94a3b8" }}>SSCET Examination System</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {[
                { label: "Students", icon: UserPlus, action: onManageStudents },
                { label: "Questions", icon: BookOpen, action: onManageQuestions },
                { label: "Performance", icon: BarChart2, action: onViewPerformance },
              ].map(({ label, icon: Icon, action }) => (
                <button key={label} onClick={action}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                  style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}>
                  <Icon style={{ width: "0.875rem", height: "0.875rem" }} />
                  {label}
                </button>
              ))}
              <button onClick={onDailyTracker}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}>
                <Calendar style={{ width: "0.875rem", height: "0.875rem" }} />
                Daily Tracker
              </button>
              <button onClick={loadDashboardData}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(99,102,241,0.06)"; }}>
                <RefreshCw className={isLoading ? "animate-spin" : ""} style={{ width: "0.875rem", height: "0.875rem" }} />
                Refresh
              </button>
              <button onClick={onBack}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "#dc2626" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.06)"; }}>
                <ArrowLeft style={{ width: "0.875rem", height: "0.875rem" }} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          {[
            {
              icon: Users,
              label: "Total Students",
              value: totalStudents,
              color: "#4f46e5",
              bg: "rgba(99,102,241,0.08)",
            },
            {
              icon: FileText,
              label: "Submissions",
              value: results.length,
              color: "#059669",
              bg: "rgba(16,185,129,0.08)",
            },
            {
              icon: TrendingUp,
              label: "Average Score",
              value: `${avgScore}/50`,
              color: "#7c3aed",
              bg: "rgba(124,58,237,0.08)",
            },
            {
              icon: AlertCircle,
              label: "Malpractice",
              value: malpracticeCount,
              color: "#dc2626",
              bg: "rgba(239,68,68,0.08)",
            },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div
              key={label}
              style={{ ...card, padding: "1.25rem" }}
              className="animate-fade-in"
            >
              <div className="flex items-start justify-between mb-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ background: bg }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <p
                className="text-2xl font-black mb-0.5 animate-fade-in"
                style={{ color: "#1e293b" }}
              >
                {value}
              </p>
              <p className="text-xs font-semibold" style={{ color: "#475569" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Exam Schedule Settings ── */}
        <div
          style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}
          className="animate-fade-in"
        >
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: "#4f46e5" }} />
            <p
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: "#4f46e5" }}
            >
              Exam Schedule Settings
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#475569" }}>
                Start Time
              </label>
              <input
                type="datetime-local"
                value={schedule.start}
                onChange={(e) =>
                  setSchedule({ ...schedule, start: e.target.value })
                }
                style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", color: "#0f172a", borderRadius: "10px", padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.8rem", outline: "none" }}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1" style={{ color: "#475569" }}>
                End Time
              </label>
              <input
                type="datetime-local"
                value={schedule.end}
                onChange={(e) =>
                  setSchedule({ ...schedule, end: e.target.value })
                }
                style={{ background: "#ffffff", border: "1.5px solid #cbd5e1", color: "#0f172a", borderRadius: "10px", padding: "0.5rem 0.75rem", width: "100%", fontSize: "0.8rem", outline: "none" }}
              />
            </div>
            <div>
              <button
                onClick={saveSchedule}
                style={{ width: "100%", background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", fontWeight: 700, padding: "0.5rem 1rem", borderRadius: "10px", border: "none", cursor: "pointer", fontSize: "0.8rem", height: "38px", transition: "all 0.2s" }}
              >
                Save Schedule
              </button>
            </div>
          </div>
          <p className="text-xs mt-2" style={{ color: "#64748b" }}>
            Students will only be able to login during this time window. Leave
            blank for no restriction.
          </p>
        </div>

        {/* ── Dept Breakdown & Analytics ── */}
        <div
          style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}
          className="animate-fade-in"
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#4f46e5" }}
          >
            Department Analytics
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
            <div style={{ height: "220px", width: "100%" }}>
              <p
                className="text-xs font-bold text-center mb-2"
                style={{ color: "#1e293b" }}
              >
                Average Score by Department
              </p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptStats}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="dept"
                    fontSize={11}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    fontSize={11}
                    tick={{ fill: "#64748b" }}
                    domain={[0, 50]}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(99,102,241,0.04)" }}
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Bar
                    dataKey="avgScore"
                    fill="#4f46e5"
                    radius={[4, 4, 0, 0]}
                    name="Avg Score"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div style={{ height: "220px", width: "100%" }}>
              <p
                className="text-xs font-bold text-center mb-2"
                style={{ color: "#1e293b" }}
              >
                Pass Rate (%) by Department
              </p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptStats}
                  margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="dept"
                    fontSize={11}
                    tick={{ fill: "#64748b" }}
                  />
                  <YAxis
                    fontSize={11}
                    tick={{ fill: "#64748b" }}
                    domain={[0, 100]}
                  />
                  <RechartsTooltip
                    cursor={{ fill: "rgba(16,185,129,0.04)" }}
                    contentStyle={{
                      background: "#ffffff",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    }}
                  />
                  <Bar
                    dataKey="passRate"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    name="Pass Rate (%)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {deptStats.map(({ fullDept, count }) => {
              const dc = DEPT_COLORS[fullDept] || {
                bg: "rgba(99,102,241,0.06)",
                text: "#4f46e5",
                border: "rgba(99,102,241,0.15)",
              };
              const isActive = filterDept === fullDept;
              return (
                <button
                  key={fullDept}
                  onClick={() =>
                    setFilterDept(filterDept === fullDept ? "all" : fullDept)
                  }
                  style={{
                    background: isActive ? dc.bg : "#ffffff",
                    border: `1.5px solid ${isActive ? dc.border : "#cbd5e1"}`,
                    borderRadius: "10px",
                    padding: "0.875rem",
                    textAlign: "left",
                    transition: "all 0.2s ease",
                    cursor: "pointer",
                  }}
                >
                  <p
                    className="text-xs mb-1"
                    style={{ color: isActive ? dc.text : "#64748b" }}
                  >
                    {DEPT_SHORT[fullDept] || fullDept}
                  </p>
                  <p
                    className="text-2xl font-black"
                    style={{ color: "#0f172a" }}
                  >
                    {count}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Filters ── */}
        <div
          style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}
          className="animate-fade-in"
        >
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ color: "#64748b" }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name or reg. no..."
                style={{ ...selectStyle, paddingLeft: "2.2rem" }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#4f46e5";
                  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.1)";
                  e.target.style.background = "#ffffff";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#cbd5e1";
                  e.target.style.boxShadow = "none";
                  e.target.style.background = "#ffffff";
                }}
              />
            </div>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              style={selectStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#4f46e5";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#cbd5e1";
              }}
            >
              <option value="all">All Departments</option>
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <select
              value={filterQuestion}
              onChange={(e) => setFilterQuestion(e.target.value)}
              style={selectStyle}
              onFocus={(e) => {
                e.target.style.borderColor = "#4f46e5";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#cbd5e1";
              }}
            >
              <option value="all">All Questions</option>
              {questions.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToExcel}
              disabled={results.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                background:
                  results.length === 0 ? "#f1f5f9" : "rgba(99,102,241,0.08)",
                border: `1px solid ${results.length === 0 ? "#e2e8f0" : "rgba(99,102,241,0.25)"}`,
                color: results.length === 0 ? "#cbd5e1" : "#4f46e5",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: results.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              <Download className="w-3.5 h-3.5" /> Export Excel
            </button>
            <button
              onClick={exportAllResults}
              disabled={results.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                background:
                  results.length === 0 ? "#f1f5f9" : "rgba(16,185,129,0.08)",
                border: `1px solid ${results.length === 0 ? "#e2e8f0" : "rgba(16,185,129,0.25)"}`,
                color: results.length === 0 ? "#cbd5e1" : "#059669",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: results.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              <Download className="w-3.5 h-3.5" /> Export JSON
            </button>
            <button
              onClick={clearAllResults}
              disabled={results.length === 0}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: "8px",
                background:
                  results.length === 0 ? "#f1f5f9" : "rgba(239,68,68,0.08)",
                border: `1px solid ${results.length === 0 ? "#e2e8f0" : "rgba(239,68,68,0.25)"}`,
                color: results.length === 0 ? "#cbd5e1" : "#dc2626",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: results.length === 0 ? "not-allowed" : "pointer",
                transition: "all 0.2s",
              }}
            >
              <X className="w-3.5 h-3.5" /> Clear All Data
            </button>
          </div>
        </div>

        {/* ── Results Table ── */}
        <div
          style={{ ...card, overflow: "hidden" }}
          className="animate-fade-in"
        >
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2
                className="w-8 h-8 animate-spin"
                style={{ color: "#4f46e5" }}
              />
              <p className="text-sm" style={{ color: "#64748b" }}>
                Loading exam records...
              </p>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)" }}
              >
                <FileText className="w-7 h-7" style={{ color: "#4f46e5" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "#64748b" }}>
                No results found
              </p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                Student exam results will appear here after submissions
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(15,23,42,0.05)",
                      background: "#f1f5f9",
                    }}
                  >
                    {[
                      "Student",
                      "Reg. No.",
                      "Department",
                      "Question",
                      "Programming (30)",
                      "MCQ (20)",
                      "Total",
                      "%",
                      "Actions"
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "0.75rem 1rem",
                          textAlign:
                            h === "Student" ||
                            h === "Reg. No." ||
                            h === "Department" ||
                            h === "Question"
                              ? "left"
                              : "center",
                          fontSize: "0.7rem",
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
                  {filteredResults.map((result, idx) => {
                    const computedTotal =
                      (result.programmingMarks || 0) + (result.mcqMarks || 0);
                    const percentage =
                      (computedTotal / (result.maxMarks || 50)) * 100;
                    const dept = result.student.department || "";
                    const dc = DEPT_COLORS[dept];
                    return (
                      <tr
                        key={result.id}
                        style={{
                          borderBottom: "1px solid rgba(15,23,42,0.05)",
                          background: result.malpractice
                            ? "rgba(239,68,68,0.06)"
                            : "transparent",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background =
                            "rgba(99,102,241,0.04)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = result.malpractice
                            ? "rgba(239,68,68,0.06)"
                            : "transparent")
                        }
                      >
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{
                                background: "rgba(99,102,241,0.08)",
                                color: "#4f46e5",
                              }}
                            >
                              {result.student.name.charAt(0)}
                            </div>
                            <div>
                              <span
                                className="text-sm font-semibold"
                                style={{ color: "#1e293b" }}
                              >
                                {result.student.name}
                              </span>
                              {result.malpractice && (
                                <span
                                  className="ml-2 px-1.5 py-0.5 text-xs font-bold rounded"
                                  style={{
                                    background: "#dc2626",
                                    color: "#fff",
                                  }}
                                >
                                  MALPRACTICE
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                             fontSize: "0.75rem",
                             fontFamily: "monospace",
                             color: "#475569",
                             letterSpacing: "0.04em",
                          }}
                        >
                          {result.student.registerNumber}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {dc ? (
                            <span
                              style={{
                                padding: "0.2rem 0.6rem",
                                borderRadius: "6px",
                                fontSize: "0.7rem",
                                fontWeight: 700,
                                background: dc.bg,
                                color: dc.text,
                                border: `1px solid ${dc.border}`,
                              }}
                            >
                              {DEPT_SHORT[dept] || dept}
                            </span>
                          ) : (
                            <span
                              style={{ color: "#94a3b8", fontSize: "0.75rem" }}
                            >
                              N/A
                            </span>
                          )}
                        </td>
                        <td
                          style={{ padding: "0.75rem 1rem", maxWidth: "200px" }}
                        >
                          <p
                            style={{
                              fontSize: "0.8rem",
                             color: "#475569",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                            title={result.question}
                          >
                            {result.question || "N/A"}
                          </p>
                          {result.malpractice && result.malpracticeReason && (
                            <p
                              style={{
                                fontSize: "0.7rem",
                                color: "#dc2626",
                                marginTop: "2px",
                              }}
                            >
                              {result.malpracticeReason}
                            </p>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#4f46e5",
                          }}
                        >
                          {result.programmingMarks || 0}/30
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            color: "#4f46e5",
                          }}
                        >
                          {result.mcqMarks || 0}/20
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                            fontSize: "0.875rem",
                            fontWeight: 800,
                            color: "#312e81",
                          }}
                        >
                          {computedTotal}/{result.maxMarks || 50}
                        </td>
                        <td
                          style={{
                            padding: "0.75rem 1rem",
                            textAlign: "center",
                          }}
                        >
                          <span
                            style={{
                              padding: "0.25rem 0.6rem",
                              borderRadius: "999px",
                              fontSize: "0.72rem",
                              fontWeight: 700,
                              background:
                                percentage >= 70
                                  ? "rgba(16,185,129,0.1)"
                                  : percentage >= 50
                                    ? "rgba(245,158,11,0.1)"
                                    : "rgba(239,68,68,0.1)",
                              color:
                                percentage >= 70
                                  ? "#059669"
                                  : percentage >= 50
                                    ? "#d97706"
                                    : "#dc2626",
                              border: `1px solid ${percentage >= 70 ? "rgba(16,185,129,0.25)" : percentage >= 50 ? "rgba(245,158,11,0.25)" : "rgba(239,68,68,0.25)"}`,
                            }}
                          >
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", textAlign: "center" }}>
                          <button
                            onClick={() => handleDeleteResult(result.id)}
                            className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                            title="Delete Attempt"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table footer */}
          <div style={{ padding: "0.75rem 1rem", borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ fontSize: "0.72rem", color: "#64748b" }}>
              Showing <span style={{ color: "#4f46e5", fontWeight: 700 }}>{filteredResults.length}</span> of {results.length} result{results.length !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <p style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Supabase · SSCET Exam DB</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
