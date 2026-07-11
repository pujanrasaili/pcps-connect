import { BrowserRouter } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { RegistrationProvider } from "./context/RegistrationContext";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RegistrationProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </RegistrationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
