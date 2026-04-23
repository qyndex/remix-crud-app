import type { MetaFunction, LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useNavigation,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { getTask, updateTask, deleteTask } from "~/lib/db.server";
import type { Task } from "~/lib/db.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.task ? `${data.task.title} — Task Manager` : "Task Not Found" },
];

export async function loader({ params }: LoaderFunctionArgs) {
  const task = getTask(params.id as string);
  if (!task) throw new Response("Task not found", { status: 404 });
  return json({ task });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  if (intent === "update") {
    const title = (formData.get("title") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() ?? "";
    const status = formData.get("status") as Task["status"];
    const priority = formData.get("priority") as Task["priority"];

    if (!title) return json({ error: "Title is required." }, { status: 400 });
    updateTask(params.id as string, { title, description, status, priority });
    return redirect(`/tasks/${params.id}`);
  }

  if (intent === "delete") {
    deleteTask(params.id as string);
    return redirect("/");
  }

  return json({ error: "Unknown intent." }, { status: 400 });
}

export default function TaskDetail() {
  const { task } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSaving = navigation.state === "submitting";

  return (
    <div className="detail-page">
      <a href="/" className="back-link">← All Tasks</a>
      <h1>{task.title}</h1>

      <Form method="post" className="edit-form" aria-label="Edit task">
        <input type="hidden" name="intent" value="update" />
        <div className="form-group">
          <label htmlFor="title">Title</label>
          <input id="title" type="text" name="title" defaultValue={task.title} required className="input" disabled={isSaving} />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" defaultValue={task.description} className="textarea" rows={4} disabled={isSaving} />
        </div>
        <div className="form-row-2">
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select id="status" name="status" defaultValue={task.status} className="select" disabled={isSaving}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select id="priority" name="priority" defaultValue={task.priority} className="select" disabled={isSaving}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        <div className="actions">
          <button type="submit" className="btn-save" disabled={isSaving}>{isSaving ? "Saving…" : "Save Changes"}</button>
        </div>
      </Form>

      <Form method="post" className="delete-form">
        <input type="hidden" name="intent" value="delete" />
        <button type="submit" className="btn-danger" aria-label="Delete this task" onClick={(e) => { if (!confirm("Delete this task?")) e.preventDefault(); }}>Delete Task</button>
      </Form>

      <p className="timestamps">Created {new Date(task.createdAt).toLocaleDateString()} · Updated {new Date(task.updatedAt).toLocaleDateString()}</p>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return <div className="error-box"><h2>{error.status}: {error.data}</h2><a href="/">← Home</a></div>;
  }
  return <div className="error-box"><h2>Unexpected Error</h2><a href="/">← Home</a></div>;
}
