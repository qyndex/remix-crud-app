import { createSupabaseServerClient } from "./supabase.server";
import type { Task, TaskComment, TaskFilters } from "~/types";

const PRIORITY_ORDER: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export async function getTasks(
  request: Request,
  filters: TaskFilters = {}
): Promise<Task[]> {
  const { supabase } = createSupabaseServerClient(request);

  let query = supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(*)");

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status);
  }
  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority);
  }
  if (filters.assignee_id && filters.assignee_id !== "all") {
    query = query.eq("assignee_id", filters.assignee_id);
  }
  if (filters.search) {
    query = query.ilike("title", `%${filters.search}%`);
  }

  const sort = filters.sort ?? "created_at";
  const ascending = filters.order === "asc";

  if (sort === "priority") {
    // Supabase can't sort by enum order, so we sort client-side
    query = query.order("created_at", { ascending: false });
  } else {
    query = query.order(sort, { ascending });
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);

  let tasks = (data ?? []) as Task[];

  if (sort === "priority") {
    tasks = tasks.sort((a, b) => {
      const diff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
      return ascending ? -diff : diff;
    });
  }

  return tasks;
}

export async function getTask(
  request: Request,
  id: string
): Promise<Task | null> {
  const { supabase } = createSupabaseServerClient(request);

  const { data, error } = await supabase
    .from("tasks")
    .select("*, assignee:profiles!tasks_assignee_id_fkey(*)")
    .eq("id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null; // row not found
    throw new Error(`Failed to load task: ${error.message}`);
  }
  return data as Task;
}

export async function createTask(
  request: Request,
  data: {
    title: string;
    description?: string | null;
    status?: Task["status"];
    priority?: Task["priority"];
    assignee_id?: string | null;
    due_date?: string | null;
  }
): Promise<Task> {
  const { supabase } = createSupabaseServerClient(request);

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? "todo",
      priority: data.priority ?? "medium",
      assignee_id: data.assignee_id ?? null,
      due_date: data.due_date ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create task: ${error.message}`);
  return task as Task;
}

export async function updateTask(
  request: Request,
  id: string,
  data: Partial<{
    title: string;
    description: string | null;
    status: Task["status"];
    priority: Task["priority"];
    assignee_id: string | null;
    due_date: string | null;
  }>
): Promise<Task> {
  const { supabase } = createSupabaseServerClient(request);

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  return task as Task;
}

export async function deleteTask(
  request: Request,
  id: string
): Promise<void> {
  const { supabase } = createSupabaseServerClient(request);

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(`Failed to delete task: ${error.message}`);
}

export async function getTaskComments(
  request: Request,
  taskId: string
): Promise<TaskComment[]> {
  const { supabase } = createSupabaseServerClient(request);

  const { data, error } = await supabase
    .from("task_comments")
    .select("*, author:profiles!task_comments_author_id_fkey(*)")
    .eq("task_id", taskId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to load comments: ${error.message}`);
  return (data ?? []) as TaskComment[];
}

export async function createComment(
  request: Request,
  taskId: string,
  authorId: string,
  content: string
): Promise<TaskComment> {
  const { supabase } = createSupabaseServerClient(request);

  const { data, error } = await supabase
    .from("task_comments")
    .insert({ task_id: taskId, author_id: authorId, content })
    .select("*, author:profiles!task_comments_author_id_fkey(*)")
    .single();

  if (error) throw new Error(`Failed to create comment: ${error.message}`);
  return data as TaskComment;
}

export async function deleteComment(
  request: Request,
  commentId: string,
  userId: string
): Promise<void> {
  const { supabase } = createSupabaseServerClient(request);

  // RLS enforces ownership; also check author_id to return a clear error
  const { error } = await supabase
    .from("task_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", userId);

  if (error) throw new Error(`Failed to delete comment: ${error.message}`);
}
