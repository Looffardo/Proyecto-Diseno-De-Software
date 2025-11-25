import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import "./styles.css";
import App from "./App.jsx";
import { I18nProvider } from "./i18n/I18nProvider";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);
