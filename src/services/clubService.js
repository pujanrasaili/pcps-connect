import { clubs } from "../data/clubs";

// Simulated async service layer — mirrors how a real API client would be
// structured, so it's a drop-in swap for a real backend later.
export function fetchClubs() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(clubs), 300);
  });
}

export function fetchClubById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const club = clubs.find((c) => c.id === id);
      club ? resolve(club) : reject(new Error("Club not found"));
    }, 200);
  });
}
