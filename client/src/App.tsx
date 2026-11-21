import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  LayoutDashboard,
  Files,
  Plus,
  RefreshCw,
  LogOut,
  Search,
  Bell,
  ChevronDown,
  Clock3,
  CheckCircle2,
  XCircle,
  Users,
  Award,
  Building2,
  ClipboardCheck,
  Loader2,
  ArrowUpRight,
  Menu,
  X,
  Send,
  AlertCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import api from "./api/client";
import type { LoginResponse, UserRole } from "./types/auth";
import "./App.css";

type DemoUser = {
  name: string;
  role: string;
  email: string;
};

type BatchStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "DISTRICT_REVIEW"
  | "QUALITY_REVIEW"
  | "STATE_REVIEW"
  | "RETURNED"
  | "REJECTED"
  | "ISSUED";

type Batch = {
  id: string;
  batchNumber: string;
  district: string;
  status: BatchStatus;
  candidateCount: number;
  needsQualityReview: boolean;
  createdAt: string;
  submittedAt: string | null;
  pendingSince: string | null;
  reviewCycle: number;
  approvals: {
    id: string;
    decision: string;
    officer: {
      name: string;
      role: string;
    };
  }[];
  centre: {
    name: string;
    centreName: string | null;
  };
};

type CandidateInput = {
  fullName: string;
  phone: string;
  email: string;
  courseName: string;
};

const demoUsers: DemoUser[] = [
  { name: "Anika", role: "Training Centre", email: "anika@certiflow.demo" },
  { name: "Dev", role: "District Officer 1", email: "dev@certiflow.demo" },
  { name: "Meera", role: "District Officer 2", email: "meera@certiflow.demo" },
  { name: "Kabir", role: "District Officer 3", email: "kabir@certiflow.demo" },
  { name: "Neha", role: "Quality Officer", email: "neha@certiflow.demo" },
  { name: "Farah", role: "State Officer", email: "farah@certiflow.demo" },
];

const roleLabels: Record<UserRole, string> = {
  TRAINING_CENTRE: "Training Centre",
  DISTRICT_OFFICER: "District Officer",
  QUALITY_OFFICER: "Quality Officer",
  STATE_OFFICER: "State Officer",
};

const statusLabels: Record<BatchStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  DISTRICT_REVIEW: "District Review",
  QUALITY_REVIEW: "Quality Review",
  STATE_REVIEW: "State Review",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  ISSUED: "Issued",
};

const emptyCandidate = (): CandidateInput => ({
  fullName: "",
  phone: "",
  email: "",
  courseName: "Full Stack Development",
});


type VerificationResult = {
  success: boolean;
  valid: boolean;
  status: "ACTIVE" | "CANCELLED" | "NOT_FOUND";
  message: string;
  certificateNumber?: string;
  candidateName?: string;
  courseName?: string;
  batchNumber?: string;
  issuedAt?: string;
  cancelledAt?: string;
};

