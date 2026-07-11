import { events } from "../data/events";

export function fetchEvents() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(events), 300);
  });
}

export function fetchEventById(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const event = events.find((e) => e.id === id);
      event ? resolve(event) : reject(new Error("Event not found"));
    }, 200);
  });
}
