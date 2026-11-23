export interface PersonDto {
  id: number
  dni: string | null
  nombre: string
  apellido_paterno: string
  apellido_materno: string | null
  nombre_completo: string
  telefono: string | null
  correo_contacto: string | null
  cliente?: { preferencias: string | null; activo?: boolean }
}

export interface ProfileDto {
  id: number
  correo: string
  activo: boolean
  roles: ('administracion' | 'recepcion' | 'estilista' | 'cliente')[]
  persona: PersonDto | null
  id_cliente: number | null
  id_empleado: number | null
  segundo_factor_configurado: boolean
}

export interface ServiceDto {
  id: number
  nombre: string
  descripcion: string | null
  imagen_url: string | null
  precio: string
  duracion_minutos: number
  activo: boolean
  visible_al_publico: boolean
}

export interface ManualDiscountDto {
  monto: string
  id_motivo_descuento: number | null
  motivo: string | null
  nota: string | null
  fecha_creacion: string
}

export interface AppointmentServiceDto {
  id: number
  id_cita?: number
  id_servicio: number
  id_empleado: number
  estilista?: string | null
  id_nivel?: number | null
  nombre_servicio_acordado: string
  precio_lista: string
  monto_descuento_automatico: string
  precio_acordado: string
  duracion_minutos: number
  hora_inicio: string
  fecha_inicio_real?: string | null
  fecha_finalizacion?: string | null
  estado_servicio: 'pendiente' | 'en_proceso' | 'realizado' | 'cancelado' | 'no_realizado'
  motivo_estado_servicio: string | null
  descuento_manual?: ManualDiscountDto | null
}

export interface AppointmentPaymentDto {
  id: number
  id_metodo_pago: number
  metodo: string | null
  importe: string
  fecha_cobro: string
  referencia_pago: string | null
  estado: 'registrado' | 'anulado'
}

export interface AppointmentDto {
  id: number
  id_cliente: number
  fecha: string
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_finalizacion: string | null
  origen?: string
  estado: 'confirmada' | 'completada' | 'cancelada' | 'no_asistio'
  numero_revision?: number
  motivo_cancelacion: string | null
  servicios: AppointmentServiceDto[]
  cobros?: AppointmentPaymentDto[]
  total_realizado?: string
  total_pagado?: string
  saldo_pendiente?: string
  cliente?: PersonDto
  nota?: { descripcion_tratamiento: string | null; observaciones: string | null } | null
  historial?: { tipo_cambio: string; fecha_creacion: string; motivo: string | null }[]
}

export interface ClientDto {
  id: number
  preferencias: string | null
  activo: boolean
  persona: PersonDto
}

export interface ScheduleDto {
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

export interface EmployeeDto {
  id: number
  cargo: string
  activo: boolean
  admite_reservas: boolean
  cuenta: ProfileDto
  jornada: ScheduleDto[]
  servicios: (ServiceDto & { pivot?: { activo: boolean } })[]
}

export interface AvailabilityDto {
  id_empleado: number
  nombre_completo: string
  duracion_minutos: number
  intervalos: { hora_inicio: string; hora_fin: string; fecha_inicio: string; fecha_fin: string }[]
}

export interface LevelDto {
  id?: number
  codigo: 'glow' | 'golden' | 'vip'
  nombre: string
  orden?: number
  puntos_minimos: number
  porcentaje_descuento: string
  activo: boolean
}

export interface PointMovementDto {
  id: number
  id_cliente: number
  id_cobro: number | null
  id_usuario_creador: number
  tipo: 'ganado' | 'reversion' | 'ajuste'
  puntos: number
  motivo: string | null
  fecha_creacion: string
}

export interface LoyaltyDto {
  puntos: number
  monto_por_punto: string
  nivel: LevelDto
  siguiente_nivel: {
    id: number
    codigo: string
    nombre: string
    puntos_minimos: number
    porcentaje_descuento: string
    puntos_faltantes: number
  } | null
  servicios_realizados: number
  visitas: number
  monto_pagado: string
  movimientos: PointMovementDto[]
}

export interface DiscountReasonDto {
  id: number
  nombre: string
  activo: boolean
}

export interface StudioConfigDto {
  id: number
  nombre_estudio: string
  canal_notificacion: 'correo' | null
  anticipacion_recordatorio_min: number
  monto_por_punto: string
}

export interface ClientPaymentDto {
  id: number
  id_cita: number
  id_metodo_pago: number
  importe: string
  fecha_cobro: string
  referencia_pago: string | null
  estado: 'registrado' | 'anulado'
  metodo?: { id: number; codigo: string; nombre: string }
  cita?: { id: number; id_cliente?: number; fecha: string; estado: string }
}

export interface PaymentMethodDto {
  id: number
  codigo: string
  nombre: string
  activo: boolean
}

export interface IncomeSummaryDto {
  total: string
  cantidad: number
  por_metodo: { id_metodo_pago: number; total: string; cantidad: number }[]
  por_fecha: { fecha: string; total: string }[]
}

export interface InventoryCategoryDto {
  id: number
  nombre: string
}

export interface SupplyDto {
  id: number
  id_categoria: number
  nombre: string
  existencias_actuales: number
  existencias_minimas: number
  activo: boolean
  categoria?: InventoryCategoryDto
}

export interface InventoryMovementDto {
  id: number
  id_insumo: number
  id_usuario_creador: number
  id_asignacion: number | null
  tipo_movimiento: 'entrada' | 'salida' | 'devolucion' | 'ajuste'
  variacion_cantidad: number
  existencias_antes: number
  existencias_despues: number
  motivo: string
  fecha_creacion: string
  insumo?: { id: number; nombre: string }
}

export interface SupplyAssignmentDto {
  id: number
  id_empleado: number
  id_insumo: number
  cantidad_entregada: number
  fecha_entrega: string
  fecha_agotamiento: string | null
  estado: 'en_uso' | 'agotado'
  insumo?: SupplyDto
  empleado?: { id: number; nombre_completo: string }
}