function VerificationPage({ token }: { token: string }) {
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await api.get(
          `/verification/${encodeURIComponent(token)}`
        );
        setResult(response.data);
      } catch (err: any) {
        if (err.response?.status === 404) {
          setResult(err.response.data);
        } else {
          setError("Unable to verify this certificate. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    };

    void verify();
  }, [token]);

  const active = result?.status === "ACTIVE";

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f7fb",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: "24px",
      fontFamily: "inherit"
    }}>
      <section style={{
        width: "100%",
        maxWidth: "520px",
        background: "#fff",
        borderRadius: "18px",
        padding: "36px",
        boxShadow: "0 12px 40px rgba(15,23,42,0.08)"
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#2563eb",
          fontSize: "22px",
          fontWeight: 800,
          marginBottom: "28px"
        }}>
          <ShieldCheck size={30} />
          CertiFlow
        </div>

        <h1 style={{ fontSize: "25px", marginBottom: "8px" }}>
          Certificate Verification
        </h1>
        <p style={{ color: "#64748b", marginBottom: "28px" }}>
          Official certificate authenticity check
        </p>

        {loading && <p>Verifying certificate...</p>}

        {error && (
          <div style={{ color: "#b91c1c" }}>{error}</div>
        )}

        {!loading && result && (
          <>
            <div style={{
              padding: "16px",
              borderRadius: "12px",
              background: active ? "#ecfdf5" : "#fef2f2",
              color: active ? "#047857" : "#b91c1c",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px"
            }}>
              {active ? <CheckCircle2 size={27} /> : <XCircle size={27} />}
              <div>
                <strong style={{ display: "block", fontSize: "17px" }}>
                  {active
                    ? "Genuine Certificate"
                    : result.status === "CANCELLED"
                    ? "Certificate Cancelled"
                    : "Certificate Not Found"}
                </strong>
                <span style={{ fontSize: "13px" }}>
                  {result.message}
                </span>
              </div>
            </div>

            {result.status !== "NOT_FOUND" && (
              <div style={{
                display: "grid",
                gap: "17px"
              }}>
                {[
                  ["Certificate Number", result.certificateNumber],
                  ["Candidate Name", result.candidateName],
                  ["Course", result.courseName],
                  ["Batch Number", result.batchNumber],
                  [
                    active ? "Issue Date" : "Cancellation Date",
                    active ? result.issuedAt : result.cancelledAt
                  ]
                ].filter((item) => item[1]).map(([label, value]) => (
                  <div key={label}>
                    <small style={{ color: "#64748b" }}>{label}</small>
                    <div style={{
                      fontWeight: 600,
                      color: "#1e293b",
                      marginTop: "4px"
                    }}>
                      {label.includes("Date")
                        ? new Date(value!).toLocaleString()
                        : value}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p style={{
          borderTop: "1px solid #e2e8f0",
          paddingTop: "18px",
          marginTop: "28px",
          fontSize: "12px",
          color: "#64748b"
        }}>
          CertiFlow · State Skills Development Mission
        </p>
      </section>
    </main>
  );
}


function App() {
  const [email, setEmail] = useState("anika@certiflow.demo");
  const [password, setPassword] = useState("Demo@123");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [verificationInput, setVerificationInput] = useState("");
  const [verificationError, setVerificationError] = useState("");

  const [loggedIn, setLoggedIn] = useState(
    Boolean(localStorage.getItem("certiflow_token"))
  );

  const [user, setUser] = useState<any>(() => {
    try {
      return JSON.parse(localStorage.getItem("certiflow_user") || "null");
    } catch {
      return null;
    }
  });

  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [activePage, setActivePage] = useState("overview");
  const [search, setSearch] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [batchNumber, setBatchNumber] = useState("HYD-2026-003");
  const [district, setDistrict] = useState("Hyderabad");
  const [candidates, setCandidates] = useState<CandidateInput[]>([
    emptyCandidate(),
  ]);

  const role = user?.role as UserRole | undefined;

  const fetchBatches = useCallback(async () => {
    if (!localStorage.getItem("certiflow_token")) return;

    setLoading(true);
    setPageError("");

    try {
      const response = await api.get("/batches");
      setBatches(response.data.batches || []);
    } catch (error: any) {
      setPageError(
        error.response?.data?.message ||
          "Unable to load batches. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loggedIn) {
      void fetchBatches();
    }
  }, [loggedIn, fetchBatches]);

  const handleLogin = async (selectedEmail?: string) => {
    setLoginLoading(true);
    setLoginError("");

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email: selectedEmail || email,
        password,
      });

      localStorage.setItem("certiflow_token", response.data.token);
      localStorage.setItem(
        "certiflow_user",
        JSON.stringify(response.data.user)
      );

      setUser(response.data.user);
      setLoggedIn(true);
      setActivePage("overview");
    } catch (error: any) {
      setLoginError(
        error.response?.data?.message ||
          "Unable to sign in. Check your credentials and server."
      );
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePublicVerification = (
  event: React.FormEvent<HTMLFormElement>
) => {
  event.preventDefault();
  setVerificationError("");

  const value = verificationInput.trim();

  if (!value) {
    setVerificationError("Please enter a verification URL or token.");
    return;
  }

  let token = value;

  // Accept a complete verification URL or a relative verification path.
  if (/^https?:\/\//i.test(value) || value.startsWith("/")) {
    try {
      const parsedUrl = new URL(value, window.location.origin);
      const match = parsedUrl.pathname.match(/^\/verify\/([^/]+)\/?$/);

      if (!match) {
        setVerificationError("Please enter a valid certificate verification URL.");
        return;
      }

      token = decodeURIComponent(match[1]);
    } catch {
      setVerificationError("Invalid verification URL.");
      return;
    }
  } else if (value.includes("/") || /\s/.test(value)) {
    setVerificationError("Please enter a valid verification URL or token.");
    return;
  }

  window.location.assign(`/verify/${encodeURIComponent(token)}`);
};

  const logout = () => {
  localStorage.removeItem("certiflow_token");
  localStorage.removeItem("certiflow_user");

  setLoggedIn(false);
  setUser(null);
  setBatches([]);
  setNotice("");
  setPageError("");
  setActivePage("overview");
  setShowCreate(false);
  setMobileMenu(false);

  window.location.replace("/");
};

  const updateCandidate = (
    index: number,
    field: keyof CandidateInput,
    value: string
  ) => {
    setCandidates((current) =>
      current.map((candidate, i) =>
        i === index ? { ...candidate, [field]: value } : candidate
      )
    );
  };

  const createBatch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionLoading("create");
    setNotice("");
    setPageError("");

    try {
      const response = await api.post("/batches", {
        batchNumber,
        district,
        candidates: candidates.map((candidate) => ({
          ...candidate,
          email: candidate.email || "",
        })),
      });

      setNotice(response.data.message || "Batch created successfully.");
      setShowCreate(false);
      setCandidates([emptyCandidate()]);
      await fetchBatches();
    } catch (error: any) {
      setPageError(
        error.response?.data?.message || "Unable to create batch."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const submitBatch = async (batchId: string) => {
    setActionLoading(batchId);
    setNotice("");
    setPageError("");

    try {
      const response = await api.post(`/batches/${batchId}/submit`);
      setNotice(response.data.message || "Batch submitted for review.");
      await fetchBatches();
    } catch (error: any) {
      setPageError(
        error.response?.data?.message || "Unable to submit batch."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const approveDistrict = async (batchId: string) => {
    setActionLoading(batchId);
    setNotice("");
    setPageError("");

    try {
      const response = await api.post(
        `/approvals/${batchId}/approve`
      );
      setNotice(response.data.message || "Approval recorded.");
      await fetchBatches();
    } catch (error: any) {
      setPageError(
        error.response?.data?.message || "Unable to approve batch."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const issueCertificates = async (batchId: string) => {
    const confirmed = window.confirm(
      "Approve this batch and issue certificates to all its candidates?"
    );

    if (!confirmed) return;

    setActionLoading(batchId);
    setNotice("");
    setPageError("");

    try {
      const response = await api.post(
        `/certificates/${batchId}/approve`
      );

      setNotice(
        `${response.data.message}. ${response.data.certificateCount} certificates issued.`
      );
      await fetchBatches();
    } catch (error: any) {
      setPageError(
        error.response?.data?.message ||
          "Unable to issue certificates."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const approveQuality = async (batchId: string) => {
    setActionLoading(batchId);
    setNotice("");
    setPageError("");

    try {
      const response = await api.post(
        `/approvals/${batchId}/quality-approve`
      );

      setNotice(response.data.message || "Quality approval recorded.");
      await fetchBatches();
    } catch (error: any) {
      setPageError(
        error.response?.data?.message ||
          "Unable to process quality approval."
      );
    } finally {
      setActionLoading(null);
    }
  };

  const filteredBatches = useMemo(() => {
    let result = batches;

    if (activePage === "pending") {
      result = batches.filter((batch) =>
        ["DISTRICT_REVIEW", "QUALITY_REVIEW", "STATE_REVIEW"].includes(
          batch.status
        )
      );
    } else if (activePage === "issued") {
      result = batches.filter((batch) => batch.status === "ISSUED");
    }

    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(
        (batch) =>
          batch.batchNumber.toLowerCase().includes(term) ||
          batch.district.toLowerCase().includes(term) ||
          batch.centre?.name?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [batches, activePage, search]);

  const stats = useMemo(
    () => ({
      total: batches.length,
      pending: batches.filter((batch) =>
        ["DISTRICT_REVIEW", "QUALITY_REVIEW", "STATE_REVIEW"].includes(
          batch.status
        )
      ).length,
      issued: batches.filter((batch) => batch.status === "ISSUED").length,
      candidates: batches.reduce(
        (total, batch) => total + batch.candidateCount,
        0
      ),
    }),
    [batches]
  );

  const navigation = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "all", label: "All batches", icon: Files },
    { id: "pending", label: "Pending reviews", icon: ClipboardCheck },
    { id: "issued", label: "Issued certificates", icon: Award },
  ];

  const pageTitle =
    activePage === "overview"
      ? "Overview"
      : activePage === "pending"
      ? "Pending reviews"
      : activePage === "issued"
      ? "Issued certificates"
      : "All batches";

  const getBatchAction = (batch: Batch) => {
    if (
      role === "TRAINING_CENTRE" &&
      ["DRAFT", "RETURNED"].includes(batch.status)
    ) {
      return (
        <button
          className="table-action primary"
          disabled={actionLoading === batch.id}
          onClick={() => void submitBatch(batch.id)}
        >
          {actionLoading === batch.id ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <Send size={15} />
          )}
          Submit
        </button>
      );
    }

    if (
      role === "DISTRICT_OFFICER" &&
      batch.status === "DISTRICT_REVIEW"
    ) {
      const alreadyApproved = batch.approvals.some(
        (approval) => approval.officer?.name === user?.name
      );

      if (alreadyApproved) {
        return <span className="muted-small">Approved by you</span>;
      }

      return (
        <button
          className="table-action primary"
          disabled={actionLoading === batch.id}
          onClick={() => void approveDistrict(batch.id)}
        >
          {actionLoading === batch.id ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          Approve
        </button>
      );
    }

    if (
      role === "STATE_OFFICER" &&
      batch.status === "STATE_REVIEW"
    ) {
      return (
        <button
          className="table-action primary"
          disabled={actionLoading === batch.id}
          onClick={() => void issueCertificates(batch.id)}
        >
          {actionLoading === batch.id ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <Award size={15} />
          )}
          Issue certificates
        </button>
      );
    }

    
    if (
      role === "QUALITY_OFFICER" &&
      batch.status === "QUALITY_REVIEW"
    ) {
      return (
        <button
          className="table-action primary"
          disabled={actionLoading === batch.id}
          onClick={() => void approveQuality(batch.id)}
        >
          {actionLoading === batch.id ? (
            <Loader2 className="spin" size={15} />
          ) : (
            <CheckCircle2 size={15} />
          )}
          Quality approve
        </button>
      );
    }


    return <span className="muted-small">No action required</span>;
  };

    const verificationMatch = window.location.pathname.match(
    /^\/verify\/([^/]+)\/?$/
  );

  if (verificationMatch) {
    return (
      <VerificationPage
        token={decodeURIComponent(verificationMatch[1])}
      />
    );
  }

  if (!loggedIn) {
    return (
      <main className="login-page">
        <section className="brand-panel">
          <div className="brand-content">
            <div className="brand-logo">
              <ShieldCheck size={30} />
            </div>
            <h1>CertiFlow</h1>
            <p className="brand-subtitle">
              Certificate Issuance & Verification Platform
            </p>

            <div className="brand-message">
              <span className="eyebrow">
                TRUSTED. TRANSPARENT. TRACKABLE.
              </span>
              <h2>Building trust in every skill certification.</h2>
              <p>
                A unified platform for secure certificate issuance,
                multi-level approvals and instant public verification.
              </p>
            </div>

            <div className="brand-footer">
              <span>
                <LockKeyhole size={14} /> Secure certificate ecosystem
              </span>
              <span>© 2026 CertiFlow</span>
            </div>
          </div>
        </section>

        <section className="form-panel">
          <div className="login-card">
            <div className="mobile-brand">
              <ShieldCheck size={27} />
              <span>CertiFlow</span>
            </div>

            <div className="form-heading">
              <span className="eyebrow">WELCOME BACK</span>
              <h2>Sign in to your account</h2>
              <p>Access your role-based workspace securely.</p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <label htmlFor="email">Email address</label>
              <div className="input-wrap">
                <Mail size={18} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <LockKeyhole size={18} />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>

              {loginError && (
                <div className="error-message">{loginError}</div>
              )}

              <button
                className="login-button"
                type="submit"
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="spin" size={18} />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in <ArrowUpRight size={18} />
                  </>
                )}
              </button>
            </form>
                        <section className="public-verification">
              <div className="verification-heading">
                <div className="verification-icon">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3>Verify a Certificate</h3>
                  <span>Public verification · No sign-in required</span>
                </div>
              </div>

              <p>
                Check the authenticity and current status of a skill
                certificate.
              </p>

              <form onSubmit={handlePublicVerification}>
                <label htmlFor="verificationInput">
                  Verification URL or token
                </label>

                <div className="input-wrap">
                  <Search size={18} />
                  <input
                    id="verificationInput"
                    type="text"
                    value={verificationInput}
                    onChange={(event) =>
                      setVerificationInput(event.target.value)
                    }
                    placeholder="Paste URL or enter token"
                  />
                </div>

                {verificationError && (
                  <div className="error-message">
                    {verificationError}
                  </div>
                )}

                <button
                  className="login-button verification-button"
                  type="submit"
                >
                  Get Details <ArrowUpRight size={18} />
                </button>
              </form>
            </section>
            <div className="demo-section">
              <div className="demo-heading">
                <div>
                  <Users size={19} />
                  <strong>Demo accounts</strong>
                </div>
                <span>For evaluation</span>
              </div>
              <p>Select an identity to autofill the login credentials.</p>

              <div className="demo-users">
                {demoUsers.map((demoUser) => (
                  <button
                    type="button"
                    key={demoUser.email}
                    className={`demo-user ${
                      email === demoUser.email ? "selected" : ""
                    }`}
                    onClick={() => {
                      setEmail(demoUser.email);
                      setPassword("Demo@123");
                      setLoginError("");
                    }}
                  >
                    <span className="demo-avatar">
                      {demoUser.name.charAt(0)}
                    </span>
                    <span className="demo-user-info">
                      <strong>{demoUser.name}</strong>
                      <small>{demoUser.role}</small>
                    </span>
                  </button>
                ))}
              </div>
              <div className="demo-password">
                Demo password: <strong>Demo@123</strong>
              </div>
            </div>

            <p className="login-note">
              Authorized personnel only. All actions are recorded for audit.
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <div className="app-shell">
      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo">
            <ShieldCheck size={25} />
          </div>
          <div>
            <strong>CertiFlow</strong>
            <small>SKILLS MISSION PORTAL</small>
          </div>
          <button
            className="mobile-close"
            onClick={() => setMobileMenu(false)}
            aria-label="Close menu"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${
                  activePage === item.id ? "active" : ""
                }`}
                onClick={() => {
                  setActivePage(item.id);
                  setMobileMenu(false);
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.id === "pending" && stats.pending > 0 && (
                  <span className="nav-count">{stats.pending}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-security">
            <ShieldCheck size={19} />
            <div>
              <strong>Secure workspace</strong>
              <small>Activity is audit logged</small>
            </div>
          </div>
          <button className="logout-button" onClick={logout}>
            <LogOut size={17} /> Sign out
          </button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenu(true)}
              aria-label="Open navigation"
            >
              <Menu size={21} />
            </button>
            <div className="breadcrumb">
              Workspace <span>/</span> <strong>{pageTitle}</strong>
            </div>
          </div>

          <div className="topbar-right">
            <button
              className="icon-button"
              onClick={() => void fetchBatches()}
              title="Refresh data"
            >
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <div className="topbar-divider" />
            <div className="user-menu">
              <div className="user-avatar">
                {user?.name?.charAt(0) || "U"}
              </div>
              <div className="user-details">
                <strong>{user?.name}</strong>
                <small>{role ? roleLabels[role] : "User"}</small>
              </div>
              <ChevronDown size={15} />
            </div>
          </div>
        </header>

        <div className="page-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow page-eyebrow">
                {user?.centreName || "STATE SKILLS DEVELOPMENT MISSION"}
              </div>
              <h1>{pageTitle}</h1>
              <p>
                Welcome back, {user?.name}. Here's what's happening today.
              </p>
            </div>

            {role === "TRAINING_CENTRE" && (
              <button
                className="create-button"
                onClick={() => setShowCreate(true)}
              >
                <Plus size={18} /> Create new batch
              </button>
            )}
          </div>

          {notice && (
            <div className="success-banner">
              <CheckCircle2 size={18} />
              <span>{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {pageError && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{pageError}</span>
              <button onClick={() => setPageError("")} aria-label="Dismiss">
                <X size={16} />
              </button>
            </div>
          )}

          {activePage === "overview" && (
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-top">
                  <span>Total batches</span>
                  <div className="stat-icon blue">
                    <Files size={19} />
                  </div>
                </div>
                <strong>{stats.total}</strong>
                <small>Across your accessible workspace</small>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Pending reviews</span>
                  <div className="stat-icon amber">
                    <Clock3 size={19} />
                  </div>
                </div>
                <strong>{stats.pending}</strong>
                <small>Awaiting workflow action</small>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Issued batches</span>
                  <div className="stat-icon green">
                    <Award size={19} />
                  </div>
                </div>
                <strong>{stats.issued}</strong>
                <small>Successfully processed</small>
              </div>

              <div className="stat-card">
                <div className="stat-top">
                  <span>Total candidates</span>
                  <div className="stat-icon violet">
                    <Users size={19} />
                  </div>
                </div>
                <strong>{stats.candidates}</strong>
                <small>Across all accessible batches</small>
              </div>
            </section>
          )}

          {activePage === "overview" && (
            <div className="section-heading">
              <div>
                <h2>Recent batches</h2>
                <p>Monitor certificate batches and their progress.</p>
              </div>
              <button
                className="text-button"
                onClick={() => setActivePage("all")}
              >
                View all <ArrowUpRight size={16} />
              </button>
            </div>
          )}

          {activePage !== "overview" && (
            <div className="section-heading">
              <div>
                <h2>{pageTitle}</h2>
                <p>Review batch details and available actions.</p>
              </div>
            </div>
          )}

          <section className="table-card">
            <div className="table-toolbar">
              <div className="table-title">
                <div className="table-title-icon">
                  <Building2 size={18} />
                </div>
                <div>
                  <strong>Batch records</strong>
                  <small>{filteredBatches.length} records found</small>
                </div>
              </div>

              <div className="table-controls">
                <div className="search-box">
                  <Search size={16} />
                  <input
                    placeholder="Search batches..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </div>
                <button
                  className="icon-button refresh-table"
                  onClick={() => void fetchBatches()}
                  title="Refresh"
                >
                  <RefreshCw size={17} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">
                <Loader2 className="spin" size={27} />
                <p>Loading batch records...</p>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="empty-state">
                <Files size={32} />
                <strong>No batches found</strong>
                <p>
                  {activePage === "pending"
                    ? "There are no batches waiting for review."
                    : "Try another search or create a new batch."}
                </p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="batch-table">
                  <thead>
                    <tr>
                      <th>Batch details</th>
                      <th>Training centre</th>
                      <th>Candidates</th>
                      <th>Approvals</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBatches.map((batch) => (
                      <tr key={batch.id}>
                        <td>
                          <strong className="batch-number">
                            {batch.batchNumber}
                          </strong>
                          <small className="cell-subtitle">
                            {batch.district} · Cycle {batch.reviewCycle}
                          </small>
                        </td>
                        <td>
                          <strong>{batch.centre?.centreName || "—"}</strong>
                          <small className="cell-subtitle">
                            {batch.centre?.name || "Training centre"}
                          </small>
                        </td>
                        <td>
                          <span className="candidate-count">
                            <Users size={15} /> {batch.candidateCount}
                          </span>
                          {batch.needsQualityReview && (
                            <small className="cell-subtitle">
                              Quality review required
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="approval-count">
                            <CheckCircle2 size={15} />
                            {
                              batch.approvals.filter(
                                (approval) =>
                                  approval.decision === "APPROVED"
                              ).length
                            }
                            <span>/ 2</span>
                          </div>
                          <small className="cell-subtitle">
                            District approvals
                          </small>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${batch.status.toLowerCase()}`}
                          >
                            <span className="status-dot" />
                            {statusLabels[batch.status] || batch.status}
                          </span>
                        </td>
                        <td>{getBatchAction(batch)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="table-footer">
              <span>
                Showing {filteredBatches.length} of {batches.length} batches
              </span>
              <span>Data from CertiFlow API</span>
            </div>
          </section>

          <footer className="page-footer">
            <span>© 2026 CertiFlow · State Skills Development Mission</span>
            <span>
              <ShieldCheck size={14} /> Secure and audit-tracked
            </span>
          </footer>
        </div>
      </main>

      {showCreate && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreate(false);
            }
          }}
        >
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="eyebrow">TRAINING CENTRE</span>
                <h2>Create a new batch</h2>
                <p>Add candidate details to start the certification workflow.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowCreate(false)}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={createBatch}>
              <div className="form-grid">
                <div className="field-group">
                  <label htmlFor="batchNumber">Batch number</label>
                  <input
                    id="batchNumber"
                    value={batchNumber}
                    onChange={(event) =>
                      setBatchNumber(event.target.value)
                    }
                    required
                    minLength={3}
                  />
                </div>
                <div className="field-group">
                  <label htmlFor="district">District</label>
                  <input
                    id="district"
                    value={district}
                    onChange={(event) => setDistrict(event.target.value)}
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div className="candidate-form-heading">
                <div>
                  <strong>Candidates</strong>
                  <small>
                    {candidates.length} candidate
                    {candidates.length !== 1 ? "s" : ""} added
                  </small>
                </div>
                <button
                  type="button"
                  className="add-candidate-button"
                  onClick={() =>
                    setCandidates((current) => [
                      ...current,
                      emptyCandidate(),
                    ])
                  }
                >
                  <Plus size={15} /> Add candidate
                </button>
              </div>

              <div className="candidate-form-list">
                {candidates.map((candidate, index) => (
                  <div className="candidate-form-card" key={index}>
                    <div className="candidate-card-title">
                      <strong>Candidate {index + 1}</strong>
                      {candidates.length > 1 && (
                        <button
                          type="button"
                          className="remove-candidate"
                          onClick={() =>
                            setCandidates((current) =>
                              current.filter((_, i) => i !== index)
                            )
                          }
                        >
                          <XCircle size={16} /> Remove
                        </button>
                      )}
                    </div>

                    <div className="form-grid">
                      <div className="field-group">
                        <label>Full name</label>
                        <input
                          value={candidate.fullName}
                          onChange={(event) =>
                            updateCandidate(
                              index,
                              "fullName",
                              event.target.value
                            )
                          }
                          placeholder="Candidate full name"
                          required
                          minLength={2}
                        />
                      </div>
                      <div className="field-group">
                        <label>Phone number</label>
                        <input
                          type="tel"
                          value={candidate.phone}
                          onChange={(event) =>
                            updateCandidate(
                              index,
                              "phone",
                              event.target.value
                            )
                          }
                          placeholder="9876543210"
                          pattern="[+]?[0-9]{10,15}"
                          required
                        />
                      </div>
                      <div className="field-group">
                        <label>Email (optional)</label>
                        <input
                          type="email"
                          value={candidate.email}
                          onChange={(event) =>
                            updateCandidate(
                              index,
                              "email",
                              event.target.value
                            )
                          }
                          placeholder="candidate@example.com"
                        />
                      </div>
                      <div className="field-group">
                        <label>Course name</label>
                        <input
                          value={candidate.courseName}
                          onChange={(event) =>
                            updateCandidate(
                              index,
                              "courseName",
                              event.target.value
                            )
                          }
                          placeholder="Course name"
                          required
                          minLength={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {candidates.length >= 50 && (
                <div className="quality-notice">
                  <AlertCircle size={17} />
                  Batches with 50 or more candidates require quality review.
                </div>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="create-button"
                  disabled={actionLoading === "create"}
                >
                  {actionLoading === "create" ? (
                    <Loader2 className="spin" size={17} />
                  ) : (
                    <Plus size={17} />
                  )}
                  Create batch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
