import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { blankAnswers, normaliseAnswers, stepComplete, SCORED_STEP_IDS, type Answers } from "./ecg.ts";
import { scoreRead } from "./scoring.server.ts";
import { buildNewCaseEmail } from "./newcase-email.ts";

const key = (over: Partial<Answers> = {}): Answers => ({
  ...blankAnswers(),
  rate: "normal", rhythm: "regular", axis: "normal", pWaves: "positive", pr: "0.16", prSloped: "no",
  qrs: "narrow", qrsV1: "negative", qrsV6: "positive", rProg: "normal",
  qWave: "none", st: "depression", stLeads: ["V4", "V5", "V6"], reciprocal: "no",
  tWaves: "negative", qtc: "430", impression: "x",
  ...over,
});

describe("scoring", () => {
  it("gives a perfect read full marks", () => {
    const { perStep, total } = scoreRead(SCORED_STEP_IDS, key(), key());
    assert.equal(total, 1);
    for (const id of SCORED_STEP_IDS) assert.equal(perStep[id], 1);
  });

  it("scores a wrong simple step as zero", () => {
    const { perStep } = scoreRead(SCORED_STEP_IDS, key(), key({ rate: "gt100" }));
    assert.equal(perStep.rate, 0);
    assert.equal(perStep.rhythm, 1);
  });

  it("gives partial credit for the right ST change in the wrong leads", () => {
    const { perStep } = scoreRead(SCORED_STEP_IDS, key(), key({ stLeads: ["II", "III", "aVF"] }));
    assert.ok(perStep.st! > 0 && perStep.st! < 1);
  });

  it("partly credits a QRS read that misses R-wave progression", () => {
    const { perStep } = scoreRead(SCORED_STEP_IDS, key(), key({ rProg: "poor" }));
    assert.equal(perStep.qrs, 0.75);
  });

  it("judges PR and QTc by band, not to the digit", () => {
    const { perStep } = scoreRead(SCORED_STEP_IDS, key(), key({ pr: "0.17", qtc: "440" }));
    assert.equal(perStep.pr, 1);
    assert.equal(perStep.qtc, 1);
  });

  it("only scores the steps a case asks for", () => {
    const { perStep } = scoreRead(["rate"], key(), key({ rate: "lt60" }));
    assert.deepEqual(Object.keys(perStep), ["rate"]);
  });
});

describe("answers", () => {
  it("drops anything that isn't a valid choice", () => {
    const a = normaliseAnswers({ rate: "banana", rhythm: "regular", stLeads: ["V1", "Z9", 4], pr: "0.16abc" });
    assert.equal(a.rate, "");
    assert.equal(a.rhythm, "regular");
    assert.deepEqual(a.stLeads, ["V1"]);
    assert.equal(a.pr, "0.16");
  });

  it("copes with junk input", () => {
    assert.deepEqual(normaliseAnswers(null), blankAnswers());
    assert.deepEqual(normaliseAnswers("x"), blankAnswers());
  });

  it("treats a blank read as incomplete and a full key as complete", () => {
    assert.equal(stepComplete("rate", blankAnswers()), false);
    for (const id of SCORED_STEP_IDS) assert.equal(stepComplete(id, key()), true, id);
  });
});

describe("new-case email", () => {
  const c = { id: "c-1", title: "Case <2>", vignette: "63yr old male\n" + "x".repeat(400) };
  const m = buildNewCaseEmail("https://example.org", c, 'Bob "B" <b>', "a".repeat(32));

  it("escapes HTML in the title and name", () => {
    assert.ok(!m.html.includes("<2>"));
    assert.ok(m.html.includes("Case &lt;2&gt;"));
    assert.ok(m.html.includes("Bob &quot;B&quot; &lt;b&gt;"));
  });

  it("carries a private unsubscribe link in both versions", () => {
    assert.equal(m.stop, `https://example.org/unsubscribe?token=${"a".repeat(32)}`);
    assert.ok(m.text.includes(m.stop) && m.html.includes(m.stop));
  });

  it("trims the teaser and links to the case", () => {
    assert.ok(m.text.includes("..."));
    assert.ok(m.text.includes("https://example.org/case/c-1"));
  });
});
