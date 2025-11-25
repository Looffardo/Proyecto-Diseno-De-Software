import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./styles.css";
import App from "./App.jsx";
import PedidosPage from "./PedidosPage";
import { I18nProvider } from "./i18n/I18nProvider";

const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <I18nProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/pedidos" element={<PedidosPage />} />
          </Routes>
        </BrowserRouter>
      </I18nProvider>
    </GoogleOAuthProvider>
  </StrictMode>
);