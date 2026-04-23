import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  useNavigation,
  Form,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { getTasks, createTask, deleteTask } from "~/lib/db.server";
import type { Task } from "~/lib/db.server";

export const meta: MetaFunction = () => [{ title: "Task Manager" }];

export async function loader({ request: _request }: LoaderFunctionArgs) {
  const tasks = getTasks();
  return json({ tasks });
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "create") {
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() ?? "";
    const priority = (formData.get("priority") as Task["priority"]) ?? "medium";

    if (!title) {
      return json({ error: "Title is required." }, { status: 400 });
    }

    createTask({ title, description, priority, status: "todo" });
    return redirect("/");
  }

  if (intent === "delete") {
    const id = formData.get("id") as string;
    if (id) deleteTask(id);
    return redirect("/");
  }

  return json({ error: "Unknown intent." }, { status: 400 });
}

const STATUS_LABELS: Record<Task["status"], string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const PRIORITY_COLORS: Record<Task["priority"], string> = {
  high: "#dc2626",
  medium: "#d97706",
  low: "#64748b",
};

export default function TasksIndex() {
  const { tasks } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="page">
      <header className="page-header">
        <h1>Task Manager</h1>
        <span className="count">{tasks.length} tasks</span>
      </header>

      {/* Create Form */}
      <Form method="post" className="create-form" aria-label="Create new task">
        <input type="hidden" name="intent" value="create" />
        <div className="form-row">
          <input
            type="text"
            name="title"
            placeholder="Task title"
            required
            aria-label="Task title"
            className="input"
            disabled={isSubmitting}
          />
          <select name="priority" aria-label="Priority" className="select" disabled={isSubmitting}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
          <button type="submit" className="btn-create" disabled={isSubmitting} aria-label="Create task">
            {isSubmitting ? "Adding…" : "+ Add Task"}
          </button>
        </div>
        <input type="text" name="description" placeholder="Description (optional)" aria-label="Description" className="input input-full" disabled={isSubmitting} />
      </Form>

      {/* Task list */}
      <ul className="task-list" aria-label="Task list">
        {tasks.length === 0 && (
          <li className="empty">No tasks yet. Create one above.</li>
        )}
        {tasks.map((task) => (
          <li key={task.id} className="task-item">
            <div className="task-main">
              <a href={`/tasks/${task.id}`} className="task-title">{task.title}</a>
              {task.description && <p className="task-desc">{task.description}</p>}
              <div className="task-meta">
                <span className="status-badge">{STATUS_LABELS[task.status]}</span>
                <span className="priority" style={{ color: PRIORITY_COLORS[task.priority] }}>
                  ● {task.priority}
                </span>
              </div>
            </div>
            <Form method="post">
              <input type="hidden" name="intent" value="delete" />
              <input type="hidden" name="id" value={task.id} />
              <button
                type="submit"
                className="btn-delete"
                aria-label={`Delete task "${task.title}"`}
              >
                ✕
              </button>
            </Form>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div className="error-box"><h2>{error.status} {error.statusText}</h2><p>{error.data}</p></div>;
  }
  return <div className="error-box"><h2>Unexpected Error</h2><p>{error instanceof Error ? error.message : "Unknown error"}</p></div>;
}
