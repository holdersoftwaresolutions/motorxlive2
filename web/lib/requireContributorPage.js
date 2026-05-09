export async function requireContributorPage(ctx) {
  const cookie = ctx.req.headers.cookie || "";

  const baseUrl =
    process.env.INTERNAL_API_BASE_URL ||
    process.env.API_BASE_URL ||
    "http://localhost:3001";

  try {
    const res = await fetch(`${baseUrl}/auth/me`, {
      method: "GET",
      headers: {
        cookie,
      },
    });

    if (!res.ok) {
      return {
        redirect: {
          destination: "/contributor/login",
          permanent: false,
        },
      };
    }

    const json = await res.json();
    const role = String(json?.user?.role || "").toUpperCase();

    if (!["STREAMER", "MEDIA", "CONTRIBUTOR", "ADMIN"].includes(role)) {
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
        destination: "/contributor/login",
        permanent: false,
      },
    };
  }
}