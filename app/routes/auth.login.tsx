import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation, useSearchParams } from "@remix-run/react";
import { createSupabaseServerClient, getUser } from "~/lib/supabase.server";

export const meta: MetaFunction = () => [{ title: "Sign In — Task Manager" }];

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getUser(request).catch(() => ({ user: null, headers: new Headers() }));
  if (user) return redirect("/");
  return json({});
}

export async function action({ request }: ActionFunctionArgs) {
  const { supabase, headers } = createSupabaseServerClient(request);
  const formData = await request.formData();

  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const redirectTo = (formData.get("redirectTo") as string) || "/";

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  return redirect(redirectTo, { headers });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/";
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
        Sign in to Task Manager
      </h1>

      <Form method="post" noValidate>
        <input type="hidden" name="redirectTo" value={redirectTo} />

        {actionData?.error && (
          <div
            className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {actionData.error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Email address"
              disabled={isSubmitting}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Password"
              disabled={isSubmitting}
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            aria-label="Sign in"
          >
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link
          to="/auth/signup"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
