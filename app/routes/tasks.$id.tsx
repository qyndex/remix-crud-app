import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import {
  useLoaderData,
  Form,
  useNavigation,
  useFetcher,
  Link,
  isRouteErrorResponse,
  useRouteError,
} from "@remix-run/react";
import { requireUser } from "~/lib/supabase.server";
import {
  getTask,
  updateTask,
  deleteTask,
  getTaskComments,
  createComment,
  deleteComment,
} from "~/lib/tasks.server";
import { listProfiles } from "~/lib/profiles.server";
import type { TaskStatus, TaskPriority, TaskComment } from "~/types";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  {
    title: data?.task
      ? `${data.task.title} — Task Manager`
      : "Task Not Found",
  },
];

export async function loader({ request, params }: LoaderFunctionArgs) {
  const { user, headers } = await requireUser(request);

  const [task, profiles] = await Promise.all([
    getTask(request, params.id as string),
    listProfiles(request),
  ]);

  if (!task) throw new Response("Task not found", { status: 404 });

  const comments = await getTaskComments(request, task.id);

  return json(
    { task, comments, profiles, currentUserId: user.id },
    { headers }
  );
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { user, headers } = await requireUser(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const taskId = params.id as string;

  if (intent === "update") {
    const title = (formData.get("title") as string)?.trim();
    const description =
      (formData.get("description") as string)?.trim() || null;
    const status = formData.get("status") as TaskStatus;
    const priority = formData.get("priority") as TaskPriority;
    const assignee_id =
      (formData.get("assignee_id") as string) || null;
    const due_date = (formData.get("due_date") as string) || null;

    if (!title) {
      return json(
        { error: "Title is required." },
        { status: 400, headers }
      );
    }

    await updateTask(request, taskId, {
      title,
      description,
      status,
      priority,
      assignee_id,
      due_date,
    });
    return redirect(`/tasks/${taskId}`, { headers });
  }

  if (intent === "delete") {
    await deleteTask(request, taskId);
    return redirect("/", { headers });
  }

  if (intent === "add-comment") {
    const content = (formData.get("content") as string)?.trim();
    if (!content) {
      return json(
        { error: "Comment cannot be empty." },
        { status: 400, headers }
      );
    }
    await createComment(request, taskId, user.id, content);
    return redirect(`/tasks/${taskId}#comments`, { headers });
  }

  if (intent === "delete-comment") {
    const commentId = formData.get("comment_id") as string;
    await deleteComment(request, commentId, user.id);
    return redirect(`/tasks/${taskId}#comments`, { headers });
  }

  return json({ error: "Unknown intent." }, { status: 400, headers });
}

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

export default function TaskDetail() {
  const { task, comments, profiles, currentUserId } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSaving =
    navigation.state === "submitting" &&
    navigation.formData?.get("intent") === "update";

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          to="/"
          className="text-sm text-indigo-600 hover:text-indigo-700"
        >
          ← All Tasks
        </Link>
      </div>

      {/* Edit Form */}
      <section
        aria-label="Edit task"
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h1 className="mb-6 text-xl font-semibold text-gray-900">
          {task.title}
        </h1>

        <Form method="post" className="space-y-4">
          <input type="hidden" name="intent" value="update" />

          <div>
            <label
              htmlFor="title"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              name="title"
              defaultValue={task.title}
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Task title"
              disabled={isSaving}
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              defaultValue={task.description ?? ""}
              rows={4}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Task description"
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <label
                htmlFor="status"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue={task.status}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Task status"
                disabled={isSaving}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="priority"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Priority
              </label>
              <select
                id="priority"
                name="priority"
                defaultValue={task.priority}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Task priority"
                disabled={isSaving}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="assignee_id"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Assignee
              </label>
              <select
                id="assignee_id"
                name="assignee_id"
                defaultValue={task.assignee_id ?? ""}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Assignee"
                disabled={isSaving}
              >
                <option value="">None</option>
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="due_date"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Due date
              </label>
              <input
                id="due_date"
                type="date"
                name="due_date"
                defaultValue={task.due_date ?? ""}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Due date"
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[task.status]}`}
              >
                {task.status.replace("_", " ")}
              </span>
              <span
                className={`text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}
              >
                {task.priority} priority
              </span>
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
              aria-label="Save changes"
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </Form>

        <div className="mt-4 border-t border-gray-100 pt-4">
          <Form
            method="post"
            onSubmit={(e) => {
              if (!confirm("Delete this task?")) e.preventDefault();
            }}
          >
            <input type="hidden" name="intent" value="delete" />
            <button
              type="submit"
              className="text-sm text-red-600 hover:text-red-700 hover:underline"
              aria-label="Delete this task"
            >
              Delete task
            </button>
          </Form>
        </div>

        <p className="mt-4 text-xs text-gray-400">
          Created {new Date(task.created_at).toLocaleString()} · Updated{" "}
          {new Date(task.updated_at).toLocaleString()}
        </p>
      </section>

      {/* Comments */}
      <section
        id="comments"
        aria-label="Comments"
        className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-base font-semibold text-gray-900">
          Comments ({comments.length})
        </h2>

        <CommentList
          comments={comments}
          currentUserId={currentUserId}
        />

        <Form method="post" className="mt-4 space-y-3">
          <input type="hidden" name="intent" value="add-comment" />
          <textarea
            name="content"
            rows={3}
            placeholder="Write a comment…"
            required
            aria-label="Comment text"
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            aria-label="Post comment"
          >
            Post comment
          </button>
        </Form>
      </section>
    </div>
  );
}

function CommentList({
  comments,
  currentUserId,
}: {
  comments: TaskComment[];
  currentUserId: string;
}) {
  const fetcher = useFetcher();

  if (comments.length === 0) {
    return (
      <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
    );
  }

  return (
    <ul className="space-y-3" aria-label="Comments list">
      {comments.map((comment) => {
        const isDeleting =
          fetcher.state !== "idle" &&
          fetcher.formData?.get("comment_id") === comment.id;

        if (isDeleting) return null;

        return (
          <li
            key={comment.id}
            className="rounded-lg bg-gray-50 px-4 py-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs font-medium text-gray-700">
                  {comment.author?.full_name ?? comment.author?.email ?? "Unknown"}{" "}
                  <span className="font-normal text-gray-400">
                    {new Date(comment.created_at).toLocaleString()}
                  </span>
                </p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
              {comment.author_id === currentUserId && (
                <fetcher.Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="delete-comment"
                  />
                  <input
                    type="hidden"
                    name="comment_id"
                    value={comment.id}
                  />
                  <button
                    type="submit"
                    className="text-xs text-gray-400 hover:text-red-600"
                    aria-label="Delete comment"
                    onClick={(e) => {
                      if (!confirm("Delete comment?")) e.preventDefault();
                    }}
                  >
                    Delete
                  </button>
                </fetcher.Form>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-800">
          {error.status}: {error.data}
        </h2>
        <Link to="/" className="mt-2 block text-sm text-indigo-600 hover:underline">
          ← Home
        </Link>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="text-lg font-semibold text-red-800">Unexpected Error</h2>
      <Link to="/" className="mt-2 block text-sm text-indigo-600 hover:underline">
        ← Home
      </Link>
    </div>
  );
}
