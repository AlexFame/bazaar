import SwipeNavigation from "@/components/SwipeNavigation";
import AppShell from "@/components/AppShell";
import BottomNavigation from "@/components/BottomNavigation";
import { Suspense } from "react";

export default function MainLayout({ children }) {
  return (
    <>
      <div className="telegram-container">
        <Suspense fallback={null}>
          <SwipeNavigation />
        </Suspense>
        <Suspense fallback={null}>
          <AppShell>{children}</AppShell>
        </Suspense>
      </div>
      
      {/* Bottom Nav outside the container to stay static during swipes */}
      <BottomNavigation />
    </>
  );
}
