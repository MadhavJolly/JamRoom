import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Room from "./pages/Room";
import Onboarding from "./pages/Onboarding";
import PublicProfile from "./pages/PublicProfile";
import Activity from "./pages/Activity";
import Messages from "./pages/Messages";
import Conversation from "./pages/Conversation";
import { Toaster } from "sonner";
import { RoomProvider } from "./RoomContext";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          const data = userDoc.data();
          const hasCompletedOnboarding = data?.onboardingComplete || (data?.genres && data.genres.length > 0);
          
          if (userDoc.exists() && hasCompletedOnboarding) {
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } catch (error) {
          console.error("Error checking user doc:", error);
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Onboarding onComplete={() => setIsAuthenticated(true)} />;
  }

  return (
    <RoomProvider>
      <Toaster theme="dark" position="bottom-right" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="search" element={<Search />} />
            <Route path="activity" element={<Activity />} />
            <Route path="messages" element={<Messages />} />
            <Route path="messages/:id" element={<Conversation />} />
            <Route path="profile" element={<Profile />} />
            <Route path="user/:id" element={<PublicProfile />} />
          </Route>
          <Route path="/room/:id" element={<Room />} />
        </Routes>
      </BrowserRouter>
    </RoomProvider>
  );
}
