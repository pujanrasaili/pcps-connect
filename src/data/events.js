export const eventCategories = [
  "All",
  "Technology",
  "Workshop",
  "Arts",
  "Career",
];

export const events = [
  {
    id: "hackathon-2026",
    title: "Hackathon 2026",
    category: "Technology",
    club: "PCPS Coding Club",
    date: "2026-08-14",
    time: "9:00 AM - 9:00 PM",
    location: "PCPS Innovation Lab, Patan",
    capacity: 150,
    registered: 96,
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?q=80&w=1000&auto=format&fit=crop",
    price: "Free",
    description:
      "A 12-hour build sprint where student teams design and ship a working prototype around this year's theme: 'Tech for Community'.",
    schedule: [
      { time: "9:00 AM", activity: "Opening ceremony & team check-in" },
      { time: "10:00 AM", activity: "Hacking begins" },
      { time: "1:00 PM", activity: "Lunch & mentor rounds" },
      { time: "6:00 PM", activity: "Submissions close" },
      { time: "7:00 PM", activity: "Judging & demos" },
      { time: "9:00 PM", activity: "Awards & closing" },
    ],
    organizer: { name: "Aayush Shrestha", role: "Coding Club President", email: "coding.club@pcps.edu.np" },
  },
  {
    id: "web-dev-workshop",
    title: "Web Development Workshop",
    category: "Workshop",
    club: "PCPS Coding Club",
    date: "2026-07-25",
    time: "2:00 PM - 5:00 PM",
    location: "Room 204, PCPS Main Block",
    capacity: 60,
    registered: 41,
    image:
      "https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1000&auto=format&fit=crop",
    price: "Free",
    description:
      "A hands-on introduction to modern web development with React and Tailwind CSS — build and deploy your first web app in one afternoon.",
    schedule: [
      { time: "2:00 PM", activity: "HTML/CSS refresher" },
      { time: "2:45 PM", activity: "Intro to React components" },
      { time: "3:45 PM", activity: "Styling with Tailwind CSS" },
      { time: "4:30 PM", activity: "Deploy your project live" },
    ],
    organizer: { name: "Sabina Lama", role: "Workshop Coordinator", email: "coding.club@pcps.edu.np" },
  },
  {
    id: "photography-contest",
    title: "Photography Contest",
    category: "Arts",
    club: "PCPS Photography Club",
    date: "2026-08-02",
    time: "10:00 AM - 4:00 PM",
    location: "PCPS Courtyard & Patan Durbar Square",
    capacity: 100,
    registered: 58,
    image:
      "https://images.unsplash.com/photo-1471879832106-c7ab9e0cee23?q=80&w=1000&auto=format&fit=crop",
    price: "NPR 200",
    description:
      "Capture the theme 'Heritage & Youth' around Patan Durbar Square. Top three entries win prizes and a feature in the annual PCPS exhibition.",
    schedule: [
      { time: "10:00 AM", activity: "Briefing & theme reveal" },
      { time: "10:30 AM", activity: "Shooting window opens" },
      { time: "2:30 PM", activity: "Submission deadline" },
      { time: "3:30 PM", activity: "Judging & winners announced" },
    ],
    organizer: { name: "Bibek Tamang", role: "Photography Club President", email: "photography.club@pcps.edu.np" },
  },
  {
    id: "robotics-exhibition",
    title: "Robotics Exhibition",
    category: "Technology",
    club: "PCPS Robotics Club",
    date: "2026-09-05",
    time: "11:00 AM - 3:00 PM",
    location: "PCPS Auditorium",
    capacity: 200,
    registered: 122,
    image:
      "https://images.unsplash.com/photo-1561144257-e32e8efc6c4f?q=80&w=1000&auto=format&fit=crop",
    price: "Free",
    description:
      "See student-built robots in action — line followers, robotic arms, and autonomous bots — plus live demos and Q&A with the builders.",
    schedule: [
      { time: "11:00 AM", activity: "Doors open & exhibit setup" },
      { time: "11:30 AM", activity: "Live demonstrations begin" },
      { time: "1:00 PM", activity: "Robot battle showcase" },
      { time: "2:30 PM", activity: "Awards for best build" },
    ],
    organizer: { name: "Sujata Maharjan", role: "Robotics Club President", email: "robotics.club@pcps.edu.np" },
  },
  {
    id: "career-guidance-seminar",
    title: "Career Guidance Seminar",
    category: "Career",
    club: "PCPS Career Services",
    date: "2026-07-30",
    time: "1:00 PM - 3:30 PM",
    location: "PCPS Auditorium",
    capacity: 250,
    registered: 187,
    image:
      "https://images.unsplash.com/photo-1560439514-4e9645039924?q=80&w=1000&auto=format&fit=crop",
    price: "Free",
    description:
      "Industry professionals share guidance on resumes, interviews, and career paths in tech, business, and creative fields — with an open Q&A panel.",
    schedule: [
      { time: "1:00 PM", activity: "Welcome & introductions" },
      { time: "1:15 PM", activity: "Panel: Building your career path" },
      { time: "2:15 PM", activity: "Resume & interview clinic" },
      { time: "3:00 PM", activity: "Open networking" },
    ],
    organizer: { name: "Career Services Office", role: "PCPS Administration", email: "careers@pcps.edu.np" },
  },
];

export const getEventById = (id) => events.find((e) => e.id === id);
