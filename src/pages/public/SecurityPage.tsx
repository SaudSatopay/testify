import { LegalLayout } from "@/components/layout/LegalLayout";

export default function SecurityPage() {
  return (
    <LegalLayout title="Security at Testify">
      <p>
        Security is designed into Testify's architecture rather than bolted on. This page summarizes the concrete
        controls in place.
      </p>

      <h2>Authentication and authorization</h2>
      <ul>
        <li>Authentication is handled by Supabase Auth (email/password with secure password reset flows).</li>
        <li>Every database table is protected by PostgreSQL Row Level Security — authorization is enforced in the database, not just the UI.</li>
        <li>Roles (candidate, interviewer, admin) gate both routes and data. Self-registration can never grant the admin role; a database trigger enforces this.</li>
        <li>Role changes and suspensions are executed by a server-side function that independently verifies the caller is an administrator.</li>
      </ul>

      <h2>Data access boundaries</h2>
      <ul>
        <li>Candidates can read only their own profiles, interviews, responses, results, and analysis.</li>
        <li>Interviewers can access only interviews they created and the candidates attached to them.</li>
        <li>MCQ answer keys never reach the browser before submission — question selection and scoring run server-side.</li>
        <li>Recordings, resumes, and reports live in private storage buckets with per-path policies and signed, expiring URLs.</li>
      </ul>

      <h2>Secrets and AI providers</h2>
      <ul>
        <li>The frontend ships only the public Supabase URL and anon key.</li>
        <li>AI provider keys (OpenAI/Anthropic), the service-role key, and email keys exist solely as Edge Function secrets.</li>
        <li>All AI calls are proxied through authenticated Edge Functions that verify the caller's JWT and ownership of the interview.</li>
      </ul>

      <h2>Operational safeguards</h2>
      <ul>
        <li>Audit logging covers sign-ins, interview lifecycle events, invitations, report generation, and every administrative action.</li>
        <li>Edge Functions rate-limit expensive AI operations per user.</li>
        <li>Assessment timing anchors to server timestamps, not the browser clock.</li>
        <li>Rendering uses React's XSS-safe escaping; no untrusted HTML is injected.</li>
      </ul>

      <h2>Reporting a vulnerability</h2>
      <p>
        If you believe you've found a security issue, contact the administrator at security@testify.example. Please avoid
        accessing other users' data while demonstrating an issue.
      </p>
    </LegalLayout>
  );
}
