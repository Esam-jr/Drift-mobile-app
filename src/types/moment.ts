export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  createdAt: number;
}

export interface MomentImage {
  id: string;
  momentId: string;
  uri: string;
  orderIndex: number;
  createdAt: number;
}

export interface Moment {
  id: string;
  title?: string | null;
  text?: string | null;
  createdAt: number;
  updatedAt: number;
  categoryId?: string | null;
  category?: Category | null;
  audioUri?: string | null;
  audioDuration?: number | null; // in milliseconds
  locationName?: string | null;
  images: MomentImage[];
}

export interface CreateMomentInput {
  title?: string;
  text?: string;
  categoryId?: string | null;
  audioUri?: string | null;
  audioDuration?: number | null;
  locationName?: string | null;
  imageUris?: string[];
}

export interface UpdateMomentInput {
  id: string;
  title?: string | null;
  text?: string | null;
  categoryId?: string | null;
  audioUri?: string | null;
  audioDuration?: number | null;
  locationName?: string | null;
  imageUris?: string[];
}

export interface DateGroupedMoments {
  dateLabel: string; // e.g. "Today", "Yesterday", "September 4, 2026"
  timestamp: number; // Normalized timestamp of the start of that day
  moments: Moment[];
}

export type HomeLayout = 'journal' | 'gallery' | 'compact';

export interface MomentPreview {
  id: string;
  createdAt: number;
  text?: string; // truncated to about 200 characters at query time
  category?: { id: string; name: string };
  voice?: { durationMs: number };
  photos: { thumbUri: string; width?: number; height?: number }[]; // max 3
  photoCount: number;
  locationName?: string | null;
}

export interface Section {
  key: string; // e.g. "2026-10"
  label: string; // e.g. "October" or "October 2025"
  moments: MomentPreview[];
}

