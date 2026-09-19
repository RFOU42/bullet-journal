import { useCallback, useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { MobileTabBar } from "./components/MobileTabBar";
import { CustomizeScreen } from "./screens/CustomizeScreen";
import { DetailScreen } from "./screens/DetailScreen";
import { MobileToday } from "./screens/MobileToday";
import { MobileWizard } from "./screens/MobileWizard";
import { Onboarding } from "./screens/Onboarding";
import { PageScreen } from "./screens/PageScreen";
import { WeekScreen } from "./screens/WeekScreen";
import { TODAY_PAGE } from "./lib/modules";
import { useIsMobile } from "./lib/viewport";
import { useJournal } from "./state/JournalContext";
import type { Route } from "./lib/routes";

const HOME: Route = { name: "page", page: TODAY_PAGE };

export function App() {
  const { settings, syncStatus } = useJournal();
  const isMobile = useIsMobile();
  const [route, setRoute] = useState<Route>(HOME);
  // Where "Retour" goes from a detail screen, and where the wizard's back
  // arrow returns to — the screen the reader was actually on.
  const [back, setBack] = useState<Route>(HOME);

  const navigate = useCallback((next: Route) => {
    setRoute((current) => {
      if ((next.name === "detail" || next.name === "wizard") && current.name !== "detail" && current.name !== "wizard") {
        setBack(current);
      }
      return next;
    });
  }, []);

  if (syncStatus === "loading") {
    return (
      <div className="splash">
        <div className="auth-mark">◗</div>
      </div>
    );
  }

  if (!settings.onboarded) return <Onboarding />;

  if (isMobile) {
    if (route.name === "wizard") {
      return (
        <MobileWizard
          dayKey={route.dayKey}
          startStep={route.step}
          onExit={() => navigate(back)}
          onCloseDay={() => navigate({ name: "week" })}
        />
      );
    }
    return (
      <div className="mobile-shell">
        {route.name === "page" && route.page === TODAY_PAGE && <MobileToday onNavigate={navigate} />}
        {route.name === "page" && route.page !== TODAY_PAGE && <PageScreen page={route.page} onNavigate={navigate} />}
        {route.name === "week" && <WeekScreen />}
        {route.name === "customize" && <CustomizeScreen />}
        {route.name === "detail" && <DetailScreen moduleId={route.module} onBack={() => navigate(back)} />}
        <MobileTabBar route={route} onNavigate={navigate} />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar route={route} onNavigate={navigate} />
      {route.name === "page" && <PageScreen page={route.page} onNavigate={navigate} />}
      {route.name === "week" && <WeekScreen />}
      {route.name === "customize" && <CustomizeScreen />}
      {route.name === "detail" && (
        <DetailScreen moduleId={route.module} onBack={() => navigate(back)} />
      )}
    </div>
  );
}
