import React, { useState, useEffect } from "react";
import { Loader2, Mail, CheckCircle2, XCircle, RefreshCw, Trophy, Code2, Clock } from "lucide-react";
import emailjs from "@emailjs/browser";
import { getStudents, Student, getLeetCodeProfileUrl, logLeetCodePresence, getGlobalSetting, setGlobalSetting } from "../services/api";
import { toast } from "sonner";

interface LeetCodeProgress {
  student: Student;
  stats: any | null;
  hasSolvedToday: boolean;
  error?: string;
}

export default function LeetCodeTracker() {
  const [loading, setLoading] = useState(false);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [progressData, setProgressData] = useState<LeetCodeProgress[]>([]);

  // Global Scheduler State (Supabase)
  const [scheduledTime, setScheduledTime] = useState<string>("21:00");
  const [isSchedulerActive, setIsSchedulerActive] = useState<boolean>(false);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);

  // Load settings from Supabase on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsSettingsLoading(true);
      const time = await getGlobalSetting("auto_email_time", "21:00");
      const active = await getGlobalSetting("auto_email_active", "false");
      setScheduledTime(time);
      setIsSchedulerActive(active === "true");
      setIsSettingsLoading(false);
    };
    loadSettings();
  }, []);

  const handleTimeChange = async (newTime: string) => {
    setScheduledTime(newTime);
    await setGlobalSetting("auto_email_time", newTime);
    toast.success("Schedule time updated in database.");
  };

  const handleToggleScheduler = async () => {
    const newState = !isSchedulerActive;
    setIsSchedulerActive(newState);
    await setGlobalSetting("auto_email_active", newState.toString());
    toast.success(newState ? "Cloud scheduler activated!" : "Cloud scheduler stopped.");
  };

  useEffect(() => {
    loadLeetCodeData();
  }, []);

  const loadLeetCodeData = async () => {
    setLoading(true);
    try {
      const allStudents = await getStudents();
      const studentsWithLc = allStudents.filter(s => s.leetCodeUsername);

      const results: any[] = [];
      const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

      for (const student of studentsWithLc) {
        try {
          // Add 600ms delay between requests to avoid rate limiting
          await new Promise((resolve) => setTimeout(resolve, 600));

          const BASE = "https://alfa-leetcode-api.onrender.com";
          const cleaned = encodeURIComponent(student.leetCodeUsername!.trim().replace(/^@/, ""));

          // Read local history for today's activity
          const history = JSON.parse(localStorage.getItem("leetcode_attendance_history") || "{}");
          const localDates: string[] = history[student.registerNumber] || [];
          let hasSolvedToday = localDates.includes(todayStr);

          // Read local cache for total solved to perfectly sync with student dashboard
          let solvedCount = 0;
          const cacheKey = `lc_cache_${cleaned.toLowerCase()}`;
          try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.data && typeof parsed.data.totalSolved === "number") {
                solvedCount = parsed.data.totalSolved;
              }
            }
          } catch { /* ignore cache error */ }

          try {
            // Primary API: Alfa
            const fetchOpts = { cache: "no-store" as RequestCache };
            const [solvedRes, recentRes] = await Promise.all([
              fetch(`${BASE}/${cleaned}/solved?t=${Date.now()}`, fetchOpts),
              fetch(`${BASE}/${cleaned}/acSubmission?limit=10&t=${Date.now()}`, fetchOpts),
            ]);

            if (!solvedRes.ok) throw new Error("Alfa API failed");

            const alfaSolved = (await solvedRes.json()).solvedProblem || 0;
            if (alfaSolved > solvedCount) solvedCount = alfaSolved;

            if (recentRes.ok) {
              try {
                const recentData = await recentRes.json();
                const submissions: any[] = recentData.submission || recentData.data || [];
                const apiHasSolved = submissions.some((sub: any) => {
                  if (!sub.timestamp) return false;
                  const subDate = new Date(Number(sub.timestamp) * 1000).toLocaleDateString('en-CA');
                  return subDate === todayStr;
                });
                if (apiHasSolved) hasSolvedToday = true;
              } catch { /* ignore */ }
            }
          } catch (err) {
            console.warn(`Primary API failed for ${cleaned}, trying fallback...`);
            // Fallback API: Faisal
            const fallbackRes = await fetch(`https://leetcode-api-faisalshohag.vercel.app/${cleaned}?t=${Date.now()}`, { cache: "no-store" });
            if (fallbackRes.ok) {
              const fallbackData = await fallbackRes.json();

              if (fallbackData.errors) {
                // User not found, just gracefully default to 0 instead of throwing an error
                // Do nothing, let it keep the local cache or 0
              } else {
                const faisalSolved = fallbackData.totalSolved || 0;
                if (faisalSolved > solvedCount) solvedCount = faisalSolved;

                const submissions: any[] = fallbackData.recentSubmissions || [];
                const apiHasSolved = submissions.some((sub: any) => {
                  if (!sub.timestamp) return false;
                  const subDate = new Date(Number(sub.timestamp) * 1000).toLocaleDateString('en-CA');
                  return subDate === todayStr;
                });
                if (apiHasSolved) hasSolvedToday = true;
              }
            } else {
              throw new Error("Both APIs failed");
            }
          }

          const stats = { totalSolved: solvedCount };

          if (hasSolvedToday) {
            logLeetCodePresence(student.registerNumber, todayStr);
          }

          results.push({
            status: "fulfilled",
            value: { student, stats, hasSolvedToday }
          });
        } catch (err: any) {
          results.push({
            status: "rejected",
            reason: err
          });
        }
      }

      const finalData: LeetCodeProgress[] = results.map((res, idx) => {
        if (res.status === "fulfilled") {
          return res.value;
        } else {
          return {
            student: studentsWithLc[idx],
            stats: null,
            hasSolvedToday: false,
            error: res.reason?.message || "Failed to fetch"
          };
        }
      });

      setProgressData(finalData);
    } catch (error: any) {
      toast.error("Failed to load LeetCode data: " + error.message);
    } finally {
      setLoading(false);
    }
  };


  const executeSendReminders = async (isAutomated: boolean = false) => {
    if (progressData.length === 0) return;
    
    const slackingStudentsWithEmail = progressData.filter(p => !p.hasSolvedToday && p.student.email);
    const slackingStudentsWithoutEmail = progressData.filter(p => !p.hasSolvedToday && !p.student.email);

    if (slackingStudentsWithEmail.length === 0) {
      if (!isAutomated) {
        if (slackingStudentsWithoutEmail.length > 0) {
          toast.warning(`${slackingStudentsWithoutEmail.length} inactive students have no email linked. Cannot send reminders.`);
        } else {
          toast.info("All students have solved a problem today!");
        }
      }
      return;
    }

    if (!isAutomated) {
      if (!confirm(`Are you sure you want to send reminder emails to ${slackingStudentsWithEmail.length} students?\n\nNote: ${slackingStudentsWithoutEmail.length} inactive students will be skipped because they don't have an email on file.`)) {
        return;
      }
    } else {
      toast.info(`Automated Scheduler: Initiating background email dispatch to ${slackingStudentsWithEmail.length} inactive students...`);
    }

    const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    if (!serviceId || serviceId === "your_emailjs_service_id") {
      toast.error("EmailJS is not configured in .env");
      return;
    }

    setSendingEmails(true);
    let successCount = 0;
    let failCount = 0;

    for (const data of slackingStudentsWithEmail) {
      try {
        await emailjs.send(
          serviceId,
          templateId,
          {
            to_name: data.student.name,
            name: data.student.name,
            user_name: data.student.name,
            to_email: data.student.email,
            email: data.student.email,
            user_email: data.student.email,
            subject: "Daily LeetCode Progress Update",
            message: `Dear ${data.student.name},

We noticed that there have been no new LeetCode submissions recorded for your account (${data.student.leetCodeUsername}) today.

Consistent daily practice is a key component of the curriculum and is essential for developing strong algorithmic problem-solving skills. We strongly encourage you to log in and complete at least one problem today to maintain your active status.

Keep up the hard work!

Best regards,
Department of ${data.student.department || 'Computer Science'}
Academic Administration`,
            leetcode_username: data.student.leetCodeUsername,
          },
          publicKey
        );
        successCount++;
      } catch (err: any) {
        console.error("Failed to send email to", data.student.email, err);
        const errMsg = err?.text || err?.message || JSON.stringify(err);
        window.alert(`EmailJS Error(Student: ${ data.student.name
          }): \n\n${ errMsg } `);
        failCount++;
      }
    }

    setSendingEmails(false);
    if (successCount > 0) toast.success(`Sent ${ successCount } reminders successfully!`);
    if (failCount > 0) toast.error(`Failed to send ${ failCount } reminders.`);
  };

  const handleSendReminders = () => executeSendReminders(false);

  return (
    <div className="rounded-2xl p-6 mt-6 backdrop-blur-xl animate-fade-in" style={{ background: "rgba(255, 255, 255, 0.75)", border: "1px solid rgba(99, 102, 241, 0.08)" }}>
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
            <Code2 className="w-6 h-6 text-orange-500" />
            LeetCode Daily Attendance
          </h2>
          <p className="text-sm mt-1" style={{ color: "#475569" }}>Track which students have solved at least one problem today.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadLeetCodeData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors disabled:opacity-50 text-slate-650 hover:text-slate-800 font-semibold"
            style={{ background: "#ffffff", border: "1px solid #cbd5e1" }}
          >
            <RefreshCw className={`w - 4 h - 4 ${ loading ? 'animate-spin' : '' } `} /> Refresh
          </button>
          <button
            onClick={handleSendReminders}
            disabled={loading || sendingEmails || progressData.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-sm"
            style={{ background: "linear-gradient(135deg,#e11d48,#be123c)", border: "none" }}
          >
            {sendingEmails ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            Send Alerts to Inactive Students
          </button>
        </div>
      </div>
      
      {/* Scheduler UI */}
      <div className="mb-6 p-4 rounded-xl flex flex-wrap items-center gap-4 bg-orange-50/50 border border-orange-100">
        <div className="flex items-center gap-2 text-orange-700 font-semibold">
          <Clock className="w-4 h-4" />
          <span>Automated Daily Reminders</span>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="time" 
            className="px-3 py-1.5 rounded-lg border border-orange-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
            value={scheduledTime}
            onChange={(e) => handleTimeChange(e.target.value)}
            disabled={isSchedulerActive || isSettingsLoading}
          />
          <button 
            onClick={handleToggleScheduler}
            disabled={isSettingsLoading}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-50 ${isSchedulerActive ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'}`}
          >
            {isSchedulerActive ? 'Active (Click to Stop)' : 'Start Cloud Scheduler'}
          </button>
        </div>
        {isSchedulerActive && (
          <p className="text-xs text-orange-600 w-full mt-1">
            <span className="font-bold">✅ Cloud Scheduler Active:</span> Emails will be dispatched automatically at {scheduledTime} by the GitHub Actions background engine, even if this browser tab is closed or your computer is offline.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
          <p className="font-medium text-slate-500">Fetching live stats from LeetCode...</p>
        </div>
      ) : progressData.length === 0 ? (
        <div className="text-center py-12">
          <Code2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="font-medium text-slate-550">No students have linked their LeetCode accounts yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: "#f1f5f9", borderBottom: "1px solid rgba(15,23,42,0.05)" }}>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#4f46e5" }}>Student</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#4f46e5" }}>LeetCode</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#4f46e5" }}>Total Solved</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider" style={{ color: "#4f46e5" }}>Today's Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "rgba(15,23,42,0.05)" }}>
              {progressData.map((data, idx) => (
                <tr key={idx} className="transition-colors hover:bg-indigo-50/20">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-slate-800">{data.student.name}</p>
                    <p className="text-xs font-mono" style={{ color: "#64748b" }}>{data.student.registerNumber}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <a href={getLeetCodeProfileUrl(data.student.leetCodeUsername)} target="_blank" rel="noreferrer" className="hover:underline" style={{ color: "#4f46e5" }}>
                      View Profile
                    </a>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {data.stats ? (
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-slate-700">
                        <Trophy className="w-4 h-4 text-orange-500" />
                        {data.stats.totalSolved}
                      </span>
                    ) : (
                      <span 
                        className="text-xs text-red-500 font-semibold cursor-help" 
                        title={data.error || "Could not fetch stats from LeetCode"}
                      >
                        Error fetching ⓘ
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {data.hasSolvedToday ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(16,185,129,0.1)", color: "#059669", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active Today
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "rgba(239,68,68,0.1)", color: "#dc2626", border: "1px solid rgba(239,68,68,0.2)" }}>
                        <XCircle className="w-3.5 h-3.5" /> Not Active
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
