import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '../../shared/api/http'
import { AgendaOperationError, createClient, updateClient } from '../../shared/agenda/agendaService'
import type { Client, ClientInput, ClientRecordResult, Actor } from '../../shared/agenda/types'
import { ClientFields } from './ClientFields'
import { Icon } from './Icon'

interface ClientEditorDialogProps {
  client: Client | null
  actor: Actor
  onClose: () => void
  onSaved: (result: ClientRecordResult) => void
  onDeleted?: () => void
}

export function ClientEditorDialog({
  client,
  onClose,
  onSaved,
  onDeleted,
}: ClientEditorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const savingRef = useRef(false)
  const [value, setValue] = useState<ClientInput>({
    dni: client?.dni ?? '',
    firstName: client?.firstName ?? '',
    paternalLastName: client?.paternalLastName ?? '',
    maternalLastName: client?.maternalLastName ?? '',
    phone: client?.phone ?? '',
    email: client?.email ?? '',
    preferences: client?.preferences ?? '',
    active: client?.active ?? true,
  })
  const [errors, setErrors] = useState<Partial<Record<keyof ClientInput, string>>>({})
  const [generalError, setGeneralError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    dialogRef.current?.showModal()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (savingRef.current) return
    setErrors({})
    setGeneralError('')
    savingRef.current = true
    setSaving(true)
    try {
      const result = client ? await updateClient(client.id, value) : await createClient(value)
      onSaved(result)
    } catch (cause) {
      if (
        cause instanceof AgendaOperationError &&
        cause.field &&
        [
          'dni',
          'firstName',
          'paternalLastName',
          'maternalLastName',
          'phone',
          'email',
          'preferences',
        ].includes(cause.field)
      )
        setErrors({ [cause.field]: cause.message })
      else
        setGeneralError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo guardar el cliente. Intenta de nuevo.',
        )
      savingRef.current = false
      setSaving(false)
    }
  }

  async function deleteClientRecord() {
    if (!client || savingRef.current) return
    setErrors({})
    setGeneralError('')
    savingRef.current = true
    setSaving(true)
    setDeleting(true)
    try {
      await request(`/clientes/${client.id}`, 'DELETE')
      onDeleted?.()
    } catch (cause) {
      setGeneralError(
        cause instanceof Error ? cause.message : 'No se pudo eliminar la ficha del cliente.',
      )
      setConfirmDelete(false)
      savingRef.current = false
      setSaving(false)
      setDeleting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="client-editor-title"
      className="appointment-dialog bg-white text-graphite"
      onClose={onClose}
      onCancel={(event) => {
        if (savingRef.current) event.preventDefault()
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !savingRef.current) dialogRef.current?.close()
      }}
    >
      <form noValidate onSubmit={submit} aria-busy={saving}>
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-semibold tracking-[.16em] text-caramel-dark uppercase">
              Clientes
            </p>
            <h2 id="client-editor-title" className="mt-1 font-display text-3xl">
              {client ? 'Editar cliente' : 'Nuevo cliente'}
            </h2>
            <p className="mt-1 text-sm text-stone">
              {client
                ? 'Actualiza sus datos de contacto y atención.'
                : 'Registra una cliente sin crear una cuenta de acceso.'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="icon-button"
            disabled={saving}
            onClick={() => dialogRef.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="px-5 py-6 sm:px-7">
          <ClientFields
            idPrefix="client-editor"
            value={value}
            onChange={(field, next) => {
              setValue((current) => ({ ...current, [field]: next }))
              setErrors((current) => ({ ...current, [field]: undefined }))
            }}
            errors={errors}
            excludeClientId={client?.id}
            showPreferences
          />
          {generalError && (
            <p
              role="alert"
              className="mt-4 rounded-lg bg-[#FAF0EA] px-3 py-2 text-sm text-caramel-dark"
            >
              {generalError}
            </p>
          )}
          {client && confirmDelete && (
            <div className="mt-4 rounded-card border border-[#E8CFC0] bg-[#FAF0EA] p-4 text-sm">
              <p className="font-semibold text-caramel-dark">
                ¿Eliminar a «{client.name}»? Esta acción no se puede deshacer.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void deleteClientRecord()}
                  className="inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-full bg-caramel-dark px-5 py-2 text-sm font-semibold text-white transition hover:bg-caramel disabled:cursor-wait disabled:opacity-60"
                >
                  {deleting ? 'Eliminando…' : 'Confirmar eliminación'}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className="api-secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4 sm:px-7">
          <div>
            {client && !confirmDelete && (
              <button
                type="button"
                className="api-secondary text-caramel-dark"
                disabled={saving}
                onClick={() => {
                  setConfirmDelete(true)
                  setGeneralError('')
                }}
              >
                Eliminar cliente
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="api-secondary disabled:opacity-50"
              disabled={saving}
              onClick={() => dialogRef.current?.close()}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="api-primary disabled:cursor-wait disabled:opacity-60"
              disabled={saving}
            >
              {saving && !deleting ? 'Guardando…' : 'Guardar cliente'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  )
}
