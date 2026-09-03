import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { FullPageLoader } from "@/components/shared/LoadingState";

/* Route-based code splitting — every page is lazy-loaded. */
const Landing = lazy(() => import("@/pages/public/Landing"));
const Login = lazy(() => import("@/pages/public/Login"));
const Register = lazy(() => import("@/pages/public/Register"));
const ForgotPassword = lazy(() => import("@/pages/public/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/public/ResetPassword"));
const Privacy = lazy(() => import("@/pages/public/Privacy"));
const Terms = lazy(() => import("@/pages/public/Terms"));
const SecurityPage = lazy(() => import("@/pages/public/SecurityPage"));
const AIDisclosure = lazy(() => import("@/pages/public/AIDisclosure"));
const InviteAccept = lazy(() => import("@/pages/public/InviteAccept"));
const NotFound = lazy(() => import("@/pages/public/NotFound"));

const CandidateDashboard = lazy(() => import("@/pages/candidate/CandidateDashboard"));
const CandidateProfile = lazy(() => import("@/pages/candidate/CandidateProfile"));
const CandidateInterviews = lazy(() => import("@/pages/candidate/CandidateInterviews"));
const MockInterviewSetup = lazy(() => import("@/pages/candidate/MockInterviewSetup"));
const InterviewRoom = lazy(() => import("@/pages/candidate/InterviewRoom"));
const CandidateAssessments = lazy(() => import("@/pages/candidate/CandidateAssessments"));
const MCQRunner = lazy(() => import("@/pages/candidate/MCQRunner"));
const CandidateResults = lazy(() => import("@/pages/candidate/CandidateResults"));
const ResultDetail = lazy(() => import("@/pages/candidate/ResultDetail"));

const InterviewerDashboard = lazy(() => import("@/pages/interviewer/InterviewerDashboard"));
const InterviewerInterviews = lazy(() => import("@/pages/interviewer/InterviewerInterviews"));
const CreateInterview = lazy(() => import("@/pages/interviewer/CreateInterview"));
const InterviewDetail = lazy(() => import("@/pages/interviewer/InterviewDetail"));
const LiveInterviewPanel = lazy(() => import("@/pages/interviewer/LiveInterviewPanel"));
const InterviewerCandidates = lazy(() => import("@/pages/interviewer/InterviewerCandidates"));
const QuestionBank = lazy(() => import("@/pages/interviewer/QuestionBank"));
const MCQBank = lazy(() => import("@/pages/interviewer/MCQBank"));
const InterviewerReports = lazy(() => import("@/pages/interviewer/InterviewerReports"));
const InterviewerSettings = lazy(() => import("@/pages/interviewer/InterviewerSettings"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminInterviews = lazy(() => import("@/pages/admin/AdminInterviews"));
const AdminQuestions = lazy(() => import("@/pages/admin/AdminQuestions"));
const AdminMCQs = lazy(() => import("@/pages/admin/AdminMCQs"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminAuditLogs = lazy(() => import("@/pages/admin/AdminAuditLogs"));
const AdminSettings = lazy(() => import("@/pages/admin/AdminSettings"));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ErrorBoundary>
        <Suspense fallback={<FullPageLoader />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/ai-disclosure" element={<AIDisclosure />} />
            <Route path="/invite/:token" element={<InviteAccept />} />

            {/* Candidate */}
            <Route element={<ProtectedRoute allowedRoles={["candidate"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
                <Route path="/candidate/profile" element={<CandidateProfile />} />
                <Route path="/candidate/interviews" element={<CandidateInterviews />} />
                <Route path="/candidate/mock-interview" element={<MockInterviewSetup />} />
                <Route path="/candidate/assessments" element={<CandidateAssessments />} />
                <Route path="/candidate/results" element={<CandidateResults />} />
                <Route path="/candidate/results/:id" element={<ResultDetail />} />
              </Route>
              {/* Full-screen interview experiences (no dashboard chrome) */}
              <Route path="/candidate/interview/:id" element={<InterviewRoom />} />
              <Route path="/candidate/mcq/:id" element={<MCQRunner />} />
            </Route>

            {/* Interviewer (admins may also access) */}
            <Route element={<ProtectedRoute allowedRoles={["interviewer", "admin"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/interviewer/dashboard" element={<InterviewerDashboard />} />
                <Route path="/interviewer/interviews" element={<InterviewerInterviews />} />
                <Route path="/interviewer/interviews/create" element={<CreateInterview />} />
                <Route path="/interviewer/interviews/:id" element={<InterviewDetail />} />
                <Route path="/interviewer/candidates" element={<InterviewerCandidates />} />
                <Route path="/interviewer/questions" element={<QuestionBank />} />
                <Route path="/interviewer/mcqs" element={<MCQBank />} />
                <Route path="/interviewer/reports" element={<InterviewerReports />} />
                <Route path="/interviewer/settings" element={<InterviewerSettings />} />
              </Route>
              <Route path="/interviewer/live/:id" element={<LiveInterviewPanel />} />
            </Route>

            {/* Admin */}
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route element={<DashboardLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/interviews" element={<AdminInterviews />} />
                <Route path="/admin/questions" element={<AdminQuestions />} />
                <Route path="/admin/mcqs" element={<AdminMCQs />} />
                <Route path="/admin/analytics" element={<AdminAnalytics />} />
                <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
