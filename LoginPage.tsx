import { useState, useEffect } from "react";
import {
  GraduationCap,
  User,
  Hash,
  BookOpen,
  Loader2,
  AlertCircle,
  ChevronRight,
  Lock,
  Mail,
  Code2,
  Eye,
  EyeOff,
  Activity,
  X,
  ShieldAlert,
  CheckCircle,
  FileCode2,
  Users
} from "lucide-react";
import {
  getStudentByEmail,
  checkServerHealth,
  createStudent,
  updateStudent,
  cleanLeetCodeUsername,
  autoAssignRandomQuestion,
  loginStudent,
  resetStudentPassword,
} from "../services/api";
import emailjs from "@emailjs/browser";
import { toast } from "sonner";

const DEPARTMENTS = [
  "Artificial Intelligence and Data Science",
  "Computer Science",
  "Information Technology",
  "Cyber Security",
];

// -- Input styling
const inputStyle: React.CSSProperties = {
  width: "100%",
  paddingLeft: "2.5rem",
  paddingRight: "2.5rem",
  paddingTop: "0.75rem",
  paddingBottom: "0.75rem",
  background: "#ffffff",
  border: "1.5px solid #cbd5e1",
  borderRadius: "12px",
  color: "#1e293b",
  fontSize: "0.875rem",
  outline: "none",
  transition: "all 0.2s ease",
  boxSizing: "border-box",
};

const onInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "#6366f1";
  e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.2)";
  e.target.style.background = "#ffffff";
};
const onInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.target.style.borderColor = "#cbd5e1";
  e.target.style.boxShadow = "none";
  e.target.style.background = "#ffffff";
};

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-widest" style={{ color: "#475569" }}>
        {label}
      </label>
      <div className="relative">
        <Icon
          className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          style={{ color: "#6366f1" }}
        />
        {children}
      </div>
    </div>
  );
}

interface LoginPageProps {
  onLogin: (student: {
    name: string;
    registerNumber: string;
    department: string;
    email?: string;
    leetCodeUsername?: string;
  }) => void;
  onAdminLogin: () => void;
}

type TabType = "student" | "register" | "admin";

