-- The templates table was created empty, so the Templates page had nothing to
-- show. These are starter blueprints that map onto the agents this app
-- actually has: troubleshooting (general), database, devops, code, visual.
--
-- config.prompt is what "Use template" hands to the Diagnose tool, and
-- config.agentType records which specialist the prompt is aimed at.
-- Idempotent: re-running adds nothing, so it is safe if the folder is ever
-- re-applied by hand.

INSERT INTO templates (name, description, category, config, required_tools, required_model, is_system, is_featured)
SELECT * FROM (VALUES
  (
    'API returns 500',
    'A service that was working suddenly starts failing on every request. Finds the real cause instead of guessing at the stack trace.',
    'development',
    '{"prompt":"Our API started returning HTTP 500 on every request about 30 minutes ago, with no deploy since. Walk me through the most likely causes in order and the fastest way to confirm each one.","agentType":"general","icon":"fa-triangle-exclamation"}'::jsonb,
    '[]'::jsonb, true, true, true
  ),
  (
    'Slow database query',
    'A query that was fast is now slow. Covers indexes, locking, statistics and connection pooling.',
    'data',
    '{"prompt":"A production SQL query that used to finish in under 200ms now takes over 30 seconds. The table is about 40 million rows. Give me a prioritised list of what to check, including the exact diagnostic queries to run.","agentType":"database","icon":"fa-database"}'::jsonb,
    '[]'::jsonb, true, true, true
  ),
  (
    'Connection pool exhausted',
    'Requests are failing because the app cannot get a database connection.',
    'data',
    '{"prompt":"Our application is throwing \"too many clients already\" and connections are not being released. Explain the likely causes of connection leaks and how to find the leaking code path.","agentType":"database","icon":"fa-plug-circle-xmark"}'::jsonb,
    '[]'::jsonb, true, false, true
  ),
  (
    'Index design review',
    'Reviews a table design and points out the indexes that are missing.',
    'data',
    '{"prompt":"Review this table design and tell me which indexes I am missing, which existing ones are redundant, and how the planner is likely to use them. Include partial and composite index suggestions where they help.","agentType":"database","icon":"fa-layer-group"}'::jsonb,
    '[]'::jsonb, true, false, false
  ),
  (
    'Container will not start',
    'A Docker or Kubernetes workload exits immediately on startup.',
    'development',
    '{"prompt":"My Docker container exits immediately after starting with no obvious error. Give me an ordered debugging checklist from the most common causes, including the exact commands to run.","agentType":"devops","icon":"fa-cube"}'::jsonb,
    '[]'::jsonb, true, true, true
  ),
  (
    'Pipeline failing intermittently',
    'A build or CI job fails sometimes but passes on retry.',
    'productivity',
    '{"prompt":"Our CI pipeline fails roughly one run in five with no pattern. Help me narrow down the causes and design a debugging plan that will actually find the flake rather than hide it.","agentType":"devops","icon":"fa-diagram-successor-step"}'::jsonb,
    '[]'::jsonb, true, true, true
  ),
  (
    'Out of memory under load',
    'A service is killed by the OOM killer only when traffic is high.',
    'development',
    '{"prompt":"A Node service is killed by the OOM killer under load but is fine locally. Help me identify the memory growth, and tell me what to measure and how.","agentType":"general","icon":"fa-memory"}'::jsonb,
    '[]'::jsonb, true, false, true
  ),
  (
    'Null pointer / undefined error',
    'Reads a stack trace and works backwards to the offending line.',
    'development',
    '{"prompt":"Here is a stack trace from my application. Identify the failing line, explain why the value is null or undefined there, and give me the fix plus a guard to stop it happening again.","agentType":"code","icon":"fa-bug"}'::jsonb,
    '[]'::jsonb, true, true, false
  ),
  (
    'Refactor with tests first',
    'Plans a refactor and the tests that lock in current behaviour first.',
    'development',
    '{"prompt":"I want to refactor this module but I am afraid of regressions. Give me a plan that writes characterisation tests first, then refactors in small safe steps, and tells me what to do at each stage.","agentType":"code","icon":"fa-code-branch"}'::jsonb,
    '[]'::jsonb, true, false, false
  ),
  (
    'Triage an error screenshot',
    'Reads a screenshot or stack trace image and explains what is on screen.',
    'customer_support',
    '{"prompt":"I have a screenshot of an error dialog. Describe exactly what it says, infer the most likely cause, and give me the first three things to try.","agentType":"visual","icon":"fa-image"}'::jsonb,
    '[]'::jsonb, true, false, true
  ),
  (
    'Incident write-up',
    'Turns a rough account of an incident into a clear, honest write-up.',
    'productivity',
    '{"prompt":"Turn this incident description into a clear write-up: impact, timeline, root cause, what made it worse, and the concrete follow-ups. Be honest about what we still do not know.","agentType":"general","icon":"fa-clipboard-list"}'::jsonb,
    '[]'::jsonb, true, false, false
  ),
  (
    'On-call handover',
    'Summarises current system state and open risks for the next person on call.',
    'productivity',
    '{"prompt":"Write an on-call handover from these notes: what is currently broken, what is being watched, which alerts are noisy, and what the next person should check first.","agentType":"general","icon":"fa-user-clock"}'::jsonb,
    '[]'::jsonb, true, false, false
  )
) AS t(name, description, category, config, required_tools, required_model, is_system, is_featured)
WHERE NOT EXISTS (
  SELECT 1 FROM templates existing WHERE existing.name = t.name
);
