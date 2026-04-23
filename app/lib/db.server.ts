// In-memory database — replace with a real DB (SQLite via better-sqlite3, Prisma, etc.)
export interface Task {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  createdAt: string;
  updatedAt: string;
}

let tasks: Task[] = [
  { id: "t1", title: "Design system audit", description: "Review all UI components for consistency.", status: "done", priority: "high", createdAt: "2026-01-10T09:00:00Z", updatedAt: "2026-01-15T14:00:00Z" },
  { id: "t2", title: "API rate limiting", description: "Implement token bucket algorithm for public API.", status: "in_progress", priority: "high", createdAt: "2026-02-01T10:00:00Z", updatedAt: "2026-03-10T11:00:00Z" },
  { id: "t3", title: "Write onboarding docs", description: "Document the new developer onboarding flow.", status: "todo", priority: "medium", createdAt: "2026-03-05T08:00:00Z", updatedAt: "2026-03-05T08:00:00Z" },
];

export function getTasks(): Task[] {
  return [...tasks];
}

export function getTask(id: string): Task | undefined {
  return tasks.find((t) => t.id === id);
}

export function createTask(data: Omit<Task, "id" | "createdAt" | "updatedAt">): Task {
  const now = new Date().toISOString();
  const task: Task = { ...data, id: crypto.randomUUID(), createdAt: now, updatedAt: now };
  tasks.push(task);
  return task;
}

export function updateTask(id: string, data: Partial<Omit<Task, "id" | "createdAt">>): Task | null {
  const idx = tasks.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  tasks[idx] = { ...tasks[idx], ...data, updatedAt: new Date().toISOString() };
  return tasks[idx];
}

export function deleteTask(id: string): boolean {
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== id);
  return tasks.length < before;
}
