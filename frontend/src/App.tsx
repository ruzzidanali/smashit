import { Route, Routes } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout";
import OwnerLayout from "./layouts/OwnerLayout";
import OwnerGuard from "./components/OwnerGuard";

import DiscoverPage from "./pages/DiscoverPage";
import ReservePage from "./pages/ReservePage";
import MyBookingsPage from "./pages/MyBookingsPage";
import AiAssistantPage from "./pages/AiAssistantPage";

import OwnerLogin from "./pages/OwnerLogin";
import OwnerRegister from "./pages/OwnerRegister";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerCourts from "./pages/OwnerCourts";
import OwnerBookings from "./pages/OwnerBookings";

import OwnerProfile from "./pages/OwnerProfile";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC + AUTH PAGES (navbar + footer) */}
      <Route element={<PublicLayout />}>
        {/* public */}
        <Route path="/" element={<DiscoverPage />} />
        <Route path="/reserve" element={<DiscoverPage />} />
        <Route path="/my-bookings" element={<MyBookingsPage />} />
        <Route path="/ai" element={<AiAssistantPage />} />

        {/* multi-tenant public */}
        <Route path="/b/:slug" element={<ReservePage />} />
        <Route path="/b/:slug/my-bookings" element={<MyBookingsPage />} />

        {/* owner auth pages WITH public navbar */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/register" element={<OwnerRegister />} />
      </Route>

      {/* OWNER AREA (NO public navbar) */}
      <Route
        path="/owner"
        element={
          <OwnerGuard>
            <OwnerLayout />
          </OwnerGuard>
        }
      >
        <Route path="dashboard" element={<OwnerDashboard />} />
        <Route path="profile" element={<OwnerProfile />} />
        <Route path="courts" element={<OwnerCourts />} />
        <Route path="bookings" element={<OwnerBookings />} />
      </Route>
    </Routes>
  );
}
