-- ============================================================================
-- Testify - seed data
-- created_by is NULL everywhere (system/seed rows, visible to all users via
-- the "questions_select_own_seed_admin_or_assigned" policy).
-- Fixed UUIDs + ON CONFLICT DO NOTHING make this file safe to run repeatedly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Technical interview questions (10)
-- ----------------------------------------------------------------------------
insert into public.questions
  (id, created_by, category, question, question_type, difficulty, expected_topics, ideal_answer, time_limit_seconds, is_ai_generated)
values
  ('d1000000-0000-4000-8000-000000000001', null, 'Software Engineer',
   'Explain the difference between a process and a thread. When would you choose multiple processes over multiple threads?',
   'technical', 'medium',
   '["memory isolation", "context switching", "shared memory", "IPC", "fault isolation"]'::jsonb,
   'A process owns its own address space while threads share the memory of their parent process, which makes threads cheaper to create and switch but vulnerable to shared-state bugs. Multiple processes are the better choice when fault isolation or security boundaries matter, because one crashing process cannot corrupt another''s memory.',
   240, false),

  ('d1000000-0000-4000-8000-000000000002', null, 'Software Engineer',
   'What is optimistic versus pessimistic locking, and when would you use each in a high-traffic system?',
   'technical', 'hard',
   '["row locks", "version columns", "retry logic", "contention", "deadlocks"]'::jsonb,
   'Pessimistic locking acquires a lock before touching data so conflicting transactions wait, which suits hot rows with frequent conflicts. Optimistic locking lets transactions proceed and validates a version number at commit, retrying on conflict, which scales better when conflicts are rare because nobody blocks.',
   300, false),

  ('d1000000-0000-4000-8000-000000000003', null, 'Software Engineer',
   'Walk me through how you would debug a sudden performance regression in production.',
   'technical', 'medium',
   '["metrics and dashboards", "recent deploys", "profiling", "logs and tracing", "rollback strategy", "bisection"]'::jsonb,
   'Start by quantifying the regression with metrics and correlating its start time with deploys, config changes, or traffic shifts. Then narrow the bottleneck with tracing or profiling, mitigate quickly (rollback or feature flag), and only afterwards land the proper fix with a regression test.',
   240, false),

  ('d1000000-0000-4000-8000-000000000004', null, 'Frontend Developer',
   'Explain the browser''s critical rendering path from receiving HTML to pixels on screen.',
   'technical', 'medium',
   '["DOM construction", "CSSOM", "render tree", "layout", "paint", "compositing", "render-blocking resources"]'::jsonb,
   'The browser parses HTML into the DOM and CSS into the CSSOM, combines them into a render tree, then runs layout to compute geometry, paints layers, and composites them to the screen. Render-blocking CSS and synchronous scripts delay this path, which is why critical CSS inlining and deferred scripts improve first paint.',
   300, false),

  ('d1000000-0000-4000-8000-000000000005', null, 'Frontend Developer',
   'What is the difference between debouncing and throttling? Give a concrete UI example of each.',
   'technical', 'easy',
   '["debounce", "throttle", "event frequency", "search-as-you-type", "scroll handlers"]'::jsonb,
   'Debouncing delays execution until events stop for a quiet period, so a search box only queries after the user pauses typing. Throttling guarantees at most one execution per interval, so a scroll or resize handler runs, say, every 100 ms no matter how fast events fire.',
   180, false),

  ('d1000000-0000-4000-8000-000000000006', null, 'Backend Developer',
   'How would you design a rate limiter for a public API used by thousands of clients?',
   'technical', 'hard',
   '["token bucket", "sliding window", "Redis or shared store", "per-key limits", "429 responses", "distributed consistency"]'::jsonb,
   'Pick an algorithm such as token bucket or sliding window and keep counters in a shared low-latency store like Redis so every instance sees the same state. Key limits per API key or user, return 429 with Retry-After when exceeded, and consider burst allowances plus separate limits for expensive endpoints.',
   300, false),

  ('d1000000-0000-4000-8000-000000000007', null, 'Backend Developer',
   'What is a database index, how does it speed up queries, and what are its trade-offs?',
   'technical', 'medium',
   '["B-tree structure", "query planner", "selectivity", "write amplification", "storage cost", "composite indexes"]'::jsonb,
   'An index is an auxiliary structure, usually a B-tree, that lets the database find matching rows without scanning the whole table. The trade-offs are slower writes and extra storage because every insert or update must also maintain the index, so you index selective, frequently filtered columns rather than everything.',
   240, false),

  ('d1000000-0000-4000-8000-000000000008', null, 'Backend Developer',
   'Explain idempotency in REST APIs. Why does it matter, and how would you implement it for a payment endpoint?',
   'technical', 'medium',
   '["idempotency keys", "safe retries", "PUT vs POST semantics", "deduplication", "exactly-once effects"]'::jsonb,
   'An idempotent endpoint produces the same result no matter how many times the same request is applied, which makes client retries safe after timeouts. For payments, accept a client-generated idempotency key, store the first outcome keyed by it, and return the stored response for any duplicate instead of charging twice.',
   240, false),

  ('d1000000-0000-4000-8000-000000000009', null, 'Data Analyst',
   'Explain the difference between an INNER JOIN and a LEFT JOIN. When does a LEFT JOIN produce NULLs?',
   'technical', 'easy',
   '["join semantics", "unmatched rows", "NULL handling"]'::jsonb,
   'An INNER JOIN returns only rows that have a match in both tables, while a LEFT JOIN returns every row from the left table regardless. When a left row has no match on the right, the right table''s columns come back as NULL, which is also how you find orphaned records.',
   180, false),

  ('d1000000-0000-4000-8000-000000000010', null, 'Data Analyst',
   'You receive a dataset with significant missing values. How do you decide whether to drop, impute, or flag them?',
   'technical', 'medium',
   '["missingness mechanism", "MCAR vs MNAR", "imputation methods", "bias risk", "sensitivity analysis", "domain knowledge"]'::jsonb,
   'First diagnose why the data is missing: values missing completely at random can often be dropped safely, while systematic missingness would bias the analysis if ignored. Then choose imputation (mean, median, model-based) or an explicit missing-indicator flag based on the column''s importance, and validate the choice with a sensitivity check.',
   240, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- HR interview questions (10)
-- ----------------------------------------------------------------------------
insert into public.questions
  (id, created_by, category, question, question_type, difficulty, expected_topics, ideal_answer, time_limit_seconds, is_ai_generated)
values
  ('d1000000-0000-4000-8000-000000000011', null, 'HR',
   'Tell me about yourself and your professional background.',
   'hr', 'easy',
   '["concise narrative", "relevant experience", "career motivation", "role fit"]'::jsonb,
   'A strong answer is a two-minute narrative connecting past roles and achievements to the position at hand. It highlights relevant skills with one or two concrete results and ends with why this role is the logical next step.',
   180, false),

  ('d1000000-0000-4000-8000-000000000012', null, 'HR',
   'Why do you want to work at this company?',
   'hr', 'easy',
   '["company research", "mission alignment", "specific products or values", "mutual fit"]'::jsonb,
   'The answer should reference specific, researched facts about the company - product, mission, culture, or growth - and connect them to the candidate''s goals and strengths. Generic praise without specifics signals low preparation.',
   150, false),

  ('d1000000-0000-4000-8000-000000000013', null, 'HR',
   'Where do you see yourself in five years?',
   'hr', 'easy',
   '["realistic ambition", "growth path", "alignment with role", "commitment"]'::jsonb,
   'A good answer shows a realistic growth trajectory that the role plausibly supports, such as deepening expertise, leading projects, or mentoring others. It balances ambition with commitment to delivering value in the current position.',
   150, false),

  ('d1000000-0000-4000-8000-000000000014', null, 'HR',
   'What are your salary expectations, and how did you arrive at that number?',
   'hr', 'medium',
   '["market research", "range not a point", "flexibility", "value justification"]'::jsonb,
   'Strong candidates give a researched range based on market data for the role, location, and their experience, and explain the basis briefly. They stay open to discussing the full package rather than anchoring on a single rigid number.',
   150, false),

  ('d1000000-0000-4000-8000-000000000015', null, 'HR',
   'Why are you leaving your current role?',
   'hr', 'medium',
   '["positive framing", "growth motivation", "no badmouthing", "pull not push"]'::jsonb,
   'The best answers are framed around what the candidate is moving toward - growth, scope, technology, impact - rather than complaints about the current employer. Honest but professional framing without negativity is the key signal.',
   150, false),

  ('d1000000-0000-4000-8000-000000000016', null, 'HR',
   'What motivates you to do your best work?',
   'hr', 'easy',
   '["self-awareness", "intrinsic motivation", "examples", "alignment with role"]'::jsonb,
   'A convincing answer names specific motivators - solving hard problems, visible user impact, team success - and backs each with a brief real example. It ideally maps those motivators to what the role actually offers.',
   150, false),

  ('d1000000-0000-4000-8000-000000000017', null, 'HR',
   'How do you handle constructive criticism?',
   'hr', 'medium',
   '["receptiveness", "concrete example", "behavior change", "follow-up"]'::jsonb,
   'Look for a concrete story: feedback received, the candidate''s initial reaction, and the specific change they made afterwards. The strongest answers show the candidate actively seeking feedback rather than merely tolerating it.',
   180, false),

  ('d1000000-0000-4000-8000-000000000018', null, 'HR',
   'What is your greatest professional strength? Give an example of it in action.',
   'hr', 'easy',
   '["relevant strength", "evidence", "measurable result", "honesty"]'::jsonb,
   'The candidate should pick a strength genuinely relevant to the role and prove it with a specific situation and measurable outcome. Claiming a strength without evidence, or listing many strengths superficially, weakens the answer.',
   180, false),

  ('d1000000-0000-4000-8000-000000000019', null, 'HR',
   'Describe your ideal work environment.',
   'hr', 'easy',
   '["culture fit", "collaboration style", "autonomy vs structure", "honesty about preferences"]'::jsonb,
   'A useful answer describes concrete conditions - collaboration style, feedback culture, autonomy level, pace - where the candidate does their best work. It should be honest enough to assess real fit rather than echoing the company''s website.',
   150, false),

  ('d1000000-0000-4000-8000-000000000020', null, 'HR',
   'Do you prefer working independently or in a team? Why?',
   'hr', 'easy',
   '["flexibility", "self-awareness", "examples of both", "context dependence"]'::jsonb,
   'Strong candidates avoid a binary answer: they explain when they thrive solo (deep focus work) and when collaboration is essential (design, review, unblocking), with a short example of each. The signal is adaptability plus self-awareness.',
   150, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Behavioral interview questions (10, STAR-style)
-- ----------------------------------------------------------------------------
insert into public.questions
  (id, created_by, category, question, question_type, difficulty, expected_topics, ideal_answer, time_limit_seconds, is_ai_generated)
values
  ('d1000000-0000-4000-8000-000000000021', null, 'Behavioral',
   'Tell me about a time you had to meet a very tight deadline. What was the situation and what did you do?',
   'behavioral', 'medium',
   '["STAR structure", "prioritization", "scope negotiation", "communication", "outcome"]'::jsonb,
   'A strong STAR answer names the deadline and stakes, explains how the candidate prioritized ruthlessly and communicated trade-offs, and ends with a concrete outcome. Cutting scope transparently beats silently cutting quality.',
   240, false),

  ('d1000000-0000-4000-8000-000000000022', null, 'Behavioral',
   'Describe a time you disagreed with a teammate or manager. How did you handle it?',
   'behavioral', 'medium',
   '["respectful disagreement", "data-driven argument", "listening", "commitment to decision"]'::jsonb,
   'Look for a real disagreement handled with curiosity: the candidate presented evidence, genuinely listened to the other side, and worked toward the best decision rather than winning. Disagree-and-commit after a fair hearing is a strong ending.',
   240, false),

  ('d1000000-0000-4000-8000-000000000023', null, 'Behavioral',
   'Tell me about a time you failed at something. What happened and what did you learn?',
   'behavioral', 'medium',
   '["ownership", "root cause honesty", "lesson learned", "changed behavior"]'::jsonb,
   'The best answers own a genuine failure without deflecting blame, identify the real root cause, and show a specific behavior change that prevented recurrence. A trivial or disguised-success "failure" is a weak signal.',
   240, false),

  ('d1000000-0000-4000-8000-000000000024', null, 'Behavioral',
   'Describe a situation where you had to learn a new skill or technology very quickly.',
   'behavioral', 'easy',
   '["learning strategy", "resourcefulness", "applying under pressure", "result"]'::jsonb,
   'A good answer explains the forcing event, the candidate''s deliberate learning approach - docs, prototypes, experts - and how they applied the skill to a real deliverable quickly. The outcome should show competence achieved, not just effort.',
   210, false),

  ('d1000000-0000-4000-8000-000000000025', null, 'Behavioral',
   'Tell me about a time you went above and beyond what was required for a project or customer.',
   'behavioral', 'easy',
   '["initiative", "customer empathy", "impact", "judgment about effort"]'::jsonb,
   'Strong answers show self-directed initiative with clear impact: the candidate spotted an unowned problem, chose to solve it, and someone measurably benefited. Judgment matters - the extra effort should have been worth it.',
   210, false),

  ('d1000000-0000-4000-8000-000000000026', null, 'Behavioral',
   'Describe a time you had to deliver difficult feedback to someone. How did you approach it?',
   'behavioral', 'hard',
   '["directness with empathy", "specific examples", "private setting", "follow-up support"]'::jsonb,
   'The candidate should describe preparing specifics, delivering the message directly but privately and with empathy, and supporting the person afterwards. The outcome ideally shows the relationship and the work both improved.',
   240, false),

  ('d1000000-0000-4000-8000-000000000027', null, 'Behavioral',
   'Tell me about a time you had to juggle multiple competing priorities. How did you decide what to do first?',
   'behavioral', 'medium',
   '["prioritization framework", "stakeholder communication", "saying no", "outcome"]'::jsonb,
   'Look for an explicit prioritization method - impact versus urgency, stakeholder input, deadlines - and proactive communication about what would slip. Quietly working longer hours without re-negotiating scope is the weaker pattern.',
   240, false),

  ('d1000000-0000-4000-8000-000000000028', null, 'Behavioral',
   'Describe a situation where you influenced a decision without having formal authority.',
   'behavioral', 'hard',
   '["building credibility", "data and prototypes", "coalition building", "persistence"]'::jsonb,
   'Strong answers show influence through evidence and relationships: the candidate built a case with data or a prototype, enlisted allies, and addressed objections. The decision changing because of their work, not their title, is the point.',
   240, false),

  ('d1000000-0000-4000-8000-000000000029', null, 'Behavioral',
   'Tell me about a time you were given an ambiguous problem with little guidance. What did you do?',
   'behavioral', 'medium',
   '["clarifying questions", "breaking down the problem", "assumptions made explicit", "iteration"]'::jsonb,
   'The candidate should show they reduced ambiguity deliberately: asked clarifying questions, defined the problem and success criteria, made assumptions explicit, and iterated with feedback. Waiting passively for direction is the anti-pattern.',
   240, false),

  ('d1000000-0000-4000-8000-000000000030', null, 'Behavioral',
   'Describe a time you made a mistake at work. How did you own it and fix it?',
   'behavioral', 'medium',
   '["fast disclosure", "mitigation", "root cause fix", "prevention"]'::jsonb,
   'The strongest pattern is immediate disclosure, quick mitigation of the impact, then a durable fix and a prevention step such as a test or checklist. Hiding the mistake or blaming circumstances are the red flags this question probes.',
   240, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- MCQ questions (20): 5 JavaScript, 4 React, 3 SQL, 4 DSA, 2 TypeScript,
-- 2 Aptitude. correct_option values verified.
-- ----------------------------------------------------------------------------
insert into public.mcq_questions
  (id, created_by, category, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
values
  -- JavaScript (5)
  ('d2000000-0000-4000-8000-000000000001', null, 'JavaScript',
   'What does `typeof null` evaluate to in JavaScript?',
   '"null"', '"object"', '"undefined"', '"number"',
   'b',
   'Due to a long-standing quirk from JavaScript''s first implementation, typeof null returns "object". null is still a primitive value; this is widely considered a historical bug that cannot be fixed without breaking the web.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000002', null, 'JavaScript',
   'Which array method returns a NEW array containing only the elements that pass a test function?',
   'forEach()', 'map()', 'filter()', 'reduce()',
   'c',
   'filter() calls the predicate for each element and returns a new array with the elements for which it returned a truthy value. map() transforms every element, forEach() returns undefined, and reduce() folds the array into a single value.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000003', null, 'JavaScript',
   'What does the strict equality operator `===` check?',
   'Value equality after type coercion', 'Value and type equality without coercion', 'Reference identity only, even for primitives', 'That both operands are of type boolean',
   'b',
   '=== compares both type and value with no coercion: 1 === "1" is false while 1 == "1" is true. For objects, both == and === compare references, but for primitives === is simply "same type and same value".',
   'easy'),

  ('d2000000-0000-4000-8000-000000000004', null, 'JavaScript',
   'What is a closure in JavaScript?',
   'A function bundled together with references to its surrounding lexical scope', 'A method that prevents an object from being modified', 'A loop that terminates automatically', 'A block of code that runs after the page closes',
   'a',
   'A closure is a function that retains access to variables from the scope in which it was defined, even after that scope has finished executing. This enables patterns like private state, factories, and callbacks that remember context.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000005', null, 'JavaScript',
   'Which of the following is NOT a primitive type in JavaScript?',
   'symbol', 'bigint', 'array', 'boolean',
   'c',
   'JavaScript has seven primitives: string, number, bigint, boolean, undefined, symbol, and null. Arrays are objects (typeof [] === "object"), which is why Array.isArray() exists.',
   'easy'),

  -- React (4)
  ('d2000000-0000-4000-8000-000000000006', null, 'React',
   'Which React hook returns a stateful value together with a function to update it?',
   'useEffect', 'useState', 'useRef', 'useMemo',
   'b',
   'useState returns a [value, setter] pair and triggers a re-render when the setter is called with a new value. useRef holds mutable data without re-rendering, useEffect runs side effects, and useMemo caches computed values.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000007', null, 'React',
   'Why does React need a `key` prop when rendering a list of elements?',
   'It applies CSS styling to each item', 'It helps React identify which items changed, were added, or removed between renders', 'It sets the DOM id attribute of each item', 'It is required for onClick handlers to work',
   'b',
   'Keys give list items a stable identity across renders so the reconciler can match old and new elements, minimizing DOM operations and preserving component state. Using array indexes as keys can cause bugs when the list is reordered.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000008', null, 'React',
   'When does a useEffect with an empty dependency array (`useEffect(fn, [])`) run?',
   'After every render', 'Only once, after the component first mounts', 'Never', 'Only when the component unmounts',
   'b',
   'An empty dependency array means the effect has no reactive dependencies, so it runs once after the initial mount. The function it returns (the cleanup) runs on unmount. In React 18 StrictMode dev builds it mounts twice to surface unsafe effects.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000009', null, 'React',
   'What is the correct way to update state based on its previous value with useState?',
   'setCount(count + 1) called three times to add 3', 'Mutating the variable directly: count++', 'Passing an updater function: setCount(prev => prev + 1)', 'Calling this.setState({ count: count + 1 })',
   'c',
   'The functional updater form receives the latest state, so consecutive updates compose correctly even when batched. setCount(count + 1) repeated in one handler uses the same stale value, and direct mutation never triggers a re-render.',
   'medium'),

  -- SQL (3)
  ('d2000000-0000-4000-8000-000000000010', null, 'SQL',
   'Which SQL clause filters groups AFTER aggregation has been applied with GROUP BY?',
   'WHERE', 'HAVING', 'ORDER BY', 'LIMIT',
   'b',
   'WHERE filters individual rows before grouping, while HAVING filters the aggregated groups afterwards - e.g. HAVING COUNT(*) > 5. ORDER BY sorts the final result and LIMIT truncates it.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000011', null, 'SQL',
   'Which JOIN returns ALL rows from the left table plus matching rows from the right table?',
   'INNER JOIN', 'CROSS JOIN', 'LEFT JOIN', 'RIGHT JOIN',
   'c',
   'A LEFT (OUTER) JOIN keeps every row of the left table; where no right-side match exists, the right columns are NULL. INNER JOIN drops unmatched rows, RIGHT JOIN keeps all right-table rows, and CROSS JOIN produces the cartesian product.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000012', null, 'SQL',
   'What does a PRIMARY KEY constraint enforce on a column (or set of columns)?',
   'Uniqueness and NOT NULL', 'Uniqueness only; NULLs are allowed', 'NOT NULL only; duplicates are allowed', 'A foreign-key reference to another table',
   'a',
   'A primary key uniquely identifies each row, so the database enforces both uniqueness and non-nullability, and creates a unique index behind the scenes. A UNIQUE constraint alone still permits NULLs; referencing another table is a FOREIGN KEY.',
   'easy'),

  -- Data Structures & Algorithms (4)
  ('d2000000-0000-4000-8000-000000000013', null, 'Data Structures & Algorithms',
   'What is the time complexity of binary search on a sorted array of n elements?',
   'O(n)', 'O(log n)', 'O(n log n)', 'O(1)',
   'b',
   'Binary search halves the search interval on every comparison, so it needs at most about log2(n) steps. The prerequisite is random access to a sorted collection - it does not work on unsorted data or plain linked lists.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000014', null, 'Data Structures & Algorithms',
   'Which data structure processes elements in FIFO (first-in, first-out) order?',
   'Stack', 'Queue', 'Binary tree', 'Hash table',
   'b',
   'A queue removes elements in the order they were added (enqueue at the back, dequeue at the front), like a waiting line. A stack is LIFO - the most recently pushed element pops first.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000015', null, 'Data Structures & Algorithms',
   'What is the WORST-case time complexity of quicksort?',
   'O(n log n)', 'O(n)', 'O(n^2)', 'O(log n)',
   'c',
   'When pivot selection is consistently poor (e.g. always the smallest element on already-sorted input with a naive first-element pivot), each partition removes only one element, giving O(n^2). Randomized or median-of-three pivots make the expected case O(n log n).',
   'medium'),

  ('d2000000-0000-4000-8000-000000000016', null, 'Data Structures & Algorithms',
   'Which data structure offers average-case O(1) lookup, insertion, and deletion by key?',
   'Sorted array', 'Hash table', 'Binary search tree', 'Singly linked list',
   'b',
   'A hash table computes an index from the key''s hash, reaching the right bucket in constant time on average (degrading toward O(n) only with pathological collisions). Balanced BSTs give O(log n); sorted arrays give O(log n) search but O(n) insertion.',
   'medium'),

  -- TypeScript (2)
  ('d2000000-0000-4000-8000-000000000017', null, 'TypeScript',
   'What does the `unknown` type require before you can operate on a value of that type?',
   'Nothing - it behaves exactly like any', 'Narrowing the type (e.g. typeof checks) or a type assertion first', 'Casting to string in all cases', 'unknown values can never be used at all',
   'b',
   'unknown is the type-safe counterpart of any: you can assign anything to it, but you must narrow it (typeof, instanceof, custom guards) or assert a type before calling methods or accessing properties. any skips checking entirely.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000018', null, 'TypeScript',
   'Which TypeScript utility type makes ALL properties of type T optional?',
   'Required<T>', 'Readonly<T>', 'Partial<T>', 'Pick<T, K>',
   'c',
   'Partial<T> maps every property of T to an optional one - handy for update/patch payloads. Required<T> does the opposite, Readonly<T> forbids reassignment, and Pick<T, K> selects a subset of properties.',
   'easy'),

  -- Aptitude (2)
  ('d2000000-0000-4000-8000-000000000019', null, 'Aptitude',
   'A train travels 60 km in 45 minutes. What is its average speed in km/h?',
   '70 km/h', '75 km/h', '80 km/h', '90 km/h',
   'c',
   '45 minutes is 0.75 hours, and speed = distance / time = 60 / 0.75 = 80 km/h. A common mistake is dividing by 45 and multiplying by 100 instead of converting minutes to hours.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000020', null, 'Aptitude',
   'What is the next number in the sequence 2, 6, 12, 20, 30, ...?',
   '40', '42', '44', '36',
   'b',
   'The differences between terms are 4, 6, 8, 10 - increasing by 2 each step - so the next difference is 12, giving 30 + 12 = 42. Equivalently, the n-th term is n(n+1): 6*7 = 42.',
   'medium')
on conflict (id) do nothing;
