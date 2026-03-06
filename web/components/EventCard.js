import Link from "next/link";

export default function EventCard({ event }) {
  return (
    <Link href={`/events/${event.slug}`} style={styles.link}>
      <div style={styles.card}>
        {event.heroImageUrl ? (
          <div style={styles.imageWrap}>
            <img
              src={event.heroImageUrl}
              alt={`${event.title} flyer`}
              style={styles.image}
            />
          </div>
        ) : (
          <div style={styles.placeholderImage}>No Flyer</div>
        )}

        <div style={styles.body}>
          <div style={styles.categoryPill}>
            {event.category?.name || "Event"}
          </div>

          <h3 style={styles.title}>{event.title}</h3>

          {event.description ? (
            <p style={styles.description}>{event.description}</p>
          ) : null}

          <div style={styles.meta}>
            {event.startAt ? (
              <div>{new Date(event.startAt).toLocaleString()}</div>
            ) : (
              <div>Date TBD</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

const styles = {
  link: {
    textDecoration: "none",
    color: "inherit",
  },
  card: {
    border: "1px solid #1f2937",
    borderRadius: 16,
    overflow: "hidden",
    background: "#11161c",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.15s ease, border-color 0.15s ease",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: "16 / 9",
    overflow: "hidden",
    background: "#0b0d10",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  placeholderImage: {
    width: "100%",
    aspectRatio: "16 / 9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f141a",
    color: "#7f8b99",
    fontSize: 14,
  },
  body: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
  },
  categoryPill: {
    alignSelf: "flex-start",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#8fb3ff",
    background: "#162235",
    border: "1px solid #27415f",
    padding: "4px 8px",
    borderRadius: 999,
  },
  title: {
    margin: 0,
    fontSize: 20,
    lineHeight: 1.2,
    color: "#f5f7fa",
  },
  description: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.5,
    color: "#c9d1d9",
  },
  meta: {
    marginTop: "auto",
    fontSize: 13,
    color: "#9aa4af",
  },
};