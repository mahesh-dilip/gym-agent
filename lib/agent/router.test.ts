import { describe, it, expect } from "vitest";
import { routeIntent } from "@/lib/agent/router";

describe("routeIntent", () => {
  it("routes a plain set log to haiku (no reasoning needed)", () => {
    // These are simple data-entry messages that match no SONNET_PATTERNS.
    expect(routeIntent("squat 100kg 5 reps")).toBe("haiku");
    expect(routeIntent("logged 3 sets of pushups")).toBe("haiku");
    expect(routeIntent("done")).toBe("haiku");
    expect(routeIntent("deadlift 140 x 3")).toBe("haiku");
  });

  it("routes press-exercise logs to haiku (PR pattern is word-anchored)", () => {
    // Regression guard for the /\bprs?\b/i fix: the substring 'pr' inside
    // 'press' must NOT trigger the PR pattern, so plain press logs stay on the
    // cheap Haiku model. Previously /pr/i misrouted all of these to Sonnet.
    expect(routeIntent("bench press 60x10")).toBe("haiku");
    expect(routeIntent("leg press 120x12")).toBe("haiku");
    expect(routeIntent("overhead press 40x8")).toBe("haiku");
    expect(routeIntent("chest press 30x12")).toBe("haiku");
    expect(routeIntent("shoulder press 20x10")).toBe("haiku");
  });

  it("still routes genuine PR / personal-record talk to sonnet", () => {
    expect(routeIntent("new PR today!")).toBe("sonnet");
    expect(routeIntent("is that a pr?")).toBe("sonnet");
    expect(routeIntent("show me all my PRs")).toBe("sonnet");
    expect(routeIntent("hit a pr on squat")).toBe("sonnet");
  });

  it("routes greetings to sonnet", () => {
    expect(routeIntent("hi")).toBe("sonnet");
    expect(routeIntent("Hey")).toBe("sonnet");
    expect(routeIntent("good morning")).toBe("sonnet");
    expect(routeIntent("gm")).toBe("sonnet");
  });

  it("anchors short greetings so they don't match inside longer logs", () => {
    // /^hi$/i is anchored — "hit a new bench" must NOT match the greeting rule.
    // It does match /pr/i via "...", so assert specifically against the haiku case:
    expect(routeIntent("this")).toBe("haiku"); // contains "hi" but not anchored greeting
    expect(routeIntent("yoga mat")).toBe("haiku"); // "yo" is anchored as /^yo$/i
  });

  it("routes recommendation / planning requests to sonnet", () => {
    expect(routeIntent("what should I do today?")).toBe("sonnet");
    expect(routeIntent("recommend a leg workout")).toBe("sonnet");
    expect(routeIntent("can you suggest something")).toBe("sonnet");
    expect(routeIntent("swap bench for incline")).toBe("sonnet");
  });

  it("routes knowledge / form questions to sonnet", () => {
    expect(routeIntent("how do I deadlift properly")).toBe("sonnet");
    expect(routeIntent("how many sets should I do")).toBe("sonnet");
    expect(routeIntent("what muscles does a row work")).toBe("sonnet");
    expect(routeIntent("explain progressive overload")).toBe("sonnet");
  });

  it("routes analytics / chart requests to sonnet", () => {
    expect(routeIntent("show me a chart of my volume")).toBe("sonnet");
    expect(routeIntent("what's my muscle distribution")).toBe("sonnet");
    expect(routeIntent("all my PRs")).toBe("sonnet");
  });

  it("routes edit / delete / undo to sonnet", () => {
    expect(routeIntent("delete that last set")).toBe("sonnet");
    expect(routeIntent("undo")).toBe("sonnet");
    expect(routeIntent("that's not right")).toBe("sonnet");
  });

  it("routes recovery / injury mentions to sonnet", () => {
    expect(routeIntent("my shoulder is sore")).toBe("sonnet");
    expect(routeIntent("I have knee pain")).toBe("sonnet");
    expect(routeIntent("need to warm up")).toBe("sonnet");
  });

  it("routes past-date backfill phrasing to sonnet", () => {
    expect(routeIntent("log this for yesterday")).toBe("sonnet");
    expect(routeIntent("add bench on 12 Jan")).toBe("sonnet");
    expect(routeIntent("workout from 3/4")).toBe("sonnet");
    expect(routeIntent("last monday I trained legs")).toBe("sonnet");
  });

  it("is case-insensitive for word patterns", () => {
    expect(routeIntent("RECOMMEND a workout")).toBe("sonnet");
    expect(routeIntent("Delete This")).toBe("sonnet");
  });
});
