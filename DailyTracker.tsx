import { useState, useEffect, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Search,
  Loader2,
  Users,
  CheckCircle,
  Clock,
  Filter,
  Eye,
} from "lucide-react";
import { DEPARTMENTS } from "./StudentManagement";
import { getStudents, getExamResults, getLeetCodeAttendanceMap } from "../services/api";
import { toast } from "sonner";

interface DailyTrackerProps {
  onBack: () => void;
}

interface StudentInfo {
  id: string;
  name: string;
  registerNumber: string;
  department: string;
  createdAt: string;
}

interface ExamResult {
  id?: number;
  student: { name: string; registerNumber: string; department?: string };
  question: string;
  programmingMarks: number;
  mcqMarks: number;
  totalMarks: number;
  maxMarks: number;
  malpractice?: boolean;
  submittedAt?: string;
  timeSpent?: number;
}

const DEPT_COLORS: Record<string, string> = {
  "Artificial Intelligence and Data Science":
    "bg-violet-50 text-violet-700 border-violet-150",
  "Computer Science": "bg-blue-50 text-blue-700 border-blue-150",
  "Information Technology":
    "bg-emerald-50 text-emerald-700 border-emerald-150",
  "Cyber Security": "bg-rose-50 text-rose-700 border-rose-150",
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DailyTracker({ onBack }: DailyTrackerProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(
    formatDateKey(today),
  );
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [allResults, setAllResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDept, setFilterDept] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [activeView, setActiveView] = useState<"calendar" | "matrix">(
    "calendar",
  );
  const [trackerType, setTrackerType] = useState<"exam" | "leetcode">("exam");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [studentsList, results] = await Promise.all([
        getStudents(),
        getExamResults(),
      ]);
      setStudents(
        studentsList.map((s: any) => ({
          id: String(s.id),
          name: s.name,
          registerNumber: s.registerNumber,
          department: s.department,
          createdAt: s.createdAt
            ? formatDateKey(new Date(s.createdAt))
            : "2000-01-01",
        })),
      );
      setAllResults(results);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Build a map of dateKey -> Set of registerNumbers who submitted
  const submissionMap = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const r of allResults) {
      const raw = r.submittedAt;
      if (!raw) continue;
      const d = new Date(raw);
      const key = formatDateKey(d);
      if (!map[key]) map[key] = new Set();
      map[key].add(r.student.registerNumber);
    }
    return map;
  }, [allResults]);

  const leetCodeMap = useMemo(() => {
    return getLeetCodeAttendanceMap();
  }, [isLoading]); // re-evaluate when load completes

  const activeMap = useMemo(() => {
    return trackerType === "exam" ? submissionMap : leetCodeMap;
  }, [trackerType, submissionMap, leetCodeMap]);

  // Build a map of dateKey -> ExamResult[] for detail panel
  const resultsByDate = useMemo(() => {
    const map: Record<string, ExamResult[]> = {};
    for (const r of allResults) {
      const raw = r.submittedAt;
      if (!raw) continue;
      const key = formatDateKey(new Date(raw));
      if (!map[key]) map[key] = [];
      map[key].push(r);
    }
    return map;
  }, [allResults]);

  // Filter students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const deptOk = filterDept === "all" || s.department === filterDept;
      const searchOk =
        !searchTerm ||
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.registerNumber.toLowerCase().includes(searchTerm.toLowerCase());
      return deptOk && searchOk;
    });
  }, [students, filterDept, searchTerm]);

  // Calendar helpers
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const todayKey = formatDateKey(today);

  // Find last active day before today
  const lastActiveDateKey = useMemo(() => {
    const activeDates = Object.keys(activeMap).filter(
      (key) => key < todayKey && activeMap[key].size > 0,
    );
    activeDates.sort();
    return activeDates.length > 0 ? activeDates[activeDates.length - 1] : null;
  }, [activeMap, todayKey]);

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else setCurrentMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else setCurrentMonth((m) => m + 1);
  };

  // Stats for selected date
  const selectedDayResults = selectedDate
    ? resultsByDate[selectedDate] || []
    : [];
  const selectedDaySubmitters = selectedDate
    ? activeMap[selectedDate] || new Set()
    : new Set();
  const completedStudents = filteredStudents.filter((s) =>
    selectedDaySubmitters.has(s.registerNumber),
  );
  const pendingStudents = filteredStudents.filter(
    (s) => !selectedDaySubmitters.has(s.registerNumber),
  );

  // Monthly stats
  const monthlyStats = useMemo(() => {
    let totalSubmissions = 0;
    let activeDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const subs = activeMap[key];
      if (subs && subs.size > 0) {
        activeDays++;
        totalSubmissions += subs.size;
      }
    }
    return { totalSubmissions, activeDays };
  }, [activeMap, currentYear, currentMonth, daysInMonth]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          <p className="text-slate-500 text-sm">
            Loading daily tracker data...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
      <div className="max-w-7xl mx-auto">
        {/* ─── Header ─────────────────────────────────────────────── */}
        <div className="rounded-2xl overflow-hidden mb-6 animate-fade-in" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
          <div style={{ height: "4px", background: "linear-gradient(90deg, #0ea5e9, #6366f1, #10b981)" }} />
          <div className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium transition-colors" style={{ color: "#64748b" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#4f46e5")} onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
                  <ArrowLeft className="w-4 h-4" /> Back to Admin
                </button>
                <div style={{ width: "1px", height: "20px", background: "#e2e8f0" }} />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0ea5e9, #10b981)", boxShadow: "0 4px 12px rgba(14,165,233,0.3)" }}>
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-base font-bold" style={{ color: "#0f172a" }}>Daily Test Tracker</h1>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>Monitor which students complete tests each day</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveView("calendar")}
                  className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-lg transition-all"
                  style={activeView === "calendar" ? { background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", border: "none", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" } : { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}>
                  <Calendar className="w-3.5 h-3.5" /> Calendar View
                </button>
                <button onClick={() => setActiveView("matrix")}
                  className="flex items-center gap-1.5 text-xs font-semibold py-2 px-3.5 rounded-lg transition-all"
                  style={activeView === "matrix" ? { background: "linear-gradient(135deg, #6366f1, #4f46e5)", color: "#fff", border: "none", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" } : { background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}>
                  <Users className="w-3.5 h-3.5" /> Attendance Matrix
                </button>
              </div>
            </div>

          {/* Monthly summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {[{label:"Total Students",value:filteredStudents.length,color:"#4f46e5",bg:"rgba(99,102,241,0.07)",border:"rgba(99,102,241,0.15)"},
              {label: trackerType==="exam" ? "Monthly Submissions" : "Monthly Solved Logs", value: monthlyStats.totalSubmissions, color:"#059669",bg:"rgba(16,185,129,0.07)",border:"rgba(16,185,129,0.15)"},
              {label:"Active Days",value:monthlyStats.activeDays,color:"#7c3aed",bg:"rgba(124,58,237,0.07)",border:"rgba(124,58,237,0.15)"},
              {label: trackerType==="exam" ? "Today's Completed" : "Today's Active",value: activeMap[todayKey]?.size || 0,color:"#0ea5e9",bg:"rgba(14,165,233,0.07)",border:"rgba(14,165,233,0.15)"},
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{background:s.bg,border:`1px solid ${s.border}`}}>
                <p className="text-xs font-semibold mb-0.5" style={{color:s.color}}>{s.label}</p>
                <p className="text-xl font-black" style={{color:s.color}}>{s.value}</p>
              </div>
            ))}
          </div>
          </div>
        </div>

        {/* Tracker Type Segmented Switcher */}
        <div className="flex p-1 rounded-xl mb-5 max-w-xs" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <button onClick={() => setTrackerType("exam")}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={trackerType==="exam" ? {background:"linear-gradient(135deg,#6366f1,#4f46e5)",color:"#fff",boxShadow:"0 2px 8px rgba(99,102,241,0.25)"} : {color:"#94a3b8"}}>
            Exam Attendance
          </button>
          <button onClick={() => setTrackerType("leetcode")}
            className="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            style={trackerType==="leetcode" ? {background:"linear-gradient(135deg,#f97316,#ea580c)",color:"#fff",boxShadow:"0 2px 8px rgba(249,115,22,0.25)"} : {color:"#94a3b8"}}>
            LeetCode Attendance
          </button>
        </div>

        {/* ─── Filters ──────────────────────────────────────────── */}
        <div className="rounded-2xl p-4 mb-5" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-sm outline-none transition-all"
                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.4)"; e.target.style.background = "#fff"; }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; }} />
            </div>
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none appearance-none"
              style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#0f172a" }}>
              <option value="all">All Departments</option>
              {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        {/* ─── Calendar View ──────────────────────────────────── */}
        {activeView === "calendar" && (
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Calendar grid */}
            <div className="lg:col-span-2 rounded-2xl p-5" style={{ background: "rgba(255, 255, 255, 0.75)", border: "1px solid rgba(99, 102, 241, 0.08)" }}>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-5">
                <button
                  onClick={prevMonth}
                  className="p-2 rounded-xl transition-all text-slate-600 hover:text-slate-800"
                  style={{ background: "#f1f5f9" }}
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="text-lg font-bold text-slate-850">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-2 rounded-xl transition-all text-slate-600 hover:text-slate-800"
                  style={{ background: "#f1f5f9" }}
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="text-center text-xs font-semibold text-slate-500 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for offset */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {/* Day cells */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const subs = activeMap[dateKey];
                  const count = subs ? subs.size : 0;
                  const isSelected = selectedDate === dateKey;
                  const isToday = formatDateKey(today) === dateKey;
                  const isFuture = new Date(currentYear, currentMonth, day) > today;

                  // Determine cell status
                  let cellBg = "bg-slate-50 hover:bg-slate-100/80";
                  let indicator = null;

                  if (!isFuture && count > 0) {
                    const pct =
                      filteredStudents.length > 0
                        ? count / filteredStudents.length
                        : 0;
                    if (pct >= 0.8) {
                      cellBg =
                        "bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/30";
                      indicator = (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                           <Check
                            className="w-2.5 h-2.5 text-white"
                            strokeWidth={3}
                          />
                        </div>
                      );
                    } else if (pct >= 0.4) {
                      cellBg =
                        "bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/20";
                      indicator = (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/50">
                          <span className="text-[7px] font-bold text-white">
                            {count}
                          </span>
                        </div>
                      );
                    } else {
                      cellBg =
                        "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/20";
                      indicator = (
                        <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/50">
                          <span className="text-[7px] font-bold text-white">
                            {count}
                          </span>
                        </div>
                      );
                    }
                  }

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(dateKey)}
                      disabled={isFuture}
                      className={`relative aspect-square rounded-xl border transition-all flex flex-col items-center justify-center text-sm font-medium
                        ${isSelected ? "ring-2 ring-indigo-500 border-indigo-500/30 bg-indigo-500/20" : `border-slate-100 ${cellBg}`}
                        ${isToday && !isSelected ? "ring-1 ring-indigo-500" : ""}
                        ${isFuture ? "opacity-25 cursor-not-allowed bg-slate-100/50 border-slate-100" : "cursor-pointer"}
                      `}
                    >
                      <span
                        className={`${isToday ? "text-indigo-600 font-bold" : "text-slate-700"} ${isSelected ? "text-indigo-600" : ""}`}
                      >
                        {day}
                      </span>
                      {!isFuture && count > 0 && (
                        <span className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                          {count}
                        </span>
                      )}
                      {indicator}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-5 pt-4 border-t border-slate-100 flex flex-wrap gap-3 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-emerald-500/20 border border-emerald-500/30" />
                  <span>≥80% done</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-amber-500/15 border border-amber-500/20" />
                  <span>40–79%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500/10 border border-blue-500/20" />
                  <span>&lt;40%</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-slate-50 border border-slate-200" />
                  <span>No tests</span>
                </div>
              </div>
            </div>

            {/* Day detail panel */}
            <div className="lg:col-span-3 rounded-2xl overflow-hidden" style={{ background: "rgba(255, 255, 255, 0.75)", border: "1px solid rgba(99, 102, 241, 0.08)" }}>
              {selectedDate ? (
                <>
                  {/* Day header */}
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {new Date(
                            selectedDate + "T00:00:00",
                          ).toLocaleDateString("en-IN", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </h3>
                        <p className="text-slate-550 text-sm mt-0.5">
                          {completedStudents.length} completed ·{" "}
                          {pendingStudents.length} pending
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-center rounded-xl px-4 py-2" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                          <p className="text-xs text-emerald-700">Done</p>
                          <p className="text-xl font-bold text-emerald-700">
                            {completedStudents.length}
                          </p>
                        </div>
                        <div className="text-center rounded-xl px-4 py-2 bg-slate-100 border border-slate-200">
                          <p className="text-xs text-slate-500">Pending</p>
                          <p className="text-xl font-bold text-slate-700">
                            {pendingStudents.length}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    {filteredStudents.length > 0 && (
                      <div className="mt-3">
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                            style={{
                              width: `${(completedStudents.length / filteredStudents.length) * 100}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-550 mt-1 text-right">
                          {(
                            (completedStudents.length /
                              filteredStudents.length) *
                            100
                          ).toFixed(0)}
                          % completion
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Completed students */}
                  <div className="max-h-[520px] overflow-y-auto">
                    {completedStudents.length > 0 && (
                      <div className="px-6 py-4">
                        <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Completed ({completedStudents.length})
                        </h4>
                        <div className="space-y-2">
                          {completedStudents.map((student) => {
                            const result = selectedDayResults.find(
                              (r) =>
                                r.student.registerNumber ===
                                student.registerNumber,
                            );
                            const dept = student.department;
                            return (
                              <div
                                key={student.registerNumber}
                                className="flex items-center justify-between rounded-xl px-4 py-3"
                                style={{ background: "rgba(16,185,129,0.03)", border: "1px solid rgba(16,185,129,0.15)" }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(16,185,129,0.08)" }}>
                                    <Check
                                      className="w-4 h-4 text-emerald-600"
                                      strokeWidth={3}
                                    />
                                  </div>
                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {student.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-xs text-slate-500 font-mono">
                                        {student.registerNumber}
                                      </span>
                                      <span
                                        className={`text-[10px] px-1.5 py-0.5 rounded-md border font-medium ${DEPT_COLORS[dept] || "bg-[#f1f5f9] text-slate-500 border-slate-200"}`}
                                      >
                                        {dept.split(" ").slice(-1)[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {result && (
                                  <div className="flex items-center gap-3 text-right">
                                    <div>
                                      <div className="flex flex-col items-end">
                                        {result.malpractice && (
                                          <p className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 mb-1 inline-block">
                                            Malpractice
                                          </p>
                                        )}
                                        <p className={`text-sm font-bold ${result.malpractice ? 'text-red-600' : 'text-emerald-600'}`}>
                                          {(result.programmingMarks || 0) +
                                            (result.mcqMarks || 0)}
                                          /{result.maxMarks || 50}
                                        </p>
                                      </div>
                                      <p className="text-[10px] text-slate-555">
                                        {result.question
                                          ? result.question.slice(0, 20) +
                                            (result.question.length > 20
                                              ? "..."
                                              : "")
                                          : "N/A"}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Pending students */}
                    {pendingStudents.length > 0 && (
                      <div className="px-6 py-4 border-t border-slate-100">
                        <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5" />
                          Pending ({pendingStudents.length})
                        </h4>
                        <div className="space-y-1.5">
                          {pendingStudents.map((student) => {
                            const dept = student.department;
                            return (
                              <div
                                key={student.registerNumber}
                                className="flex items-center justify-between rounded-xl px-4 py-2.5"
                                style={{ background: "#ffffff", border: "1px solid rgba(99,102,241,0.08)" }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <div className="w-2.5 h-2.5 rounded-full border-2 border-slate-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm text-slate-700">
                                      {student.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {student.registerNumber}
                                      </span>
                                      <span
                                        className={`text-[9px] px-1.5 py-0.5 rounded-md border font-medium ${DEPT_COLORS[dept] || "bg-[#1e293b] text-slate-500 border-slate-800"}`}
                                      >
                                        {dept.split(" ").slice(-1)[0]}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-xs text-slate-500 italic">
                                  Not submitted
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {completedStudents.length === 0 &&
                      pendingStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 gap-3">
                          <Users className="w-12 h-12 text-slate-600" />
                          <p className="text-slate-500 text-sm">
                            No students match your filters
                          </p>
                        </div>
                      )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 gap-3">
                  <Eye className="w-14 h-14 text-slate-700" />
                  <p className="font-medium text-slate-400">
                    Select a date to view details
                  </p>
                  <p className="text-slate-500 text-sm">
                    Click on any day in the calendar
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Attendance Matrix View ──────────────────────────── */}
        {activeView === "matrix" && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255, 255, 255, 0.75)", border: "1px solid rgba(99, 102, 241, 0.08)" }}>
            {/* Matrix header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-lg transition-all text-slate-650 hover:text-slate-800"
                  style={{ background: "#f1f5f9" }}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <h3 className="text-base font-bold text-slate-850 min-w-[180px] text-center">
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </h3>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-lg transition-all text-slate-650 hover:text-slate-800"
                  style={{ background: "#f1f5f9" }}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                    <Check
                      className="w-3 h-3 text-emerald-600"
                      strokeWidth={3}
                    />
                  </div>
                  <span>Test completed</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  </div>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-md bg-slate-50 border border-slate-200" />
                  <span>No test</span>
                </div>
              </div>
            </div>

            {/* Matrix table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid rgba(15,23,42,0.05)" }}>
                    <th className="sticky left-0 z-10 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider min-w-[200px] border-r border-slate-200" style={{ background: "#f8fafc", color: "#4f46e5" }}>
                      Student
                    </th>
                    <th className="sticky left-[200px] z-10 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider min-w-[55px] border-r border-slate-200" style={{ background: "#f8fafc", color: "#4f46e5" }}>
                      Total
                    </th>
                    {Array.from({ length: daysInMonth }).map((_, i) => {
                      const day = i + 1;
                      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                      const isToday = dateKey === todayKey;
                      const dayOfWeek = new Date(
                        currentYear,
                        currentMonth,
                        day,
                      ).getDay();
                      const isSunday = dayOfWeek === 0;
                      return (
                        <th
                          key={day}
                          className={`px-0 py-3 text-center text-[10px] font-semibold min-w-[34px]
                            ${isToday ? "text-teal-600 bg-teal-500/10" : isSunday ? "text-rose-600" : "text-slate-500"}
                          `}
                        >
                          <div>{day}</div>
                          <div className="text-[8px] font-normal">
                            {WEEKDAYS[dayOfWeek]}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan={daysInMonth + 2}
                        className="px-6 py-16 text-center text-slate-500 text-sm"
                      >
                        No students match your filters
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((student) => {
                      // Pre-compute total days this student completed tests this month
                      let totalDays = 0;
                      const completionFlags: boolean[] = [];
                      for (let i = 0; i < daysInMonth; i++) {
                        const day = i + 1;
                        const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                        const subs = activeMap[dateKey];
                        const completed = subs
                          ? subs.has(student.registerNumber)
                          : false;
                        completionFlags.push(completed);
                        if (completed) totalDays++;
                      }

                      return (
                        <tr
                          key={student.registerNumber}
                          className="transition-colors hover:bg-indigo-50/20"
                        >
                          <td className="sticky left-0 z-10 px-4 py-2.5 border-r border-slate-200" style={{ background: "#ffffff" }}>
                            <div>
                              <p className="text-xs font-semibold text-slate-800 truncate max-w-[130px]">
                                {student.name}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                {student.registerNumber}
                              </p>
                            </div>
                          </td>
                          <td className="sticky left-[200px] z-10 px-2 py-2.5 text-center border-r border-slate-200" style={{ background: "#ffffff" }}>
                            <span
                              className={`text-xs font-bold ${totalDays > 0 ? "text-emerald-700" : "text-slate-500"}`}
                            >
                              {totalDays}
                            </span>
                          </td>
                          {completionFlags.map((completed, i) => {
                            const day = i + 1;
                            const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                            const isFuture =
                              new Date(currentYear, currentMonth, day) > today;
                            const isToday = dateKey === todayKey;

                            // Only mark absent if student existed on or before this date
                            const isLastActive =
                              dateKey === lastActiveDateKey &&
                              student.createdAt <= lastActiveDateKey;

                            return (
                              <td
                                key={day}
                                className={`px-0 py-2.5 text-center ${isToday ? "bg-teal-500/10" : ""}`}
                              >
                                {isFuture ? (
                                  <div className="w-6 h-6 mx-auto rounded-md bg-slate-100/50" />
                                ) : completed ? (
                                  <div className="w-6 h-6 mx-auto rounded-md bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center transition-all hover:bg-emerald-500/40 hover:scale-110">
                                    <Check
                                      className="w-3.5 h-3.5 text-emerald-600"
                                      strokeWidth={3}
                                    />
                                  </div>
                                ) : isLastActive ? (
                                  <div
                                    className="w-6 h-6 mx-auto rounded-md bg-red-500/20 border border-red-500/40 flex items-center justify-center"
                                    title="Absent"
                                  >
                                    <div className="w-2 h-2 rounded-full bg-red-500" />
                                  </div>
                                ) : (
                                  <div className="w-6 h-6 mx-auto rounded-md bg-slate-50 border border-slate-100" />
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="px-5 py-3 border-t border-slate-100 text-xs text-slate-500 text-center">
              Showing {filteredStudents.length} student
              {filteredStudents.length !== 1 ? "s" : ""} × {daysInMonth} days —{" "}
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