export default function LoginPage({ onLogin, onAdminLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<TabType>("student");

  // Register fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registerNumber, setRegisterNumber] = useState("");
  const [department, setDepartment] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [leetCodeUsername, setLeetCodeUsername] = useState("");
  const [leetCodeUrl, setLeetCodeUrl] = useState("");

  const handleUsernameChange = (val: string) => {
    setLeetCodeUsername(val);
    if (val.trim()) {
      setLeetCodeUrl(`https://leetcode.com/u/${val.trim()}/`);
    } else {
      setLeetCodeUrl("");
    }
  };

  const handleUrlChange = (val: string) => {
    setLeetCodeUrl(val);
    const cleaned = cleanLeetCodeUsername(val);
    if (cleaned && cleaned !== val) {
      setLeetCodeUsername(cleaned);
    }
  };

  // Student Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Admin Login fields
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isServerOffline, setIsServerOffline] = useState(false);

  // Password visibilities
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password modal flow
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetStep, setResetStep] = useState<"email" | "code" | "password">("email");
  const [forgotError, setForgotError] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    checkServerHealth().then((isOnline) => {
      if (!isOnline) setIsServerOffline(true);
    });

    // Check remembered email
    const saved = localStorage.getItem("remembered_email");
    if (saved) {
      setLoginEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const switchTab = (tab: TabType) => {
    setActiveTab(tab);
    setError("");
  };

  const checkSchedule = (): string | null => {
    const savedSchedule = localStorage.getItem("exam_schedule");
    if (!savedSchedule) return null;
    try {
      const schedule = JSON.parse(savedSchedule);
      const now = new Date();
      if (schedule.start && now < new Date(schedule.start))
        return "Exam has not started yet. Please wait until the scheduled start time.";
      if (schedule.end && now > new Date(schedule.end))
        return "Exam window has closed. You can no longer log in.";
    } catch { }
    return null;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) return setError("Please enter your full name.");
    if (!email.trim()) return setError("Please enter your email address.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return setError("Please enter a valid email address.");
    if (!department) return setError("Please select your department.");
    if (!registerNumber.trim()) return setError("Please enter your register number.");
    const regNoPattern = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8}$/;
    if (!regNoPattern.test(registerNumber.trim()))
      return setError("Register number must be exactly 8 alphanumeric characters (e.g., E23AI011).");
    if (!leetCodeUsername.trim()) return setError("Please enter your LeetCode username.");
    if (!leetCodeUrl.trim()) return setError("Please enter your LeetCode profile URL.");
    if (!password) return setError("Please create a password.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");

    const schedErr = checkSchedule();
    if (schedErr) return setError(schedErr);

    setIsLoading(true);
    try {
      const newStudent = await createStudent({
        name: name.trim(),
        email: email.trim(),
        registerNumber: registerNumber.trim().toUpperCase(),
        department,
        password,
        leetCodeUsername: leetCodeUsername.trim() || undefined,
      });

      toast.success("Account created successfully! Please sign in using your credentials.");

      // Clear registration inputs
      setName("");
      setEmail("");
      setRegisterNumber("");
      setPassword("");
      setConfirmPassword("");
      setLeetCodeUsername("");
      setLeetCodeUrl("");

      // Redirect to student login tab
      setActiveTab("student");
      setLoginEmail(email.trim()); // Pre-fill registered email for convenience
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!loginEmail.trim()) return setError("Please enter your email.");
    if (!loginPassword) return setError("Please enter your password.");

    const schedErr = checkSchedule();
    if (schedErr) return setError(schedErr);

    setIsLoading(true);
    try {
      const student = await loginStudent(loginEmail.trim(), loginPassword);

      if (rememberMe) {
        localStorage.setItem("remembered_email", loginEmail.trim());
      } else {
        localStorage.removeItem("remembered_email");
      }

      // Auto-assign a random question on login
      await autoAssignRandomQuestion(student.registerNumber);

      onLogin({
        name: student.name,
        registerNumber: student.registerNumber,
        department: student.department,
        email: student.email,
        leetCodeUsername: student.leetCodeUsername,
      });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("not found") || msg.includes("404"))
        setError("Email not found. Please register first.");
      else setError(msg || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!adminUsername.trim()) return setError("Please enter your username.");
    if (!adminPassword) return setError("Please enter your password.");

    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (adminUsername.trim() === "sscet" && adminPassword === "adminsscet@2026") {
      onAdminLogin();
    } else {
      setError("Invalid admin credentials.");
    }
    setIsLoading(false);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotEmail.trim()) return setForgotError("Please enter your registered email.");

    setForgotLoading(true);
    try {
      await resetStudentPassword(forgotEmail.trim());
      toast.success("Password reset link sent to your email.");
      setIsForgotOpen(false); // Close modal since we use Supabase email link
      setForgotEmail("");
    } catch (err: any) {
      setForgotError(err.message || "Failed to initiate password reset.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    // Deprecated with Supabase Auth reset links
    e.preventDefault();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError("");

    if (!newPassword) return setForgotError("Please enter a new password.");
    if (newPassword.length < 6) return setForgotError("Password must be at least 6 characters.");
    if (newPassword !== confirmNewPassword) return setForgotError("Passwords do not match.");

    setForgotLoading(true);
    try {
      const student = await getStudentByEmail(forgotEmail.trim());
      await updateStudent(student.id!, {
        ...student,
        password: newPassword,
      });

      toast.success("Password reset successfully! You can now log in.");
      setIsForgotOpen(false);
      resetForgotState();
    } catch (err: any) {
      setForgotError(err.message || "Failed to reset password.");
    } finally {
      setForgotLoading(false);
    }
  };

  const resetForgotState = () => {
    setForgotEmail("");
    setResetCode("");
    setGeneratedCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetStep("email");
    setForgotError("");
  };

  const initials = "EP";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 font-sans">

      {/* LEFT SIDE SCREEN: BRAND AREA */}
      <div
        className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-between relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
        }}
      >
        {/* Background glow effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-400/10 blur-3xl" />

        {/* Top brand label */}
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center backdrop-blur-md">
            <GraduationCap className="w-5 h-5 text-indigo-200" />
          </div>
          <span className="text-sm font-black tracking-widest text-indigo-100 uppercase">SSCET Platform</span>
        </div>

        {/* Mid illustration & text */}
        <div className="my-auto py-12 md:py-0 relative z-10 max-w-lg">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-6">
            Tech Assessment Hub & LeetCode Tracker
          </h1>
          <p className="text-sm md:text-base text-indigo-100 leading-relaxed opacity-90 mb-8">
            Welcome to the automated laboratory evaluation portal. Monitor code test evaluations, multiple choice questionnaires, and daily LeetCode activity directly from a unified panel.
          </p>

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center mt-0.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-indigo-100/90">Real-time compilation and automatic testcase checking.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center mt-0.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-indigo-100/90">Live Syncing with student's LeetCode profile solved counts.</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/35 flex items-center justify-center mt-0.5">
                <CheckCircle className="w-3 h-3 text-emerald-400" />
              </div>
              <p className="text-xs font-semibold text-indigo-100/90">Pulsing reminders and active dashboard streak logging.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE SCREEN: FORM CONTAINER */}
      <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center relative" style={{ background: "linear-gradient(160deg, #f8fafc 0%, #ffffff 100%)" }}>

        {/* Removed Database Health Badge as per user request */}

        <div className="w-full max-w-md mx-auto space-y-6">

          <div className="mb-2">
            <h2 className="text-2xl font-black tracking-tight" style={{ color: "#0f172a" }}>Portal Access</h2>
            <p className="text-xs mt-1 font-medium" style={{ color: "#475569" }}>Please select your portal type and provide credentials.</p>
          </div>

          {/* Tab Switcher (Three Pill Indicator switcher) */}
          <div className="relative flex p-1.5 rounded-2xl" style={{ background: "rgba(241,245,249,0.8)", border: "1px solid rgba(99,102,241,0.1)" }}>
            {/* Sliding Pill background */}
            <div
              className="absolute top-1.5 bottom-1.5 rounded-xl shadow-sm transition-all duration-300"
              style={{
                width: "calc(33.333% - 6px)",
                background: "#ffffff",
                border: "1px solid rgba(99,102,241,0.15)",
                left: activeTab === "student"
                  ? "4px"
                  : activeTab === "register"
                    ? "calc(33.333% + 2px)"
                    : "calc(66.666% + 2px)"
              }}
            />
            <button
              type="button"
              onClick={() => switchTab("student")}
              className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors duration-300 ${activeTab === "student" ? 'text-indigo-600' : 'text-slate-500'
                }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => switchTab("register")}
              className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors duration-300 ${activeTab === "register" ? 'text-indigo-600' : 'text-slate-500'
                }`}
            >
              Register
            </button>
            <button
              type="button"
              onClick={() => switchTab("admin")}
              className={`relative z-10 flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-xl transition-colors duration-300 ${activeTab === "admin" ? 'text-indigo-600' : 'text-slate-500'
                }`}
            >
              Admin
            </button>
          </div>

          {/* Form Error Message */}
          {error && (
            <div className="animate-fade-in">
              <ErrorBox message={error} />
            </div>
          )}

          {/* 1. STUDENT LOGIN FORM */}
          {activeTab === "student" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <Field label="Personal Email Address" icon={Mail}>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="Password" icon={Lock}>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors p-1" style={{ color: "#6366f1" }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-350 w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-bold" style={{ color: "#475569" }}>Remember me</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotOpen(true);
                    resetForgotState();
                  }}
                  className="text-xs font-bold transition-colors" style={{ color: "#4f46e5" }}
                >
                  Forgot Password?
                </button>
              </div>

              <div className="pt-2">
                <SubmitBtn isLoading={isLoading} label="Enter Evaluation System" />
              </div>
            </form>
          )}

          {/* 2. STUDENT REGISTRATION FORM */}
          {activeTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              <Field label="Student Full Name" icon={User}>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Anitha"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="Personal Email Address" icon={Mail}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. anitha@gmail.com"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="Department" icon={BookOpen}>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                  className="cursor-pointer"
                >
                  <option value="" disabled>Select Department</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Register Number" icon={Hash}>
                <input
                  type="text"
                  value={registerNumber}
                  onChange={(e) => {
                    const v = e.target.value
                      .replace(/[^A-Za-z0-9]/g, "")
                      .toUpperCase();
                    if (v.length <= 8) setRegisterNumber(v);
                  }}
                  placeholder="e.g. E23AI001"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="LeetCode Username" icon={Code2}>
                <input
                  type="text"
                  value={leetCodeUsername}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="e.g. anitha"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="LeetCode Profile URL" icon={Code2}>
                <input
                  type="text"
                  value={leetCodeUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="e.g. https://leetcode.com/u/anitha"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="Create Password" icon={Lock}>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min 6 chars)"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors p-1" style={{ color: "#6366f1" }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm Password" icon={Lock}>
                <div className="relative w-full">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password to confirm"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors p-1" style={{ color: "#6366f1" }}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <div className="pt-2">
                <SubmitBtn isLoading={isLoading} label="Create Account" />
              </div>
            </form>
          )}

          {/* 3. ADMIN LOGIN FORM */}
          {activeTab === "admin" && (
            <form onSubmit={handleAdminSubmit} className="space-y-4 animate-fade-in">
              <Field label="Admin Username" icon={User}>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Enter administrator username"
                  style={inputStyle}
                  onFocus={onInputFocus}
                  onBlur={onInputBlur}
                />
              </Field>

              <Field label="Security Password" icon={Lock}>
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter security password"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors p-1" style={{ color: "#6366f1" }}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    width: "100%",
                    padding: "0.8rem",
                    borderRadius: "12px",
                    fontWeight: 900,
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "#fff",
                    cursor: isLoading ? "not-allowed" : "pointer",
                    background: isLoading
                      ? "rgba(99,102,241,0.3)"
                      : "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                    border: "none",
                    boxShadow: isLoading ? "none" : "0 4px 16px rgba(99,102,241,0.4)",
                    transition: "all 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    marginTop: "0.5rem",
                  }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Authenticating...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 text-indigo-300" />
                      Sign In as Coordinator
                      <ChevronRight className="w-4 h-4 text-indigo-300" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* ── FORGOT PASSWORD MODAL OVERLAY ── */}
      {isForgotOpen && (
        <div className="fixed inset-0 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" style={{ background: "rgba(15,23,42,0.4)" }}>
          <div className="rounded-3xl shadow-2xl w-full max-w-md p-6 relative animate-scale-in" style={{ background: "rgba(255,255,255,0.98)", border: "1px solid rgba(99,102,241,0.15)" }}>

            <button
              onClick={() => {
                setIsForgotOpen(false);
                resetForgotState();
              }}
              className="absolute right-4 top-4 p-1.5 rounded-xl transition-all" style={{ color: "#4f46e5", background: "rgba(99,102,241,0.08)" }}
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-4">
              <h2 className="text-lg font-black flex items-center gap-2" style={{ color: "#0f172a" }}>
                <Lock className="w-5 h-5" style={{ color: "#4f46e5" }} />
                Reset Account Password
              </h2>
              <p className="text-xs font-medium mt-0.5" style={{ color: "#475569" }}>
                Verify your identity to reset your account password.
              </p>
            </div>

            {forgotError && (
              <div className="mb-4">
                <ErrorBox message={forgotError} />
              </div>
            )}

            {/* Step 1: Request Email */}
            {resetStep === "email" && (
              <form onSubmit={handleSendCode} className="space-y-4">
                <Field label="Registered Personal Email" icon={Mail}>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter your registered email address"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none" }}
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Send Verification Code
                </button>
              </form>
            )}

            {/* Step 2: Verification Code Entry */}
            {resetStep === "code" && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="rounded-2xl p-4 mb-2 text-xs font-medium" style={{ background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", color: "#a5b4fc" }}>
                  A 6-digit OTP verification code has been dispatched to your email inbox. Please retrieve the code and submit below.
                </div>
                <Field label="6-Digit Code" icon={Hash}>
                  <input
                    type="text"
                    maxLength={6}
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="Enter 6-digit OTP code"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </Field>
                <button
                  type="submit"
                  className="w-full py-3 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none" }}
                >
                  Verify Code
                </button>
              </form>
            )}

            {/* Step 3: Set New Password */}
            {resetStep === "password" && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Field label="Choose New Password" icon={Lock}>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </Field>
                <Field label="Confirm New Password" icon={Lock}>
                  <input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    style={inputStyle}
                    onFocus={onInputFocus}
                    onBlur={onInputBlur}
                  />
                </Field>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-3 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg,#6366f1,#4f46e5)", border: "none" }}
                >
                  {forgotLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Reset Password
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ErrorBox({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#dc2626",
      }}
    >
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#ef4444" }} />
      <span className="font-semibold text-xs">{message}</span>
    </div>
  );
}

function SubmitBtn({
  isLoading,
  label,
}: {
  isLoading: boolean;
  label: string;
}) {
  return (
    <button
      type="submit"
      disabled={isLoading}
      style={{
        width: "100%",
        padding: "0.8rem",
        borderRadius: "12px",
        fontWeight: 900,
        fontSize: "0.8rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "#fff",
        cursor: isLoading ? "not-allowed" : "pointer",
        background: isLoading
          ? "rgba(79, 70, 229, 0.5)"
          : "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
        border: "none",
        boxShadow: isLoading ? "none" : "0 4px 16px rgba(79, 70, 229, 0.35)",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        marginTop: "0.5rem",
      }}
      className="text-white"
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <ChevronRight className="w-4 h-4 text-indigo-200" />
          {label}
          <ChevronRight className="w-4 h-4 text-indigo-200" />
        </>
      )}
    </button>
  );
}
