import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { RegistrationProvider } from "./context/RegistrationContext";
import { ClubMembershipProvider } from "./context/ClubMembershipContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RegistrationProvider>
          <ClubMembershipProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </ClubMembershipProvider>
        </RegistrationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
