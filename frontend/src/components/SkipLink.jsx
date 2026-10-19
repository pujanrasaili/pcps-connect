// First tab stop on every page: lets keyboard and screen-reader users jump
// past the navbar straight to the page content. Invisible until focused.
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      onClick={(e) => {
        // The app uses client-side routing, so move focus ourselves instead of
        // letting the hash change fight the router.
        const main = document.getElementById("main-content");
        if (main) {
          e.preventDefault();
          main.focus();
          main.scrollIntoView();
        }
      }}
      className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-primary-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
    >
      Skip to main content
    </a>
  );
}
