import { useJournal } from "../state/JournalContext";
import { useAuth } from "../state/AuthContext";
import { SyncStatusLabel } from "./SyncStatusLabel";
import type { Route } from "../lib/routes";

interface Props {
  route: Route;
  onNavigate: (route: Route) => void;
}

export function Sidebar({ route, onNavigate }: Props) {
  const { settings, syncStatus, flush } = useJournal();
  const { session, signOut } = useAuth();

  const isPage = (page: string) => route.name === "page" && route.page === page;

  return (
    <nav className="sidebar">
      <div>
        <div className="brand">bullet.</div>
        <div className="brand-sub">mon carnet</div>

        <div className="nav">
          {settings.pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`nav-item${isPage(page) ? " active" : ""}`}
              aria-current={isPage(page) ? "page" : undefined}
              onClick={() => onNavigate({ name: "page", page })}
            >
              <span className="bullet">•</span>
              {page}
            </button>
          ))}
        </div>

        <div className="nav-group-label">vues</div>
        <div className="nav">
          <button
            type="button"
            className={`nav-item${route.name === "week" ? " active" : ""}`}
            onClick={() => onNavigate({ name: "week" })}
          >
            <span className="bullet">○</span>
            Semaine
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          className={`nav-item${route.name === "customize" ? " active" : ""}`}
          onClick={() => onNavigate({ name: "customize" })}
        >
          <span className="bullet">—</span>
          Personnaliser
        </button>
        <div className="sidebar-foot" style={{ marginTop: 12, paddingLeft: 12 }}>
          <SyncStatusLabel status={syncStatus} />
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {session?.user.email}
            </span>
            <button
              type="button"
              className="btn-link"
              style={{ alignSelf: "flex-start", fontSize: 11.5 }}
              onClick={() => void flush().then(signOut)}
            >
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
