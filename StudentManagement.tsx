import { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Users,
  Loader2,
  Search,
  UserCheck,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
  Hash,
  Mail,
  BookOpen,
  Code2,
  ChevronRight,
} from "lucide-react";
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getQuestions,
  assignQuestion,
  deleteAllStudents,
  getLeetCodeProfileUrl,
} from "../services/api";
import { toast } from "sonner";

export const DEPARTMENTS = [
  "Artificial Intelligence and Data Science",
  "Computer Science",
  "Information Technology",
  "Cyber Security",
];

const DEPT_META: Record<string, { color: string; bg: string; border: string; abbr: string }> = {
  "Artificial Intelligence and Data Science": { color: "#7c3aed", bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.18)", abbr: "AI & DS" },
  "Computer Science": { color: "#2563eb", bg: "rgba(37,99,235,0.07)", border: "rgba(37,99,235,0.18)", abbr: "CSE" },
  "Information Technology": { color: "#059669", bg: "rgba(5,150,105,0.07)", border: "rgba(5,150,105,0.18)", abbr: "IT" },
  "Cyber Security": { color: "#dc2626", bg: "rgba(220,38,38,0.07)", border: "rgba(220,38,38,0.18)", abbr: "CYS" },
};

export interface StudentRecord {
  id: string;
  name: string;
  registerNumber: string;
  department: string;
  email?: string;
  leetCodeUsername?: string;
  createdAt: string;
}

interface StudentManagementProps {
  onBack: () => void;
}

const Field = ({ label, icon: Icon, children }: { label: string; icon: any; children: React.ReactNode }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "#64748b" }}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </label>
    {children}
  </div>
);

const inputCls = "w-full px-3.5 py-2.5 rounded-xl text-sm transition-all outline-none";
const inputStyle = {
  background: "#ffffff",
  border: "1.5px solid #e2e8f0",
  color: "#0f172a",
  boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
};
const inputFocusStyle = {
  borderColor: "rgba(99,102,241,0.5)",
  boxShadow: "0 0 0 3px rgba(99,102,241,0.1)",
};

