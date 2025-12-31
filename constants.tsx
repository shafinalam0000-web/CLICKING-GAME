
import React from 'react';

export const MODELS = {
  CHAT: 'gemini-3-flash-preview',
  COMPLEX: 'gemini-3-pro-preview',
  IMAGE: 'gemini-2.5-flash-image',
  VIDEO: 'veo-3.1-fast-generate-preview',
  LIVE: 'gemini-2.5-flash-native-audio-preview-09-2025'
};

export const Icons = {
  Chat: () => <i className="fa-solid fa-comments"></i>,
  Image: () => <i className="fa-solid fa-image"></i>,
  Video: () => <i className="fa-solid fa-video"></i>,
  Live: () => <i className="fa-solid fa-microphone-lines"></i>,
  Send: () => <i className="fa-solid fa-paper-plane"></i>,
  Search: () => <i className="fa-solid fa-magnifying-glass"></i>,
  Map: () => <i className="fa-solid fa-map-location-dot"></i>,
  Loading: () => <i className="fa-solid fa-circle-notch fa-spin"></i>,
  Download: () => <i className="fa-solid fa-download"></i>,
  Delete: () => <i className="fa-solid fa-trash"></i>,
  Settings: () => <i className="fa-solid fa-gear"></i>,
};
