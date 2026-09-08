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
