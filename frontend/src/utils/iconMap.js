import { FaCode, FaRobot, FaCamera, FaFutbol, FaLightbulb, FaUsers } from "react-icons/fa";

// Maps the icon name string stored on a Club document (backend) back to an
// actual react-icons component to render. Falls back to a generic icon for
// any club category not in this list, so a newly-added club never breaks.
const ICON_MAP = {
  FaCode,
  FaRobot,
  FaCamera,
  FaFutbol,
  FaLightbulb,
  FaUsers,
};

export function getClubIcon(iconName) {
  return ICON_MAP[iconName] || FaUsers;
}

// Assigns a consistent color gradient per category, since the backend
// doesn't store a color -- purely a frontend display concern.
const CATEGORY_COLORS = {
  Technology: "from-indigo-500 to-blue-600",
  Sports: "from-emerald-500 to-green-600",
  Arts: "from-amber-500 to-orange-600",
  Business: "from-rose-500 to-red-600",
};

export function getClubColor(category) {
  return CATEGORY_COLORS[category] || "from-purple-500 to-fuchsia-600";
}
