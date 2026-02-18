import { describe, it, expect } from "vitest";
import {
  listCommentaryQuerySchema,
  createCommentarySchema,
} from "./commentary.js";

describe("listCommentaryQuerySchema", () => {
  it("should validate valid query with limit", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: 50 });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(50);
  });

  it("should validate query without limit", () => {
    const result = listCommentaryQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBeUndefined();
  });

  it("should coerce string limit to number", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: "25" });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(25);
  });

  it("should reject negative limit", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: -10 });
    expect(result.success).toBe(false);
  });

  it("should reject zero limit", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: 0 });
    expect(result.success).toBe(false);
  });

  it("should reject limit greater than 100", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: 101 });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer limit", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: 10.5 });
    expect(result.success).toBe(false);
  });

  it("should accept limit of 100 (boundary test)", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: 100 });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(100);
  });

  it("should accept limit of 1 (boundary test)", () => {
    const result = listCommentaryQuerySchema.safeParse({ limit: 1 });
    expect(result.success).toBe(true);
    expect(result.data?.limit).toBe(1);
  });
});

describe("createCommentarySchema", () => {
  const validCommentary = {
    minute: 45,
    message: "Goal scored!",
  };

  it("should validate minimal valid commentary", () => {
    const result = createCommentarySchema.safeParse(validCommentary);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validCommentary);
  });

  it("should validate commentary with all optional fields", () => {
    const fullCommentary = {
      minute: 45,
      sequence: 1,
      period: "first_half",
      actor: "John Doe",
      eventType: "goal",
      team: "Team A",
      message: "Goal scored by John Doe",
      metadata: { assistedBy: "Jane Smith", distance: 20 },
      tags: ["goal", "important"],
    };

    const result = createCommentarySchema.safeParse(fullCommentary);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(fullCommentary);
  });

  it("should reject commentary without minute", () => {
    const result = createCommentarySchema.safeParse({ message: "Test" });
    expect(result.success).toBe(false);
  });

  it("should reject commentary without message", () => {
    const result = createCommentarySchema.safeParse({ minute: 10 });
    expect(result.success).toBe(false);
  });

  it("should reject empty message", () => {
    const result = createCommentarySchema.safeParse({
      minute: 10,
      message: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative minute", () => {
    const result = createCommentarySchema.safeParse({
      minute: -5,
      message: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("should accept minute of 0", () => {
    const result = createCommentarySchema.safeParse({
      minute: 0,
      message: "Kickoff",
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer minute", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45.5,
      message: "Test",
    });
    expect(result.success).toBe(false);
  });

  it("should accept large minute values", () => {
    const result = createCommentarySchema.safeParse({
      minute: 120,
      message: "Extra time event",
    });
    expect(result.success).toBe(true);
  });

  it("should validate metadata as arbitrary record", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      metadata: { foo: "bar", count: 123, nested: { key: "value" } },
    });
    expect(result.success).toBe(true);
  });

  it("should validate tags as array of strings", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      tags: ["tag1", "tag2", "tag3"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-array tags", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      tags: "not-an-array",
    });
    expect(result.success).toBe(false);
  });

  it("should reject tags with non-string elements", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      tags: ["valid", 123, "another"],
    });
    expect(result.success).toBe(false);
  });

  it("should accept empty tags array", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      tags: [],
    });
    expect(result.success).toBe(true);
  });

  it("should reject non-integer sequence", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      sequence: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should accept sequence of 0", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "Test",
      sequence: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should reject message with only whitespace", () => {
    const result = createCommentarySchema.safeParse({
      minute: 45,
      message: "   ",
    });
    expect(result.success).toBe(false);
  });
});