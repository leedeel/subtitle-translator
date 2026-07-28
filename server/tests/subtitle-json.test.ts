import assert from "node:assert/strict";
import { test } from "node:test";
import { normalizeSrtTimestamp, parseSrtCues } from "../src/lib/subtitle";

test("normalizeSrtTimestamp preserves millisecond precision", () => {
  assert.equal(normalizeSrtTimestamp("00:00:02,360"), "00:00:02,360");
  assert.equal(normalizeSrtTimestamp("0:00:02,3"), "00:00:02,300");
  assert.equal(normalizeSrtTimestamp("00:00:02,36"), "00:00:02,360");
  assert.equal(normalizeSrtTimestamp("100:00:02,007"), "100:00:02,007");
  assert.equal(normalizeSrtTimestamp("invalid"), "invalid");
});

test("parseSrtCues keeps cue order, timestamps, and multiline text", () => {
  const cues = parseSrtCues([
    "1",
    "00:00:00,000 --> 00:00:02,360",
    "Steve Bannon, welcome",
    "to the insider.",
    "",
    "2",
    "00:00:03,5 --> 00:00:05,08",
    "2026",
    "",
  ]);

  assert.deepEqual(cues, [
    {
      timeLineIndex: 1,
      start: "00:00:00,000",
      end: "00:00:02,360",
      textLines: ["Steve Bannon, welcome", "to the insider."],
    },
    {
      timeLineIndex: 6,
      start: "00:00:03,5",
      end: "00:00:05,08",
      textLines: ["2026"],
    },
  ]);
});

test("parseSrtCues recognizes the next cue without a blank separator", () => {
  const cues = parseSrtCues([
    "00:00:00,000 --> 00:00:01,000",
    "First cue",
    "2",
    "00:00:01,000 --> 00:00:02,000",
    "Second cue",
  ]);

  assert.equal(cues.length, 2);
  assert.deepEqual(cues[0].textLines, ["First cue"]);
  assert.deepEqual(cues[1].textLines, ["Second cue"]);
});

test("parseSrtCues ignores VTT and invalid time lines", () => {
  assert.deepEqual(
    parseSrtCues([
      "WEBVTT",
      "00:00:00.000 --> 00:00:02.360",
      "VTT cue",
      "not a time line",
    ]),
    []
  );
});
