import { TODAY_PAGE } from "../lib/modules";
import { useJournal } from "../state/JournalContext";
import type { Route } from "../lib/routes";

const TABS: { page: string; icon: string; label: string }[] = [
  { page: TODAY_PAGE, icon: "◗", label: "Aujourd'hui" },
  { page: "Suivis & objectifs", icon: "▤", label: "Suivis" },
  { page: "__week__", icon: "◍", label: "Semaine" },
  { page: "Lecture & inspiration", icon: "✎", label: "Lecture" },
  { page: "__customize__", icon: "—", label: "Réglages" },
];

interface Props {
  route: Route;
  onNavigate: (route: Route) => void;
}

/** The bottom navigation from design 7a, replacing the sidebar on mobile. */
export function MobileTabBar({ route, onNavigate }: Props) {
  const { settings } = useJournal();

  return (
    <nav className="tabbar">
      {TABS.map((tab) => {
        // Pages the reader turned off in Personnaliser still get a tab —
        // it opens straight to the "add a module" prompt, same as desktop.
        if (tab.page !== "__week__" && tab.page !== "__customize__" && tab.page !== TODAY_PAGE && !settings.pages.includes(tab.page)) return null;
        const active =
          tab.page === "__week__"
            ? route.name === "week"
            : tab.page === "__customize__"
              ? route.name === "customize"
              : route.name === "page" && route.page === tab.page;
        return (
          <button
            key={tab.page}
            type="button"
            className={`tab-item${active ? " active" : ""}`}
            aria-current={active ? "page" : undefined}
            onClick={() =>
              onNavigate(
                tab.page === "__week__" ? { name: "week" } : tab.page === "__customize__" ? { name: "customize" } : { name: "page", page: tab.page },
              )
            }
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
