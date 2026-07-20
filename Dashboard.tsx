import React, { useState, useEffect } from "react";
import {
  User,
  LogOut,
  Clock,
  FileText,
  PlayCircle,
  AlertCircle,
  Loader2,
  BookOpen,
  Zap,
  Shield,
  CheckCircle,
  Flame,
  Code2,
  Trophy,
  RefreshCw,
  X,
  Activity,
  Award,
  BookOpenCheck,
  GraduationCap,
  ExternalLink
} from "lucide-react";
import {
  getQuestions,
  getAssignedQuestion,
  assignQuestion,
  getStudentExamResults,
  fetchLeetCodeStats,
  LeetCodeStats,
  logLeetCodePresence,
  checkServerHealth,
  getLeetCodeProfileUrl,
} from "../services/api";
import { toast } from "sonner";


interface DashboardProps {
  student: {
    name: string;
    registerNumber: string;
    department?: string;
    email?: string;
    leetCodeUsername?: string;
  };
  onStartExam: (question: any) => void;
  onLogout: () => void;
  onViewHistory: () => void;
  onViewProfile: () => void;
}

const PROGRAMMING_QUOTES = [
  { quote: "Talk is cheap. Show me the code.", author: "Linus Torvalds" },
  { quote: "Programs must be written for people to read, and only secondarily for machines to execute.", author: "Harold Abelson" },
  { quote: "First, solve the problem. Then, write the code.", author: "John Johnson" },
  { quote: "Clean code always looks like it was written by someone who cares.", author: "Michael Feathers" },
  { quote: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" }
];

const DIFF_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  Easy: { bg: "rgba(16,185,129,0.08)", text: "#059669", border: "rgba(16,185,129,0.2)" },
  Medium: { bg: "rgba(245,158,11,0.08)", text: "#d97706", border: "rgba(245,158,11,0.2)" },
  Hard: { bg: "rgba(239,68,68,0.08)", text: "#dc2626", border: "rgba(239,68,68,0.2)" },
};

const cardStyles: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.75)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(99, 102, 241, 0.08)",
  borderRadius: "24px",
  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.02)",
  padding: "1.75rem",
  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
};

// --- Contribution Grid Component ---
interface ContributionGridProps {
  activityMap: Record<string, number>;
}

