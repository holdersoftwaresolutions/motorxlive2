import Link from "next/link";

function isEventCurrentlyLive(event) {
  const now = new Date();

  const start = event?.startAt ? new Date(event.startAt) : null;
  const end = event?.endAt ? new Date(event.endAt) : null;

  if (!start || !end) return false;

  return start <= now && now <= end;
}

function hasPlayableLiveFeed(event) {
  if (!Array.isArray(event?.streams)) return false;

  return event.streams.some((stream) => {
    return (
      stream?.moderationStatus === "APPROVED" &&
      (
        stream?.youtubeVideoId ||
        stream?.playbackHlsUrl ||
        stream?.playbackDashUrl
      )
    );
  });
}

function shouldShowLiveBadge(event) {
  return isEventCurrentlyLive(event) && hasPlayableLiveFeed(event);
}

function formatEventDate(event) {
  if (!event?.startAt) return "Date TBD";

  try {
    const start = new Date(event.startAt);

    if (!event?.endAt) {
      return start.toLocaleString();
    }

    const end = new Date(event.endAt);

    const sameDay =
      start.toDateString() === end.toDateString();

    if (sameDay) {
      return start.toLocaleString();
    }

    return `${start.toLocaleDateString()} → ${end.toLocaleDateString()}`;
  } catch {
    return "Date TBD";
  }
}

export default function EventCard({ event }) {
  const liveNow = shouldShowLiveBadge(event);

  return (
    <Link href={`/events/${event.slug}`} style={styles.link}>
      <div
        style={{
          ...styles.card,
          ...(liveNow ? styles.cardLive : {}),
        }}
      >
        <div style={styles.imageContainer}>
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

          {liveNow ? (
            <div style={styles.liveBadge}>
              <span style={styles.liveDot} />
              LIVE NOW
            </div>
          ) : null}
        </div>

        <div style={styles.body}>
          <div style={styles.topRow}>
            <div style={styles.categoryPill}>
              {event.category?.name || "Event"}
            </div>

            {event.streams?.length ? (
              <div style={styles.streamCount}>
                {event.streams.length} Feed
                {event.streams.length !== 1 ? "s" : ""}
              </div>
            ) : null}
          </div>

          <h3 style={styles.title}>{event.title}</h3>

          {event.description ? (
            <p style={styles.description}>{event.description}</p>
          ) : null}

          <div style={styles.meta}>
            <div>{formatEventDate(event)}</div>

            {(event.venueName || event.city || event.state) ? (
              <div style={styles.location}>
                {[event.venueName, event.city, event.state]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
            ) : null}
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

  cardLive: {
    border: "1px solid #ff3b3b",
    boxShadow: "0 0 0 1px rgba(255,59,59,0.2)",
  },

  imageContainer: {
    position: "relative",
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

  liveBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#c62828",
    color: "#fff",
    fontWeight: 800,
    fontSize: 12,
    padding: "6px 10px",
    borderRadius: 999,
    letterSpacing: 0.5,
    border: "1px solid #ff6b6b",
  },

  liveDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#fff",
  },

  body: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
  },

  topRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
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

  streamCount: {
    fontSize: 12,
    color: "#9aa4af",
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
    display: "grid",
    gap: 6,
  },

  location: {
    color: "#7f8b99",
  },
};