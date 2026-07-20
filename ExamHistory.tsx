// @ts-nocheck
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Clock,
  Calendar,
  Code,
  HelpCircle,
  Trophy,
  CheckCircle,
  AlertCircle,
  Loader2,
  BookOpen,
} from "lucide-react";
import { getStudentExamResults } from "../services/api";

interface ExamHistoryProps {
  student: { name: string; registerNumber: string; department?: string };
  onBack: () => void;
}

export default function ExamHistory({ student, onBack }: ExamHistoryProps) {
  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const exams = await getStudentExamResults(student.registerNumber);
      setResults(
        exams.sort(
          (a, b) =>
            new Date(b.submittedAt || b.date).getTime() -
            new Date(a.submittedAt || a.date).getTime(),
        ),
      );
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const card = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "#f0f4f8" }}>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header */}
        <div
          className="flex items-center justify-between mb-5"
          style={{
            ...card,
            background: "#2563eb",
            border: "none",
            padding: "1rem 1.5rem",
          }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-xs font-medium transition-colors text-white/80 hover:text-white"
            >
              <ArrowLeft style={{ width: "0.875rem", height: "0.875rem" }} />
              Back
            </button>
            <div
              style={{
                width: "1px",
                height: "24px",
                background: "rgba(255,255,255,0.2)",
              }}
            />
            <h1 className="text-sm font-bold text-white">Your Exam History</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">{student.name}</p>
            <p className="text-xs font-mono text-white/90">
              {student.registerNumber}
            </p>
          </div>
        </div>

        {/* History List */}
        {isLoading ? (
          <div
            style={{ ...card, padding: "4rem 2rem" }}
            className="text-center"
          >
            <Loader2
              className="w-8 h-8 animate-spin mx-auto mb-3"
              style={{ color: "#2563eb" }}
            />
            <p className="text-sm" style={{ color: "#64748b" }}>
              Loading your past exams...
            </p>
          </div>
        ) : results.length === 0 ? (
          <div
            style={{ ...card, padding: "4rem 2rem" }}
            className="text-center"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
            >
              <BookOpen className="w-7 h-7" style={{ color: "#64748b" }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: "#64748b" }}>
              No Exam History
            </p>
            <p className="text-xs mt-1" style={{ color: "#94a3b8" }}>
              You haven't taken any exams yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {results.map((r, idx) => {
              const total = (r.programmingMarks || 0) + (r.mcqMarks || 0);
              const max = r.maxMarks || 50;
              const pct = (total / max) * 100;
              const d = new Date(r.submittedAt || r.date);

              return (
                <div key={idx} style={{ ...card, padding: "1.25rem" }}>
                  <div
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4"
                    style={{ borderBottom: "1px solid #e2e8f0" }}
                  >
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 mb-1">
                        {r.question || "Unknown Question"}
                      </h3>
                      <div
                        className="flex items-center gap-3 text-xs"
                        style={{ color: "#64748b" }}
                      >
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />{" "}
                          {d.toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />{" "}
                          {d.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {r.malpractice ? (
                        <span
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold"
                          style={{
                            background: "#fef2f2",
                            color: "#dc2626",
                            border: "1px solid #fecaca",
                          }}
                        >
                          <AlertCircle className="w-3.5 h-3.5" /> Malpractice
                        </span>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-black text-slate-800">
                            {total}
                            <span className="text-sm text-slate-500">
                              /{max}
                            </span>
                          </span>
                          <span
                            className="px-2 py-1 rounded text-xs font-bold"
                            style={{
                              background: pct >= 50 ? "#d1fae5" : "#fee2e2",
                              color: pct >= 50 ? "#059669" : "#dc2626",
                            }}
                          >
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: "#f8fafc" }}
                    >
                      <div className="flex items-center gap-2">
                        <Code className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-semibold text-slate-600">
                          Programming
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {r.programmingMarks || 0}/30
                      </span>
                    </div>
                    <div
                      className="flex items-center justify-between p-3 rounded-lg"
                      style={{ background: "#f8fafc" }}
                    >
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-purple-600" />
                        <span className="text-xs font-semibold text-slate-600">
                          MCQ Test
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {r.mcqMarks || 0}/20
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
  );
}

