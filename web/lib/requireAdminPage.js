export async function requireAdminPage(ctx) {
  const cookie = ctx.req.headers.cookie || "";
  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:3001";

  try {
    const res = await fetch(`${baseUrl}/auth/me`, {
      headers: {
        cookie,
      },
    });

    if (!res.ok) {
      return {
        redirect: {
          destination: "/admin/login",
          permanent: false,
        },
      };
    }

    const json = await res.json();
    const role = json?.user?.role;

    if (role !== "ADMIN") {
      return {
        redirect: {
          destination: "/",
          permanent: false,
        },
      };
    }

    return {
      props: {
        currentUser: json.user,
      },
    };
  } catch {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false,
      },
    };
  }
}