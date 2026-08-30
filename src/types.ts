export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  modelId?: string;
  timestamp: number;
}

export interface Model {
  id: string;
  name: string;
  provider: string;
  ttft?: number;
  tps?: number;
}

export interface SwarmState {
  models: Model[];
  messages: Message[];
  isStreaming: boolean;
}
