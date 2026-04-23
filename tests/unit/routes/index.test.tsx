import { describe, it, expect, vi } from "vitest";

// Mock environment variables required by supabase.server
vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
vi.stubEnv("SUPABASE_ANON_KEY", "test-anon-key");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

// Mock Supabase server client
vi.mock("../../../app/lib/supabase.server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    supabase: {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "test@example.com" } },
        }),
      },
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      })),
    },
    headers: new Headers(),
  })),
  requireUser: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "test@example.com" },
    headers: new Headers(),
  }),
}));

describe("Index route", () => {
  it("exports a loader function", async () => {
    const route = await import("../../../app/routes/_index");
    expect(route.loader).toBeDefined();
    expect(typeof route.loader).toBe("function");
  });

  it("exports an action function", async () => {
    const route = await import("../../../app/routes/_index");
    expect(route.action).toBeDefined();
    expect(typeof route.action).toBe("function");
  });

  it("exports a default component", async () => {
    const route = await import("../../../app/routes/_index");
    expect(route.default).toBeDefined();
    expect(typeof route.default).toBe("function");
  });

  it("exports an ErrorBoundary", async () => {
    const route = await import("../../../app/routes/_index");
    expect(route.ErrorBoundary).toBeDefined();
  });
});
