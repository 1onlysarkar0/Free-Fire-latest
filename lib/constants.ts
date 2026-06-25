// Shared tournament status constants — single source of truth
export const TOURNAMENT_STATUS_COLORS: Record<string, string> = {
  UPCOMING: "bg-blue-100 text-blue-800",
  ACTIVE: "bg-green-100 text-green-800",
  ROOM_REVEALED: "bg-orange-100 text-orange-800",
  LIVE: "bg-green-100 text-green-800",
  FINISHED: "bg-gray-100 text-gray-700",
  COMPLETED: "bg-purple-100 text-purple-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Upcoming",
  ACTIVE: "Active",
  ROOM_REVEALED: "Room Open",
  LIVE: "Live Now",
  FINISHED: "Finished",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};
