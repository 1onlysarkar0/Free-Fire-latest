type TournamentSeoInput = {
  id: string;
  name: string;
  type: string;
  joiningFee: number | null;
  prizePool: number | null;
  gameMode: string;
  teamFormat: string;
  totalSlots: number;
  startTime: Date | string;
  status?: string | null;
  availableSlots?: number | null;
  siteName: string;
  baseUrl: string;
  logoSrc?: string | null;
};

const REGISTRATION_OPEN_STATUSES = new Set(["UPCOMING", "ACTIVE", "ROOM_REVEALED", "LIVE"]);

function toIsoDate(value: Date | string) {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function humanize(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildDetailUrl(baseUrl: string, id: string) {
  return `${baseUrl.replace(/\/$/, "")}/tournaments/${id}`;
}

export function getTournamentSchemaStatus(status?: string | null) {
  return status === "CANCELLED"
    ? "https://schema.org/EventCancelled"
    : "https://schema.org/EventScheduled";
}

export function getTournamentSchemaAvailability(status?: string | null, availableSlots?: number | null) {
  if (status === "CANCELLED" || status === "COMPLETED" || status === "FINISHED") {
    return "https://schema.org/SoldOut";
  }

  if (typeof availableSlots === "number") {
    return availableSlots > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut";
  }

  return REGISTRATION_OPEN_STATUSES.has(status ?? "UPCOMING")
    ? "https://schema.org/InStock"
    : "https://schema.org/SoldOut";
}

export function buildTournamentMeta(input: TournamentSeoInput) {
  const name = input.name.trim();
  const siteName = input.siteName.trim() || "1OnlySarkar";
  const entryFee = Math.max(0, input.joiningFee ?? 0);
  const prizePool = Math.max(0, input.prizePool ?? 0);
  const entryText = input.type.toUpperCase() === "FREE" ? "Free entry" : `Entry fee: Rs ${entryFee}`;
  const mode = humanize(input.gameMode);
  const format = input.teamFormat.toUpperCase();

  return {
    metaTitle: `${name} Free Fire Tournament | ${siteName}`,
    metaDescription: `Join ${name} on ${siteName}. ${entryText}. Prize pool: Rs ${prizePool}. ${format} ${mode} custom room with ${input.totalSlots} slots.`,
  };
}

export function buildTournamentSportsEventSchema(input: TournamentSeoInput) {
  const detailUrl = buildDetailUrl(input.baseUrl, input.id);
  const { metaDescription } = buildTournamentMeta(input);
  const entryFee = Math.max(0, input.joiningFee ?? 0);
  const logoUrl = input.logoSrc?.startsWith("http")
    ? input.logoSrc
    : `${input.baseUrl.replace(/\/$/, "")}${input.logoSrc ?? "/assets/logo.webp"}`;

  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    "name": input.name.trim(),
    "description": metaDescription,
    "url": detailUrl,
    "startDate": toIsoDate(input.startTime),
    "eventStatus": getTournamentSchemaStatus(input.status),
    "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
    "location": {
      "@type": "VirtualLocation",
      "url": detailUrl,
    },
    "organizer": {
      "@type": "Organization",
      "name": input.siteName,
      "url": input.baseUrl,
      "logo": logoUrl,
    },
    "offers": {
      "@type": "Offer",
      "price": entryFee,
      "priceCurrency": "INR",
      "availability": getTournamentSchemaAvailability(input.status, input.availableSlots),
      "url": detailUrl,
    },
    "isAccessibleForFree": input.type.toUpperCase() === "FREE",
    "maximumAttendeeCapacity": input.totalSlots,
    ...(typeof input.availableSlots === "number"
      ? { "remainingAttendeeCapacity": Math.max(0, input.availableSlots) }
      : {}),
    "about": {
      "@type": "VideoGame",
      "name": "Free Fire",
      "publisher": "Garena",
      "applicationCategory": "Game",
      "operatingSystem": "Android, iOS",
      "url": "https://ff.garena.com/",
    },
  };
}
