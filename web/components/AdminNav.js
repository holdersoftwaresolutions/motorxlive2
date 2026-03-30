import Link from "next/link";
import { useRouter } from "next/router";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/streams", label: "Streams" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminNav() {
  const router = useRouter();

  return (
    <nav style={styles.nav}>
      {links.map((link) => {
        const active = router.pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            style={{
              ...styles.link,
              ...(active ? styles.linkActive : {}),
            }}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
    marginBottom: 24,
  },
  link: {
    textDecoration: "none",
    color: "#dbe5f0",
    background: "#131a22",
    border: "1px solid #223041",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 14,
  },
  linkActive: {
    background: "#1b2a40",
    border: "1px solid #4f8cff",
    color: "#fff",
  },
};