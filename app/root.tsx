import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  useLoaderData,
  Link,
  Form,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import stylesheet from "./tailwind.css?url";
import { getUser } from "~/lib/supabase.server";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
];

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { user, headers } = await getUser(request);
    return json(
      {
        user: user
          ? { id: user.id, email: user.email ?? "", fullName: user.user_metadata?.full_name ?? null, avatarUrl: user.user_metadata?.avatar_url ?? null }
          : null,
      },
      { headers }
    );
  } catch {
    // Supabase env not configured (e.g. running tests without .env)
    return json({ user: null });
  }
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <Meta />
        <Links />
      </head>
      <body className="h-full bg-gray-50 text-gray-900 antialiased">
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </>
  );
}

interface HeaderUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

function Header({ user }: { user: HeaderUser | null }) {
  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link
          to="/"
          className="text-lg font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Task Manager
        </Link>
        <nav className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                to="/"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Tasks
              </Link>
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName ?? user.email}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
                    {initials}
                  </span>
                )}
                <span className="hidden text-sm text-gray-700 sm:block">
                  {user.fullName ?? user.email}
                </span>
                <Form method="post" action="/auth/logout">
                  <button
                    type="submit"
                    className="text-sm text-gray-500 hover:text-gray-900"
                    aria-label="Sign out"
                  >
                    Sign out
                  </button>
                </Form>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/auth/login"
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                Sign in
              </Link>
              <Link
                to="/auth/signup"
                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900">
          {error.status} — {error.statusText}
        </h1>
        <p className="mt-4 text-gray-600">{error.data}</p>
        <a href="/" className="mt-6 text-indigo-600 hover:underline">
          Go home
        </a>
      </div>
    );
  }
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred.";
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-4xl font-bold text-gray-900">Application Error</h1>
      <p className="mt-4 text-gray-600">{message}</p>
      <a href="/" className="mt-6 text-indigo-600 hover:underline">
        Go home
      </a>
    </div>
  );
}
