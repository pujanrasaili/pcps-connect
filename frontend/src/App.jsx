import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./context/LanguageContext";
import { ToastProvider } from "./context/ToastContext";
import { AuthProvider } from "./context/AuthContext";
import LanguageSync from "./components/LanguageSync";
import { EventsProvider } from "./context/EventsContext";
import { ClubsProvider } from "./context/ClubsContext";
import { RegistrationProvider } from "./context/RegistrationContext";
import { ClubMembershipProvider } from "./context/ClubMembershipContext";
import AppRoutes from "./routes/AppRoutes";
import ErrorBoundary from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <LanguageSync />
            <EventsProvider>
              <ClubsProvider>
                <RegistrationProvider>
                  <ClubMembershipProvider>
                    <BrowserRouter>
                      <AppRoutes />
                    </BrowserRouter>
                  </ClubMembershipProvider>
                </RegistrationProvider>
              </ClubsProvider>
            </EventsProvider>
          </AuthProvider>
        </ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
