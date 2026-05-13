import Link from "next/link";
import { useRouter } from "next/router";
import { BRAND } from "../lib/brand";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/streams", label: "Streams" },
  { href: "/admin/videos", label: "Videos" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/contributor-requests", label: "Contributor Requests" },
  { href: "/admin/youtube-discovery", label: "YouTube Discovery" },
  { href: "/admin/youtube-channels", label: "Approved YouTube Channels" },
  { href: "/admin/youtube-videos", label: "YouTube Videos" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/auto-events", label: "Auto Events" },
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
    fontWeight: 700,
  },
  linkActive: {
    background: "linear-gradient(135deg, rgba(0,229,255,0.18), rgba(0,255,157,0.10))",
    border: `1px solid ${BRAND.colors.blue}`,
    color: "#fff",
    boxShadow: "0 0 14px rgba(0,229,255,0.16)",
  },
};