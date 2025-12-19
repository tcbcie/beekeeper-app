export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
}

export interface ChatRequest {
  message: string
  conversationHistory?: ChatMessage[]
}

export interface ChatResponse {
  message: string
  intent?: 'sql' | 'knowledge' | 'hybrid' | 'general'
  sources?: string[]
}

export type QueryIntent = 'sql' | 'knowledge' | 'hybrid' | 'general'
