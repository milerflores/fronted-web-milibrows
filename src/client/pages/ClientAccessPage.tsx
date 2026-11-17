import { useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  AgendaOperationError,
  registerPublicClient,
} from "../../shared/agenda/mockAgendaService";
import { valeriaDemoCredentials } from "../../shared/agenda/mockAuthService";
import type { Session } from "../../shared/agenda/mockAuthService";
import type { DemoClientIdentity } from "../../shared/agenda/types";
import { SignInForm } from "../../shared/components/SignInForm";

export function ClientAccessPage({
  mode,
  onSignedIn,
  onRegistered,
}: {
  mode: "login" | "registro";
  onSignedIn: (session: Session) => void;
  onRegistered: (client: DemoClientIdentity) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [field, setField] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  async function register(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;
    setError("");
    setField("");
    if (password !== confirmation) {
      setField("confirmation");
      setError("Las contraseñas no coinciden.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      onRegistered(
        await registerPublicClient(
          { name, phone, email },
          email,
          password,
          confirmation,
        ),
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "No se pudo crear la cuenta.",
      );
      setField(
        cause instanceof AgendaOperationError ? (cause.field ?? "") : "",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const input = (
    id: string,
    label: string,
    type: string,
    value: string,
    change: (value: string) => void,
    autocomplete: string,
    maxLength: number,
  ) => (
    <div>
      <label htmlFor={`register-${id}`} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={`register-${id}`}
        className="client-search mt-2"
        type={type}
        value={value}
        autoComplete={autocomplete}
        maxLength={maxLength}
        required
        onChange={(event) => {
          change(event.target.value);
          setError("");
          setField("");
        }}
        aria-invalid={field === id}
      />
    </div>
  );

  return (
    <main
      id="contenido"
      className="client-container grid min-h-[70vh] place-items-center py-12 sm:py-18"
    >
      <section className="w-full max-w-[540px] rounded-[18px] border border-line bg-white p-6 shadow-card sm:p-10">
        <h1 className="mt-3 text-center font-display text-4xl">
          {mode === "login"
            ? "Nos alegra que estés de vuelta."
            : "Crea tu cuenta."}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-stone">
          {mode === "login" ? "Ingresa a tu cuenta." : ""}
        </p>
        <div className="mt-7">
          {mode === "login" ? (
            <SignInForm area="client" onSignedIn={onSignedIn} />
          ) : (
            <form
              noValidate
              onSubmit={register}
              className="space-y-4"
              aria-busy={saving}
            >
              {input(
                "name",
                "Nombre completo *",
                "text",
                name,
                setName,
                "name",
                100,
              )}
              {input("phone", "Teléfono *", "tel", phone, setPhone, "tel", 20)}
              {input(
                "email",
                "Correo *",
                "email",
                email,
                setEmail,
                "email",
                120,
              )}

              <div>
                <label
                  htmlFor="register-password"
                  className="text-sm font-semibold"
                >
                  Contraseña *
                </label>
                <div className="mt-2 flex rounded-[10px] border border-line bg-white focus-within:outline-2 focus-within:outline-gold">
                  <input
                    id="register-password"
                    className="min-h-12 min-w-0 flex-1 rounded-[10px] px-4 outline-none"
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={100}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError("");
                    }}
                  />
                  <button
                    type="button"
                    className="px-4 text-sm font-semibold text-stone"
                    aria-label={
                      visible ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                    onClick={() => setVisible((current) => !current)}
                  >
                    {visible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
              {input(
                "confirmation",
                "Confirmar contraseña *",
                visible ? "text" : "password",
                confirmation,
                setConfirmation,
                "new-password",
                100,
              )}
              {error && (
                <p
                  role="alert"
                  className="rounded-[10px] bg-[#F7EBE5] p-3 text-sm text-caramel-dark"
                >
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="client-primary w-full disabled:opacity-50"
              >
                {saving ? "Registrando…" : "Crear cuenta"}
              </button>
            </form>
          )}
        </div>
        <p className="mt-6 border-t border-line pt-5 text-center text-sm text-stone">
          {mode === "login" ? "¿No tienes cuenta? " : "¿Ya tienes cuenta? "}
          <a
            href={mode === "login" ? "#registro" : "#login"}
            className="client-text-link"
          >
            {mode === "login" ? "Regístrate" : "Inicia sesión"}
          </a>
        </p>
        {mode === "login" && (
          <div className="mt-6 text-center text-base text-graphite">
            <p className="font-semibold">Cuenta de prueba</p>
            <p className="mt-2">
              Correo:{" "}
              <strong className="break-all">
                {valeriaDemoCredentials.email}
              </strong>
            </p>
            <p className="mt-1">
              Contraseña: <strong>{valeriaDemoCredentials.password}</strong>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
