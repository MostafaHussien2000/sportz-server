import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCommentaryController } from "./commentary.controller.js";

// Mock dependencies
vi.mock("../db/db.js", () => ({
  db: {
    insert: vi.fn(),
  },
}));

vi.mock("../db/schema.js", () => ({
  commentary: {},
}));

vi.mock("../validation/commentary.js", () => ({
  createCommentarySchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock("../validation/matches.js", () => ({
  matchIdParamSchema: {
    safeParse: vi.fn(),
  },
}));

import { db } from "../db/db.js";
import { commentary } from "../db/schema.js";
import { createCommentarySchema } from "../validation/commentary.js";
import { matchIdParamSchema } from "../validation/matches.js";

describe("createCommentaryController", () => {
  let mockBroadcast;
  let mockReq;
  let mockRes;
  let controller;

  beforeEach(() => {
    vi.clearAllMocks();

    mockBroadcast = vi.fn();
    controller = createCommentaryController({
      broadcastCommentaryCreated: mockBroadcast,
    });

    mockReq = {
      params: { id: "1" },
      body: {
        minute: 45,
        message: "Goal scored!",
      },
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it("should return a function", () => {
    expect(typeof controller).toBe("function");
  });

  it("should create commentary successfully", async () => {
    const mockEvent = {
      id: 1,
      matchId: 1,
      minute: 45,
      message: "Goal scored!",
      createdAt: new Date(),
    };

    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: true,
      data: { minute: 45, message: "Goal scored!" },
    });

    const mockReturning = vi.fn().mockResolvedValue([mockEvent]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    db.insert.mockReturnValue({ values: mockValues });

    await controller(mockReq, mockRes);

    expect(matchIdParamSchema.safeParse).toHaveBeenCalledWith(mockReq.params);
    expect(createCommentarySchema.safeParse).toHaveBeenCalledWith(mockReq.body);
    expect(db.insert).toHaveBeenCalledWith(commentary);
    expect(mockValues).toHaveBeenCalledWith({
      matchId: 1,
      minute: 45,
      message: "Goal scored!",
    });
    expect(mockBroadcast).toHaveBeenCalledWith(1, mockEvent);
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Commentary created successfully.",
      data: mockEvent,
    });
  });

  it("should handle invalid match ID", async () => {
    matchIdParamSchema.safeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ message: "Invalid match ID" }],
      },
    });

    await controller(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Invalid match ID.",
      details: [{ message: "Invalid match ID" }],
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should handle invalid commentary data", async () => {
    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: false,
      error: {
        issues: [{ message: "Invalid message" }],
      },
    });

    await controller(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Invalid commentary data.",
      details: [{ message: "Invalid message" }],
    });
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should handle database errors", async () => {
    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: true,
      data: { minute: 45, message: "Goal scored!" },
    });

    const dbError = new Error("Database connection failed");
    const mockReturning = vi.fn().mockRejectedValue(dbError);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    db.insert.mockReturnValue({ values: mockValues });

    await controller(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to create commentary.",
      details: "Database connection failed",
    });
  });

  it("should handle non-Error exceptions", async () => {
    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: true,
      data: { minute: 45, message: "Goal scored!" },
    });

    const mockReturning = vi.fn().mockRejectedValue("String error");
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    db.insert.mockReturnValue({ values: mockValues });

    await controller(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: "Failed to create commentary.",
      details: "String error",
    });
  });

  it("should work without broadcast function", async () => {
    const controllerNoBroadcast = createCommentaryController({});
    const mockEvent = {
      id: 1,
      matchId: 1,
      minute: 45,
      message: "Goal scored!",
    };

    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: true,
      data: { minute: 45, message: "Goal scored!" },
    });

    const mockReturning = vi.fn().mockResolvedValue([mockEvent]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    db.insert.mockReturnValue({ values: mockValues });

    await controllerNoBroadcast(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.json).toHaveBeenCalledWith({
      message: "Commentary created successfully.",
      data: mockEvent,
    });
  });

  it("should handle commentary with all optional fields", async () => {
    const fullCommentary = {
      minute: 45,
      sequence: 1,
      period: "first_half",
      actor: "John Doe",
      eventType: "goal",
      team: "Team A",
      message: "Goal scored!",
      metadata: { assistedBy: "Jane" },
      tags: ["goal"],
    };

    mockReq.body = fullCommentary;

    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: true,
      data: fullCommentary,
    });

    const mockEvent = { id: 1, matchId: 1, ...fullCommentary };
    const mockReturning = vi.fn().mockResolvedValue([mockEvent]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    db.insert.mockReturnValue({ values: mockValues });

    await controller(mockReq, mockRes);

    expect(mockValues).toHaveBeenCalledWith({
      matchId: 1,
      ...fullCommentary,
    });
    expect(mockRes.status).toHaveBeenCalledWith(201);
  });

  it("should correctly destructure minute from body data", async () => {
    matchIdParamSchema.safeParse.mockReturnValue({
      success: true,
      data: { id: 1 },
    });

    createCommentarySchema.safeParse.mockReturnValue({
      success: true,
      data: {
        minute: 90,
        message: "Full time",
        eventType: "whistle",
      },
    });

    const mockEvent = {
      id: 1,
      matchId: 1,
      minute: 90,
      message: "Full time",
      eventType: "whistle",
    };
    const mockReturning = vi.fn().mockResolvedValue([mockEvent]);
    const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
    db.insert.mockReturnValue({ values: mockValues });

    await controller(mockReq, mockRes);

    expect(mockValues).toHaveBeenCalledWith({
      matchId: 1,
      minute: 90,
      message: "Full time",
      eventType: "whistle",
    });
  });
});