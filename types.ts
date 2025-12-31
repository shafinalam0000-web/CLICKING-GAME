
export enum AppMode {
  CHAT = 'CHAT',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  LIVE = 'LIVE'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  groundingLinks?: GroundingLink[];
}

export interface GroundingLink {
  title: string;
  uri: string;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
}

export interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  timestamp: Date;
  status: 'processing' | 'completed' | 'failed';
}