export default function StudentManagement({ onBack }: StudentManagementProps) {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", registerNumber: "", department: "", email: "", leetCodeUsername: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedStudentForAssign, setSelectedStudentForAssign] = useState<StudentRecord | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => { loadStudents(); loadQuestions(); }, []);

  const loadQuestions = async () => {
    try { const data = await getQuestions(); setQuestions(data); } catch {}
  };

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const data = await getStudents();
      setStudents(data.map(s => ({ id: String(s.id), name: s.name, registerNumber: s.registerNumber, department: s.department, email: s.email, leetCodeUsername: s.leetCodeUsername, createdAt: s.createdAt || new Date().toISOString() })));
    } catch (error: any) { toast.error("Failed to load students: " + error.message); }
    finally { setIsLoading(false); }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.registerNumber.trim() || !formData.department || !formData.email.trim() || !formData.leetCodeUsername.trim()) { toast.warning("Please fill in all required fields including Email and LeetCode Username"); return; }
    setIsSaving(true);
    try {
      const payload = { name: formData.name.trim(), registerNumber: formData.registerNumber.trim().toUpperCase(), department: formData.department, email: formData.email.trim(), leetCodeUsername: formData.leetCodeUsername.trim() };
      if (editingId) { await updateStudent(editingId, payload); toast.success("Student updated successfully"); }
      else { await createStudent(payload); toast.success(`${payload.name} registered successfully`); }
      resetForm(); await loadStudents();
    } catch (error: any) { toast.error(error.message || "Operation failed"); }
    finally { setIsSaving(false); }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Delete ${name}? This will also remove their exam results.`)) {
      try { await deleteStudent(id); toast.success(`${name} deleted`); await loadStudents(); }
      catch (error: any) { toast.error("Failed to delete: " + error.message); }
    }
  };

  const handleDeleteAll = async () => {
    if (confirm("Delete ALL students permanently? This cannot be undone.")) {
      setIsLoading(true);
      try { await deleteAllStudents(); toast.success("All students deleted."); await loadStudents(); }
      catch (error: any) { toast.error("Failed: " + error.message); }
      finally { setIsLoading(false); }
    }
  };

  const handleEdit = (student: StudentRecord) => {
    setFormData({ name: student.name, registerNumber: student.registerNumber, department: student.department, email: student.email || "", leetCodeUsername: student.leetCodeUsername || "" });
    setEditingId(student.id); setIsAdding(true);
  };

  const resetForm = () => { setFormData({ name: "", registerNumber: "", department: "", email: "", leetCodeUsername: "" }); setIsAdding(false); setEditingId(null); };

  const handleAssignQuestion = async () => {
    if (!selectedStudentForAssign || !selectedQuestionId) return;
    setIsAssigning(true);
    try { await assignQuestion(selectedStudentForAssign.registerNumber, selectedQuestionId); toast.success(`Question assigned to ${selectedStudentForAssign.name}`); setAssignModalOpen(false); }
    catch (error: any) { toast.error(error.message || "Failed to assign question"); }
    finally { setIsAssigning(false); }
  };

  const filteredStudents = students.filter(s => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return s.name.toLowerCase().includes(t) || s.registerNumber.toLowerCase().includes(t) || s.email?.toLowerCase().includes(t);
  });

  const getIS = (field: string) => focusedField === field ? { ...inputStyle, ...inputFocusStyle } : inputStyle;

  const deptCounts = DEPARTMENTS.reduce((acc, d) => { acc[d] = students.filter(s => s.department === d).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)", fontFamily: "'Inter', sans-serif" }}>
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-5">

        {/* ── Header Card ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
          {/* Top stripe */}
          <div style={{ height: "4px", background: "linear-gradient(90deg, #6366f1, #8b5cf6, #06b6d4)" }} />
          <div className="p-5 md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <button onClick={onBack} className="flex items-center gap-1.5 text-sm font-medium mb-3 transition-colors" style={{ color: "#64748b" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "#4f46e5")} onMouseLeave={e => (e.currentTarget.style.color = "#64748b")}>
                  <ArrowLeft className="w-4 h-4" /> Back to Admin
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 4px 12px rgba(99,102,241,0.3)" }}>
                    <Users className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold" style={{ color: "#0f172a" }}>Student Registration</h1>
                    <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>Manage student profiles and LeetCode connections</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-center px-5 py-2.5 rounded-xl" style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.12)" }}>
                  <p className="text-xs font-medium" style={{ color: "#6366f1" }}>Total Students</p>
                  <p className="text-2xl font-black" style={{ color: "#4f46e5" }}>{students.length}</p>
                </div>
                <button onClick={handleDeleteAll}
                  className="flex items-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl transition-all"
                  style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", color: "#dc2626" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "rgba(239,68,68,0.12)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.35)"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(239,68,68,0.07)"; e.currentTarget.style.borderColor = "rgba(239,68,68,0.2)"; }}>
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
                {!isAdding && (
                  <button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: "", registerNumber: "", department: "", email: "", leetCodeUsername: "" }); }}
                    className="flex items-center gap-2 text-xs font-semibold py-2.5 px-4 rounded-xl text-white transition-all"
                    style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}
                    onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(99,102,241,0.4)")}
                    onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 12px rgba(99,102,241,0.25)")}>
                    <Plus className="w-3.5 h-3.5" /> Add Student
                  </button>
                )}
              </div>
            </div>

            {/* Department Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              {DEPARTMENTS.map(dept => {
                const meta = DEPT_META[dept];
                return (
                  <div key={dept} className="rounded-xl p-3.5 transition-all" style={{ background: meta.bg, border: `1px solid ${meta.border}` }}>
                    <p className="text-xs font-semibold truncate" style={{ color: meta.color }}>{meta.abbr}</p>
                    <p className="text-2xl font-black mt-0.5" style={{ color: meta.color }}>{deptCounts[dept] || 0}</p>
                    <p className="text-xs mt-0.5" style={{ color: meta.color, opacity: 0.7 }}>students</p>
                  </div>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by name, register number or email..."
                className="w-full pl-11 pr-10 py-3 rounded-xl text-sm transition-all outline-none"
                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#0f172a" }}
                onFocus={e => { e.target.style.borderColor = "rgba(99,102,241,0.4)"; e.target.style.background = "#fff"; e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.08)"; }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; e.target.style.background = "#f8fafc"; e.target.style.boxShadow = "none"; }} />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-0.5 transition-colors" style={{ color: "#94a3b8" }}>
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Add / Edit Form ── */}
        {isAdding && (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold" style={{ color: "#0f172a" }}>
                  {editingId ? "✏️ Edit Student" : "➕ Register New Student"}
                </h3>
                <button onClick={resetForm} className="p-2 rounded-lg transition-colors" style={{ color: "#94a3b8" }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#f1f5f9"; e.currentTarget.style.color = "#64748b"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Field label="Department *" icon={BookOpen}>
                  <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })}
                    className={inputCls} style={getIS("dept")}
                    onFocus={() => setFocusedField("dept")} onBlur={() => setFocusedField(null)}>
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>

                <Field label="Student Name *" icon={Users}>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Anitha" className={inputCls} style={getIS("name")}
                    onFocus={() => setFocusedField("name")} onBlur={() => setFocusedField(null)} />
                </Field>

                <Field label="Register Number *" icon={Hash}>
                  <input type="text" value={formData.registerNumber}
                    onChange={e => setFormData({ ...formData, registerNumber: e.target.value.replace(/[^A-Za-z0-9]/g, "").toUpperCase() })}
                    placeholder="e.g., E23CS001" className={`${inputCls} font-mono`} style={getIS("reg")}
                    onFocus={() => setFocusedField("reg")} onBlur={() => setFocusedField(null)} />
                </Field>

                <Field label="Email Address" icon={Mail}>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="e.g., anitha@gmail.com" className={inputCls} style={getIS("email")}
                    onFocus={() => setFocusedField("email")} onBlur={() => setFocusedField(null)} />
                </Field>

                <Field label="LeetCode Username / URL" icon={Code2}>
                  <input type="text" value={formData.leetCodeUsername} onChange={e => setFormData({ ...formData, leetCodeUsername: e.target.value })}
                    placeholder="e.g., anitha or leetcode.com/u/anitha" className={inputCls} style={getIS("lc")}
                    onFocus={() => setFocusedField("lc")} onBlur={() => setFocusedField(null)} />
                </Field>
              </div>

              <div className="flex gap-3 mt-5 pt-5" style={{ borderTop: "1px solid #f1f5f9" }}>
                <button onClick={handleSubmit} disabled={isSaving}
                  className="flex items-center gap-2 font-semibold py-2.5 px-6 rounded-xl text-sm text-white transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)", boxShadow: "0 4px 12px rgba(99,102,241,0.25)" }}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editingId ? "Update Student" : "Register Student"}
                </button>
                <button onClick={resetForm} className="flex items-center gap-2 font-semibold py-2.5 px-5 rounded-xl text-sm transition-all"
                  style={{ background: "#f8fafc", color: "#64748b", border: "1.5px solid #e2e8f0" }}>
                  <X className="w-4 h-4" /> Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Student Table ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.05)" }}>
          {/* Table header bar */}
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #f1f5f9" }}>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>
                {searchTerm ? `Search Results` : "All Students"}
              </p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.08)", color: "#4f46e5" }}>
                {filteredStudents.length}
              </span>
            </div>
            {searchTerm && (
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                Showing results for "<span style={{ color: "#4f46e5" }}>{searchTerm}</span>"
              </p>
            )}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16 gap-3" style={{ color: "#94a3b8" }}>
              <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
              <span className="text-sm">Loading students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.12)" }}>
                <UserCheck className="w-7 h-7" style={{ color: "#6366f1" }} />
              </div>
              <p className="text-sm font-semibold" style={{ color: "#475569" }}>
                {searchTerm ? `No results for "${searchTerm}"` : "No students registered yet"}
              </p>
              <p className="text-xs" style={{ color: "#94a3b8" }}>
                {searchTerm ? "Try a different search term" : "Click \"Add Student\" to get started"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: "#fafbff", borderBottom: "1px solid #f1f5f9" }}>
                    {["#", "Student", "Department", "Register No.", "Email", "LeetCode", "Registered", "Actions"].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: "#6366f1" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, idx) => {
                    const meta = DEPT_META[student.department] || DEPT_META["Computer Science"];
                    return (
                      <tr key={student.id} style={{ borderBottom: "1px solid #f8fafc" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.025)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                        <td className="px-5 py-4 text-sm" style={{ color: "#94a3b8" }}>{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${meta.color}, ${meta.color}cc)` }}>
                              {student.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
                            </div>
                            <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{student.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>
                            {meta.abbr}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-sm font-mono font-semibold" style={{ color: "#475569" }}>{student.registerNumber}</td>
                        <td className="px-5 py-4 text-sm" style={{ color: "#64748b" }}>{student.email || <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                        <td className="px-5 py-4">
                          {student.leetCodeUsername ? (
                            <a href={getLeetCodeProfileUrl(student.leetCodeUsername)} target="_blank" rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                              style={{ background: "rgba(245,158,11,0.08)", color: "#d97706", border: "1px solid rgba(245,158,11,0.2)" }}
                              onMouseEnter={e => { e.currentTarget.style.background = "rgba(245,158,11,0.15)"; }}
                              onMouseLeave={e => { e.currentTarget.style.background = "rgba(245,158,11,0.08)"; }}>
                              <Code2 className="w-3 h-3" /> View Profile <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-xs" style={{ color: "#cbd5e1" }}>—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-xs" style={{ color: "#94a3b8" }}>
                          {new Date(student.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1">
                            <button onClick={() => { setSelectedStudentForAssign(student); setSelectedQuestionId(""); setAssignModalOpen(true); }}
                              className="p-1.5 rounded-lg transition-all" title="Assign Question" style={{ color: "#6366f1" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(99,102,241,0.1)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <AlertCircle className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleEdit(student)} className="p-1.5 rounded-lg transition-all" title="Edit" style={{ color: "#3b82f6" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(59,130,246,0.1)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(student.id, student.name)} className="p-1.5 rounded-lg transition-all" title="Delete" style={{ color: "#ef4444" }}
                              onMouseEnter={e => (e.currentTarget.style.background = "rgba(239,68,68,0.1)")}
                              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-3 flex items-center justify-between" style={{ borderTop: "1px solid #f1f5f9" }}>
            <p className="text-xs" style={{ color: "#94a3b8" }}>
              {students.length} student{students.length !== 1 ? "s" : ""} — data stored permanently in Supabase
            </p>
            <div className="flex items-center gap-1 text-xs" style={{ color: "#94a3b8" }}>
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live sync
            </div>
          </div>
        </div>
      </div>

      {/* ── Assign Question Modal ── */}
      {assignModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50" style={{ background: "rgba(15,23,42,0.35)", backdropFilter: "blur(4px)" }}>
          <div className="rounded-2xl w-full max-w-md overflow-hidden" style={{ background: "#ffffff", boxShadow: "0 24px 64px rgba(0,0,0,0.15)", border: "1px solid #e2e8f0" }}>
            <div style={{ height: "3px", background: "linear-gradient(90deg, #6366f1, #8b5cf6)" }} />
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold" style={{ color: "#0f172a" }}>Assign Question</h3>
                  <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>to {selectedStudentForAssign?.name} ({selectedStudentForAssign?.registerNumber})</p>
                </div>
                <button onClick={() => setAssignModalOpen(false)} className="p-2 rounded-xl" style={{ color: "#94a3b8" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#f1f5f9")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <X className="w-4 h-4" />
                </button>
              </div>
              <select value={selectedQuestionId} onChange={e => setSelectedQuestionId(e.target.value)}
                className="w-full px-4 py-3 rounded-xl mb-5 text-sm outline-none"
                style={{ background: "#f8fafc", border: "1.5px solid #e2e8f0", color: "#0f172a" }}>
                <option value="">Select a question...</option>
                {questions.map(q => <option key={q.id} value={q.id}>{q.title}</option>)}
              </select>
              <div className="flex justify-end gap-3">
                <button onClick={() => setAssignModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: "#64748b", background: "#f8fafc", border: "1px solid #e2e8f0" }}>Cancel</button>
                <button onClick={handleAssignQuestion} disabled={isAssigning || !selectedQuestionId}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: "linear-gradient(135deg, #6366f1, #4f46e5)" }}>
                  {isAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
