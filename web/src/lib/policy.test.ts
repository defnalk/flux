import { describe, expect, it } from "vitest";

import { getPolicySummary, listPolicyTopics } from "./policy";

describe("getPolicySummary", () => {
  it("returns a known topic by exact match", () => {
    const summary = getPolicySummary("EU ETS");
    expect(summary).not.toBeNull();
    expect(summary?.title).toContain("Emissions Trading");
    expect(summary?.sources.length).toBeGreaterThan(0);
  });

  it("matches loosely on substring", () => {
    expect(getPolicySummary("the cbam levy")?.title).toMatch(/CBAM/);
  });

  it("returns null on unknown topics", () => {
    expect(getPolicySummary("kazoo policy")).toBeNull();
  });

  it("lists all canned topics", () => {
    const topics = listPolicyTopics();
    expect(topics).toContain("eu ets");
    expect(topics).toContain("cbam");
    expect(topics.length).toBeGreaterThanOrEqual(5);
  });
});
