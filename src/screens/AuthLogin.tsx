import { useState, type FormEvent } from "react";
import { GoogleIcon } from "../components/GoogleIcon";
import { useAuth } from "../state/AuthContext";

interface Props {
  onSwitchToSignup: () => void;
}

/** Design 8a — email/password sign-in, plus Google. */
export function AuthLogin({ onSwitchToSignup }: Props) {
  const { signIn, signInWithGoogle, resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ready = /\S+@\S+\.\S+/.test(email) && password.length >= 8;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    const { error: err } = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  };

  const google = async () => {
    setError(null);
    const { error: err } = await signInWithGoogle();
    if (err) setError(err);
  };

  const forgotPassword = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Indique ton e-mail ci-dessus, puis clique à nouveau.");
      return;
    }
    setError(null);
    const { error: err } = await resetPassword(email);
    setNotice(err ? null : "Un e-mail de réinitialisation vient d'être envoyé.");
    if (err) setError(err);
  };

  return (
    <main className="auth-screen dotted">
      <div className="auth-card">
        <div className="auth-mark">◗</div>
        <h1 className="auth-title">Content de te revoir</h1>
        <div className="hand" style={{ marginTop: 8 }}>reprends ton fil du jour là où tu l'as laissé</div>

        <form onSubmit={submit} className="auth-form">
          <label>
            <div className="field-label">e-mail</div>
            <input
              className="input auth-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              placeholder="vous@exemple.fr"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(null); }}
              placeholder="••••••••"
              style={{ marginTop: 6 }}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}
          {notice && <div className="hand" style={{ color: "var(--indigo)" }}>{notice}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={!ready || busy}>
            {busy ? "Connexion…" : "Se connecter"}
          </button>
        </form>

        <button type="button" className="btn-link auth-forgot" onClick={forgotPassword}>
          Mot de passe oublié ?
        </button>

        <div className="auth-divider">
          <span />
          <span>ou</span>
          <span />
        </div>

        <button type="button" className="auth-google" onClick={google}>
          <GoogleIcon />
          Continuer avec Google
        </button>

        <div className="auth-switch">
          <span>Pas encore de journal ?</span>
          <button type="button" className="btn-link" onClick={onSwitchToSignup}>
            Créer un compte
          </button>
        </div>
        <div className="auth-legal">En continuant, tu acceptes les conditions et la politique de confidentialité.</div>
      </div>
    </main>
  );
}
