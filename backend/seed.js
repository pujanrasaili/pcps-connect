// Populates the database with the original 5 PCPS clubs and 5 sample
// events, so the app has real data to show after switching from the old
// hardcoded frontend data files to live API calls.
//
// Run once with:  node seed.js
// Safe to re-run -- it clears existing clubs/events first so you don't get
// duplicates.

require("dotenv").config();
const mongoose = require("mongoose");
const dns = require("dns");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const Club = require("./models/Club");
const Event = require("./models/Event");

const clubs = [
  {
    name: "PCPS Coding Club",
    category: "Technology",
    icon: "FaCode",
    description: "A community of student developers building real projects together, from web apps to open-source contributions.",
    longDescription: "PCPS Coding Club brings together students who love writing code and solving problems. We run weekly coding sessions, pair-programming nights, and prepare members for hackathons and technical interviews. Beginners are always welcome — we believe everyone can learn to build software with the right guidance and community.",
    activities: ["Weekly coding meetups", "Open-source contribution drives", "Hackathon preparation bootcamps", "Guest talks from industry engineers"],
    leadName: "Aayush Shrestha",
    leadRole: "Club President",
    email: "coding.club@pcps.edu.np",
    foundedYear: "2021",
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "PCPS Robotics Club",
    category: "Technology",
    icon: "FaRobot",
    description: "Design, build, and program robots — from line followers to competition-ready autonomous bots.",
    longDescription: "The Robotics Club is where hardware meets software. Members work in small teams to design circuits, 3D print parts, and write embedded firmware for robots that compete in regional showcases. No prior electronics experience is required to join.",
    activities: ["Robot design & build sessions", "Arduino & sensor workshops", "Inter-college robotics exhibitions", "Firmware & embedded systems training"],
    leadName: "Sujata Maharjan",
    leadRole: "Club President",
    email: "robotics.club@pcps.edu.np",
    foundedYear: "2022",
    image: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "PCPS Photography Club",
    category: "Arts",
    icon: "FaCamera",
    description: "Capture campus life and beyond — a creative outlet for students who see the world through a lens.",
    longDescription: "From portrait sessions to street photography walks around Patan, this club nurtures visual storytellers. We host monthly photo contests, editing workshops, and an annual exhibition featuring the best student work of the year.",
    activities: ["Monthly photo walks", "Lightroom & editing workshops", "Annual PCPS photo exhibition", "Campus event coverage team"],
    leadName: "Bibek Tamang",
    leadRole: "Club President",
    email: "photography.club@pcps.edu.np",
    foundedYear: "2020",
    image: "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "PCPS Sports Club",
    category: "Sports",
    icon: "FaFutbol",
    description: "Football, futsal, basketball and more — building teamwork, fitness, and college spirit.",
    longDescription: "PCPS Sports Club organizes inter-department leagues, fitness drives, and represents the college in inter-collegiate tournaments across Kathmandu Valley. Whether you're a competitive athlete or just want to stay active, there's a place for you here.",
    activities: ["Weekly futsal & basketball practice", "Inter-department leagues", "Annual sports week", "Fitness & wellness sessions"],
    leadName: "Kiran Gurung",
    leadRole: "Club President",
    email: "sports.club@pcps.edu.np",
    foundedYear: "2019",
    image: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800&auto=format&fit=crop",
  },
  {
    name: "PCPS Entrepreneurship Club",
    category: "Business",
    icon: "FaLightbulb",
    description: "Turn ideas into ventures — pitch practice, mentorship, and a network of student founders.",
    longDescription: "The Entrepreneurship Club supports student founders at every stage, from validating an idea to pitching investors. We host founder talks, business model workshops, and an annual pitch competition with real seed funding for the winning team.",
    activities: ["Startup pitch nights", "Founder mentorship circles", "Business model workshops", "Annual PCPS Pitch Competition"],
    leadName: "Nisha Rai",
    leadRole: "Club President",
    email: "ecell@pcps.edu.np",
    foundedYear: "2023",
    image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?q=80&w=800&auto=format&fit=crop",
  },
];

const events = [
  {
    title: "Hackathon 2026",
    capacity: 150,
    category: "Technology",
    price: "Free",
    description: "A 12-hour build sprint where student teams design and ship a working prototype around this year's theme: 'Tech for Community'.",
    date: new Date("2026-08-14T09:00:00"),
    location: "PCPS Innovation Lab, Patan",
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Web Development Workshop",
    capacity: 60,
    category: "Workshop",
    price: "Free",
    description: "A hands-on introduction to modern web development with React and Tailwind CSS — build and deploy your first web app in one afternoon.",
    date: new Date("2026-07-25T14:00:00"),
    location: "Room 204, PCPS Main Block",
    image: "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Photography Contest",
    capacity: 100,
    category: "Arts",
    price: "NPR 200",
    description: "Capture the theme 'Heritage & Youth' around Patan Durbar Square. Top three entries win prizes and a feature in the annual PCPS exhibition.",
    date: new Date("2026-08-02T10:00:00"),
    location: "PCPS Courtyard & Patan Durbar Square",
    image: "https://images.unsplash.com/photo-1471879832106-c7ab9e0cee23?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Robotics Exhibition",
    capacity: 200,
    category: "Technology",
    price: "Free",
    description: "See student-built robots in action — line followers, robotic arms, and autonomous bots — plus live demos and Q&A with the builders.",
    date: new Date("2026-09-05T11:00:00"),
    location: "PCPS Auditorium",
    image: "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?q=80&w=1000&auto=format&fit=crop",
  },
  {
    title: "Career Guidance Seminar",
    capacity: 250,
    category: "Career",
    price: "Free",
    description: "Industry professionals share guidance on resumes, interviews, and career paths in tech, business, and creative fields — with an open Q&A panel.",
    date: new Date("2026-07-30T13:00:00"),
    location: "PCPS Auditorium",
    image: "https://images.unsplash.com/photo-1560439514-4e9645039924?q=80&w=1000&auto=format&fit=crop",
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected. Seeding...");

  await Club.deleteMany({});
  await Club.insertMany(clubs);
  console.log(`Inserted ${clubs.length} clubs`);

  // Events need a createdBy user -- find any existing user, or skip if none yet.
  const User = require("./models/User");
  const anyUser = await User.findOne();
  if (!anyUser) {
    console.log("No users found yet -- skipping event seed. Register a user first, then re-run seed.js if you want sample events too.");
  } else {
    await Event.deleteMany({});
    await Event.insertMany(events.map((e) => ({ ...e, createdBy: anyUser._id })));
    console.log(`Inserted ${events.length} events (attributed to ${anyUser.email})`);
  }

  console.log("Done.");
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
