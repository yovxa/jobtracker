import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import DetailPage from "./detailPage";
import Home from "./home";
import LoginPage from "./loginpage";
import { AuthProvider, useAuth } from "./lib/auth";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[#959eb8]">
        Loading...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[#959eb8]">
        Loading...
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="flex min-h-screen flex-row">
          <main className="flex-1 p-10">
            <Routes>
              <Route
                path="/login"
                element={
                  <GuestRoute>
                    <LoginPage />
                  </GuestRoute>
                }
              />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/application/:id"
                element={
                  <ProtectedRoute>
                    <DetailPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </main>
        </div>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