function ContributionGrid({ activityMap }: ContributionGridProps) {
  const cells: Date[] = [];
  const today = new Date();

  // Find the start date (120 days ago, aligned to Sunday)
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 120);
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  const temp = new Date(startDate);
  while (temp <= today) {
    cells.push(new Date(temp));
    temp.setDate(temp.getDate() + 1);
  }

  // Group cells into weeks (7 days each)
  const weeks: Date[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const getGreenShade = (count: number) => {
    if (!count) return "#e2e8f0"; // empty light cell
    if (count === 1) return "#a7f3d0"; // light emerald
    if (count === 2) return "#34d399"; // medium emerald
    if (count === 3) return "#059669"; // dark emerald
    return "#047857"; // super dark emerald
  };

  return (
    <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(99,102,241,0.12)" }}>
      <h3 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5" style={{ color: "#4f46e5" }}>
        <Activity className="w-3.5 h-3.5 text-indigo-500" />
        Daily Activity Contribution Calendar
      </h3>
      <div className="flex gap-[3px] overflow-x-auto pb-2">
        {weeks.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-[3px]">
            {week.map((day, dIdx) => {
              const dateStr = day.toLocaleDateString("en-CA");
              const count = activityMap[dateStr] || 0;
              const color = getGreenShade(count);
              return (
                <div
                  key={dIdx}
                  className="w-[11px] h-[11px] rounded-[2px] transition-all hover:scale-125 cursor-pointer"
                  style={{ backgroundColor: color }}
                  title={`${day.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${count} activity/activities`}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between text-[10px] mt-2" style={{ color: "#64748b" }}>
        <span>Less</span>
        <div className="flex gap-[3px]">
          <div className="w-[10px] h-[10px] rounded-[2px] bg-[#e2e8f0]" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-[#a7f3d0]" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-[#34d399]" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-[#059669]" />
          <div className="w-[10px] h-[10px] rounded-[2px] bg-[#047857]" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default function Dashboard({
  student,
  onStartExam,
  onLogout,
  onViewHistory,
  onViewProfile,
}: DashboardProps) {
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todayResult, setTodayResult] = useState<any>(null);
  const [examResults, setExamResults] = useState<any[]>([]);

  // Navigation & Modals
  const [dashboardTab, setDashboardTab] = useState<"home" | "evaluation" | "leetcode">("home");
  const [showProfileModal, setShowProfileModal] = useState(false);

  // LeetCode State
  const [leetStats, setLeetStats] = useState<LeetCodeStats | null>(null);
  const [leetLoading, setLeetLoading] = useState(false);
  const [leetError, setLeetError] = useState("");
  const [solvedTodayCount, setSolvedTodayCount] = useState(0);

  // Streak State
  const [streak, setStreak] = useState(1);

  // Combined Activity Map for Contribution Grid
  const [activityMap, setActivityMap] = useState<Record<string, number>>({});
  const [isServerOffline, setIsServerOffline] = useState(false);

  useEffect(() => {
    loadQuestions();
    // checkAssignedQuestion(); // Removed to guarantee a new question every login
    checkTodaySubmission();
    handleStreak();
    loadExamResults();

    if (student.leetCodeUsername) {
      loadLeetCode(student.leetCodeUsername);
    }

    checkServerHealth().then((isOnline) => {
      if (!isOnline) setIsServerOffline(true);
    });
  }, []);

  // Update contribution grid mapping whenever results or LeetCode changes
  useEffect(() => {
    const map: Record<string, number> = {};

    // 1. Get LeetCode active dates from attendance history
    try {
      const history = JSON.parse(localStorage.getItem("leetcode_attendance_history") || "{}");
      const leetDates: string[] = history[student.registerNumber] || [];
      for (const d of leetDates) {
        map[d] = (map[d] || 0) + 1;
      }
    } catch (e) {
      console.warn("Failed to load leetcode history map", e);
    }

    // 2. Get Exam active dates from results list
    for (const r of examResults) {
      if (r.submittedAt) {
        const d = r.submittedAt.split("T")[0];
        map[d] = (map[d] || 0) + 1;
      }
    }

    setActivityMap(map);
  }, [examResults, leetStats]);

  const loadExamResults = async () => {
    try {
      const results = await getStudentExamResults(student.registerNumber);
      setExamResults(results || []);
    } catch (e) {
      console.error("Failed to load exam results", e);
    }
  };

  const handleStreak = () => {
    const key = `exam_streak_${student.registerNumber}`;
    const stored = localStorage.getItem(key);
    const getLocalDate = (d: Date) => d.toLocaleDateString('en-CA');
    const today = getLocalDate(new Date());

    if (!stored) {
      localStorage.setItem(key, JSON.stringify({ streak: 1, lastLoginDate: today }));
      setStreak(1);
      return;
    }

    try {
      const data = JSON.parse(stored);
      const lastLogin = new Date(data.lastLoginDate);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const lastLoginStr = getLocalDate(lastLogin);
      const yesterdayStr = getLocalDate(yesterday);

      if (lastLoginStr === today) {
        setStreak(data.streak);
      } else if (lastLoginStr === yesterdayStr) {
        const newStreak = data.streak + 1;
        localStorage.setItem(key, JSON.stringify({ streak: newStreak, lastLoginDate: today }));
        setStreak(newStreak);
      } else {
        localStorage.setItem(key, JSON.stringify({ streak: 1, lastLoginDate: today }));
        setStreak(1);
      }
    } catch {
      localStorage.setItem(key, JSON.stringify({ streak: 1, lastLoginDate: today }));
      setStreak(1);
    }
  };

  const loadLeetCode = async (username: string, forceSync: boolean = false) => {
    setLeetLoading(true);
    setLeetError("");
    try {
      const stats = await fetchLeetCodeStats(username, forceSync);
      setLeetStats(stats);

      const todayStr = new Date().toLocaleDateString('en-CA');
      const snapshotKey = `leetcode_snapshot_${student.registerNumber}`;
      const saved = localStorage.getItem(snapshotKey);
      let yesterdaySolved = 0;
      let todaySolved = stats.totalSolved;

      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.date === todayStr) {
            yesterdaySolved = data.previousSolved;
          } else {
            yesterdaySolved = data.currentSolved;
            localStorage.setItem(snapshotKey, JSON.stringify({
              date: todayStr,
              previousSolved: yesterdaySolved,
              currentSolved: todaySolved
            }));
          }
        } catch {
          yesterdaySolved = todaySolved;
        }
      } else {
        yesterdaySolved = todaySolved;
        localStorage.setItem(snapshotKey, JSON.stringify({
          date: todayStr,
          previousSolved: todaySolved,
          currentSolved: todaySolved
        }));
      }

      const diffCount = Math.max(0, todaySolved - yesterdaySolved);
      setSolvedTodayCount(diffCount);

      if (todaySolved > yesterdaySolved) {
        logLeetCodePresence(student.registerNumber, todayStr);
      }
    } catch (err: any) {
      console.warn("Could not fetch LeetCode on dashboard:", err);
      setLeetError(err.message || "Could not load stats.");
    } finally {
      setLeetLoading(false);
    }
  };

  const checkTodaySubmission = async () => {
    try {
      const results = await getStudentExamResults(student.registerNumber);
      const getLocalDateString = (dObj: Date) => {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, "0");
        const d = String(dObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };
      const localToday = getLocalDateString(new Date());
      const resultForToday = results.find((r) => {
        if (!r.submittedAt) return false;
        return getLocalDateString(new Date(r.submittedAt)) === localToday;
      });
      if (resultForToday) {
        setHasSubmittedToday(true);
        setTodayResult(resultForToday);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadQuestions = async () => {
    setIsLoading(true);
    setServerError("");
    try {
      let q = await getQuestions();
      // If still empty, try seeding defaults into localStorage directly
      if (!q || q.length === 0) {
        try {
          const { default: defaultQs } = await import("../data/default_questions.json");
          if (defaultQs && defaultQs.length > 0) {
            localStorage.setItem("exam_portal_questions", JSON.stringify(defaultQs));
            q = defaultQs as any;
            console.log("Seeded", defaultQs.length, "questions into localStorage");
          }
        } catch (seedErr) {
          console.warn("Fallback seed failed:", seedErr);
        }
      }
      setAvailableQuestions(q);
    } catch (err: any) {
      console.error("Failed to load questions in dashboard", err);
      setServerError(err.message || "Could not connect to database.");
    } finally {
      setIsLoading(false);
    }
  };

  const checkAssignedQuestion = async () => {
    try {
      const q = await getAssignedQuestion(student.registerNumber);
      if (q) setSelectedQuestion(q);
    } catch (err) {
      console.error("Failed to check assigned question", err);
    }
  };

  const handleGetRandomQuestion = async () => {
    if (availableQuestions.length === 0) {
      toast.error("No questions available in the question bank.");
      return;
    }
    setIsQuestionLoading(true);
    try {
      // Find all questions the student has previously attempted (even malpractice ones)
      const previouslyAttemptedTitles = new Set(examResults.map(r => r.question));

      // Filter to languages we support
      let pool = availableQuestions.filter(
        (q) => q.language.toLowerCase() === "javascript" || q.language.toLowerCase() === "python" || q.language.toLowerCase() === "java" || q.language.toLowerCase() === "c"
      );
      if (pool.length === 0) pool = availableQuestions;

      // Filter out previously attempted questions
      let freshPool = pool.filter(q => !previouslyAttemptedTitles.has(q.title));
      if (freshPool.length === 0) {
        // If they have somehow attempted ALL available questions, fall back to the full pool
        freshPool = pool;
      }

      // Pick a random question from the fresh pool
      const randomQ = freshPool[Math.floor(Math.random() * freshPool.length)];

      const assigned = await assignQuestion(student.registerNumber, randomQ.id);
      setSelectedQuestion(randomQ); // Must set the FULL question object, not the assignment metadata
      toast.success(`Question "${randomQ.title}" has been assigned to you!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to assign question.");
    } finally {
      setIsQuestionLoading(false);
    }
  };

  const handleStart = () => {
    if (selectedQuestion) {
      onStartExam(selectedQuestion);
    }
  };

  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();

  const diff = selectedQuestion ? DIFF_COLORS[selectedQuestion.difficulty] : null;

  // Calculate Average Exam Score
  const avgExamScore = examResults.length > 0
    ? Math.round(examResults.reduce((acc, r) => acc + (r.totalMarks || 0), 0) / examResults.length)
    : 0;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-700">

      {/* 1. LEFT SIDEBAR */}
      <aside className="w-[260px] flex flex-col justify-between py-7 px-5 flex-shrink-0 text-slate-400" style={{ background: "linear-gradient(180deg, #0c0f1d 0%, #1a1836 100%)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

        <div className="space-y-7">
          {/* Top Logo & App Title */}
          <div className="flex items-center gap-3 px-1">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/10">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-white">Tech Console</span>
              <p className="text-[9px] font-medium text-slate-500 -mt-0.5">v2.0 Student</p>
            </div>
          </div>

          {/* User Profile Mini-Badge */}
          <div className="flex items-center gap-3 p-3.5 bg-white/[0.04] border border-white/[0.06] rounded-2xl backdrop-blur-sm hover:bg-white/[0.06] transition-colors duration-300">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-extrabold text-sm text-white shadow-md shadow-indigo-500/20">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{student.name.split(" ")[0]}</p>
              <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">{student.registerNumber}</p>
            </div>
          </div>

          {/* Navigation Sidebar List */}
          <nav className="space-y-1">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-[0.15em] px-3 mb-3">Workspace</p>
            {[
              { id: "home" as const, label: "Home", icon: Activity, accent: "indigo" },
              { id: "evaluation" as const, label: "Evaluation", icon: BookOpenCheck, accent: "indigo" },
              { id: "leetcode" as const, label: "LeetCode", icon: Code2, accent: "orange" },
            ].map((item) => {
              const isActive = dashboardTab === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setDashboardTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-semibold text-[13px] transition-all duration-300 relative group ${isActive
                      ? item.accent === "orange"
                        ? "bg-orange-500/10 text-orange-400"
                        : "bg-indigo-500/10 text-indigo-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]"
                    }`}
                >
                  {isActive && (
                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full ${item.accent === "orange" ? "bg-orange-400" : "bg-indigo-400"
                      }`} style={{ transition: "all 0.3s ease" }} />
                  )}
                  <Icon className={`w-[18px] h-[18px] transition-transform duration-300 ${isActive ? "" : "group-hover:scale-110"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer (Logout Action) */}
        <div className="space-y-3">

          {/* Quick Streak indicator */}
          <div className="flex items-center gap-2.5 p-3 bg-orange-500/[0.06] border border-orange-500/10 rounded-xl text-orange-400 group hover:bg-orange-500/[0.1] transition-colors duration-300">
            <Flame className="w-4 h-4 group-hover:animate-bounce" />
            <span className="text-[11px] font-bold">{streak} Day Streak</span>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-3 bg-white/[0.03] hover:bg-rose-500/10 border border-white/[0.06] hover:border-rose-500/20 text-slate-450 hover:text-rose-450 rounded-xl transition-all duration-300 font-semibold text-[13px] justify-center group"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            <span>Sign Out</span>
          </button>
        </div>

      </aside>

      {/* 2. RIGHT CONTENT PANE */}
      <main className="flex-grow flex flex-col overflow-hidden" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" }}>

        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-200 bg-white/85 backdrop-blur-xl px-8 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
          <div>
            <h2 className="text-[15px] font-bold tracking-tight text-slate-800">
              {dashboardTab === "home" ? "Home Hub" : dashboardTab === "evaluation" ? "Assigned Evaluation" : "LeetCode Insights"}
            </h2>
            <p className="text-[11px] font-medium mt-0.5 hidden sm:block" style={{ color: "#64748b" }}>
              {student.department}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Removed Database connection badge as per user request */}

            {/* Profile modal button */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl transition-all duration-300 font-semibold text-[11px] shadow-sm hover:shadow-md active:scale-[0.97]"
            >
              <User className="w-3.5 h-3.5" />
              Profile
            </button>
          </div>
        </header>

        {/* Scrollable Panel Area */}
        <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">

          {serverError && (
            <div className="flex items-start gap-3 px-5 py-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold animate-fade-in shadow-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Server Connection Alert</p>
                <p className="opacity-80 mt-0.5">{serverError}</p>
              </div>
            </div>
          )}

          <div className="flex-grow">

            {/* 0. HOME / OVERVIEW TAB CONTENT */}
            {dashboardTab === "home" && (
              <div className="space-y-6">

                {/* Welcome Banner */}
                <div
                  className="p-8 rounded-3xl relative overflow-hidden text-white flex flex-col justify-center shadow-md shadow-indigo-500/5"
                  style={{
                    background: "linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)",
                  }}
                >
                  <div className="absolute right-[-10%] top-[-20%] w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl" />
                  <div className="absolute left-[30%] bottom-[-10%] w-48 h-48 rounded-full bg-blue-500/10 blur-3xl" />
                  <div className="relative z-10">
                    <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase text-indigo-200 border border-white/5 backdrop-blur-md">Active Student Workspace</span>
                    <h2 className="text-3xl font-black mt-3 mb-1 tracking-tight">Welcome, {student.name}! 👋</h2>
                    <p className="text-xs text-indigo-100 font-medium max-w-xl leading-relaxed mt-1">
                      Access code compiler evaluations, mock vivas, and track your daily LeetCode coding logs with circular milestones.
                    </p>
                  </div>
                </div>

                {/* Top Section: Welcome Details & LeetCode Milestone Progress */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Quote of the Day Card */}
                  <div style={cardStyles} className="lg:col-span-2 flex flex-col justify-between relative overflow-hidden hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center gap-2 text-indigo-600 mb-4">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: "#4f46e5" }}>Quote of the Day</span>
                    </div>
                    <blockquote className="my-auto">
                      <p className="text-sm font-semibold italic leading-relaxed text-slate-800">
                        "{PROGRAMMING_QUOTES[new Date().getDate() % PROGRAMMING_QUOTES.length].quote}"
                      </p>
                      <footer className="text-xs font-bold text-indigo-600 mt-2">
                        — {PROGRAMMING_QUOTES[new Date().getDate() % PROGRAMMING_QUOTES.length].author}
                      </footer>
                    </blockquote>
                    <div className="mt-4 pt-4 border-t border-slate-200/60 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Inspirational Coding Insight
                    </div>
                  </div>

                  {/* LeetCode Targets Milestone Progress Card */}
                  <div style={cardStyles} className="flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Target Rings</span>
                        <Code2 className="w-4 h-4 text-orange-500" />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center pt-2">
                        {/* Easy Ring */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-14 h-14 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="28" cy="28" r="22" className="text-slate-200/70" strokeWidth="4.5" stroke="currentColor" fill="transparent" />
                              <circle cx="28" cy="28" r="22" className="text-emerald-500" strokeWidth="4.5" strokeDasharray={138} strokeDashoffset={138 - (138 * Math.min(50, leetStats ? leetStats.easySolved : 0)) / 50} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[10px] font-black text-slate-700">{leetStats ? leetStats.easySolved : 0}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Easy</span>
                        </div>

                        {/* Medium Ring */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-14 h-14 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="28" cy="28" r="22" className="text-slate-200/70" strokeWidth="4.5" stroke="currentColor" fill="transparent" />
                              <circle cx="28" cy="28" r="22" className="text-amber-500" strokeWidth="4.5" strokeDasharray={138} strokeDashoffset={138 - (138 * Math.min(30, leetStats ? leetStats.mediumSolved : 0)) / 30} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[10px] font-black text-slate-700">{leetStats ? leetStats.mediumSolved : 0}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Medium</span>
                        </div>

                        {/* Hard Ring */}
                        <div className="flex flex-col items-center">
                          <div className="relative w-14 h-14 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="28" cy="28" r="22" className="text-slate-200/70" strokeWidth="4.5" stroke="currentColor" fill="transparent" />
                              <circle cx="28" cy="28" r="22" className="text-red-500" strokeWidth="4.5" strokeDasharray={138} strokeDashoffset={138 - (138 * Math.min(10, leetStats ? leetStats.hardSolved : 0)) / 10} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[10px] font-black text-slate-700">{leetStats ? leetStats.hardSolved : 0}</span>
                          </div>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Hard</span>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

                {/* Quick Stats Grid Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                  {/* LeetCode Solved Card */}
                  <div style={cardStyles} className="flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-xl hover:shadow-indigo-500/[0.06] hover:border-indigo-500/30 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-5">
                        <div className="p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300" style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)" }}>
                          <Code2 className="w-5 h-5 text-orange-500" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "#475569" }}>LeetCode Solved</span>
                      </div>
                      <div>
                        <h4 className="text-4xl font-extrabold tracking-tight text-slate-800">
                          {leetStats ? leetStats.totalSolved : "0"}
                        </h4>
                        <p className="text-xs mt-1.5 font-medium" style={{ color: "#64748b" }}>Problems Solved</p>
                      </div>
                      {leetStats && (
                        <div className="mt-5 pt-4 flex items-center gap-3 text-[11px] font-semibold" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
                          <span className="px-2 py-0.5 rounded-md" style={{ background: "rgba(16,185,129,0.08)", color: "#047857", border: "1px solid rgba(16,185,129,0.15)" }}>E: {leetStats.easySolved}</span>
                          <span className="px-2 py-0.5 rounded-md" style={{ background: "rgba(245,158,11,0.08)", color: "#b45309", border: "1px solid rgba(245,158,11,0.15)" }}>M: {leetStats.mediumSolved}</span>
                          <span className="px-2 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.08)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.15)" }}>H: {leetStats.hardSolved}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Evaluations Card */}
                  <div style={cardStyles} className="flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-xl hover:shadow-blue-500/[0.06] hover:border-blue-500/30 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-5">
                        <div className="p-3 rounded-2xl group-hover:scale-110 transition-transform duration-300" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                          <BookOpen className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "#475569" }}>Evaluations</span>
                      </div>
                      <div>
                        <h4 className="text-4xl font-extrabold tracking-tight text-slate-800">
                          {examResults.length}
                        </h4>
                        <p className="text-xs mt-1.5 font-medium" style={{ color: "#64748b" }}>Exams Taken</p>
                      </div>
                      <div className="mt-5 pt-4 flex items-center justify-between text-[11px] font-semibold" style={{ borderTop: "1px solid rgba(15,23,42,0.06)", color: "#475569" }}>
                        <span>Avg Score:</span>
                        <span className="font-bold text-sm" style={{ color: "#4f46e5" }}>
                          {examResults.length > 0
                            ? Math.round(examResults.reduce((acc, curr) => acc + (curr.totalMarks || 0), 0) / examResults.length)
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Streak Card */}
                  <div style={cardStyles} className="flex flex-col justify-between relative overflow-hidden group hover:-translate-y-1.5 hover:shadow-xl hover:shadow-rose-500/[0.06] hover:border-rose-500/30 cursor-default">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                    <div className="relative z-10">
                      <div className="flex items-center justify-between mb-5">
                        <div className="p-3 rounded-2xl group-hover:scale-110 group-hover:rotate-12 transition-all duration-300" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                          <Flame className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-[10px] font-bold tracking-wider uppercase" style={{ color: "#475569" }}>Streak Log</span>
                      </div>
                      <div>
                        <h4 className="text-4xl font-extrabold tracking-tight flex items-baseline gap-2 text-slate-800">
                          {streak} <span className="text-sm font-bold text-slate-500">Days</span>
                        </h4>
                        <p className="text-xs mt-1.5 font-medium" style={{ color: "#64748b" }}>Active Daily Streak</p>
                      </div>
                      <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(15,23,42,0.06)" }}>
                        <div className="flex gap-1">
                          {[...Array(7)].map((_, i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < Math.min(streak, 7) ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-slate-200"
                                }`}
                            />
                          ))}
                        </div>
                        <p className="text-[10px] font-medium mt-2" style={{ color: "#64748b" }}>Keep coding daily!</p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Split Bottom Section: Contribution calendar & Timeline attempts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                  {/* Contribution Grid Left Side */}
                  <div className="lg:col-span-2">
                    <div style={cardStyles} className="h-full">
                      <ContributionGrid activityMap={activityMap} />
                    </div>
                  </div>

                  {/* Exam Timeline Attempts Right Side */}
                  <div>
                    <div style={cardStyles} className="h-full flex flex-col justify-between hover:-translate-y-1 hover:shadow-lg transition-all duration-300">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-1.5 pb-2" style={{ color: "#4f46e5", borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          Recent Attempts
                        </h3>
                        {examResults.length === 0 ? (
                          <div className="py-12 text-center text-xs font-semibold" style={{ color: "#64748b" }}>
                            No exam attempts recorded yet.
                          </div>
                        ) : (
                          <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                            {examResults.slice(0, 5).map((res, index) => {
                              const isPassed = res.status === "Passed" || (res.totalMarks && res.totalMarks >= 50);
                              const isMalpractice = res.status && res.status.toLowerCase().includes("malpractice");
                              return (
                                <div key={index} className="flex gap-3 items-start pl-3 relative ml-2" style={{ borderLeft: "1px solid rgba(99,102,241,0.2)" }}>
                                  <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500" />
                                  <div className="flex-grow">
                                    <div className="flex items-center justify-between">
                                      <h4 className="text-[11px] font-black text-slate-800 line-clamp-1">{res.questionTitle}</h4>
                                      <span className="text-[9px] font-bold text-slate-500">
                                        {new Date(res.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between mt-0.5 text-[10px] font-semibold text-slate-500">
                                      <span>Marks: {res.totalMarks}%</span>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${isMalpractice ? "bg-red-500/10 text-red-700 border border-red-500/15" :
                                          isPassed ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/15" :
                                            "bg-amber-500/10 text-amber-700 border border-amber-500/15"
                                        }`}>
                                        {res.status || "Completed"}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Assigned test Quick Launch panel */}
                <div
                  className="p-6 rounded-2xl border transition-all"
                  style={{
                    background: (selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday
                      ? "#fffbeb"
                      : "rgba(255,255,255,0.7)",
                    borderColor: (selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday
                      ? "#fde68a"
                      : "rgba(99,102,241,0.08)",
                    color: (selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday
                      ? "#b45309"
                      : "#475569"
                  }}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-wider">
                        {(selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday
                          ? "⚠️ Evaluation Test Active"
                          : "✅ All Caught Up!"}
                      </h4>
                      <p className="text-xs mt-1 font-semibold opacity-85" style={{ color: (selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday ? "#b45309" : "#475569" }}>
                        {(selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday
                          ? selectedQuestion
                            ? `You have been assigned the exam question: "${selectedQuestion.title}". Please launch the evaluation to complete it.`
                            : `You have a pending evaluation test. Please launch the evaluation to generate your question.`
                          : hasSubmittedToday
                            ? "You have already completed today's evaluation test. Great job!"
                            : "There is no evaluation test assigned to you at this time."}
                      </p>
                    </div>

                    {(selectedQuestion || availableQuestions.length > 0) && !hasSubmittedToday && (
                      <button
                        onClick={() => setDashboardTab("evaluation")}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                        style={{ border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}
                      >
                        Launch Evaluation
                      </button>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* 1. EVALUATION TAB CONTENT */}
            {dashboardTab === "evaluation" && (
              <div style={cardStyles} className="h-full min-h-[500px]">
                {hasSubmittedToday ? (
                  <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                    <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 relative"
                      style={{ background: "rgba(16,185,129,0.1)", border: "2px solid rgba(16,185,129,0.3)" }}>
                      <CheckCircle className="w-12 h-12 text-emerald-600" />
                      <div className="absolute inset-0 rounded-full border-2 border-emerald-500 opacity-20"
                        style={{ animation: "pulse-ring 2s ease-out infinite" }} />
                    </div>
                    <h2 className="text-2xl font-black text-slate-800 mb-2">
                      Exam Completed!
                    </h2>
                    <p className="text-sm text-slate-500 mb-8 max-w-sm">
                      Excellent work! Your lab examination has been successfully recorded for today.
                    </p>

                    <div className="w-full max-w-sm rounded-2xl p-6 mb-8 relative overflow-hidden" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                      <div className="absolute right-0 bottom-0 opacity-5 transform translate-x-4 translate-y-4">
                        <Trophy className="w-32 h-32" />
                      </div>
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mb-1 relative z-10">Total Score</p>
                      <p className="text-6xl font-black text-emerald-650 relative z-10" style={{ color: "#059669" }}>
                        {(todayResult?.programmingMarks || 0) + (todayResult?.mcqMarks || 0) + (todayResult?.observationMarks || 0)}
                        <span className="text-3xl font-bold opacity-45">/{todayResult?.maxMarks || 50}</span>
                      </p>
                    </div>

                    <button
                      onClick={onViewHistory}
                      className="flex items-center gap-2 text-sm font-bold transition-all px-6 py-3 rounded-xl"
                      style={{ color: "#4f46e5", background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}
                    >
                      <BookOpen className="w-4 h-4" /> View Full History
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h2 className="text-xl font-black text-slate-800">
                          Today's Examination
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                          {availableQuestions.length} question pool available
                        </p>
                      </div>
                      {selectedQuestion && (
                        <span className="px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider" style={{ background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)", color: "#4f46e5" }}>
                          Assigned
                        </span>
                      )}
                    </div>

                    <div className="h-px w-full mb-8" style={{ background: "rgba(15,23,42,0.06)" }} />

                    <div className="flex-grow flex flex-col justify-center">
                      {availableQuestions.length === 0 && !isLoading ? (
                        <div className="text-center py-10">
                          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                          <p className="text-lg font-bold text-slate-800">No Questions Yet</p>
                          <p className="text-sm text-slate-500 mt-2">Waiting for administrator to add questions.</p>
                        </div>
                      ) : isQuestionLoading ? (
                        <div className="text-center py-10">
                          <Loader2 className="w-10 h-10 animate-spin text-indigo-550 mx-auto mb-4" />
                          <p className="text-sm font-bold text-slate-655">Assigning question...</p>
                        </div>
                      ) : !selectedQuestion ? (
                        <div className="text-center max-w-md mx-auto py-10">
                          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transform rotate-3" style={{ background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.15)" }}>
                            <Zap className="w-10 h-10 text-indigo-500" />
                          </div>
                          <h3 className="text-xl font-black text-slate-800 mb-3">Ready to start?</h3>
                          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                            Click below to receive your randomly assigned question. Note that you will only receive ONE question and it cannot be changed.
                          </p>
                          <button
                            onClick={handleGetRandomQuestion}
                            className="w-full bg-indigo-650 hover:bg-indigo-700 text-white font-bold text-lg py-4 rounded-xl transition-all transform hover:-translate-y-1"
                            style={{ background: "#4f46e5", border: "none", cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.25)" }}
                          >
                            Generate My Question
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div className="rounded-2xl p-6" style={{ background: "#ffffff", border: "1px solid rgba(99,102,241,0.12)" }}>
                            <div className="flex justify-between items-start mb-4 gap-4">
                              <h3 className="text-xl font-black text-slate-800 leading-snug">
                                {selectedQuestion.title}
                              </h3>
                              <div className="flex gap-2">
                                {diff && (
                                  <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider" style={{ background: diff.bg, color: diff.text, border: `1px solid ${diff.border}` }}>
                                    {selectedQuestion.difficulty}
                                  </span>
                                )}
                                <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider font-mono" style={{ background: "rgba(99,102,241,0.06)", color: "#4f46e5", border: "1px solid rgba(99,102,241,0.12)" }}>
                                  {selectedQuestion.language}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-sm text-slate-700">
                              <p className="font-bold uppercase tracking-wider text-xs mb-1" style={{ color: "#4f46e5" }}>Problem Statement</p>
                              <p className="leading-relaxed" style={{ color: "#334155" }}>
                                {selectedQuestion.description}
                              </p>
                            </div>
                          </div>

                          <div className="rounded-2xl p-5" style={{ background: "#fffbeb", border: "1px solid #fde68a", color: "#b45309" }}>
                            <h4 className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" /> Rules of conduct
                            </h4>
                            <ul className="space-y-2 text-sm font-medium">
                              <li className="flex gap-2"><span>•</span> 30 Marks for code execution, 20 Marks for MCQ.</li>
                              <li className="flex gap-2 text-red-650 font-bold" style={{ color: "#dc2626" }}><span>•</span> ⚠ DO NOT SWITCH TABS. Your exam will be instantly terminated.</li>
                            </ul>
                          </div>

                          <button
                            onClick={handleStart}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-black text-lg py-4 rounded-xl transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3"
                            style={{ border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(99,102,241,0.2)" }}
                          >
                            <PlayCircle className="w-6 h-6" /> START EXAM NOW
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. LEETCODE TAB CONTENT */}
            {dashboardTab === "leetcode" && (
              <div style={cardStyles} className="h-full min-h-[500px] relative overflow-hidden">
                <div className="absolute -right-12 -top-12 opacity-[0.03] text-orange-500">
                  <Code2 className="w-72 h-72" />
                </div>

                <div className="flex items-center justify-between mb-6 pb-4 relative z-10" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                      <Code2 className="w-5 h-5 text-orange-550" />
                      LeetCode Portfolio
                    </h2>
                    <p className="text-xs font-medium mt-0.5" style={{ color: "#64748b" }}>
                      Username: <span className="font-mono font-bold" style={{ color: "#334155" }}>{student.leetCodeUsername || "Not Linked"}</span>
                    </p>
                  </div>
                  {student.leetCodeUsername && (
                    <button
                      onClick={() => loadLeetCode(student.leetCodeUsername!, true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-orange-600 hover:bg-orange-50 transition-colors bg-slate-100"
                      title="Force sync stats from LeetCode"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${leetLoading ? "animate-spin" : ""}`} />
                      Sync Profile
                    </button>
                  )}
                </div>

                {!student.leetCodeUsername ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(15,23,42,0.03)", border: "1px solid rgba(15,23,42,0.08)" }}>
                      <Code2 className="w-8 h-8 text-slate-405" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">No LeetCode Profile Linked</h3>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: "#64748b" }}>
                      Please request the administrator to add your LeetCode username to your profile registration details to track your stats here.
                    </p>
                  </div>
                ) : leetLoading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mb-4" />
                    <p className="text-sm font-semibold text-slate-600">Retrieving stats from LeetCode...</p>
                  </div>
                ) : leetStats ? (
                  <div className="space-y-6 relative z-10">

                    {/* Hero Stats Banner */}
                    <div className="rounded-2xl p-6 relative overflow-hidden text-white"
                      style={{ background: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)" }}
                    >
                      <div className="absolute right-[-5%] top-[-20%] w-56 h-56 rounded-full bg-orange-500/10 blur-3xl" />
                      <div className="absolute left-[40%] bottom-[-15%] w-40 h-40 rounded-full bg-indigo-400/10 blur-2xl" />

                      <div className="relative z-10 flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          {/* Donut Chart */}
                          <div className="relative w-24 h-24 flex-shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                              <circle cx="50" cy="50" r="40" className="text-white/5" strokeWidth="8" stroke="currentColor" fill="transparent" />
                              {/* Easy arc */}
                              <circle cx="50" cy="50" r="40" className="text-emerald-400" strokeWidth="8"
                                strokeDasharray={251} strokeDashoffset={251 - (251 * (leetStats.easySolved / Math.max(leetStats.totalSolved, 1)))}
                                strokeLinecap="round" stroke="currentColor" fill="transparent" />
                              {/* Medium arc */}
                              <circle cx="50" cy="50" r="32" className="text-amber-400" strokeWidth="8"
                                strokeDasharray={201} strokeDashoffset={201 - (201 * (leetStats.mediumSolved / Math.max(leetStats.totalSolved, 1)))}
                                strokeLinecap="round" stroke="currentColor" fill="transparent" />
                              {/* Hard arc */}
                              <circle cx="50" cy="50" r="24" className="text-rose-400" strokeWidth="8"
                                strokeDasharray={151} strokeDashoffset={151 - (151 * (leetStats.hardSolved / Math.max(leetStats.totalSolved, 1)))}
                                strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-extrabold text-white">{leetStats.totalSolved}</span>
                              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Solved</span>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Overall Progress</p>
                            <div className="flex items-center gap-2">
                              <h3 className="text-xl font-extrabold tracking-tight">LeetCode Statistics</h3>
                              <a
                                href={getLeetCodeProfileUrl(student.leetCodeUsername)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-1 px-2.5 rounded-lg border border-white/10 transition-all"
                                title="View LeetCode Profile"
                              >
                                <span>@{student.leetCodeUsername}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                            <p className="text-xs text-white/60 mt-1 font-medium">
                              {leetStats.ranking > 0 ? `Global Rank: #${leetStats.ranking.toLocaleString()}` : "Keep solving to rank up!"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metric Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                      {/* Easy Card */}
                      <div className="group relative bg-white border border-emerald-250 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-emerald-500/[0.06] transition-all duration-400 overflow-hidden cursor-default" style={{ borderColor: "rgba(16,185,129,0.15)" }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Easy</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-1 tracking-tight">{leetStats.easySolved}</p>
                          </div>
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="24" cy="24" r="18" className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="transparent" />
                              <circle cx="24" cy="24" r="18" className="text-emerald-500" strokeWidth="4"
                                strokeDasharray={113} strokeDashoffset={113 - (113 * Math.min(1, leetStats.easySolved / 50))}
                                strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[9px] font-extrabold text-emerald-600">{Math.round((leetStats.easySolved / Math.max(leetStats.totalSolved, 1)) * 100)}%</span>
                          </div>
                        </div>
                        <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, (leetStats.easySolved / 50) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-1.5">Target: {leetStats.easySolved} / 50 problems completed</p>
                      </div>

                      {/* Medium Card */}
                      <div className="group relative bg-white border border-amber-250 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-amber-500/[0.06] transition-all duration-400 overflow-hidden cursor-default" style={{ borderColor: "rgba(245,158,11,0.15)" }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Medium</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-1 tracking-tight">{leetStats.mediumSolved}</p>
                          </div>
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="24" cy="24" r="18" className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="transparent" />
                              <circle cx="24" cy="24" r="18" className="text-amber-500" strokeWidth="4"
                                strokeDasharray={113} strokeDashoffset={113 - (113 * Math.min(1, leetStats.mediumSolved / 30))}
                                strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[9px] font-extrabold text-amber-600">{Math.round((leetStats.mediumSolved / Math.max(leetStats.totalSolved, 1)) * 100)}%</span>
                          </div>
                        </div>
                        <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, (leetStats.mediumSolved / 30) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-1.5">Target: {leetStats.mediumSolved} / 30 problems completed</p>
                      </div>

                      {/* Hard Card */}
                      <div className="group relative bg-white border border-rose-250 rounded-2xl p-5 hover:-translate-y-1 hover:shadow-lg hover:shadow-rose-500/[0.06] transition-all duration-400 overflow-hidden cursor-default" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
                        <div className="relative z-10 flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold text-rose-600 uppercase tracking-widest">Hard</p>
                            <p className="text-3xl font-extrabold text-slate-800 mt-1 tracking-tight">{leetStats.hardSolved}</p>
                          </div>
                          <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                              <circle cx="24" cy="24" r="18" className="text-slate-100" strokeWidth="4" stroke="currentColor" fill="transparent" />
                              <circle cx="24" cy="24" r="18" className="text-rose-500" strokeWidth="4"
                                strokeDasharray={113} strokeDashoffset={113 - (113 * Math.min(1, leetStats.hardSolved / 10))}
                                strokeLinecap="round" stroke="currentColor" fill="transparent" />
                            </svg>
                            <span className="absolute text-[9px] font-extrabold text-rose-600">{Math.round((leetStats.hardSolved / Math.max(leetStats.totalSolved, 1)) * 100)}%</span>
                          </div>
                        </div>
                        <div className="mt-3 w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-rose-400 to-rose-500 rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(100, (leetStats.hardSolved / 10) * 100)}%` }} />
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-1.5">Target: {leetStats.hardSolved} / 10 problems completed</p>
                      </div>

                    </div>

                    {/* Contribution Grid */}
                    <div style={cardStyles} className="!p-0 overflow-hidden">
                      <div className="px-6 pt-5 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(15,23,42,0.06)" }}>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-indigo-550" />
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-805">Activity Calendar</span>
                        </div>
                        <span className="text-[10px] font-medium text-slate-500">{Object.keys(activityMap).length} active days</span>
                      </div>
                      <div className="p-5">
                        <ContributionGrid activityMap={activityMap} />
                      </div>
                    </div>

                    {/* Daily Tip Banner */}
                    <div className="rounded-2xl p-5 flex gap-4 items-start border relative overflow-hidden"
                      style={{ background: "#fff7ed", borderColor: "#ffedd5" }}
                    >
                      <div className="absolute right-[-2%] bottom-[-20%] w-32 h-32 rounded-full bg-orange-300/5 blur-2xl" />
                      <div className="p-2.5 rounded-xl flex-shrink-0" style={{ background: "#ffedd5" }}>
                        <Flame className="w-5 h-5 text-orange-550" />
                      </div>
                      <div className="relative z-10">
                        <h4 className="text-xs font-bold tracking-wide mb-0.5 text-orange-700">Daily Challenge Reminder</h4>
                        <p className="text-xs leading-relaxed font-medium text-orange-800">
                          Solve at least one problem daily on LeetCode to maintain your streak. Your progress syncs automatically.
                        </p>
                      </div>
                    </div>

                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <AlertCircle className="w-6 h-6 text-rose-500" />
                    </div>
                    <h3 className="text-base font-black text-slate-800">Connection Failed</h3>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: "#64748b" }}>
                      {leetError || "We were unable to communicate with LeetCode. Please check your registered username and try again."}
                    </p>
                    <button
                      onClick={() => loadLeetCode(student.leetCodeUsername!, true)}
                      className="mt-6 px-4 py-2 rounded-xl transition-all text-xs font-bold inline-flex items-center gap-1.5"
                      style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.2)", color: "#ea580c" }}
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retry Sync
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── PROFILE DETAILS DRAWER ── */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex justify-end animate-fade-in">
          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
            .animate-slide-in-right {
              animation: slideInRight 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>

          <div className="absolute inset-0" onClick={() => setShowProfileModal(false)} />

          <div className="w-full max-w-[420px] h-full shadow-2xl relative flex flex-col animate-slide-in-right" style={{ background: "#ffffff", borderLeft: "1px solid rgba(99,102,241,0.15)" }}>

            {/* Hero Header */}
            <div className="relative overflow-hidden flex-shrink-0" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)" }}>
              <div className="absolute right-[-8%] top-[-25%] w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
              <div className="absolute left-[20%] bottom-[-15%] w-40 h-40 rounded-full bg-blue-400/10 blur-2xl" />

              <div className="relative z-10 px-7 pt-6 pb-8">
                <div className="flex items-center justify-between mb-6">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-[9px] font-bold tracking-widest uppercase text-indigo-200 border border-white/[0.08]">Student Profile</span>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white/60 hover:text-white border border-white/[0.06] transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-xl shadow-indigo-500/20 ring-2 ring-white/10"
                      style={{ background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)" }}
                    >
                      {initials}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white shadow-sm" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">{student.name}</h3>
                    <p className="text-[11px] font-medium text-indigo-300/80 mt-0.5">{student.registerNumber}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Body Content */}
            <div className="flex-grow overflow-y-auto">
              <div className="px-7 py-6 space-y-6">

                {/* Info Rows */}
                <div className="space-y-1">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Academic Information</p>
                  {[
                    { icon: GraduationCap, label: "Department", value: student.department },
                    ...(student.email ? [{ icon: FileText, label: "Email", value: student.email }] : []),
                    ...(student.leetCodeUsername ? [{ icon: Code2, label: "LeetCode", value: `@${student.leetCodeUsername}`, isLeetCode: true }] : []),
                  ].map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors duration-200 group" style={{ background: "rgba(241,245,249,0.5)" }} onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.05)")} onMouseLeave={e => (e.currentTarget.style.background = "rgba(241,245,249,0.5)")}>
                        <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 transition-colors">
                          <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</p>
                          {item.isLeetCode ? (
                            <a
                              href={getLeetCodeProfileUrl(student.leetCodeUsername)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[13px] font-semibold text-indigo-600 hover:underline flex items-center gap-1"
                            >
                              {item.value}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <p className="text-[13px] font-semibold text-slate-800 truncate">{item.value}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Stats */}
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Performance Overview</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border rounded-2xl p-3.5 text-center group transition-all duration-300" style={{ background: "rgba(241,245,249,0.3)", borderColor: "rgba(99,102,241,0.08)" }}>
                      <p className="text-2xl font-extrabold text-slate-800">{examResults.length}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Tests</p>
                    </div>
                    <div className="border rounded-2xl p-3.5 text-center group transition-all duration-300" style={{ background: "rgba(241,245,249,0.3)", borderColor: "rgba(99,102,241,0.08)" }}>
                      <p className="text-2xl font-extrabold text-indigo-600">{avgExamScore}%</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Avg Score</p>
                    </div>
                    <div className="border rounded-2xl p-3.5 text-center group transition-all duration-300" style={{ background: "rgba(241,245,249,0.3)", borderColor: "rgba(99,102,241,0.08)" }}>
                      <p className="text-2xl font-extrabold text-orange-500">{streak}</p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">Streak</p>
                    </div>
                  </div>
                </div>

                {/* LeetCode Mini Section */}
                {leetStats && (
                  <div>
                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">LeetCode Breakdown</p>
                    <div className="rounded-2xl p-4" style={{ background: "rgba(241,245,249,0.3)", border: "1px solid rgba(99,102,241,0.08)" }}>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-sm font-bold text-slate-700">{leetStats.totalSolved} Total Solved</span>
                        <Code2 className="w-4 h-4 text-orange-550" />
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: "Easy", solved: leetStats.easySolved || 0, target: 50, color: "emerald", barColor: "emerald-500" },
                          { label: "Medium", solved: leetStats.mediumSolved || 0, target: 30, color: "amber", barColor: "amber-500" },
                          { label: "Hard", solved: leetStats.hardSolved || 0, target: 10, color: "rose", barColor: "rose-500" },
                        ].map((item) => (
                          <div key={item.label}>
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className={`font-bold text-${item.color}-600`}>{item.label}</span>
                              <span className="text-slate-500 font-medium">{item.solved}/{item.target}</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full overflow-hidden bg-slate-100">
                              <div className={`h-full rounded-full transition-all duration-700 bg-${item.barColor}`}
                                style={{ width: `${Math.min(100, (item.solved / item.target) * 100)}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity Grid */}
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.15em] mb-3">Activity Calendar</p>
                  <div className="rounded-2xl" style={{ border: "1px solid rgba(99,102,241,0.08)", background: "rgba(255,255,255,0.5)" }}>
                    <ContributionGrid activityMap={activityMap} />
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="px-7 py-4 border-t flex-shrink-0" style={{ borderColor: "rgba(15,23,42,0.06)", background: "#f8fafc" }}>
              <button
                onClick={() => setShowProfileModal(false)}
                className="w-full py-2.5 hover:bg-indigo-700 text-white font-semibold text-[12px] rounded-xl transition-all duration-300 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none", cursor: "pointer" }}
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}


    </div>
  );
}
