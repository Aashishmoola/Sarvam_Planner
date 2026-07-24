import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PATHS = ["/login", "/auth/callback"];
const ONBOARDING_PATHS = [
  "/welcome",
  "/limits",
  "/focus-hours",
  "/goals",
  "/mottos",
];

function startsWithAny(path: string, list: string[]) {
  return list.some((p) => path === p || path.startsWith(p + "/"));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthPath = startsWithAny(path, AUTH_PATHS);
  const isOnboardingPath = startsWithAny(path, ONBOARDING_PATHS);

  // Unauthenticated → force to /login
  if (!user) {
    if (isAuthPath) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Authenticated → look up onboarded_at
  const { data: config } = await supabase
    .from("user_config")
    .select("onboarded_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const onboarded = !!config?.onboarded_at;

  // Signed in but on /login → send home
  if (isAuthPath) {
    const url = request.nextUrl.clone();
    url.pathname = onboarded ? "/today" : "/welcome";
    return NextResponse.redirect(url);
  }

  // Not onboarded and outside onboarding → send to /welcome
  if (!onboarded && !isOnboardingPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/welcome";
    return NextResponse.redirect(url);
  }

  // Onboarded and on onboarding → send to /today
  if (onboarded && isOnboardingPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/today";
    return NextResponse.redirect(url);
  }

  return response;
}
