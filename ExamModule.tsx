// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import {
  Clock,
  AlertCircle,
  Code,
  FileText,
  HelpCircle,
  ArrowLeft,
  Send,
  Play,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  executeCode,
  getLanguageName,
  getCodeTemplate,
} from "../services/codeExecutor";
import { submitExamResult, getStudentExamResults } from "../services/api";
import { toast } from "sonner";

interface ExamModuleProps {
  student: { name: string; registerNumber: string; department?: string; leetCodeUsername?: string; };
  question: any;
  onComplete: (results: any) => void;
  onBack: () => void;
}

type Section = "programming" | "mcq";

export default function ExamModule({
  student,
  question,
  onComplete,
  onBack,
}: ExamModuleProps) {
  const [currentSection, setCurrentSection] = useState<Section>("programming");
  const [timeRemaining, setTimeRemaining] = useState(60 * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTerminated, setIsTerminated] = useState(false);

  // Programming section
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    question.language || "javascript",
  );
  const [code, setCode] = useState("");
  const [codeOutput, setCodeOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionError, setExecutionError] = useState("");
  const [outputMatches, setOutputMatches] = useState<boolean | null>(null);

  // MCQ section
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, number>>({});

  const mcqQuestions = question.vivas || question.mcqs || [];
  const validQuestions = mcqQuestions.filter((q: any) => q.question);
  const isMCQComplete =
    Object.keys(mcqAnswers).length === validQuestions.length;
  const isProgrammingComplete = code.trim().length > 0;
  const isExamComplete = isProgrammingComplete && isMCQComplete;

  useEffect(() => {
    // Request fullscreen on mount for safe browser mode
    const requestFS = async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen request failed", err);
      }
    };
    requestFS();

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden && !isTerminated && !isSubmitting) {
        setIsTerminated(true);
        // Immediately terminate exam on tab switch
        const malpracticeResult = {
          student: {
            name: student.name,
            registerNumber: student.registerNumber,
            department: student.department || "Unknown",
          },
          question: question.title,
          questionId: question.id,
          programmingMarks: 0,
          mcqMarks: 0,
          totalMarks: 0,
          maxMarks: 50,
          code,
          codeOutput,
          outputMatches: false,
          mcqAnswers,
          timeSpent: 60 * 60 - timeRemaining,
          malpractice: true,
          malpracticeReason: "Tab switching detected - Exam terminated",
        };

        try {
          await submitExamResult(malpracticeResult);
        } catch (error) {
          console.error("Failed to submit malpractice result:", error);
        }

        // Clear current student session
        localStorage.removeItem("currentStudent");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [code, codeOutput, timeRemaining, question, student, outputMatches]);

  // Terminate exam if student exits fullscreen (Esc key or browser UI)
  useEffect(() => {
    const handleFullscreenChange = async () => {
      // If fullscreen was exited (no fullscreenElement), terminate as malpractice
      if (!document.fullscreenElement && !isTerminated && !isSubmitting) {
        setIsTerminated(true);
        const malpracticeResult = {
          student: {
            name: student.name,
            registerNumber: student.registerNumber,
            department: student.department || "Unknown",
          },
          question: question.title,
          questionId: question.id,
          programmingMarks: 0,
          mcqMarks: 0,
          totalMarks: 0,
          maxMarks: 50,
          code,
          codeOutput,
          outputMatches: false,
          mcqAnswers,
          timeSpent: 60 * 60 - timeRemaining,
          malpractice: true,
          malpracticeReason: "Fullscreen exited - Exam terminated",
        };

        try {
          await submitExamResult(malpracticeResult);
        } catch (error) {
          console.error("Failed to submit malpractice result:", error);
        }

        localStorage.removeItem("currentStudent");
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [
    code,
    codeOutput,
    timeRemaining,
    question,
    student,
    outputMatches,
    mcqAnswers,
  ]);

  // Block copy/right-click on entire exam page to prevent question copying to AI tools
  useEffect(() => {
    const blockCopy = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      // Block Escape key to prevent fullscreen exit attempt
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        toast.warning("⚠️ Exiting fullscreen will terminate your exam!");
        return;
      }
      // Block Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+U (view source)
      if (
        e.ctrlKey &&
        (key === "c" || key === "a" || key === "x" || key === "u")
      ) {
        // Allow Ctrl+A only inside the textarea (code editor)
        const active = document.activeElement;
        const isTextarea = active && active.tagName === "TEXTAREA";
        if (key === "a" && isTextarea) return; // allow select-all inside code editor
        e.preventDefault();
        e.stopPropagation();
        if (key === "c")
          toast.warning("❌ Copying is disabled during the exam.");
      }
    };

    const blockRightClick = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Disable text selection on document level (except textarea)
    const blockSelect = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      e.preventDefault();
    };

    document.addEventListener("keydown", blockCopy, true);
    document.addEventListener("contextmenu", blockRightClick, true);
    document.addEventListener("selectstart", blockSelect, true);

    return () => {
      document.removeEventListener("keydown", blockCopy, true);
      document.removeEventListener("contextmenu", blockRightClick, true);
      document.removeEventListener("selectstart", blockSelect, true);
    };
  }, []);

  const handleExecuteCode = async () => {
    setIsExecuting(true);
    setExecutionError("");
    setCodeOutput("");
    setOutputMatches(null);

    try {
      const result = await executeCode(code, selectedLanguage);

      if (result.success) {
        setCodeOutput(result.output);

        // Check if output matches expected
        if (question.expectedOutput) {
          const match = result.output.trim() === question.expectedOutput.trim();
          setOutputMatches(match);
        }
      } else {
        setExecutionError(result.error || "Execution failed");
      }
    } catch (error: any) {
      setExecutionError(error.message);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAutoSubmit = () => {
    submitExam();
  };

  const submitExam = async () => {
    setIsSubmitting(true);
    try {
      // STRICT LIMIT: Verify against DB that student hasn't submitted today
      const pastResults = await getStudentExamResults(student.registerNumber);
      const getLocalDateString = (dObj: Date) => {
        const y = dObj.getFullYear();
        const m = String(dObj.getMonth() + 1).padStart(2, "0");
        const d = String(dObj.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      };
      const localToday = getLocalDateString(new Date());
      const hasSubmitted = pastResults.some(r => r.submittedAt && getLocalDateString(new Date(r.submittedAt)) === localToday);
      
      if (hasSubmitted) {
        toast.error("Security Alert: You have already submitted an exam today. Multiple submissions are strictly denied.");
        setIsSubmitting(false);
        setIsTerminated(true);
        localStorage.removeItem("currentStudent");
        window.location.reload();
        return;
      }

      // Calculate MCQ marks (2 marks each)
      const mcqQuestions = question.vivas || question.mcqs || [];
      const mcqScore = mcqQuestions.reduce((score: number, mcq: any) => {
        return mcqAnswers[mcq.id] === mcq.correctAnswer ? score + 2 : score;
      }, 0);

      // Programming marks (auto 30 if output matches, else needs manual review)
      const programmingMarks = outputMatches ? 30 : 0;

      const results = {
        student: {
          name: student.name,
          registerNumber: student.registerNumber,
          department: student.department || "Unknown",
          leetCodeUsername: student.leetCodeUsername,
        },
        question: question.title,
        questionId: question.id,
        programmingMarks,
        mcqMarks: mcqScore,
        totalMarks: programmingMarks + mcqScore,
        maxMarks: 50,
        code,
        codeOutput,
        outputMatches: !!outputMatches,
        mcqAnswers,
        timeSpent: 60 * 60 - timeRemaining,
        malpractice: false,
      };

      await submitExamResult(results);
      toast.success("Exam submitted successfully!");

      onComplete({
        ...results,
        questionId: question.id,
        language: selectedLanguage,
        submittedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      toast.error("Failed to submit exam: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (isTerminated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0f172a" }}>
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-8 text-center shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">EXAM TERMINATED</h2>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Tab switching or exiting fullscreen is strictly prohibited. Your exam has been marked as <strong className="text-red-400">MALPRACTICE</strong> and terminated.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  const card = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  return (
    <div
      className="min-h-screen p-4 md:p-6"
      style={{
        background: "#f0f4f8",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between mb-5 animate-fade-in"
          style={{
            ...card,
            background: "#2563eb",
            border: "none",
            padding: "1rem 1.5rem",
          }}
        >
          <div>
            <h2 className="text-base font-bold text-white">{question.title}</h2>
            <p
              className="text-xs mt-0.5 text-blue-100"
              style={{ fontFamily: "monospace" }}
            >
              {student.name} · {student.registerNumber}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
              style={{
                background:
                  timeRemaining < 300
                    ? "rgba(239,68,68,0.9)"
                    : "rgba(255,255,255,0.2)",
                border: `1px solid ${timeRemaining < 300 ? "#fca5a5" : "rgba(255,255,255,0.3)"}`,
                animation: timeRemaining < 300 ? "pulse 1s infinite" : "none",
              }}
            >
              <Clock className="w-4 h-4" style={{ color: "#ffffff" }} />
              <span
                className="font-mono font-bold text-sm"
                style={{ color: "#ffffff" }}
              >
                {formatTime(timeRemaining)}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{
                background: "rgba(239,68,68,0.9)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#ffffff",
              }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              Tab switch / Exit fullscreen = Terminated
            </div>
          </div>
        </div>

        {/* ── Section Tabs ── */}
        <div className="flex gap-2 mb-5">
          {(
            [
              ["programming", "Programming", "30 marks"],
              ["mcq", "MCQ", "20 marks"],
            ] as const
          ).map(([sec, label, marks]) => (
            <button
              key={sec}
              onClick={() => setCurrentSection(sec)}
              style={{
                flex: 1,
                padding: "0.7rem 1rem",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
                background:
                  currentSection === sec ? "rgba(37,99,235,0.1)" : "#ffffff",
                border: `1px solid ${currentSection === sec ? "rgba(37,99,235,0.3)" : "#e2e8f0"}`,
                color: currentSection === sec ? "#1d4ed8" : "#64748b",
                transition: "all 0.2s ease",
              }}
            >
              {sec === "programming" ? (
                <Code style={{ width: "1rem", height: "1rem" }} />
              ) : (
                <HelpCircle style={{ width: "1rem", height: "1rem" }} />
              )}
              {label}
              <span
                style={{
                  padding: "0.1rem 0.5rem",
                  borderRadius: "999px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  background:
                    currentSection === sec ? "rgba(37,99,235,0.15)" : "#f1f5f9",
                  color: currentSection === sec ? "#1d4ed8" : "#94a3b8",
                }}
              >
                {marks}
              </span>
            </button>
          ))}
        </div>

        {/* ── Section Content ── */}
        {currentSection === "programming" && (
          <ProgrammingSection
            question={question}
            code={code}
            setCode={setCode}
            codeOutput={codeOutput}
            isExecuting={isExecuting}
            executionError={executionError}
            outputMatches={outputMatches}
            onExecute={handleExecuteCode}
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
          />
        )}
        {currentSection === "mcq" && (
          <MCQSection
            questions={question.vivas || question.mcqs || []}
            answers={mcqAnswers}
            onAnswerChange={setMcqAnswers}
          />
        )}

        {/* ── Submit ── */}
        <div
          className="mt-5 animate-fade-in"
          style={{ ...card, padding: "1.25rem 1.5rem" }}
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="text-xs font-semibold mb-1.5"
                style={{ color: "#64748b" }}
              >
                Completion Status
              </p>
              <div className="flex items-center gap-4">
                <div
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{
                    color: isProgrammingComplete ? "#10b981" : "#f59e0b",
                  }}
                >
                  {isProgrammingComplete ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  Programming {isProgrammingComplete ? "✓" : "(pending)"}
                </div>
                <div
                  className="flex items-center gap-1.5 text-xs font-medium"
                  style={{ color: isMCQComplete ? "#10b981" : "#f59e0b" }}
                >
                  {isMCQComplete ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  MCQ {Object.keys(mcqAnswers).length}/{validQuestions.length}{" "}
                  {isMCQComplete ? "✓" : "(pending)"}
                </div>
              </div>
            </div>
            <button
              onClick={submitExam}
              disabled={isSubmitting || !isExamComplete}
              style={{
                padding: "0.75rem 2rem",
                borderRadius: "10px",
                fontWeight: 700,
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor:
                  isSubmitting || !isExamComplete ? "not-allowed" : "pointer",
                background:
                  isSubmitting || !isExamComplete
                    ? "#f1f5f9"
                    : "linear-gradient(135deg, #059669, #10b981)",
                border: `1px solid ${isSubmitting || !isExamComplete ? "#e2e8f0" : "rgba(16,185,129,0.3)"}`,
                color: isSubmitting || !isExamComplete ? "#94a3b8" : "#fff",
                boxShadow:
                  isSubmitting || !isExamComplete
                    ? "none"
                    : "0 4px 14px rgba(16,185,129,0.25)",
                transition: "all 0.2s ease",
              }}
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isSubmitting ? "Submitting..." : "Submit Exam"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Programming Section Component
function ProgrammingSection({
  question,
  code,
  setCode,
  codeOutput,
  isExecuting,
  executionError,
  outputMatches,
  onExecute,
  selectedLanguage,
  setSelectedLanguage,
}: any) {
  const prevLengthRef = useRef<number>(code.length);

  // Detect paste: if characters added in one event > 5, it's likely a paste
  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const added = newVal.length - prevLengthRef.current;
    if (added > 5) {
      // Revert to previous value and warn
      e.target.value = code;
      toast.warning(
        "❌ Pasting is not allowed during the exam. Please type your code manually.",
      );
      return;
    }
    prevLengthRef.current = newVal.length;
    setCode(newVal);
  };

  const card = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };
  return (
    <div style={{ ...card, padding: "1.5rem" }} className="animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Programming Section
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: "#64748b" }}>
              Language:
            </span>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="text-xs px-2 py-1 rounded outline-none cursor-pointer"
              style={{
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                color: "#2563eb",
              }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>
        <button
          onClick={onExecute}
          disabled={isExecuting || !code}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 1.1rem",
            borderRadius: "8px",
            fontWeight: 600,
            fontSize: "0.8rem",
            cursor: isExecuting || !code ? "not-allowed" : "pointer",
            background:
              isExecuting || !code ? "#f1f5f9" : "rgba(16,185,129,0.1)",
            border: `1px solid ${isExecuting || !code ? "#e2e8f0" : "rgba(16,185,129,0.25)"}`,
            color: isExecuting || !code ? "#94a3b8" : "#059669",
            transition: "all 0.2s",
          }}
        >
          <Play style={{ width: "0.875rem", height: "0.875rem" }} />
          {isExecuting ? "Running..." : "Run Code"}
        </button>
      </div>

      {/* Problem statement - copy protected */}
      <div
        className="rounded-xl p-4 mb-4"
        style={{
          background: "rgba(37,99,235,0.08)",
          border: "1px solid rgba(99,102,241,0.15)",
          userSelect: "none",
          WebkitUserSelect: "none",
          MozUserSelect: "none",
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <p
          className="text-xs font-bold uppercase tracking-wider mb-2"
          style={{ color: "#2563eb" }}
        >
          Problem Statement
        </p>
        <p className="text-sm leading-relaxed text-slate-700">
          {question.description}
        </p>
        {question.expectedOutput && (
          <p className="text-xs mt-2" style={{ color: "#64748b" }}>
            Expected:{" "}
            <code
              style={{
                background: "rgba(37,99,235,0.1)",
                padding: "0.1rem 0.4rem",
                borderRadius: "4px",
                color: "#1d4ed8",
              }}
            >
              {question.expectedOutput}
            </code>
          </p>
        )}
      </div>

      {/* Code editor */}
      <textarea
        value={code}
        onChange={handleCodeChange}
        placeholder={getCodeTemplate(selectedLanguage)}
        spellCheck={false}
        onCopy={(e) => e.preventDefault()}
        onPaste={(e) => {
          e.preventDefault();
          toast.warning(
            "❌ Pasting is not allowed during the exam. Please type your code manually.",
          );
        }}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          toast.warning("❌ Drag & drop is not allowed during the exam.");
        }}
        onDragOver={(e) => e.preventDefault()}
        style={{
          width: "100%",
          height: "26rem",
          padding: "1rem",
          borderRadius: "10px",
          background: "#090d16",
          border: "1px solid rgba(99,102,241,0.2)",
          color: "#86efac",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          lineHeight: 1.7,
          outline: "none",
          resize: "vertical",
          transition: "border-color 0.2s",
          userSelect: "text",
          WebkitUserSelect: "text",
        }}
        onFocus={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.4)")}
        onBlur={(e) => (e.target.style.borderColor = "rgba(99,102,241,0.2)")}
      />

      {/* Output */}
      {(codeOutput || executionError) && (
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Output
            </p>
            {outputMatches !== null && (
              <span
                className="flex items-center gap-1 text-xs font-semibold"
                style={{
                  color: outputMatches ? "#059669" : "#dc2626",
                }}
              >
                {outputMatches ? (
                  <>
                    <CheckCircle
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />{" "}
                    Correct!
                  </>
                ) : (
                  <>
                    <XCircle
                      style={{ width: "0.875rem", height: "0.875rem" }}
                    />{" "}
                    Doesn't match
                  </>
                )}
              </span>
            )}
          </div>
          {executionError ? (
            <div
              style={{
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.15)",
                borderRadius: "10px",
                padding: "0.875rem",
              }}
            >
              <p
                style={{
                  color: "#fca5a5",
                  fontFamily: "monospace",
                  fontSize: "0.78rem",
                }}
              >
                {executionError}
              </p>
            </div>
          ) : (
            <div
              style={{
                background: "#090d16",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "10px",
                padding: "0.875rem",
                fontFamily: "monospace",
                fontSize: "0.8rem",
                color: "#86efac",
                whiteSpace: "pre-wrap",
              }}
            >
              {codeOutput || "(no output)"}
            </div>
          )}
        </div>
      )}

      <div
        className="mt-4 rounded-xl p-3 text-xs"
        style={{
          background: "rgba(245,158,11,0.1)",
          border: "1px solid rgba(245,158,11,0.2)",
          color: "#b45309",
        }}
      >
        💡 Write clean code. Use "Run Code" to test before submitting — matching
        output gives full programming marks.
      </div>
    </div>
  );
}

// MCQ Section Component
function MCQSection({ questions, answers, onAnswerChange }: any) {
  const answeredCount = Object.keys(answers).length;
  const validQuestions = questions.filter((q: any) => q.question);
  const card = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  };

  return (
    <div style={{ ...card, padding: "1.5rem" }} className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Multiple Choice Questions
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
            2 marks each · 20 marks total
          </p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{
            background:
              answeredCount === validQuestions.length &&
              validQuestions.length > 0
                ? "rgba(16,185,129,0.1)"
                : "#f1f5f9",
            border: `1px solid ${answeredCount === validQuestions.length && validQuestions.length > 0 ? "rgba(16,185,129,0.2)" : "#e2e8f0"}`,
          }}
        >
          <span
            className="text-xs font-bold"
            style={{
              color:
                answeredCount === validQuestions.length &&
                validQuestions.length > 0
                  ? "#059669"
                  : "#64748b",
            }}
          >
            {answeredCount} / {validQuestions.length} Answered
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {validQuestions.map((q: any, idx: number) => {
          const isAnswered = answers[q.id] !== undefined;
          return (
            <div
              key={q.id}
              style={{
                background: isAnswered ? "rgba(16,185,129,0.08)" : "#ffffff",
                border: `1px solid ${isAnswered ? "rgba(16,185,129,0.25)" : "#e2e8f0"}`,
                borderRadius: "12px",
                padding: "1.1rem",
                transition: "all 0.2s",
              }}
            >
              <div className="flex gap-3 mb-3">
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: isAnswered
                      ? "rgba(16,185,129,0.15)"
                      : "rgba(37,99,235,0.1)",
                    color: isAnswered ? "#059669" : "#1d4ed8",
                    border: `1px solid ${isAnswered ? "rgba(16,185,129,0.25)" : "rgba(37,99,235,0.2)"}`,
                  }}
                >
                  {idx + 1}
                </span>
                <p className="flex-1 text-sm font-semibold text-slate-800 leading-relaxed">
                  {q.question}
                </p>
              </div>
              <div className="ml-9 space-y-2">
                {q.options.map((option: string, optIdx: number) => {
                  const isSelected = answers[q.id] === optIdx;
                  return (
                    <label
                      key={optIdx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                        padding: "0.6rem 0.875rem",
                        borderRadius: "8px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background: isSelected
                          ? "rgba(37,99,235,0.1)"
                          : "#f8fafc",
                        border: `1px solid ${isSelected ? "rgba(37,99,235,0.4)" : "#cbd5e1"}`,
                        color: isSelected ? "#1d4ed8" : "#475569",
                      }}
                    >
                      <input
                        type="radio"
                        name={`mcq-${q.id}`}
                        checked={isSelected}
                        onChange={() =>
                          onAnswerChange({ ...answers, [q.id]: optIdx })
                        }
                        style={{
                          accentcolor: "#2563eb",
                          width: "0.9rem",
                          height: "0.9rem",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: "0.825rem",
                          fontWeight: isSelected ? 600 : 400,
                        }}
                      >
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

