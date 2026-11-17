import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { dateFromKey, endTime } from "../../shared/agenda/dates";
import {
  AgendaOperationError,
  getClientSelfProfile,
  updateClientSelfProfile,
} from "../../shared/agenda/mockAgendaService";
import type {
  Client,
  ClientInput,
  ClientSelfProfile,
  DemoClientIdentity,
} from "../../shared/agenda/types";

const money = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
});
const fullDate = new Intl.DateTimeFormat("es-PE", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});
type Field = keyof ClientInput;

interface Props {
  accounts: DemoClientIdentity[];
  accountsLoading: boolean;
  accountsError: string;
  accountId: string;
  onRetryAccounts: () => void;
  onProfileSaved: (updated: Client) => void;
}

export function MyProfilePage({
  accounts,
  accountsLoading,
  accountsError,
  accountId,
  onRetryAccounts,
  onProfileSaved,
}: Props) {
  const [profile, setProfile] = useState<ClientSelfProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(accountId));
  const [error, setError] = useState("");
  const [request, setRequest] = useState(0);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ClientInput>({
    name: "",
    phone: "",
    email: "",
    preferences: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<Field, string>>>({});
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (!accountId) return;
    let active = true;
    getClientSelfProfile(accountId)
      .then((result) => {
        if (!active) return;
        setProfile(result);
        setLoading(false);
        setError("");
      })
      .catch((cause) => {
        if (active) {
          setError(cause instanceof Error ? cause.message : "No se pudo cargar tu perfil.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [accountId, request]);

  function retry() {
    setProfile(null);
    setLoading(true);
    setError("");
    setRequest((current) => current + 1);
  }
  function beginEdit() {
    if (!profile) return;
    setDraft({
      name: profile.client.name,
      phone: profile.client.phone,
      email: profile.client.email,
      preferences: profile.client.preferences ?? "",
    });
    setFieldErrors({});
    setSaveError("");
    setNotice("");
    setEditing(true);
  }
  function cancelEdit() {
    if (savingRef.current) return;
    setEditing(false);
    setFieldErrors({});
    setSaveError("");
  }
  function change(field: Field, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
    setSaveError("");
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || savingRef.current) return;
    setFieldErrors({});
    setSaveError("");
    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await updateClientSelfProfile(draft, accountId);
      setProfile((current) => (current ? { ...current, client: updated } : current));
      onProfileSaved(updated);
      setEditing(false);
      setNotice("Tus datos de contacto y preferencias se guardaron correctamente.");
    } catch (cause) {
      const message =
        cause instanceof Error ? cause.message : "No se pudo guardar el perfil. Intenta de nuevo.";
      if (cause instanceof AgendaOperationError && cause.field && cause.field in draft)
        setFieldErrors({ [cause.field]: message });
      else setSaveError(message);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  const completed = profile?.completed ?? [];
  return (
    <main
      id="contenido"
      className="client-simple-page client-container max-w-[1120px] py-12 sm:py-18"
    >
      <div className="mb-10 rounded-[24px] bg-black p-8 text-white sm:p-12">
        <h1 className="font-display text-4xl sm:text-5xl">Mi perfil</h1>
        <p className="mt-4 max-w-[55ch] text-white/85">
          Consulta tus datos y las atenciones que ya se completaron.
        </p>
      </div>
      {accountsLoading && (
        <p role="status" className="rounded-[16px] bg-white p-6 text-base text-stone">
          Cargando clientes de demostración…
        </p>
      )}
      {accountsError && (
        <div role="alert" className="rounded-[16px] bg-white p-6 text-base">
          <p className="text-caramel-dark">{accountsError}</p>
          <button type="button" className="client-text-link mt-3" onClick={onRetryAccounts}>
            Reintentar
          </button>
        </div>
      )}
      {!accountsLoading && !accountsError && !accounts.length && (
        <p role="status" className="rounded-[16px] bg-white p-6 text-base text-stone">
          No hay clientes de demostración disponibles.
        </p>
      )}
      {!accountsLoading && !accountsError && accounts.length > 0 && (
        <>
          {!accountId && (
            <p role="status" className="rounded-[16px] bg-white p-6 text-base text-stone">
              Selecciona un cliente de demostración para consultar su perfil.
            </p>
          )}
          {accountId && loading && (
            <p role="status" className="rounded-[16px] bg-white p-6 text-base text-stone">
              Cargando tu perfil e historial…
            </p>
          )}
          {accountId && error && (
            <div role="alert" className="rounded-[16px] bg-white p-6 text-base">
              <p className="text-caramel-dark">{error}</p>
              <button type="button" className="client-text-link mt-3" onClick={retry}>
                Reintentar
              </button>
            </div>
          )}
          {accountId && !loading && !error && profile && (
            <>
              {notice && (
                <p
                  role="status"
                  className="mb-6 rounded-[12px] bg-champagne/60 p-4 text-base text-graphite"
                >
                  {notice}
                </p>
              )}
              <section
                aria-labelledby="profile-contact-title"
                className="rounded-[24px] bg-white p-6 shadow-card sm:p-10"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 id="profile-contact-title" className="mt-2 font-display text-3xl">
                      Mis datos
                    </h2>
                  </div>
                  {!editing && (
                    <button type="button" className="client-secondary" onClick={beginEdit}>
                      Editar datos
                    </button>
                  )}
                </div>
                {editing ? (
                  <form className="mt-7" onSubmit={save} noValidate>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div>
                        <label htmlFor="profile-name" className="text-base font-semibold">
                          Nombre completo *
                        </label>
                        <input
                          id="profile-name"
                          className="client-search mt-2"
                          type="text"
                          autoComplete="name"
                          maxLength={100}
                          required
                          value={draft.name}
                          aria-invalid={!!fieldErrors.name}
                          aria-describedby={fieldErrors.name ? "profile-name-error" : undefined}
                          onChange={(event) => change("name", event.target.value)}
                        />
                        {fieldErrors.name && (
                          <p
                            id="profile-name-error"
                            role="alert"
                            className="mt-2 text-base text-caramel-dark"
                          >
                            {fieldErrors.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label htmlFor="profile-phone" className="text-base font-semibold">
                          Teléfono *
                        </label>
                        <input
                          id="profile-phone"
                          className="client-search mt-2"
                          type="tel"
                          autoComplete="tel"
                          maxLength={20}
                          required
                          value={draft.phone}
                          aria-invalid={!!fieldErrors.phone}
                          aria-describedby={fieldErrors.phone ? "profile-phone-error" : undefined}
                          onChange={(event) => change("phone", event.target.value)}
                        />
                        {fieldErrors.phone && (
                          <p
                            id="profile-phone-error"
                            role="alert"
                            className="mt-2 text-base text-caramel-dark"
                          >
                            {fieldErrors.phone}
                          </p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="profile-email" className="text-base font-semibold">
                          Correo de contacto (opcional)
                        </label>
                        <input
                          id="profile-email"
                          className="client-search mt-2"
                          type="email"
                          autoComplete="email"
                          maxLength={120}
                          value={draft.email}
                          aria-invalid={!!fieldErrors.email}
                          aria-describedby={
                            fieldErrors.email ? "profile-email-error" : "profile-email-help"
                          }
                          onChange={(event) => change("email", event.target.value)}
                        />
                        <p id="profile-email-help" className="mt-2 text-base text-stone">
                          Este correo es solo de contacto. No modifica credenciales de acceso.
                        </p>
                        {fieldErrors.email && (
                          <p
                            id="profile-email-error"
                            role="alert"
                            className="mt-2 text-base text-caramel-dark"
                          >
                            {fieldErrors.email}
                          </p>
                        )}
                      </div>
                      <div className="sm:col-span-2">
                        <label htmlFor="profile-preferences" className="text-base font-semibold">
                          Preferencias para la atención (opcional)
                        </label>
                        <textarea
                          id="profile-preferences"
                          className="client-search mt-2 min-h-28 resize-y"
                          maxLength={500}
                          value={draft.preferences ?? ""}
                          aria-invalid={!!fieldErrors.preferences}
                          aria-describedby={
                            fieldErrors.preferences ? "profile-preferences-error" : undefined
                          }
                          onChange={(event) => change("preferences", event.target.value)}
                        />
                        {fieldErrors.preferences && (
                          <p
                            id="profile-preferences-error"
                            role="alert"
                            className="mt-2 text-base text-caramel-dark"
                          >
                            {fieldErrors.preferences}
                          </p>
                        )}
                      </div>
                    </div>
                    {saveError && (
                      <p role="alert" className="mt-5 text-base text-caramel-dark">
                        {saveError}
                      </p>
                    )}
                    <div className="mt-8 flex flex-wrap gap-3">
                      <button
                        type="submit"
                        className="client-primary disabled:opacity-50"
                        disabled={saving}
                      >
                        {saving ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        className="client-secondary"
                        disabled={saving}
                        onClick={cancelEdit}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                ) : (
                  <dl className="mt-7 grid gap-6 text-base sm:grid-cols-2">
                    <div>
                      <dt className="client-eyebrow">Nombre</dt>
                      <dd className="mt-2 font-semibold">{profile.client.name}</dd>
                    </div>
                    <div>
                      <dt className="client-eyebrow">Teléfono</dt>
                      <dd className="mt-2 font-semibold">{profile.client.phone}</dd>
                    </div>
                    {profile.client.email && (
                      <div>
                        <dt className="client-eyebrow">Correo de contacto</dt>
                        <dd className="mt-2 break-all font-semibold">{profile.client.email}</dd>
                      </div>
                    )}
                    <div className={profile.client.email ? "" : "sm:col-span-2"}>
                      <dt className="client-eyebrow">Preferencias declaradas</dt>
                      <dd className="mt-2 whitespace-pre-wrap text-stone">
                        {profile.client.preferences || "No se han indicado preferencias."}
                      </dd>
                    </div>
                  </dl>
                )}
              </section>
              <section aria-labelledby="history-title" className="mt-14">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <h2 id="history-title" className="font-display text-3xl sm:text-4xl">
                      Atenciones completadas
                    </h2>
                  </div>
                  <a href="#reservar" className="client-secondary">
                    Reservar nueva cita
                  </a>
                </div>
                {!completed.length ? (
                  <div role="status" className="mt-7 rounded-[20px] bg-sand p-8 text-center">
                    <p className="font-display text-2xl">Aún no tienes atenciones completadas.</p>
                    <p className="mt-2 text-base text-stone">
                      Aquí aparecerán cuando se complete una de tus citas.
                    </p>
                    <a href="#reservar" className="client-primary mt-5">
                      Reservar cita
                    </a>
                  </div>
                ) : (
                  <div className="mt-7 grid gap-5 lg:grid-cols-2">
                    {completed.map((appointment) => {
                      const duration = appointment.services.reduce(
                        (sum, service) => sum + service.agreedDuration,
                        0,
                      );
                      const price = appointment.services.reduce(
                        (sum, service) => sum + service.agreedPrice,
                        0,
                      );
                      return (
                        <article
                          key={appointment.id}
                          className="rounded-[20px] bg-white p-6 shadow-card sm:p-8"
                        >
                          <h3 className="mt-2 font-display text-2xl capitalize">
                            {fullDate.format(dateFromKey(appointment.date))}
                          </h3>
                          <p className="mt-2 text-base text-stone">
                            {appointment.startTime} – {endTime(appointment.startTime, duration)} ·{" "}
                            {appointment.stylistName}
                          </p>
                          <ul className="mt-5 space-y-2 rounded-[14px] bg-sand p-4">
                            {appointment.services.map((service) => (
                              <li
                                key={service.serviceId}
                                className="flex flex-wrap justify-between gap-2 py-3 text-base"
                              >
                                <span>
                                  <strong className="font-semibold">{service.serviceName}</strong>
                                  <span className="ml-2 text-stone">
                                    {service.agreedDuration} min
                                  </span>
                                </span>
                                <strong>{money.format(service.agreedPrice)}</strong>
                              </li>
                            ))}
                          </ul>
                          <div className="mt-4 flex justify-between gap-3 text-base">
                            <span>Duración total</span>
                            <strong>{duration} min</strong>
                          </div>
                          <div className="mt-2 flex justify-between gap-3 text-base">
                            <span>Precio total </span>
                            <strong>{money.format(price)}</strong>
                          </div>

                          <a
                            href={`#mis-citas/${appointment.id}`}
                            className="client-text-link mt-5 inline-block"
                          >
                            Ver detalle de la cita →
                          </a>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
