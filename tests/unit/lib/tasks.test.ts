import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client
vi.mock("../../../app/lib/supabase.server", () => ({
  createSupabaseServerClient: vi.fn(() => ({
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: [
            {
              id: "task-1",
              title: "Test Task",
              status: "todo",
              priority: "medium",
              description: null,
              assignee_id: null,
              due_date: null,
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
          error: null,
        }),
        single: vi.fn().mockResolvedValue({
          data: {
            id: "task-1",
            title: "Test Task",
            status: "todo",
            priority: "medium",
            description: null,
            assignee_id: null,
            due_date: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
          error: null,
        }),
      })),
    },
    headers: new Headers(),
  })),
}));

describe("Task operations", () => {
  it("module exports all CRUD functions", async () => {
    const tasks = await import("../../../app/lib/tasks.server");
    expect(tasks.getTasks).toBeDefined();
    expect(tasks.getTask).toBeDefined();
    expect(tasks.createTask).toBeDefined();
    expect(tasks.updateTask).toBeDefined();
    expect(tasks.deleteTask).toBeDefined();
  });

  it("module exports comment functions", async () => {
    const tasks = await import("../../../app/lib/tasks.server");
    expect(tasks.getTaskComments).toBeDefined();
    expect(tasks.createComment).toBeDefined();
    expect(tasks.deleteComment).toBeDefined();
  });

  describe("getTasks", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns an array of tasks", async () => {
      const { createSupabaseServerClient } = await import(
        "../../../app/lib/supabase.server"
      );
      const mockOrder = vi.fn().mockResolvedValue({
        data: [
          {
            id: "task-1",
            title: "Test Task",
            status: "todo",
            priority: "medium",
            description: null,
            assignee_id: null,
            due_date: null,
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
        error: null,
      });
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        supabase: {
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            ilike: vi.fn().mockReturnThis(),
            order: mockOrder,
          })),
        } as never,
        headers: new Headers(),
      });

      const { getTasks } = await import("../../../app/lib/tasks.server");
      const request = new Request("http://localhost/");
      const result = await getTasks(request);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getTask", () => {
    it("returns a single task by id", async () => {
      const { createSupabaseServerClient } = await import(
        "../../../app/lib/supabase.server"
      );
      const mockSingle = vi.fn().mockResolvedValue({
        data: {
          id: "task-1",
          title: "Test Task",
          status: "todo",
          priority: "medium",
          description: null,
          assignee_id: null,
          due_date: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        error: null,
      });
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        supabase: {
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: mockSingle,
          })),
        } as never,
        headers: new Headers(),
      });

      const { getTask } = await import("../../../app/lib/tasks.server");
      const request = new Request("http://localhost/");
      const result = await getTask(request, "task-1");
      expect(result).not.toBeNull();
      expect(result?.id).toBe("task-1");
    });

    it("returns null when task not found (PGRST116)", async () => {
      const { createSupabaseServerClient } = await import(
        "../../../app/lib/supabase.server"
      );
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        supabase: {
          from: vi.fn(() => ({
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "PGRST116", message: "not found" },
            }),
          })),
        } as never,
        headers: new Headers(),
      });

      const { getTask } = await import("../../../app/lib/tasks.server");
      const request = new Request("http://localhost/");
      const result = await getTask(request, "nonexistent-id");
      expect(result).toBeNull();
    });
  });

  describe("createTask", () => {
    it("inserts a task and returns it", async () => {
      const { createSupabaseServerClient } = await import(
        "../../../app/lib/supabase.server"
      );
      const newTask = {
        id: "task-new",
        title: "New Task",
        status: "todo",
        priority: "medium",
        description: null,
        assignee_id: null,
        due_date: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        supabase: {
          from: vi.fn(() => ({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({ data: newTask, error: null }),
          })),
        } as never,
        headers: new Headers(),
      });

      const { createTask } = await import("../../../app/lib/tasks.server");
      const request = new Request("http://localhost/");
      const result = await createTask(request, { title: "New Task" });
      expect(result.title).toBe("New Task");
    });

    it("throws on insert error", async () => {
      const { createSupabaseServerClient } = await import(
        "../../../app/lib/supabase.server"
      );
      vi.mocked(createSupabaseServerClient).mockReturnValue({
        supabase: {
          from: vi.fn(() => ({
            insert: vi.fn().mockReturnThis(),
            select: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "insert failed" },
            }),
          })),
        } as never,
        headers: new Headers(),
      });

      const { createTask } = await import("../../../app/lib/tasks.server");
      const request = new Request("http://localhost/");
      await expect(
        createTask(request, { title: "Failing Task" })
      ).rejects.toThrow("Failed to create task");
    });
  });
});
