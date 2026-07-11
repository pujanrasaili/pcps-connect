import { FaCode, FaRobot, FaCamera, FaFutbol, FaLightbulb } from "react-icons/fa";

export const clubCategories = [
  "All",
  "Technology",
  "Sports",
  "Arts",
  "Business",
];

export const clubs = [
  {
    id: "coding-club",
    name: "PCPS Coding Club",
    category: "Technology",
    icon: FaCode,
    color: "from-indigo-500 to-blue-600",
    image:
      "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop",
    members: 128,
    founded: "2021",
    description:
      "A community of student developers building real projects together, from web apps to open-source contributions.",
    longDescription:
      "PCPS Coding Club brings together students who love writing code and solving problems. We run weekly coding sessions, pair-programming nights, and prepare members for hackathons and technical interviews. Beginners are always welcome — we believe everyone can learn to build software with the right guidance and community.",
    activities: [
      "Weekly coding meetups",
      "Open-source contribution drives",
      "Hackathon preparation bootcamps",
      "Guest talks from industry engineers",
    ],
    lead: { name: "Aayush Shrestha", role: "Club President" },
    email: "coding.club@pcps.edu.np",
  },
  {
    id: "robotics-club",
    name: "PCPS Robotics Club",
    category: "Technology",
    icon: FaRobot,
    color: "from-purple-500 to-fuchsia-600",
    image:
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop",
    members: 76,
    founded: "2022",
    description:
      "Design, build, and program robots — from line followers to competition-ready autonomous bots.",
    longDescription:
      "The Robotics Club is where hardware meets software. Members work in small teams to design circuits, 3D print parts, and write embedded firmware for robots that compete in regional showcases. No prior electronics experience is required to join.",
    activities: [
      "Robot design & build sessions",
      "Arduino & sensor workshops",
      "Inter-college robotics exhibitions",
      "Firmware & embedded systems training",
    ],
    lead: { name: "Sujata Maharjan", role: "Club President" },
    email: "robotics.club@pcps.edu.np",
  },
  {
    id: "photography-club",
    name: "PCPS Photography Club",
    category: "Arts",
    icon: FaCamera,
    color: "from-amber-500 to-orange-600",
    image:
      "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=800&auto=format&fit=crop",
    members: 94,
    founded: "2020",
    description:
      "Capture campus life and beyond — a creative outlet for students who see the world through a lens.",
    longDescription:
      "From portrait sessions to street photography walks around Patan, this club nurtures visual storytellers. We host monthly photo contests, editing workshops, and an annual exhibition featuring the best student work of the year.",
    activities: [
      "Monthly photo walks",
      "Lightroom & editing workshops",
      "Annual PCPS photo exhibition",
      "Campus event coverage team",
    ],
    lead: { name: "Bibek Tamang", role: "Club President" },
    email: "photography.club@pcps.edu.np",
  },
  {
    id: "sports-club",
    name: "PCPS Sports Club",
    category: "Sports",
    icon: FaFutbol,
    color: "from-emerald-500 to-green-600",
    image:
      "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800&auto=format&fit=crop",
    members: 210,
    founded: "2019",
    description:
      "Football, futsal, basketball and more — building teamwork, fitness, and college spirit.",
    longDescription:
      "PCPS Sports Club organizes inter-department leagues, fitness drives, and represents the college in inter-collegiate tournaments across Kathmandu Valley. Whether you're a competitive athlete or just want to stay active, there's a place for you here.",
    activities: [
      "Weekly futsal & basketball practice",
      "Inter-department leagues",
      "Annual sports week",
      "Fitness & wellness sessions",
    ],
    lead: { name: "Kiran Gurung", role: "Club President" },
    email: "sports.club@pcps.edu.np",
  },
  {
    id: "entrepreneurship-club",
    name: "PCPS Entrepreneurship Club",
    category: "Business",
    icon: FaLightbulb,
    color: "from-rose-500 to-red-600",
    image:
      "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
    members: 63,
    founded: "2023",
    description:
      "Turn ideas into ventures — pitch practice, mentorship, and a network of student founders.",
    longDescription:
      "The Entrepreneurship Club supports student founders at every stage, from validating an idea to pitching investors. We host founder talks, business model workshops, and an annual pitch competition with real seed funding for the winning team.",
    activities: [
      "Startup pitch nights",
      "Founder mentorship circles",
      "Business model workshops",
      "Annual PCPS Pitch Competition",
    ],
    lead: { name: "Nisha Rai", role: "Club President" },
    email: "ecell@pcps.edu.np",
  },
];

export const getClubById = (id) => clubs.find((c) => c.id === id);
