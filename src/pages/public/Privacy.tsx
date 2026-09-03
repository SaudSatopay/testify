import { LegalLayout } from "@/components/layout/LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        Testify ("we", "the platform") helps candidates practice interviews and helps interviewers evaluate candidates.
        This policy explains what we collect, why, and the controls you have. It is written to be read, not skimmed past.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account data</strong> — name, email, role, and optional profile details (phone, bio, skills, experience, avatar, resume).</li>
        <li><strong>Interview content</strong> — your typed answers, transcripts of spoken answers, and (with consent) audio/video recordings.</li>
        <li><strong>AI analysis output</strong> — per-answer scores, strengths, weaknesses, recommendations, and aggregate results.</li>
        <li><strong>Assessment monitoring events</strong> — only when an interviewer enables monitoring and only during the assessment: tab visibility changes, window focus changes, fullscreen exits, and copy/paste events. A visible notice is always shown while monitoring is active.</li>
        <li><strong>Audit records</strong> — sign-ins, interview lifecycle events, and administrative actions, for security and accountability.</li>
      </ul>

      <h2>Recording and consent</h2>
      <p>
        Your camera and microphone are never accessed silently. Recording starts only after you explicitly start an
        interview and confirm a consent screen. Optional video-signal analysis requires its own separate consent, runs in
        your browser, and stores only aggregate signals — individual frames are discarded immediately and never uploaded.
      </p>

      <h2>How your data is protected</h2>
      <ul>
        <li>Row-level security: candidates can only read their own interviews, responses, results, and analysis; interviewers can only access interviews they created.</li>
        <li>Recordings and resumes are stored in private buckets with per-user access policies; access uses short-lived signed URLs.</li>
        <li>AI provider keys and privileged credentials exist only on the server — never in your browser.</li>
      </ul>

      <h2>How AI analysis is used</h2>
      <p>
        AI analysis describes observable communication signals (relevance, clarity, structure, pace, filler words) and,
        when enabled, observable video signals (camera presence, approximate eye-contact indicator). It never infers race,
        ethnicity, religion, health, disability, sexuality, personality, mental health, honesty, or criminality. See the
        AI Disclosure page for the full statement.
      </p>

      <h2>Sharing</h2>
      <p>
        Interview results and transcripts are visible to you and to the interviewer who ran the interview. Private
        interviewer notes are not shown to candidates unless the interviewer explicitly marks them shared. We do not sell
        personal data.
      </p>

      <h2>Retention and deletion</h2>
      <p>
        You may update your profile at any time. To request account deletion or export, contact the platform
        administrator; deletion removes your profile and cascades to your interview data.
      </p>

      <h2>Contact</h2>
      <p>Questions about this policy: contact your Testify administrator or hello@testify.example.</p>
    </LegalLayout>
  );
}
