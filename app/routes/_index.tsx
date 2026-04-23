import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useNavigation,
  Form,
  useSubmit,
  useFetcher,
  Link,
  isRouteErrorResponse,
  useRouteError,
  useSearchParams,
} from "@remix-run/react";
import { requireUser } from "~/lib/supabase.server";
import { getTasks, createTask, deleteTask, updateTask } from "~/lib/tasks.server";
import { listProfiles } from "~/lib/profiles.server";
import type { Task, TaskFilters, TaskStatus, TaskPriority } from "~/types";

export const meta: MetaFunction = () => [{ title: "Task Manager" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await requireUser(request);
  const url = new URL(request.url);

  const filters: TaskFilters = {
    status: (url.searchParams.get("status") as TaskFilters["status"]) || "all",
    priority:
      (url.searchParams.get("priority") as TaskFilters["priority"]) || "all",
    assignee_id: url.searchParams.get("assignee") || "all",
    search: url.searchParams.get("q") || undefined,
    sort:
      (url.searchParams.get("sort") as TaskFilters["sort"]) || "created_at",
    order:
      (url.searchParams.get("order") as TaskFilters["order"]) || "desc",
  };

  const [tasks, profiles] = await Promise.all([
    getTasks(request, filters),
    listProfiles(request),
  ]);

  return json(
    { tasks, profiles, filters, currentUserId: user.id },
    { headers }
  );
}

export async function action({ request }: ActionFunctionArgs) {
  const { headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const title = (formData.get("title") as string)?.trim();
    const description =
      (formData.get("description") as string)?.trim() || null;
    const priority = (formData.get("priority") as TaskPriority) ?? "medium";
    const assignee_id =
      (formData.get("assignee_id") as string) || null;
    const due_date = (formData.get("due_date") as string) || null;

    if (!title) {
      return json(
        { error: "Title is required." },
        { status: 400, headers }
      );
    }

    await createTask(request, {
      title,
      description,
      priority,
      assignee_id,
      due_date,
    });
    return redirect("/", { headers });
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    if (id) await deleteTask(request, id);
    return redirect("/", { headers });
  }

  if (intent === "update-status") {
    const id = formData.get("id") as string;
    const status = formData.get("status") as TaskStatus;
    if (id && status) {
      await updateTask(request, id, { status });
    }
    return json({ success: true }, { headers });
  }

  return json({ error: "Unknown intent." }, { status: 400, headers });
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700",
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-slate-500",
};

const PRIORITY_DOT: Record<TaskPriority, string> = {
  high: "bg-red-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

export default function TasksIndex() {
  const { tasks, profiles, filters, currentUserId } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "create";
  const [searchParams] = useSearchParams();
  const submit = useSubmit();

  function handleFilterChange(key: string, value: string) {
    const params = new URLSearchParams(searchParams);
    if (value === "all" || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    submit(params, { method: "get" });
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <span className="text-sm text-gray-500">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Create Form */}
      <section aria-label="Create new task">
        <Form
          method="post"
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <input type="hidden" name="intent" value="create" />
          <div className="flex flex-wrap gap-3">
            <input
              type="text"
              name="title"
              placeholder="Task title"
              required
              aria-label="Task title"
              className="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            <select
              name="priority"
              aria-label="Priority"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              <option value="low">Low</option>
              <option value="medium" selected>
                Medium
              </option>
              <option value="high">High</option>
            </select>
            <select
              name="assignee_id"
              aria-label="Assignee"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSubmitting}
            >
              <option value="">No assignee</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email}
                </option>
              ))}
            </select>
            <input
              type="date"
              name="due_date"
              aria-label="Due date"
              className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
              aria-label="Create task"
            >
              {isSubmitting ? "Adding…" : "+ Add Task"}
            </button>
          </div>
          <input
            type="text"
            name="description"
            placeholder="Description (optional)"
            aria-label="Description"
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            disabled={isSubmitting}
          />
        </Form>
      </section>

      {/* Filters */}
      <section aria-label="Filter and search tasks">
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <input
            type="search"
            name="q"
            placeholder="Search tasks…"
            defaultValue={filters.search ?? ""}
            aria-label="Search tasks"
            className="min-w-[160px] flex-1 rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            onChange={(e) => handleFilterChange("q", e.target.value)}
          />
          <select
            aria-label="Filter by status"
            value={filters.status ?? "all"}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
          <select
            aria-label="Filter by priority"
            value={filters.priority ?? "all"}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            aria-label="Filter by assignee"
            value={filters.assignee_id ?? "all"}
            onChange={(e) =>
              handleFilterChange("assignee", e.target.value)
            }
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="all">All assignees</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name ?? p.email}
              </option>
            ))}
          </select>
          <select
            aria-label="Sort tasks"
            value={`${filters.sort ?? "created_at"}:${filters.order ?? "desc"}`}
            onChange={(e) => {
              const [sort, order] = e.target.value.split(":");
              const params = new URLSearchParams(searchParams);
              params.set("sort", sort);
              params.set("order", order);
              submit(params, { method: "get" });
            }}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
          >
            <option value="created_at:desc">Newest first</option>
            <option value="created_at:asc">Oldest first</option>
            <option value="priority:desc">High priority first</option>
            <option value="priority:asc">Low priority first</option>
            <option value="due_date:asc">Due soonest</option>
          </select>
        </div>
      </section>

      {/* Task list */}
      <ul
        className="space-y-3"
        aria-label="Task list"
        aria-live="polite"
      >
        {tasks.length === 0 && (
          <li className="rounded-xl border border-dashed border-gray-300 bg-white py-12 text-center text-gray-500">
            No tasks found. Create one above.
          </li>
        )}
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            currentUserId={currentUserId}
          />
        ))}
      </ul>
    </div>
  );
}

