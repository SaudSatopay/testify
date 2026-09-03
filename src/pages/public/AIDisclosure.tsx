import { LegalLayout } from "@/components/layout/LegalLayout";

export default function AIDisclosure() {
  return (
    <LegalLayout title="AI Analysis Disclosure">
      <p>
        Testify uses AI systems to generate interview questions and analyze answers. This page states plainly what that
        analysis is — and what it is not.
      </p>

      <h2>What the AI analyzes</h2>
      <ul>
        <li><strong>Answer content</strong> — relevance to the question, technical accuracy, clarity, and structure.</li>
        <li><strong>Speech signals</strong> — speaking pace and filler-word frequency, derived from the transcript.</li>
        <li>
          <strong>Optional video signals</strong> (separate consent required) — camera presence, an approximate
          eye-contact indicator, head movement, and visible expression variation. Frames are processed in your browser
          and discarded; only aggregate numbers are stored.
        </li>
      </ul>

      <h2>What the AI does not do</h2>
      <ul>
        <li>It does not infer race, ethnicity, religion, health, disability, sexuality, personality, mental health, honesty, or criminality — and prompts to our AI providers explicitly forbid such inferences.</li>
        <li>It does not claim facial expressions prove confidence, competence, or truthfulness. Video observations use neutral, observable language only (e.g., "eye gaze frequently moved away from the camera").</li>
        <li>It does not make hiring decisions. Scores are decision-support signals reviewed by humans.</li>
      </ul>

      <h2>About the confidence indicator</h2>
      <p>
        The "confidence indicator" is a composite of observable communication signals: speech pace, filler words, answer
        structure, clarity, hesitation, and — when enabled — the eye-contact indicator. It is an AI-generated
        communication indicator and should not be treated as a psychological assessment. It can be affected by nerves,
        language fluency, accessibility needs, and equipment quality, which is why it is displayed alongside — never in
        place of — the substance of your answers.
      </p>

      <h2>Fairness and limitations</h2>
      <ul>
        <li>AI analysis can be wrong, especially for short answers, noisy audio, or partial transcripts.</li>
        <li>Interviewers see the transcript and can override or annotate any AI signal with their own scoring and notes.</li>
        <li>Assessment-monitoring events (tab switches, focus changes) are informational signals and are never presented as proof of cheating.</li>
      </ul>

      <h2>Your controls</h2>
      <ul>
        <li>Recording requires your explicit consent on every interview.</li>
        <li>Video-signal analysis is optional and separately consented; declining never blocks the interview itself.</li>
        <li>You can review your transcripts, scores, and AI feedback in your results dashboard.</li>
      </ul>
    </LegalLayout>
  );
}
