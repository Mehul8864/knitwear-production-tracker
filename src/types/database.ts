export type UserRole = 'merchandiser' | 'supervisor' | 'buyer'
export type OrderStatus = 'active' | 'completed' | 'cancelled' | 'on_hold'
export type RiskStatus = 'GREEN' | 'AMBER' | 'RED'
export type ProductionStage =
  | 'fabric_inhouse'
  | 'cutting'
  | 'stitching'
  | 'printing'
  | 'washing'
  | 'finishing'
  | 'packing'
  | 'final_inspection'
  | 'dispatch'

export type AICategory =
  | 'MATERIAL_SHORTAGE'
  | 'MACHINE_BREAKDOWN'
  | 'LABOUR_SHORTAGE'
  | 'QUALITY_REWORK'
  | 'PRINTING_DELAY'
  | 'WASHING_DELAY'
  | 'POWER_OUTAGE'
  | 'SUBCONTRACTOR_DELAY'
  | 'OTHER'

export interface Profile {
  id: string
  email: string
  full_name: string
  role: UserRole
  production_unit_id?: string | null
  avatar_url?: string | null
  created_at: string
  updated_at: string
}

export interface Buyer {
  id: string
  name: string
  country: string
  contact_name?: string | null
  contact_email?: string | null
  created_at: string
}

export interface ProductionUnit {
  id: string
  name: string
  location: string
  capacity_per_day: number
  supervisor_id?: string | null
  created_at: string
}

export interface Order {
  id: string
  po_number: string
  buyer_id: string
  style_name: string
  style_description?: string | null
  total_quantity: number
  production_unit_id: string
  current_stage: ProductionStage
  completed_quantity: number
  ex_factory_date: string
  status: OrderStatus
  risk_status: RiskStatus
  notes?: string | null
  created_by: string
  created_at: string
  updated_at: string
  // joins
  buyer?: Buyer
  production_unit?: ProductionUnit
}

export interface OrderItem {
  id: string
  order_id: string
  colour: string
  size: string
  quantity: number
}

export interface TNATemplate {
  id: string
  name: string
  created_by: string
  created_at: string
}

export interface TNATemplateMilestone {
  id: string
  template_id: string
  stage: ProductionStage
  name: string
  days_before_exfactory: number
  sort_order: number
}

export interface OrderMilestone {
  id: string
  order_id: string
  stage: ProductionStage
  name: string
  target_date: string
  completed_date?: string | null
  sort_order: number
  target_quantity: number
  completed_quantity: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MilestoneDateChangeHistory {
  id: string
  milestone_id: string
  order_id: string
  previous_date: string
  new_date: string
  reason: string
  changed_by: string
  changed_at: string
  // joins
  profile?: Pick<Profile, 'full_name' | 'email'>
}

export interface ProductionUpdate {
  id: string
  client_id: string
  order_id: string
  milestone_id: string
  supervisor_id: string
  stage: ProductionStage
  quantity_completed: number
  update_date: string
  issue_note_original?: string | null
  issue_note_english?: string | null
  ai_category?: AICategory | null
  ai_confidence?: number | null
  ai_needs_review: boolean
  ai_corrected_category?: AICategory | null
  ai_corrected_by?: string | null
  photo_urls: string[]
  created_at: string
  // joins
  supervisor?: Pick<Profile, 'full_name'>
}

export interface BuyerAccessToken {
  id: string
  buyer_id: string
  token_hash: string
  label?: string | null
  expires_at?: string | null
  revoked_at?: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  read: boolean
  type: 'warning' | 'info' | 'success' | 'error'
  order_id?: string | null
  created_at: string
}

export interface ActivityLog {
  id: string
  user_id?: string | null
  order_id?: string | null
  action: string
  details?: Record<string, unknown> | null
  created_at: string
}

// ─── Database shape for Supabase client ───
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>
      }
      buyers: {
        Row: Buyer
        Insert: Omit<Buyer, 'id' | 'created_at'>
        Update: Partial<Omit<Buyer, 'id' | 'created_at'>>
      }
      production_units: {
        Row: ProductionUnit
        Insert: Omit<ProductionUnit, 'id' | 'created_at'>
        Update: Partial<Omit<ProductionUnit, 'id' | 'created_at'>>
      }
      orders: {
        Row: Order
        Insert: Omit<Order, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Order, 'id' | 'created_at'>>
      }
      order_items: {
        Row: OrderItem
        Insert: Omit<OrderItem, 'id'>
        Update: Partial<Omit<OrderItem, 'id'>>
      }
      tna_templates: {
        Row: TNATemplate
        Insert: Omit<TNATemplate, 'id' | 'created_at'>
        Update: Partial<Omit<TNATemplate, 'id' | 'created_at'>>
      }
      tna_template_milestones: {
        Row: TNATemplateMilestone
        Insert: Omit<TNATemplateMilestone, 'id'>
        Update: Partial<Omit<TNATemplateMilestone, 'id'>>
      }
      order_milestones: {
        Row: OrderMilestone
        Insert: Omit<OrderMilestone, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<OrderMilestone, 'id' | 'created_at'>>
      }
      milestone_date_change_history: {
        Row: MilestoneDateChangeHistory
        Insert: Omit<MilestoneDateChangeHistory, 'id'>
        Update: never
      }
      production_updates: {
        Row: ProductionUpdate
        Insert: Omit<ProductionUpdate, 'id' | 'created_at'>
        Update: Partial<Omit<ProductionUpdate, 'id' | 'created_at'>>
      }
      buyer_access_tokens: {
        Row: BuyerAccessToken
        Insert: Omit<BuyerAccessToken, 'id' | 'created_at'>
        Update: Partial<Omit<BuyerAccessToken, 'id' | 'created_at'>>
      }
      notifications: {
        Row: Notification
        Insert: Omit<Notification, 'id' | 'created_at'>
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>
      }
      activity_logs: {
        Row: ActivityLog
        Insert: Omit<ActivityLog, 'id' | 'created_at'>
        Update: never
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
