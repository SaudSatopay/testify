-- ============================================================================
-- Testify - seed data (commerce edition)
-- created_by is NULL everywhere (system/seed rows, visible to all users via
-- the "questions_select_own_seed_admin_or_assigned" policy).
-- Fixed UUIDs + ON CONFLICT DO NOTHING make this file safe to run repeatedly.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Subject-knowledge interview questions (16) - accountancy, finance,
-- economics, marketing, taxation, audit, banking.
-- (question_type 'technical' is the schema's internal value for
--  domain/subject-knowledge questions.)
-- ----------------------------------------------------------------------------
insert into public.questions
  (id, created_by, category, question, question_type, difficulty, expected_topics, ideal_answer, time_limit_seconds, is_ai_generated)
values
  ('d1000000-0000-4000-8000-000000000001', null, 'Accountant',
   'Walk me through the three golden rules of accounting, with one example journal entry for each.',
   'technical', 'easy',
   '["personal accounts", "real accounts", "nominal accounts", "debit and credit rules", "example journal entries"]'::jsonb,
   'Personal accounts: debit the receiver, credit the giver (e.g. goods sold on credit to Ravi - debit Ravi). Real accounts: debit what comes in, credit what goes out (e.g. purchase of machinery for cash - debit Machinery, credit Cash). Nominal accounts: debit all expenses and losses, credit all incomes and gains (e.g. rent paid - debit Rent). A strong answer states each rule and grounds it in a correct entry.',
   240, false),

  ('d1000000-0000-4000-8000-000000000002', null, 'Accountant',
   'What is the difference between the accrual basis and the cash basis of accounting, and why do companies report on the accrual basis?',
   'technical', 'medium',
   '["revenue recognition", "matching principle", "outstanding and prepaid items", "true and fair view", "statutory requirement"]'::jsonb,
   'Cash basis records transactions only when money moves; accrual basis records revenue when earned and expenses when incurred, regardless of receipt or payment. Accrual accounting matches expenses to the revenue they generate, bringing outstanding and prepaid items into the period they belong to, which is why it gives a true and fair view and is required for companies.',
   240, false),

  ('d1000000-0000-4000-8000-000000000003', null, 'Accountant',
   'Explain depreciation. How do the straight-line method and the written-down-value method differ in their effect on reported profit over an asset''s life?',
   'technical', 'medium',
   '["allocation of cost", "useful life and salvage value", "straight-line equal charge", "WDV declining charge", "profit pattern", "matching with repairs"]'::jsonb,
   'Depreciation allocates the cost of a fixed asset over its useful life rather than expensing it at purchase. Straight-line charges an equal amount every year, so its profit impact is constant; written-down value charges a fixed percentage of the shrinking book value, so early years bear more depreciation and later years less - which pairs well with rising repair costs as the asset ages.',
   270, false),

  ('d1000000-0000-4000-8000-000000000004', null, 'Accountant',
   'A trial balance has tallied, yet the accounts may still contain errors. Which kinds of errors does a trial balance NOT reveal, and how would you catch them?',
   'technical', 'hard',
   '["error of complete omission", "error of commission", "error of principle", "compensating errors", "control accounts and reconciliations", "vouching"]'::jsonb,
   'A tallied trial balance still hides errors of complete omission, posting to the wrong account of the correct type, errors of principle such as expensing a capital item, and compensating errors that cancel out. They are caught by vouching entries against documents, reconciling control accounts and bank statements, scrutinising ledgers, and analytical review of ratios against expectations.',
   300, false),

  ('d1000000-0000-4000-8000-000000000005', null, 'Financial Analyst',
   'What do the three main financial statements show, and how do they link together?',
   'technical', 'easy',
   '["profit and loss statement", "balance sheet", "cash flow statement", "net profit to retained earnings", "depreciation add-back", "closing cash tie-out"]'::jsonb,
   'The profit and loss statement shows performance over a period, the balance sheet shows financial position at a date, and the cash flow statement explains the change in cash. Net profit flows into retained earnings on the balance sheet and starts the cash flow statement, where non-cash items like depreciation are added back; the closing cash ties back to the balance sheet.',
   240, false),

  ('d1000000-0000-4000-8000-000000000006', null, 'Financial Analyst',
   'What is working capital, and what does a negative working capital cycle tell you about a business?',
   'technical', 'medium',
   '["current assets minus current liabilities", "operating cycle", "receivable and inventory days", "payable days", "supplier-financed growth", "liquidity risk"]'::jsonb,
   'Working capital is current assets minus current liabilities, and the cycle measures days from paying suppliers to collecting from customers. A negative cycle means the business collects from customers before it pays suppliers - typical of retailers - so suppliers effectively finance growth; the strong answer also notes the liquidity risk if sales slow while payables still fall due.',
   270, false),

  ('d1000000-0000-4000-8000-000000000007', null, 'Financial Analyst',
   'How would you value a company? Compare the discounted cash flow approach with relative valuation using multiples.',
   'technical', 'hard',
   '["DCF and free cash flows", "discount rate / WACC", "terminal value", "comparable companies", "EV/EBITDA and P/E", "when each method fits", "sanity-checking assumptions"]'::jsonb,
   'DCF projects free cash flows and discounts them at the cost of capital plus a terminal value - theoretically sound but sensitive to assumptions. Relative valuation applies peer multiples like EV/EBITDA or P/E to the company''s metrics - fast and market-anchored but inherits market mispricing. Strong candidates use both: DCF for intrinsic value, multiples as the sanity check, and explain divergences.',
   330, false),

  ('d1000000-0000-4000-8000-000000000008', null, 'Financial Analyst',
   'Explain debt versus equity financing. How does leverage affect a company''s return on equity and its risk?',
   'technical', 'medium',
   '["cost of debt vs equity", "interest tax shield", "trading on equity", "fixed obligation risk", "financial vs business risk"]'::jsonb,
   'Debt is borrowed money with fixed, tax-deductible interest and repayment obligations; equity is owners'' capital with residual claims. When return on capital exceeds the cost of debt, leverage magnifies return on equity (trading on equity), but interest is payable regardless of profits, so leverage also magnifies losses and insolvency risk in downturns.',
   270, false),

  ('d1000000-0000-4000-8000-000000000009', null, 'Economist',
   'Explain the law of demand and its main exceptions. Why can a Giffen good''s demand curve slope upward?',
   'technical', 'medium',
   '["inverse price-quantity relationship", "income and substitution effects", "Giffen goods", "Veblen goods", "necessities and expectations"]'::jsonb,
   'The law of demand says quantity demanded rises as price falls, other things equal, driven by income and substitution effects. Exceptions include Veblen goods bought for prestige, expectations of future price rises, and Giffen goods - inferior necessities where a price rise so reduces real income that consumers cut costlier substitutes and buy more of the good itself.',
   270, false),

  ('d1000000-0000-4000-8000-000000000010', null, 'Economist',
   'What is inflation, how is it measured, and what tools does a central bank use to control it?',
   'technical', 'medium',
   '["sustained rise in price level", "CPI and WPI", "demand-pull vs cost-push", "repo rate", "reserve requirements", "open market operations"]'::jsonb,
   'Inflation is a sustained rise in the general price level, measured by indices such as the consumer price index. To cool demand-pull inflation a central bank tightens monetary policy: raising the repo/policy rate, selling securities through open market operations, and raising reserve requirements - all of which make credit costlier and slow spending. Cost-push inflation responds less to these tools, which a strong answer notes.',
   270, false),

  ('d1000000-0000-4000-8000-000000000011', null, 'Economist',
   'What is the difference between GDP and GNP? And why can real GDP fall even while nominal GDP rises?',
   'technical', 'easy',
   '["domestic territory vs residents", "net factor income from abroad", "nominal vs real", "GDP deflator", "price vs volume effect"]'::jsonb,
   'GDP measures production within a country''s borders; GNP adds net factor income earned abroad by residents and removes income earned domestically by non-residents. Nominal GDP values output at current prices, so high inflation can raise it even when the actual volume of output - real GDP, valued at base-year prices - is shrinking.',
   240, false),

  ('d1000000-0000-4000-8000-000000000012', null, 'Marketing Executive',
   'Take a product you admire and walk me through its marketing mix - the 4 Ps. Which P do you think drives its success the most?',
   'technical', 'medium',
   '["product", "price", "place", "promotion", "consistency of the mix", "reasoned judgment"]'::jsonb,
   'The candidate should map a real product across product (features, quality, brand), price (strategy relative to positioning), place (distribution channels) and promotion (advertising, sales promotion, digital), then argue which P is decisive with evidence. The signal is coherent reasoning about how the four reinforce each other, not textbook recitation.',
   300, false),

  ('d1000000-0000-4000-8000-000000000013', null, 'Marketing Executive',
   'What is market segmentation? How would you segment the market for a new digital payments app?',
   'technical', 'medium',
   '["demographic segmentation", "geographic segmentation", "psychographic segmentation", "behavioral segmentation", "targeting and positioning", "actionable segments"]'::jsonb,
   'Segmentation divides a heterogeneous market into groups with similar needs so each can be targeted with a tailored mix. For a payments app: demographic (students, salaried, small merchants), behavioral (online shoppers, bill payers, first-time UPI users), geographic (metro vs small town) and psychographic (convenience-seekers vs cashback-hunters), followed by choosing target segments and a positioning for each.',
   300, false),

  ('d1000000-0000-4000-8000-000000000014', null, 'Tax Consultant',
   'Explain the difference between direct and indirect taxes with examples. How does GST avoid the cascading effect of the older indirect tax system?',
   'technical', 'medium',
   '["incidence vs impact", "income tax as direct", "GST as indirect", "tax on tax problem", "input tax credit", "value-added taxation"]'::jsonb,
   'A direct tax, like income tax, is paid by the person who bears it and cannot be shifted; an indirect tax, like GST, is collected by sellers but borne by the final consumer. The old system taxed values that already included earlier taxes - the cascading "tax on tax" effect. GST fixes this with input tax credit: each business offsets tax paid on purchases against tax collected on sales, so only the value added at each stage is taxed.',
   300, false),

  ('d1000000-0000-4000-8000-000000000015', null, 'Auditor',
   'What is the difference between an internal audit and a statutory audit? And what does a qualified opinion in an audit report signify?',
   'technical', 'medium',
   '["management-appointed vs law-mandated", "independence", "scope and continuous vs annual", "types of audit opinions", "materiality", "except-for language"]'::jsonb,
   'Internal audit is appointed by management to continuously review controls and operations; statutory audit is mandated by law, performed by an independent auditor who reports to shareholders on whether the financial statements show a true and fair view. A qualified opinion says the statements are fairly presented EXCEPT for specific material matters the auditor describes - less severe than an adverse opinion or a disclaimer.',
   300, false),

  ('d1000000-0000-4000-8000-000000000016', null, 'Banking & Insurance',
   'What is a non-performing asset? Why do rising NPAs reduce a bank''s capacity to lend?',
   'technical', 'medium',
   '["90-day overdue rule", "provisioning requirements", "capital adequacy", "interest income stops accruing", "credit squeeze cycle"]'::jsonb,
   'A loan becomes a non-performing asset when interest or principal stays overdue beyond the prescribed period, commonly 90 days. NPAs stop earning interest while forcing the bank to set aside provisions out of profits, eroding capital; since lending capacity is tied to capital adequacy norms, high NPAs shrink the funds available for fresh credit and make banks more risk-averse.',
   300, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- HR interview questions (10)
-- ----------------------------------------------------------------------------
insert into public.questions
  (id, created_by, category, question, question_type, difficulty, expected_topics, ideal_answer, time_limit_seconds, is_ai_generated)
values
  ('d1000000-0000-4000-8000-000000000017', null, 'HR',
   'Tell me about yourself and your professional background.',
   'hr', 'easy',
   '["concise narrative", "relevant experience", "career motivation", "role fit"]'::jsonb,
   'A strong answer is a two-minute narrative connecting past roles and achievements to the position at hand. It highlights relevant skills with one or two concrete results and ends with why this role is the logical next step.',
   180, false),

  ('d1000000-0000-4000-8000-000000000018', null, 'HR',
   'Why do you want to work at this company?',
   'hr', 'easy',
   '["company research", "mission alignment", "specific products or values", "mutual fit"]'::jsonb,
   'The answer should reference specific, researched facts about the company - product, mission, culture, or growth - and connect them to the candidate''s goals and strengths. Generic praise without specifics signals low preparation.',
   150, false),

  ('d1000000-0000-4000-8000-000000000019', null, 'HR',
   'Where do you see yourself in five years?',
   'hr', 'easy',
   '["realistic ambition", "growth path", "alignment with role", "commitment"]'::jsonb,
   'A good answer shows a realistic growth trajectory that the role plausibly supports, such as deepening expertise, leading projects, or mentoring others. It balances ambition with commitment to delivering value in the current position.',
   150, false),

  ('d1000000-0000-4000-8000-000000000020', null, 'HR',
   'What are your salary expectations, and how did you arrive at that number?',
   'hr', 'medium',
   '["market research", "range not a point", "flexibility", "value justification"]'::jsonb,
   'Strong candidates give a researched range based on market data for the role, location, and their experience, and explain the basis briefly. They stay open to discussing the full package rather than anchoring on a single rigid number.',
   150, false),

  ('d1000000-0000-4000-8000-000000000021', null, 'HR',
   'Why are you leaving your current role?',
   'hr', 'medium',
   '["positive framing", "growth motivation", "no badmouthing", "pull not push"]'::jsonb,
   'The best answers are framed around what the candidate is moving toward - growth, scope, responsibility, impact - rather than complaints about the current employer. Honest but professional framing without negativity is the key signal.',
   150, false),

  ('d1000000-0000-4000-8000-000000000022', null, 'HR',
   'What motivates you to do your best work?',
   'hr', 'easy',
   '["self-awareness", "intrinsic motivation", "examples", "alignment with role"]'::jsonb,
   'A convincing answer names specific motivators - solving hard problems, visible client impact, team success - and backs each with a brief real example. It ideally maps those motivators to what the role actually offers.',
   150, false),

  ('d1000000-0000-4000-8000-000000000023', null, 'HR',
   'How do you handle constructive criticism?',
   'hr', 'medium',
   '["receptiveness", "concrete example", "behavior change", "follow-up"]'::jsonb,
   'Look for a concrete story: feedback received, the candidate''s initial reaction, and the specific change they made afterwards. The strongest answers show the candidate actively seeking feedback rather than merely tolerating it.',
   180, false),

  ('d1000000-0000-4000-8000-000000000024', null, 'HR',
   'What is your greatest professional strength? Give an example of it in action.',
   'hr', 'easy',
   '["relevant strength", "evidence", "measurable result", "honesty"]'::jsonb,
   'The candidate should pick a strength genuinely relevant to the role and prove it with a specific situation and measurable outcome. Claiming a strength without evidence, or listing many strengths superficially, weakens the answer.',
   180, false),

  ('d1000000-0000-4000-8000-000000000025', null, 'HR',
   'Describe your ideal work environment.',
   'hr', 'easy',
   '["culture fit", "collaboration style", "autonomy vs structure", "honesty about preferences"]'::jsonb,
   'A useful answer describes concrete conditions - collaboration style, feedback culture, autonomy level, pace - where the candidate does their best work. It should be honest enough to assess real fit rather than echoing the company''s website.',
   150, false),

  ('d1000000-0000-4000-8000-000000000026', null, 'HR',
   'Do you prefer working independently or in a team? Why?',
   'hr', 'easy',
   '["flexibility", "self-awareness", "examples of both", "context dependence"]'::jsonb,
   'Strong candidates avoid a binary answer: they explain when they thrive solo (deep focus work) and when collaboration is essential (planning, review, unblocking), with a short example of each. The signal is adaptability plus self-awareness.',
   150, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Behavioral interview questions (10, STAR-style)
-- ----------------------------------------------------------------------------
insert into public.questions
  (id, created_by, category, question, question_type, difficulty, expected_topics, ideal_answer, time_limit_seconds, is_ai_generated)
values
  ('d1000000-0000-4000-8000-000000000027', null, 'Behavioral',
   'Tell me about a time you had to meet a very tight deadline. What was the situation and what did you do?',
   'behavioral', 'medium',
   '["STAR structure", "prioritization", "scope negotiation", "communication", "outcome"]'::jsonb,
   'A strong STAR answer names the deadline and stakes, explains how the candidate prioritized ruthlessly and communicated trade-offs, and ends with a concrete outcome. Cutting scope transparently beats silently cutting quality.',
   240, false),

  ('d1000000-0000-4000-8000-000000000028', null, 'Behavioral',
   'Describe a time you disagreed with a teammate or manager. How did you handle it?',
   'behavioral', 'medium',
   '["respectful disagreement", "data-driven argument", "listening", "commitment to decision"]'::jsonb,
   'Look for a real disagreement handled with curiosity: the candidate presented evidence, genuinely listened to the other side, and worked toward the best decision rather than winning. Disagree-and-commit after a fair hearing is a strong ending.',
   240, false),

  ('d1000000-0000-4000-8000-000000000029', null, 'Behavioral',
   'Tell me about a time you failed at something. What happened and what did you learn?',
   'behavioral', 'medium',
   '["ownership", "root cause honesty", "lesson learned", "changed behavior"]'::jsonb,
   'The best answers own a genuine failure without deflecting blame, identify the real root cause, and show a specific behavior change that prevented recurrence. A trivial or disguised-success "failure" is a weak signal.',
   240, false),

  ('d1000000-0000-4000-8000-000000000030', null, 'Behavioral',
   'Describe a situation where you had to learn a new skill or tool very quickly - say a new accounting package, analytics tool, or process.',
   'behavioral', 'easy',
   '["learning strategy", "resourcefulness", "applying under pressure", "result"]'::jsonb,
   'A good answer explains the forcing event, the candidate''s deliberate learning approach - guides, practice runs, experts - and how they applied the skill to a real deliverable quickly. The outcome should show competence achieved, not just effort.',
   210, false),

  ('d1000000-0000-4000-8000-000000000031', null, 'Behavioral',
   'Tell me about a time you went above and beyond what was required for a project or customer.',
   'behavioral', 'easy',
   '["initiative", "customer empathy", "impact", "judgment about effort"]'::jsonb,
   'Strong answers show self-directed initiative with clear impact: the candidate spotted an unowned problem, chose to solve it, and someone measurably benefited. Judgment matters - the extra effort should have been worth it.',
   210, false),

  ('d1000000-0000-4000-8000-000000000032', null, 'Behavioral',
   'Describe a time you had to deliver difficult feedback to someone. How did you approach it?',
   'behavioral', 'hard',
   '["directness with empathy", "specific examples", "private setting", "follow-up support"]'::jsonb,
   'The candidate should describe preparing specifics, delivering the message directly but privately and with empathy, and supporting the person afterwards. The outcome ideally shows the relationship and the work both improved.',
   240, false),

  ('d1000000-0000-4000-8000-000000000033', null, 'Behavioral',
   'Tell me about a time you had to juggle multiple competing priorities. How did you decide what to do first?',
   'behavioral', 'medium',
   '["prioritization framework", "stakeholder communication", "saying no", "outcome"]'::jsonb,
   'Look for an explicit prioritization method - impact versus urgency, stakeholder input, deadlines - and proactive communication about what would slip. Quietly working longer hours without re-negotiating scope is the weaker pattern.',
   240, false),

  ('d1000000-0000-4000-8000-000000000034', null, 'Behavioral',
   'Describe a situation where you influenced a decision without having formal authority.',
   'behavioral', 'hard',
   '["building credibility", "evidence and analysis", "coalition building", "persistence"]'::jsonb,
   'Strong answers show influence through evidence and relationships: the candidate built a case with data or a worked example, enlisted allies, and addressed objections. The decision changing because of their work, not their title, is the point.',
   240, false),

  ('d1000000-0000-4000-8000-000000000035', null, 'Behavioral',
   'Tell me about a time you were given an ambiguous problem with little guidance. What did you do?',
   'behavioral', 'medium',
   '["clarifying questions", "breaking down the problem", "assumptions made explicit", "iteration"]'::jsonb,
   'The candidate should show they reduced ambiguity deliberately: asked clarifying questions, defined the problem and success criteria, made assumptions explicit, and iterated with feedback. Waiting passively for direction is the anti-pattern.',
   240, false),

  ('d1000000-0000-4000-8000-000000000036', null, 'Behavioral',
   'Describe a time you made a mistake at work. How did you own it and fix it?',
   'behavioral', 'medium',
   '["fast disclosure", "mitigation", "root cause fix", "prevention"]'::jsonb,
   'The strongest pattern is immediate disclosure, quick mitigation of the impact, then a durable fix and a prevention step such as a checklist or review. Hiding the mistake or blaming circumstances are the red flags this question probes.',
   240, false)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- MCQ questions (48): 8 Accountancy, 8 Business Studies, 8 Economics,
-- 6 Finance, 6 Marketing, 6 Taxation, 3 Banking, 3 Business Law.
-- correct_option values verified.
-- ----------------------------------------------------------------------------
insert into public.mcq_questions
  (id, created_by, category, question, option_a, option_b, option_c, option_d, correct_option, explanation, difficulty)
values
  -- Accountancy (8)
  ('d2000000-0000-4000-8000-000000000001', null, 'Accountancy',
   'According to the dual aspect concept, every business transaction affects:',
   'Only the cash account', 'At least two accounts', 'Only one account', 'Only asset accounts',
   'b',
   'The dual aspect concept is the foundation of double-entry book-keeping: every transaction has a debit and an equal credit, so at least two accounts are always affected. This is what keeps the accounting equation (Assets = Liabilities + Capital) permanently in balance.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000002', null, 'Accountancy',
   'Which of the following is a nominal account?',
   'Machinery account', 'Capital account', 'Rent account', 'Debtors account',
   'c',
   'Nominal accounts record expenses, losses, incomes, and gains - rent is an expense. Machinery is a real account (asset), while capital and debtors are personal accounts. The rule for nominal accounts: debit all expenses and losses, credit all incomes and gains.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000003', null, 'Accountancy',
   'The accounting equation is: Assets =',
   'Capital - Liabilities', 'Liabilities - Capital', 'Liabilities + Capital', 'Drawings + Liabilities',
   'c',
   'Everything a business owns (assets) is financed either by outsiders (liabilities) or by the owners (capital), so Assets = Liabilities + Capital always holds. Every transaction changes the equation''s components but never its equality.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000004', null, 'Accountancy',
   'Prepaid insurance appears in the final accounts as:',
   'A current liability in the balance sheet', 'A current asset in the balance sheet', 'Only an expense in the profit and loss account', 'A contingent liability',
   'b',
   'Insurance paid in advance is a benefit the business is yet to receive, so it is an asset. The prepaid portion is deducted from the insurance expense in the profit and loss account and shown as a current asset in the balance sheet - an application of the accrual/matching concept.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000005', null, 'Accountancy',
   'A machine costs 5,00,000 with an estimated scrap value of 50,000 and a useful life of 9 years. Under the straight-line method, annual depreciation is:',
   '45,000', '50,000', '55,556', '61,111',
   'b',
   'Straight-line depreciation = (Cost - Scrap value) / Useful life = (5,00,000 - 50,000) / 9 = 4,50,000 / 9 = 50,000 per year. A common mistake is forgetting to subtract the scrap value before dividing.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000006', null, 'Accountancy',
   'A cheque issued to a supplier has not yet been presented to the bank. Compared with the cash-book balance, the bank statement (pass book) balance will be:',
   'Lower', 'Higher', 'Exactly equal', 'Shown as overdrawn',
   'b',
   'The cash book was reduced the day the cheque was issued, but the bank pays only when the cheque is presented. Until then the bank statement shows a higher balance - one of the classic timing differences a bank reconciliation statement explains.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000007', null, 'Accountancy',
   'Which of these errors will NOT affect the agreement of the trial balance?',
   'Posting 500 to the wrong side of an account', 'Completely omitting a transaction from the books', 'A casting (totalling) error in the sales book', 'Posting only the debit aspect of a transaction',
   'b',
   'An error of complete omission leaves both the debit and the credit out, so the trial balance still tallies. The other errors break the debit-credit equality. This is why a tallied trial balance is not proof of accuracy - such errors surface only through vouching and reconciliation.',
   'hard'),

  ('d2000000-0000-4000-8000-000000000008', null, 'Accountancy',
   'Goodwill is classified as which type of asset?',
   'Current asset', 'Fictitious asset', 'Intangible asset', 'Wasting asset',
   'c',
   'Goodwill has no physical form but has real value - the firm''s reputation and earning power - so it is an intangible asset. It is not fictitious: fictitious assets (like deferred revenue expenditure) have no realisable value at all, whereas goodwill can be sold with the business.',
   'easy'),

  -- Business Studies (8)
  ('d2000000-0000-4000-8000-000000000009', null, 'Business Studies',
   'Which function of management comes FIRST in the management process?',
   'Planning', 'Organising', 'Staffing', 'Controlling',
   'a',
   'Planning decides in advance what to do, how, when, and by whom - every other function (organising resources, staffing roles, directing people, controlling results) implements or checks the plan. Controlling closes the loop by comparing outcomes against the plan.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000010', null, 'Business Studies',
   'Fayol''s principle of "unity of command" states that:',
   'All plans must come from one central committee', 'An employee should receive orders from only one superior', 'Every department must have exactly one function', 'Command should rotate among managers',
   'b',
   'Unity of command means each subordinate reports to a single boss, preventing conflicting instructions, divided loyalty, and blurred accountability. It differs from unity of direction, which says activities with the same objective should follow one plan under one head.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000011', null, 'Business Studies',
   '"Span of management" refers to:',
   'The total lifespan of an organisation', 'The number of levels in the hierarchy', 'The number of subordinates a manager can effectively supervise', 'The geographic spread of company branches',
   'c',
   'Span of management (or span of control) is how many subordinates one manager directly supervises. A wider span produces a flatter organisation with fewer levels; a narrower span produces a taller one with tighter supervision but slower communication.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000012', null, 'Business Studies',
   'Which of the following is a feature of a private limited company?',
   'Its shares are freely traded on a stock exchange', 'It restricts the transfer of its shares', 'It must have at least seven members', 'It has no separate legal existence',
   'b',
   'A private company restricts share transfer through its articles, caps its membership (200 in India, excluding employees), and cannot invite the public to subscribe. Free trading on an exchange and the seven-member minimum describe public companies; every company has a separate legal existence.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000013', null, 'Business Studies',
   'The liability of a sole proprietor is:',
   'Limited to capital invested', 'Limited to business assets', 'Unlimited', 'Shared equally with employees',
   'c',
   'A sole proprietorship has no separate legal identity, so business debts are the owner''s personal debts - private property can be used to pay them. Limited liability exists only in forms like companies and LLPs, where the entity is legally separate from its owners.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000014', null, 'Business Studies',
   'In delegation of authority, which element can NEVER be passed on to a subordinate?',
   'Authority', 'Responsibility for the task', 'Accountability', 'Decision-making power',
   'c',
   'A manager can grant authority and assign responsibility for tasks, but accountability to their own superior for the final outcome always remains with the delegator. This is why delegation does not mean abdication - the manager still answers for results.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000015', null, 'Business Studies',
   'In Maslow''s hierarchy, once physiological and safety needs are satisfied, the NEXT need to emerge is:',
   'Self-actualisation', 'Esteem needs', 'Social / belongingness needs', 'Job security',
   'c',
   'Maslow''s order is: physiological, safety, social (affection, belonging, acceptance), esteem, then self-actualisation. Job security is part of safety needs, and esteem comes only after social needs are reasonably met.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000016', null, 'Business Studies',
   'Under Taylor''s differential piece-wage system, workers are paid:',
   'A flat monthly salary regardless of output', 'The same piece rate for all output levels', 'A higher piece rate for meeting or beating the standard and a lower rate below it', 'Only bonuses, with no base wage',
   'c',
   'Taylor set a standard output scientifically and used two piece rates - a higher rate for workers who reach the standard and a lower rate for those who fall short - to reward efficiency and push the inefficient to improve. It is a core technique of scientific management.',
   'hard'),

  -- Economics (8)
  ('d2000000-0000-4000-8000-000000000017', null, 'Economics',
   'Microeconomics primarily studies:',
   'National income and aggregate employment', 'The behaviour of individual units like consumers and firms', 'Only government fiscal policy', 'The overall price level of the economy',
   'b',
   'Microeconomics analyses individual decision units - a consumer''s choices, a firm''s output and pricing, a single market''s equilibrium. Aggregates like national income, overall employment, and the general price level belong to macroeconomics.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000018', null, 'Economics',
   'The production possibility curve is concave to the origin because of:',
   'Constant opportunity cost', 'Increasing opportunity cost', 'Decreasing opportunity cost', 'Unemployment of resources',
   'b',
   'Resources are not equally efficient in all uses, so producing more of one good means sacrificing increasing amounts of the other - the marginal opportunity cost rises along the curve, giving it the concave (bowed-out) shape. Constant opportunity cost would make it a straight line.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000019', null, 'Economics',
   'If demand for a product is price-elastic, a FALL in its price will:',
   'Decrease total revenue', 'Increase total revenue', 'Leave total revenue unchanged', 'First raise then lower total revenue',
   'b',
   'With elastic demand, the percentage rise in quantity demanded exceeds the percentage fall in price, so total revenue (price x quantity) increases. With inelastic demand the opposite holds - which is why sellers of necessities rarely cut prices to boost revenue.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000020', null, 'Economics',
   'The GDP deflator is calculated as:',
   'Real GDP divided by Nominal GDP, times 100', 'Nominal GDP divided by Real GDP, times 100', 'Nominal GDP minus Real GDP', 'CPI divided by WPI, times 100',
   'b',
   'GDP deflator = (Nominal GDP / Real GDP) x 100. It measures how much of nominal growth is just price change: if nominal GDP rises 10% but real GDP rises 4%, the deflator captures the roughly 6% inflation across all domestically produced goods and services.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000021', null, 'Economics',
   'The repo rate is the rate at which:',
   'Commercial banks lend to their best corporate customers', 'The central bank lends short-term funds to commercial banks against securities', 'Banks lend to each other overnight', 'The government borrows from foreign institutions',
   'b',
   'Under a repurchase (repo) agreement, commercial banks borrow short-term from the central bank by selling securities with a promise to buy them back. Raising the repo rate makes bank funding costlier, which tightens credit and cools inflation; cutting it does the reverse.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000022', null, 'Economics',
   'Inflation experienced by households is most directly measured by:',
   'The GDP deflator', 'The Wholesale Price Index', 'The Consumer Price Index', 'The index of industrial production',
   'c',
   'The CPI tracks the retail prices of a basket of goods and services that households actually consume, which is why it anchors inflation targeting and cost-of-living adjustments. The WPI tracks wholesale transactions, and the deflator covers all domestic production, not just consumption.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000023', null, 'Economics',
   'A Giffen good is:',
   'A luxury bought mainly to display status', 'An inferior good whose demand rises when its price rises', 'Any good with perfectly elastic demand', 'A good with no substitutes at any price',
   'b',
   'A Giffen good is a special inferior necessity (the classic example is a staple food of the poor): when its price rises, real income falls so sharply that consumers abandon costlier substitutes and buy MORE of it. Status-display goods are Veblen goods - a different exception to the law of demand.',
   'hard'),

  ('d2000000-0000-4000-8000-000000000024', null, 'Economics',
   'Fiscal policy refers to decisions about:',
   'The money supply and interest rates', 'Government taxation and public expenditure', 'Foreign exchange intervention only', 'Commercial bank reserve requirements',
   'b',
   'Fiscal policy is the government''s use of taxation, public spending, and borrowing to influence the economy. Money supply, interest rates, and reserve requirements are monetary policy, run by the central bank.',
   'medium'),

  -- Finance (6)
  ('d2000000-0000-4000-8000-000000000025', null, 'Finance',
   'The time value of money says a rupee today is worth more than a rupee next year primarily because:',
   'Currency notes physically wear out', 'Money today can be invested to earn a return', 'Prices always fall over time', 'Banks charge fees on old deposits',
   'b',
   'Money in hand can be invested to grow, so its value today exceeds the same nominal amount received later - the foundation of discounting, present value, and every valuation technique. Inflation and uncertainty reinforce the preference, but the earning capacity is the core reason.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000026', null, 'Finance',
   '10,000 invested at 10% per annum compounded annually grows in 2 years to:',
   '12,000', '12,100', '11,000', '12,214',
   'b',
   'Compound value = 10,000 x (1.10)^2 = 10,000 x 1.21 = 12,100. Simple interest would give 12,000; the extra 100 is interest earned on the first year''s interest - the essence of compounding.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000027', null, 'Finance',
   'A consistently higher current ratio generally indicates:',
   'Higher long-term solvency', 'Better short-term liquidity', 'Higher profitability', 'Lower working capital',
   'b',
   'The current ratio (current assets / current liabilities) tests the ability to pay near-term obligations - liquidity. A very high ratio can even signal idle funds or slow-moving inventory. Long-term solvency is measured by debt-equity and interest-coverage ratios, and profitability by margin and return ratios.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000028', null, 'Finance',
   'The cost of debt is usually LOWER than the cost of equity because:',
   'Lenders expect the business to fail', 'Interest is tax-deductible and lenders bear less risk than shareholders', 'Equity never has to be repaid', 'Debt is always unsecured',
   'b',
   'Interest payments reduce taxable profit (the tax shield), and debt holders have a priority, contractual claim on cash flows and assets, so they accept a lower return than residual-claim shareholders. This is also why moderate leverage can lower the overall cost of capital.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000029', null, 'Finance',
   'Under the net present value rule, a project should be accepted when:',
   'Its NPV is greater than zero', 'Its payback period is longest', 'Its NPV equals its initial investment', 'Its internal rate of return is below the cost of capital',
   'a',
   'NPV discounts all expected cash flows at the required rate of return and subtracts the initial investment; a positive NPV means the project earns more than the capital it consumes and adds value. An IRR below the cost of capital corresponds to a negative NPV - a rejection.',
   'hard'),

  ('d2000000-0000-4000-8000-000000000030', null, 'Finance',
   'A "bull market" is a market in which:',
   'Prices are falling steadily', 'Prices are rising or expected to rise', 'Trading is suspended', 'Only government bonds are traded',
   'b',
   'Bulls buy expecting prices to rise, so a sustained rising market is called a bull market; its opposite, marked by falling prices and pessimism, is a bear market. The names come from how the animals attack - a bull tosses upward, a bear swipes downward.',
   'easy'),

  -- Marketing (6)
  ('d2000000-0000-4000-8000-000000000031', null, 'Marketing',
   'The four Ps of the marketing mix are:',
   'Product, Price, Place, Promotion', 'People, Profit, Process, Product', 'Plan, Price, Position, People', 'Product, Publicity, Power, Place',
   'a',
   'McCarthy''s classic mix is Product (what you sell), Price (what it costs), Place (how it reaches buyers), and Promotion (how you communicate). Services marketing extends it with People, Process, and Physical evidence - the 7 Ps.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000032', null, 'Marketing',
   'USP stands for:',
   'Universal Sales Process', 'Unique Selling Proposition', 'Unified Service Plan', 'Ultimate Store Placement',
   'b',
   'A unique selling proposition is the distinctive benefit that sets a product apart from competitors - the one claim competitors cannot easily make. Effective positioning and advertising are built around a clear USP.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000033', null, 'Marketing',
   'Price skimming means:',
   'Launching at a low price to win share quickly', 'Launching at a high price, then lowering it over time', 'Pricing exactly at competitor levels', 'Selling below cost permanently',
   'b',
   'Skimming sets a high introductory price to capture early adopters who value the innovation most, then steps the price down to reach successive segments. Its opposite, penetration pricing, launches low to build volume and share quickly.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000034', null, 'Marketing',
   'Segmenting a market by consumers'' lifestyle, values, and personality is called:',
   'Demographic segmentation', 'Geographic segmentation', 'Psychographic segmentation', 'Behavioural segmentation',
   'c',
   'Psychographic segmentation groups buyers by psychological traits - lifestyle, values, interests, personality. Demographics cover age, income, and occupation; geography covers location; behavioural segmentation looks at usage rate, loyalty, and purchase occasions.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000035', null, 'Marketing',
   'In the AIDA model of promotion, the letters stand for:',
   'Analyse, Identify, Decide, Act', 'Attention, Interest, Desire, Action', 'Advertise, Inform, Demonstrate, Achieve', 'Attract, Invest, Deliver, Assess',
   'b',
   'AIDA maps the buyer''s journey a promotional message should walk: capture Attention, build Interest, arouse Desire, and prompt Action (the purchase). It remains the base framework for ad copy, sales funnels, and campaign design.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000036', null, 'Marketing',
   'In the DECLINE stage of the product life cycle, the typical strategy is to:',
   'Invest heavily in brand building', 'Harvest the product or divest it', 'Expand distribution to new channels aggressively', 'Raise the price to premium levels',
   'b',
   'In decline, sales and profits shrink structurally, so firms cut support costs and "milk" remaining sales (harvesting), or drop/sell the product line (divesting). Heavy investment and aggressive expansion belong to the growth stage.',
   'hard'),

  -- Taxation (6)
  ('d2000000-0000-4000-8000-000000000037', null, 'Taxation',
   'GST is best described as a:',
   'Direct tax on corporate profits', 'Destination-based indirect tax on the supply of goods and services', 'Tax only on imported goods', 'State tax on agricultural income',
   'b',
   'GST is an indirect, value-added tax levied on supplies of goods and services and collected in the state where they are consumed (destination-based), replacing a web of earlier levies like excise, service tax, and VAT. Taxes on imports alone are customs duties.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000038', null, 'Taxation',
   'Which of the following is a DIRECT tax?',
   'Goods and Services Tax', 'Customs duty', 'Income tax', 'Excise duty',
   'c',
   'Income tax is paid by the person who bears it - its burden cannot be shifted to someone else, which is the defining feature of a direct tax. GST, customs, and excise are indirect taxes: the seller or importer deposits them but passes the burden to the final consumer.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000039', null, 'Taxation',
   'Input tax credit under GST allows a registered business to:',
   'Skip filing returns for small turnovers', 'Set off tax paid on purchases against tax collected on sales', 'Charge two different rates to different customers', 'Claim refund of income tax paid',
   'b',
   'ITC lets a business deduct the GST already paid on its inputs from the GST it collects on outputs, remitting only the difference. This taxes only the value added at each stage and eliminates the cascading "tax on tax" of the pre-GST system.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000040', null, 'Taxation',
   'Income earned during the financial year 2024-25 is assessed to income tax in the assessment year:',
   '2023-24', '2024-25', '2025-26', '2026-27',
   'c',
   'Income of a "previous year" is assessed in the following "assessment year": income earned in FY 2024-25 (ending 31 March 2025) is returned and assessed in AY 2025-26. The one-year gap gives taxpayers time to close books and file returns.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000041', null, 'Taxation',
   'An INTER-state supply of goods under GST attracts:',
   'CGST plus SGST', 'IGST', 'Only SGST', 'Customs duty',
   'b',
   'Supplies within one state attract CGST + SGST (shared by centre and state); supplies across state lines attract IGST, collected by the centre and apportioned to the destination state. This routing is what makes GST destination-based across states.',
   'hard'),

  ('d2000000-0000-4000-8000-000000000042', null, 'Taxation',
   'TDS (Tax Deducted at Source) means:',
   'The taxpayer deposits advance tax in four instalments', 'The payer deducts tax while making specified payments and deposits it with the government', 'Tax is collected only at year end', 'A discount given for early tax payment',
   'b',
   'Under TDS, the person paying salary, rent, interest, professional fees, etc. deducts a prescribed percentage before payment and deposits it against the payee''s PAN. The payee then claims credit for it when filing their return - taxing income as it is earned.',
   'medium'),

  -- Banking (3)
  ('d2000000-0000-4000-8000-000000000043', null, 'Banking',
   'The Cash Reserve Ratio (CRR) is the share of a bank''s deposits that must be:',
   'Lent to priority sectors', 'Kept with the central bank in cash', 'Invested in government bonds', 'Held as gold reserves',
   'b',
   'CRR is the fraction of a bank''s net demand and time liabilities parked with the central bank as cash, earning no interest. Raising it drains lendable funds and tightens liquidity. The requirement to hold government securities is the Statutory Liquidity Ratio (SLR), a separate tool.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000044', null, 'Banking',
   'A loan account is normally classified as a non-performing asset when interest or principal remains overdue for more than:',
   '30 days', '60 days', '90 days', '180 days',
   'c',
   'The standard prudential norm treats a loan as an NPA once payments are overdue beyond 90 days. The bank must then stop accruing the interest as income and make provisions, which is why rising NPAs directly dent profitability and capital.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000045', null, 'Banking',
   'Crossing a cheque with two parallel lines means the cheque:',
   'Becomes invalid', 'Can be encashed by anyone over the counter', 'Must be paid into a bank account, not encashed across the counter', 'Can only be used for government payments',
   'c',
   'A crossed cheque can only be credited to a bank account, creating a traceable trail of who received the money - protection if the cheque is lost or stolen. Adding "account payee" restricts it further to the named payee''s own account.',
   'medium'),

  -- Business Law (3)
  ('d2000000-0000-4000-8000-000000000046', null, 'Business Law',
   'Under contract law, an agreement enforceable by law is a:',
   'Promise', 'Proposal', 'Contract', 'Guarantee',
   'c',
   'The classic definition: all contracts are agreements, but only agreements enforceable by law - made with free consent, lawful consideration and object, by competent parties - are contracts. A proposal (offer) and its acceptance create the agreement that may ripen into a contract.',
   'easy'),

  ('d2000000-0000-4000-8000-000000000047', null, 'Business Law',
   'The minimum number of members required to form a PUBLIC limited company is:',
   '2', '5', '7', '10',
   'c',
   'A public company needs at least 7 members (with no upper limit), while a private company needs just 2 and an OPC exactly 1. The public company must also have a minimum of three directors.',
   'medium'),

  ('d2000000-0000-4000-8000-000000000048', null, 'Business Law',
   'An agreement entered into with a minor is:',
   'Valid if a guardian later approves it', 'Voidable at the minor''s option', 'Void from the very beginning', 'Valid only for small amounts',
   'c',
   'A minor is not competent to contract, so the agreement is void ab initio - it never becomes a contract at all, as laid down in the landmark Mohori Bibee case. It cannot be ratified even after the minor attains majority; a fresh agreement would be needed.',
   'medium')
on conflict (id) do nothing;
