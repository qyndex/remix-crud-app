import type {
  MetaFunction,
  LoaderFunctionArgs,
  ActionFunctionArgs,
} from "@remix-run/node";
import { json, redirect } from "@remix-run/node";
import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { createSupabaseServerClient, getUser } from "~/lib/supabase.server";
import { upsertProfile } from "~/lib/profiles.server";

export const meta: MetaFunction = () => [
  { title: "Sign Up — Task Manager" },
];

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
  const fullName = (formData.get("full_name") as string)?.trim() || null;

  if (!email || !password) {
    return json({ error: "Email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
    },
  });

  if (error) {
    return json({ error: error.message }, { status: 400, headers });
  }

  // Create profile immediately (trigger also fires, but this ensures it exists)
  if (data.user) {
    await upsertProfile(data.user.id, email, { full_name: fullName });
  }

  return redirect("/", { headers });
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="mx-auto max-w-sm py-16">
      <h1 className="mb-8 text-center text-2xl font-bold text-gray-900">
        Create your account
      </h1>

      <Form method="post" noValidate>
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
              htmlFor="full_name"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Full name <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="full_name"
              type="text"
              name="full_name"
              autoComplete="name"
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Full name"
              disabled={isSubmitting}
            />
          </div>

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
              autoComplete="new-password"
              required
              minLength={8}
              className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Password (minimum 8 characters)"
              aria-describedby="password-hint"
              disabled={isSubmitting}
            />
            <p id="password-hint" className="mt-1 text-xs text-gray-500">
              Minimum 8 characters
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-60"
            aria-label="Create account"
          >
            {isSubmitting ? "Creating account…" : "Create account"}
          </button>
        </div>
      </Form>

      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link
          to="/auth/login"
          className="font-medium text-indigo-600 hover:text-indigo-700"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
