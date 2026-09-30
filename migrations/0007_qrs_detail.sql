-- QRS detail: bundle branch pattern when wide, and main deflection in V1 and V6.
update cases set
  answer_key = answer_key || '{"bbb": "", "qrsV1": "negative", "qrsV6": "positive"}'::jsonb,
  step_reasons = step_reasons || $reasons${
    "qrs": "The QRS is 108 ms, under three small squares, so it is narrow. It points down in V1 (a small r and deep S) and up in V6 (a tall R), and the R waves grow steadily from V1 across to V5."
  }$reasons$::jsonb,
  updated_at = now()
where id = 'c-week-1';
