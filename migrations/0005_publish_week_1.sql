-- Publish Week 1: the answer key, per-step reasons, model impression and
-- teaching point, then open it to learners.

update cases set
  answer_key = '{
    "rate": "normal",
    "rhythm": "regular",
    "axis": "normal",
    "pWaves": "normal",
    "pr": "normal",
    "qrs": "narrow",
    "qWave": "none",
    "qLeads": [],
    "st": "none",
    "stLeads": [],
    "reciprocal": "",
    "tWaves": "positive",
    "qtc": "433",
    "impression": ""
  }'::jsonb,
  scored_steps = '["rate","rhythm","axis","p","pr","qrs","q","st","t","qtc"]'::jsonb,
  step_reasons = $reasons${
    "rate": "About four large squares between R waves: 300 ÷ 4 is roughly 75. The machine measured 76.",
    "rhythm": "The R-R intervals are even across the lead II rhythm strip. This is sinus rhythm.",
    "axis": "The QRS is positive in both lead I and aVF, so the axis is normal. The machine put it at +50°.",
    "p": "Every QRS has an upright P wave in front of it in lead II.",
    "pr": "The PR interval is 152 ms, just under four small squares.",
    "qrs": "The QRS is 108 ms, under three small squares, so it is narrow.",
    "q": "There are no Q waves wide or deep enough to be pathological.",
    "st": "The ST segments sit on the baseline. There is no elevation or depression to find here, and that is exactly why this ECG gets called normal.",
    "t": "The T waves are upright. Now compare their size: the T in V1 is taller than the T in V6. That is the finding in this case.",
    "qtc": "The QTc is 433 ms, within the normal range."
  }$reasons$::jsonb,
  model_impression = $impression$Sinus rhythm at 76, normal axis and intervals, no ST change. The machine calls it normal, but the upright T wave in V1 is taller than the T wave in V6: loss of precordial T-wave balance. With a week of indigestion and eight hours of chest discomfort, this raises concern for significant LAD disease. Escalate for urgent cardiology review. Don't discharge on the machine read.$impression$,
  teaching_point = $teaching$When the machine says normal and the patient has ischaemic-type symptoms, and nothing is jumping out at you, look closely at the T waves. An upright T in V1 that is taller than the T in V6 can be an early sign of a critical LAD lesion. The other usual causes are LBBB, LVH and hyperkalaemia. Fall in love with P waves to sort out arrhythmias, and with T waves to catch ischaemia.$teaching$,
  learning_outcomes = $outcomes$Work a 12-lead systematically when the machine interpretation reads normal. Recognise loss of precordial T-wave balance (T in V1 taller than T in V6) as a warning sign in a patient with ischaemic-type symptoms, and escalate.$outcomes$,
  author = 'Brad Chesham, RN, MSc',
  verified_by = 'Brad Chesham, RN, MSc',
  status = 'open',
  updated_at = now()
where id = 'c-week-1';