function TaskRow({
  task,
  currentUserId: _currentUserId,
}: {
  task: Task;
  currentUserId: string;
}) {
  const fetcher = useFetcher();
  const isDeleting =
    fetcher.state !== "idle" &&
    fetcher.formData?.get("intent") === "delete" &&
    fetcher.formData?.get("id") === task.id;
  const pendingStatus = fetcher.formData?.get("status") as TaskStatus | null;
  const displayStatus = pendingStatus ?? task.status;

  if (isDeleting) return null;

  return (
    <li className="group flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/tasks/${task.id}`}
            className="font-medium text-gray-900 hover:text-indigo-600 hover:underline"
          >
            {task.title}
          </Link>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[displayStatus]}`}
          >
            {STATUS_LABELS[displayStatus]}
          </span>
          <span
            className={`flex items-center gap-1 text-xs ${PRIORITY_COLORS[task.priority]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[task.priority]}`}
            />
            {task.priority}
          </span>
          {task.due_date && (
            <span className="text-xs text-gray-500">
              Due {new Date(task.due_date).toLocaleDateString()}
            </span>
          )}
        </div>
        {task.description && (
          <p className="mt-1 text-sm text-gray-500 line-clamp-1">
            {task.description}
          </p>
        )}
        {task.assignee && (
          <p className="mt-1 text-xs text-gray-400">
            Assigned to {task.assignee.full_name ?? task.assignee.email}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Inline status transition */}
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="update-status" />
          <input type="hidden" name="id" value={task.id} />
          <select
            name="status"
            aria-label={`Change status for "${task.title}"`}
            defaultValue={task.status}
            onChange={(e) => {
              const form = e.target.form;
              if (form) fetcher.submit(form);
            }}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </fetcher.Form>

        {/* Delete */}
        <fetcher.Form method="post">
          <input type="hidden" name="intent" value="delete" />
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className="rounded p-1 text-gray-400 opacity-0 transition-opacity hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
            aria-label={`Delete task "${task.title}"`}
            onClick={(e) => {
              if (!confirm(`Delete "${task.title}"?`)) e.preventDefault();
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.519.149.022a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </fetcher.Form>
      </div>
    </li>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">
          {error.status} {error.statusText}
        </h2>
        <p className="mt-1 text-red-700">{error.data}</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Unexpected Error</h2>
      <p className="mt-1 text-red-700">
        {error instanceof Error ? error.message : "Unknown error"}
      </p>
    </div>
  );
}
