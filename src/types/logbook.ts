// Logbook-related type definitions

export interface LogbookEntry {
  id: string
  user_id: string
  skill_id: string
  assessor_name: string
  assessor_fibka_number: string | null
  completed_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

export interface LogbookEntryFormData {
  assessor_name: string
  assessor_fibka_number: string
  completed_date: string
  notes: string
}

export interface LogbookSkill {
  id: string
  description: string
}

export interface LogbookCategory {
  id: string
  name: string
  skills: LogbookSkill[]
}

export interface LogbookStage {
  id: string
  name: string
  categories: LogbookCategory[]
}
