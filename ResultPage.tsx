// @ts-nocheck
import {
  Code,
  FileText,
  HelpCircle,
  Trophy,
  Download,
  LogOut,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface ResultPageProps {
  student: { name: string; registerNumber: string; department?: string };
  results: {
    question: string;
    language?: string;
    programmingMarks: number;
    mcqMarks: number;
    totalMarks: number;
    maxMarks: number;
    code: string;
    codeOutput: string;
    outputMatches: boolean | null;
    timeSpent: number;
    malpractice?: boolean;
    malpracticeReason?: string;
  };
  onBackToDashboard: () => void;
}

export default function ResultPage({
  student,
  results,
  onBackToDashboard,
}: ResultPageProps) {
  const percentage = (results.totalMarks / results.maxMarks) * 100;
  const grade = getGrade(percentage);

  const downloadPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 99, 235); // Blue color for brand
    doc.text("SSCET LAB EXAMINATION REPORT", pageWidth / 2, 20, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);

    // Student Information
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Student Details`, 20, 35);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${student.name}`, 20, 42);
    doc.text(`Register Number: ${student.registerNumber}`, 20, 49);
    doc.text(`Department: ${student.department || "N/A"}`, 20, 56);
    doc.text(`Question: ${results.question}`, 20, 63);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 70);

    // Marks Summary Table
    autoTable(doc, {
      startY: 80,
      head: [["Section", "Marks Obtained", "Maximum Marks"]],
      body: [
        ["Programming", results.programmingMarks.toString(), "30"],
        ["MCQ Test", results.mcqMarks.toString(), "20"],
        ["TOTAL", results.totalMarks.toString(), results.maxMarks.toString()],
      ],
      theme: "grid",
      headStyles: { fillColor: [79, 70, 229] },
      footStyles: {
        fillColor: [229, 231, 235],
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      foot: [
        ["TOTAL", results.totalMarks.toString(), results.maxMarks.toString()],
      ],
    });

    let yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Performance Summary
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Performance Summary", 20, yPosition);
    yPosition += 10;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Percentage: ${percentage.toFixed(2)}%`, 20, yPosition);
    yPosition += 7;
    doc.text(`Grade: ${grade}`, 20, yPosition);
    yPosition += 7;
    doc.text(
      `Time Spent: ${Math.floor(results.timeSpent / 60)} minutes`,
      20,
      yPosition,
    );
    yPosition += 7;
    doc.text(`Tab Switches: ${results.tabSwitches}`, 20, yPosition);
    yPosition += 15;

    // Code Section
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Submitted Code:", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    const codeLines = doc.splitTextToSize(
      results.code || "No code submitted",
      pageWidth - 40,
    );

    // Check if we need a new page
    if (
      yPosition + codeLines.length * 5 >
      doc.internal.pageSize.getHeight() - 20
    ) {
      doc.addPage();
      yPosition = 20;
    }

    doc.text(codeLines, 20, yPosition);
    yPosition += codeLines.length * 5 + 10;

    // Output Section
    if (yPosition > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Code Output:", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont("courier", "normal");
    const outputLines = doc.splitTextToSize(
      results.codeOutput || "No output generated",
      pageWidth - 40,
    );
    doc.text(outputLines, 20, yPosition);
    yPosition += outputLines.length * 5 + 10;

    // Output Match Status
    if (results.outputMatches !== null) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(
        results.outputMatches ? 0 : 255,
        results.outputMatches ? 128 : 0,
        0,
      );
      doc.text(
        results.outputMatches ? "✓ Output Correct" : "✗ Output Incorrect",
        20,
        yPosition,
      );
      doc.setTextColor(0, 0, 0);
      yPosition += 10;
    }

    // Result Generation Section
    if (yPosition > doc.internal.pageSize.getHeight() - 60) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Result Generation:", 20, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(
      results.observation || "No result generation details provided",
      pageWidth - 40,
    );
    doc.text(obsLines, 20, yPosition);

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${i} of ${totalPages} | Generated on ${new Date().toLocaleString()}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" },
      );
    }

    // Save PDF
    doc.save(`${student.registerNumber}_Exam_Result.pdf`);
  };

  const card = {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    boxShadow:
      "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
  };

  return (
    <div className="min-h-screen p-4 md:p-6" style={{ background: "#f0f4f8" }}>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* ── Banner ── */}
        {results.malpractice ? (
          <div
            className="rounded-2xl p-6 mb-5"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(239,68,68,0.15)" }}
              >
                <AlertCircle className="w-6 h-6" style={{ color: "#fca5a5" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: "#fca5a5" }}>
                  ⚠ EXAM TERMINATED — MALPRACTICE
                </h1>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "rgba(252,165,165,0.6)" }}
                >
                  {results.malpracticeReason || "Exam rules violated"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div
            className="rounded-2xl p-6 mb-5"
            style={{
              background: "rgba(16,185,129,0.06)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#d1fae5" }}
              >
                <CheckCircle className="w-6 h-6" style={{ color: "#059669" }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-800">
                  Exam Completed Successfully!
                </h1>
                <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
                  Your results have been saved to the database
                </p>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <div className="text-right">
                  <p
                    className="text-xs font-medium uppercase tracking-wider mb-0.5"
                    style={{ color: "#059669" }}
                  >
                    Total Score
                  </p>
                  <p
                    className="text-3xl font-black"
                    style={{ color: "#047857" }}
                  >
                    {results.totalMarks}
                    <span
                      className="text-lg font-semibold"
                      style={{ color: "#10b981" }}
                    >
                      /{results.maxMarks}
                    </span>
                  </p>
                </div>
                <div className="hidden md:block">
                  <Trophy className="w-12 h-12" style={{ color: "#fbbf24" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Student Info ── */}
        <div style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#64748b" }}
          >
            Student Information
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { label: "Full Name", val: student.name, mono: false },
              {
                label: "Register Number",
                val: student.registerNumber,
                mono: true,
              },
              { label: "Question", val: results.question, mono: false },
              {
                label: "Submitted At",
                val: new Date().toLocaleString(),
                mono: false,
              },
            ].map(({ label, val, mono }) => (
              <div key={label}>
                <p className="text-xs mb-0.5" style={{ color: "#94a3b8" }}>
                  {label}
                </p>
                <p
                  className="text-sm font-semibold text-slate-800"
                  style={{
                    fontFamily: mono ? "monospace" : undefined,
                    letterSpacing: mono ? "0.05em" : undefined,
                  }}
                >
                  {val}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Score Cards ── */}
        <div className="grid md:grid-cols-3 gap-4 mb-5">
          {/* Programming */}
          <div style={{ ...card, padding: "1.25rem", gridColumn: "span 1" }}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#eff6ff" }}
              >
                <Code className="w-4 h-4" style={{ color: "#2563eb" }} />
              </div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#64748b" }}
              >
                Programming
              </p>
            </div>
            <p className="text-3xl font-black text-slate-800 mb-2">
              {results.programmingMarks}
              <span
                className="text-base font-semibold"
                style={{ color: "#94a3b8" }}
              >
                /30
              </span>
            </p>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "#e2e8f0" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(results.programmingMarks / 30) * 100}%`,
                  background: "linear-gradient(90deg, #3b82f6, #2563eb)",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
            {results.outputMatches !== null && (
              <p
                className="text-xs mt-2 font-medium"
                style={{ color: results.outputMatches ? "#059669" : "#dc2626" }}
              >
                {results.outputMatches
                  ? "✓ Output Verified"
                  : "✗ Output Mismatch"}
              </p>
            )}
          </div>

          {/* MCQ */}
          <div style={{ ...card, padding: "1.25rem" }}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#faf5ff" }}
              >
                <HelpCircle className="w-4 h-4" style={{ color: "#9333ea" }} />
              </div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#64748b" }}
              >
                MCQ Test
              </p>
            </div>
            <p className="text-3xl font-black text-slate-800 mb-2">
              {results.mcqMarks}
              <span
                className="text-base font-semibold"
                style={{ color: "#94a3b8" }}
              >
                /20
              </span>
            </p>
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: "#e2e8f0" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${(results.mcqMarks / 20) * 100}%`,
                  background: "linear-gradient(90deg, #9333ea, #7e22ce)",
                  transition: "width 0.8s ease",
                }}
              />
            </div>
          </div>

          {/* Grade */}
          <div
            style={{
              ...card,
              padding: "1.25rem",
              background:
                percentage >= 70
                  ? "#f0fdf4"
                  : percentage >= 50
                    ? "#fffbeb"
                    : "#fef2f2",
              borderColor:
                percentage >= 70
                  ? "#bbf7d0"
                  : percentage >= 50
                    ? "#fde68a"
                    : "#fecaca",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "#fef3c7" }}
              >
                <Trophy className="w-4 h-4" style={{ color: "#d97706" }} />
              </div>
              <p
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#64748b" }}
              >
                Final Grade
              </p>
            </div>
            <div className="flex items-end gap-3">
              <p
                className="text-3xl font-black"
                style={{
                  color:
                    percentage >= 70
                      ? "#059669"
                      : percentage >= 50
                        ? "#d97706"
                        : "#dc2626",
                }}
              >
                {grade}
              </p>
              <p
                className="text-lg font-bold mb-0.5"
                style={{ color: "#64748b" }}
              >
                {percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* ── Code Preview ── */}
        <div style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#64748b" }}
          >
            Submitted Code
          </p>
          <pre
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              padding: "1rem",
              color: "#1e293b",
              fontFamily: "monospace",
              fontSize: "0.75rem",
              lineHeight: 1.7,
              overflowX: "auto",
              maxHeight: "16rem",
              overflowY: "auto",
            }}
          >
            <code>{results.code || "No code submitted"}</code>
          </pre>
        </div>

        {/* ── Exam Details ── */}
        <div style={{ ...card, padding: "1.25rem", marginBottom: "1.25rem" }}>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#64748b" }}
          >
            Exam Details
          </p>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              {
                label: "Time Spent",
                val: `${Math.floor(results.timeSpent / 60)} minutes`,
              },
              {
                label: "Status",
                val: results.malpractice ? "MALPRACTICE" : "COMPLETED",
                warn: results.malpractice,
              },
            ].map(({ label, val, warn }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3 rounded-lg"
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "#64748b" }}
                >
                  {label}
                </span>
                <span
                  className="text-sm font-bold"
                  style={{ color: warn ? "#dc2626" : "#059669" }}
                >
                  {val}
                </span>
              </div>
            ))}
          </div>
          {results.malpractice && (
            <div
              className="mt-3 px-4 py-3 rounded-xl"
              style={{ background: "#fef2f2", border: "1px solid #fecaca" }}
            >
              <p className="text-xs font-semibold" style={{ color: "#dc2626" }}>
                ⚠ {results.malpracticeReason}
              </p>
              <p className="text-xs mt-1" style={{ color: "#ef4444" }}>
                This incident has been recorded and reported to the
                administrator.
              </p>
            </div>
          )}
        </div>

        {/* ── Action Buttons ── */}
        <div className="grid md:grid-cols-2 gap-3">
          <button
            onClick={downloadPDF}
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#ffffff",
              border: "1px solid #10b981",
              color: "#10b981",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#ecfdf5";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#ffffff";
            }}
          >
            <Download className="w-4 h-4" />
            Download Result (PDF)
          </button>
          <button
            onClick={onBackToDashboard}
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "0.875rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#2563eb",
              border: "none",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(37,99,235,0.2)",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#1d4ed8";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#2563eb";
              e.currentTarget.style.transform = "none";
            }}
          >
            <LogOut className="w-4 h-4" />
            Logout & Exit
          </button>
        </div>

        <p className="text-center mt-5 text-xs" style={{ color: "#94a3b8" }}>
          Your result has been saved. Download the PDF for your records.
        </p>
      </div>
    </div>
  );
}

function getGrade(percentage: number): string {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "F";
}

function getGradeColor(grade: string): string {
  const colors: Record<string, string> = {
    "A+": "bg-green-500 text-white",
    A: "bg-green-400 text-white",
    "B+": "bg-blue-500 text-white",
    B: "bg-blue-400 text-white",
    C: "bg-yellow-500 text-white",
    D: "bg-orange-500 text-white",
    F: "bg-red-500 text-white",
  };
  return colors[grade] || "bg-gray-500 text-white";
}

