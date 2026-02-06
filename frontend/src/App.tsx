import { Navigate, Route, Routes } from "react-router-dom";
import PublicLayout from "./layouts/PublicLayout";
import OwnerLayout from "./layouts/OwnerLayout";
import OwnerGuard from "./components/OwnerGuard";
import DiscoverPage from "./pages/DiscoverPage";
import ReservePage from "./pages/ReservePage";
import MyBookingsPage from "./pages/MyBookingsPage";
// import AiAssistantPage from "./pages/AiAssistantPage";
import OwnerLogin from "./pages/OwnerLogin";
import OwnerRegister from "./pages/OwnerRegister";
import OwnerDashboard from "./pages/OwnerDashboard";
import OwnerCourts from "./pages/OwnerCourts";
import OwnerBookings from "./pages/OwnerBookings";
import OwnerProfile from "./pages/OwnerProfile";
import ProfileGuard from "./components/ProfileGuard";
import UserLogin from "./pages/UserLogin";
import UserRegister from "./pages/UserRegister";
import VerifyEmailTac from "./pages/VerifyEmailTac";
import AccountGuard from "./components/AccountGuard";
import UserProfile from "./pages/UserProfile";
import GuestGuard from "./components/GuestGuard";

export default function App() {
  return (
    <Routes>
      {/* PUBLIC + AUTH PAGES (navbar + footer) */}
      <Route element={<PublicLayout />}>
        {/* public */}
        <Route path="/" element={<DiscoverPage />} />

        {/* Reserve should show ReservePage, not DiscoverPage */}
        <Route path="/reserve" element={<ReservePage />} />

        <Route path="/my-bookings" element={<MyBookingsPage />} />
        {/* <Route path="/ai" element={<AiAssistantPage />} /> */}

        {/* multi-tenant public */}
        <Route path="/b/:slug" element={<ReservePage />} />
        <Route path="/b/:slug/my-bookings" element={<MyBookingsPage />} />

        {/* Optional helper route (if you ever link to /b/:slug/reserve) */}
        <Route
          path="/b/:slug/reserve"
          element={<Navigate to="../" replace />}
        />

        {/* owner auth pages WITH public navbar */}
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route path="/owner/register" element={<OwnerRegister />} />

        {/* user auth pages */}
        <Route
          path="/login"
          element={
            <GuestGuard>
              <UserLogin />
            </GuestGuard>
          }
        />
        <Route
          path="/register"
          element={
            <GuestGuard>
              <UserRegister />
            </GuestGuard>
          }
        />

        <Route path="/verify-email" element={<VerifyEmailTac />} />

        <Route
          path="/profile"
          element={
            <AccountGuard>
              <UserProfile />
            </AccountGuard>
          }
        />
      </Route>

      {/* OWNER AREA (NO public navbar) */}
      <Route
        path="/owner"
        element={
          <OwnerGuard>
            <ProfileGuard>
              <OwnerLayout />
            </ProfileGuard>
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
