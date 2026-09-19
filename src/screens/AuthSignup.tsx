import { useMemo, useState, type FormEvent } from "react";
import { GoogleIcon } from "../components/GoogleIcon";
import { useAuth } from "../state/AuthContext";

interface Props {
  onSwitchToLogin: () => void;
}

const STRENGTH_COLORS = ["var(--dot)", "var(--rose)", "var(--ochre)", "var(--sage)"];
const STRENGTH_LABELS = ["", "trop simple", "correct", "solide"];

function passwordScore(p: string): 0 | 1 | 2 | 3 {
  if (p.length === 0) return 0;
  const score = (p.length >= 8 ? 1 : 0) + (/[A-Z]/.test(p) || /[^a-zA-Z0-9]/.test(p) ? 1 : 0) + (p.length >= 12 ? 1 : 0);
  return Math.min(3, score) as 0 | 1 | 2 | 3;
}

/** Design 9a — name, email, password with a strength meter, consent, and Google. */
export function AuthSignup({ onSwitchToLogin }: Props) {
  const { signUp, signInWithGoogle } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const emailOk = /\S+@\S+\.\S+/.test(email);
  const score = useMemo(() => passwordScore(password), [password]);
  const ready = name.trim() !== "" && emailOk && password.length >= 8 && consent;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy || done) return;
    setBusy(true);
    setError(null);
    const { error: err, needsConfirmation } = await signUp(email, password, name.trim());
    setBusy(false);
    if (err) return setError(err);
    setDone(
      needsConfirmation
        ? `Presque — confirme ton adresse depuis l'e-mail qu'on vient d'envoyer à ${email}.`
        : `Bienvenue ${name.trim()} — on ouvre ton premier fil du jour.`,
    );
  };

  const google = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  };

  return (
    <main className="auth-screen dotted">
      <div className="auth-card">
        <div className="auth-mark">◗</div>
        <h1 className="auth-title">Créer ton journal</h1>
        <div className="hand" style={{ marginTop: 8 }}>trois champs, et le fil du jour est à toi</div>

        <form onSubmit={submit} className="auth-form">
          <label>
            <div className="field-label">prénom</div>
            <input
              className="input auth-input"
              autoComplete="given-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(null); }}
              placeholder="Camille"
              disabled={!!done}
            />
          </label>
          <label>
            <div className="field-label">e-mail</div>
            <input
              className="input auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="vous@exemple.fr"
              disabled={!!done}
            />
          </label>
          <label>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="field-label" style={{ marginBottom: 0 }}>mot de passe</span>
              <button type="button" className="btn-link" style={{ fontSize: 12 }} onClick={() => setShowPassword((s) => !s)}>
                {showPassword ? "masquer" : "afficher"}
              </button>
            </div>
            <input
              className="input auth-input"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="8 caractères minimum"
              style={{ marginTop: 6 }}
              disabled={!!done}
            />
            <div className="auth-strength">
              <span className="auth-strength-bars">
                {[0, 1, 2].map((i) => (
                  <span key={i} style={{ background: i < score ? STRENGTH_COLORS[score] : "var(--rule)" }} />
                ))}
              </span>
              <span className="auth-strength-label">{STRENGTH_LABELS[score]}</span>
            </div>
          </label>

          <button
            type="button"
            className="auth-consent"
            aria-pressed={consent}
            onClick={() => { setConsent((c) => !c); setError(null); }}
            disabled={!!done}
          >
            <span className={`checkbox${consent ? " on" : ""}`} style={consent ? { background: "var(--indigo)" } : undefined}>
              {consent ? "✓" : ""}
            </span>
            <span>J'accepte les conditions d'utilisation et la politique de confidentialité. Mes données de suivi restent privées.</span>
          </button>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={!ready || busy || !!done}>
            {busy ? "Création…" : "Créer mon compte"}
          </button>
        </form>

        <div className="auth-divider">
          <span />
          <span>ou</span>
          <span />
        </div>

        <button type="button" className="auth-google" onClick={google} disabled={!!done}>
          <GoogleIcon />
          S'inscrire avec Google
        </button>

        {done && <div className="banner" style={{ marginTop: 16 }}><span className="banner-text">{done}</span></div>}

        <div className="auth-switch">
          <span>Déjà un compte ?</span>
          <button type="button" className="btn-link" onClick={onSwitchToLogin}>
            Se connecter
          </button>
        </div>
      </div>
    </main>
  );
}
