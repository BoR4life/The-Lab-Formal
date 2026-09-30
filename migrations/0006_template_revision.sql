-- Week 1 key for the revised template: P wave options, measured PR with a
-- sloped-segment question, and QRS width with R-wave progression.

update cases set
  answer_key = answer_key || '{
    "pWaves": "positive",
    "pr": "0.15",
    "prSloped": "no",
    "qrs": "narrow",
    "rProg": "normal"
  }'::jsonb,
  step_reasons = step_reasons || $reasons${
    "p": "Every QRS has an upright (positive) P wave in front of it in lead II, normal in size and shape.",
    "pr": "The PR interval is 0.15 s (152 ms), just under four small squares, and the PR segment sits flat on the baseline.",
    "qrs": "The QRS is 108 ms, under three small squares, so it is narrow. The R waves grow steadily from V1 across to V5."
  }$reasons$::jsonb,
  updated_at = now()
where id = 'c-week-1';
