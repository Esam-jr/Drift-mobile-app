import { getDatabase } from './database';
import {
  Moment,
  Category,
  CreateMomentInput,
  UpdateMomentInput,
  MomentImage,
  DateGroupedMoments,
  MomentPreview,
  Section,
} from '@/types/moment';
import { persistMediaFile, deleteMediaFile } from '../media/mediaService';
import { stripMarkdown } from '@/utils/markdown';

interface MomentRow {
  id: string;
  title: string | null;
  text: string | null;
  created_at: number;
  updated_at: number;
  category_id: string | null;
  audio_uri: string | null;
  audio_duration: number | null;
  location_name: string | null;
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
  category_created_at: number | null;
}

interface MomentImageRow {
  id: string;
  moment_id: string;
  uri: string;
  order_index: number;
  created_at: number;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Maps database rows to the Moment domain entity.
 */
function mapRowToMoment(row: MomentRow, images: MomentImage[] = []): Moment {
  return {
    id: row.id,
    title: row.title,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryId: row.category_id,
    category: row.category_id && row.category_name ? {
      id: row.category_id,
      name: row.category_name,
      color: row.category_color || '#8CA697',
      icon: row.category_icon || 'tag',
      createdAt: row.category_created_at || row.created_at,
    } : null,
    audioUri: row.audio_uri,
    audioDuration: row.audio_duration,
    locationName: row.location_name,
    images: images.sort((a, b) => a.orderIndex - b.orderIndex),
  };
}

/**
 * Retrieves all categories.
 */
export async function getCategories(): Promise<Category[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Category>('SELECT id, name, color, icon, created_at as createdAt FROM categories ORDER BY created_at ASC;');
  return rows;
}

/**
 * Retrieves all moments, optionally filtered by category.
 */
export async function getAllMoments(filter?: { categoryId?: string; search?: string }): Promise<Moment[]> {
  const db = await getDatabase();

  let query = `
    SELECT 
      m.id, m.title, m.text, m.created_at, m.updated_at, m.category_id,
      m.audio_uri, m.audio_duration, m.location_name,
      c.name as category_name, c.color as category_color, c.icon as category_icon, c.created_at as category_created_at
    FROM moments m
    LEFT JOIN categories c ON m.category_id = c.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.categoryId) {
    conditions.push('m.category_id = ?');
    params.push(filter.categoryId);
  }

  if (filter?.search && filter.search.trim().length > 0) {
    conditions.push('(m.text_plain LIKE ? OR m.text LIKE ? OR m.title LIKE ? OR m.location_name LIKE ?)');
    const searchTerm = `%${filter.search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY m.created_at DESC;';

  const momentRows = await db.getAllAsync<MomentRow>(query, ...params);
  if (momentRows.length === 0) return [];

  // Fetch all images for these moments in one batch
  const imageRows = await db.getAllAsync<MomentImageRow>(
    'SELECT id, moment_id, uri, order_index, created_at FROM moment_images ORDER BY order_index ASC;'
  );

  const imagesByMomentId = new Map<string, MomentImage[]>();
  for (const img of imageRows) {
    const list = imagesByMomentId.get(img.moment_id) || [];
    list.push({
      id: img.id,
      momentId: img.moment_id,
      uri: img.uri,
      orderIndex: img.order_index,
      createdAt: img.created_at,
    });
    imagesByMomentId.set(img.moment_id, list);
  }

  return momentRows.map((row) => mapRowToMoment(row, imagesByMomentId.get(row.id) || []));
}

/**
 * Retrieves a single moment by ID.
 */
export async function getMomentById(id: string): Promise<Moment | null> {
  const db = await getDatabase();
  const query = `
    SELECT 
      m.id, m.title, m.text, m.created_at, m.updated_at, m.category_id,
      m.audio_uri, m.audio_duration, m.location_name,
      c.name as category_name, c.color as category_color, c.icon as category_icon, c.created_at as category_created_at
    FROM moments m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.id = ?;
  `;

  const row = await db.getFirstAsync<MomentRow>(query, id);
  if (!row) return null;

  const imageRows = await db.getAllAsync<MomentImageRow>(
    'SELECT id, moment_id, uri, order_index, created_at FROM moment_images WHERE moment_id = ? ORDER BY order_index ASC;',
    id
  );

  const images: MomentImage[] = imageRows.map((img) => ({
    id: img.id,
    momentId: img.moment_id,
    uri: img.uri,
    orderIndex: img.order_index,
    createdAt: img.created_at,
  }));

  return mapRowToMoment(row, images);
}

/**
 * Creates and persists a new Moment.
 */
export async function createMoment(input: CreateMomentInput): Promise<Moment> {
  const db = await getDatabase();
  const momentId = generateId();
  const now = Date.now();

  // Persist audio if present
  let persistentAudioUri: string | null = null;
  if (input.audioUri) {
    persistentAudioUri = await persistMediaFile(input.audioUri, 'audio');
  }

  // Persist images if present
  const persistentImageUris: string[] = [];
  if (input.imageUris && input.imageUris.length > 0) {
    for (const uri of input.imageUris) {
      const savedUri = await persistMediaFile(uri, 'image');
      persistentImageUris.push(savedUri);
    }
  }

  const textPlain = input.text ? stripMarkdown(input.text) : null;

  await db.runAsync(
    `INSERT INTO moments (id, title, text, text_plain, created_at, updated_at, category_id, audio_uri, audio_duration, location_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    momentId,
    input.title ?? null,
    input.text ?? null,
    textPlain,
    now,
    now,
    input.categoryId ?? null,
    persistentAudioUri ?? null,
    input.audioDuration ?? null,
    input.locationName ?? null
  );

  for (let i = 0; i < persistentImageUris.length; i++) {
    const imgId = generateId();
    await db.runAsync(
      `INSERT INTO moment_images (id, moment_id, uri, order_index, created_at)
       VALUES (?, ?, ?, ?, ?);`,
      imgId,
      momentId,
      persistentImageUris[i],
      i,
      now
    );
  }

  const created = await getMomentById(momentId);
  if (!created) {
    throw new Error('Failed to retrieve newly created moment');
  }
  return created;
}

export async function updateMoment(input: UpdateMomentInput): Promise<Moment> {
  const db = await getDatabase();
  const now = Date.now();

  const existing = await getMomentById(input.id);
  if (!existing) {
    throw new Error(`Moment with id ${input.id} not found`);
  }

  // Handle audio updating
  let persistentAudioUri: string | null = existing.audioUri ?? null;
  if (input.audioUri !== undefined) {
    if (existing.audioUri && existing.audioUri !== input.audioUri) {
      await deleteMediaFile(existing.audioUri);
    }
    if (input.audioUri) {
      persistentAudioUri = input.audioUri.includes('drift_media')
        ? input.audioUri
        : await persistMediaFile(input.audioUri, 'audio');
    } else {
      persistentAudioUri = null;
    }
  }

  // Handle images updating
  if (input.imageUris !== undefined) {
    const existingUris = existing.images.map((img) => img.uri);
    for (const oldUri of existingUris) {
      if (!input.imageUris.includes(oldUri)) {
        await deleteMediaFile(oldUri);
      }
    }

    await db.runAsync('DELETE FROM moment_images WHERE moment_id = ?;', input.id);

    for (let i = 0; i < input.imageUris.length; i++) {
      const uri = input.imageUris[i];
      const savedUri = uri.includes('drift_media')
        ? uri
        : await persistMediaFile(uri, 'image');
      const imgId = generateId();
      await db.runAsync(
        `INSERT INTO moment_images (id, moment_id, uri, order_index, created_at)
         VALUES (?, ?, ?, ?, ?);`,
        imgId,
        input.id,
        savedUri,
        i,
        now
      );
    }
  }

  const updatedText = input.text !== undefined ? (input.text ?? null) : (existing.text ?? null);
  const updatedTextPlain = updatedText ? stripMarkdown(updatedText) : null;

  await db.runAsync(
    `UPDATE moments 
     SET title = ?, text = ?, text_plain = ?, category_id = ?, updated_at = ?, location_name = ?, audio_uri = ?, audio_duration = ?
     WHERE id = ?;`,
    input.title !== undefined ? (input.title ?? null) : (existing.title ?? null),
    updatedText,
    updatedTextPlain,
    input.categoryId !== undefined ? (input.categoryId ?? null) : (existing.categoryId ?? null),
    now,
    input.locationName !== undefined ? (input.locationName ?? null) : (existing.locationName ?? null),
    persistentAudioUri,
    input.audioDuration !== undefined ? (input.audioDuration ?? null) : (existing.audioDuration ?? null),
    input.id
  );

  const updated = await getMomentById(input.id);
  if (!updated) {
    throw new Error('Failed to retrieve updated moment');
  }
  return updated;
}

/**
 * Deletes a moment and purges its media from disk.
 */
export async function deleteMoment(id: string): Promise<void> {
  const db = await getDatabase();
  const moment = await getMomentById(id);
  if (!moment) return;

  // 1. Delete associated media files from disk
  if (moment.audioUri) {
    await deleteMediaFile(moment.audioUri);
  }
  for (const img of moment.images) {
    await deleteMediaFile(img.uri);
  }

  // 2. Delete database rows (images cascade delete)
  await db.runAsync('DELETE FROM moment_images WHERE moment_id = ?;', id);
  await db.runAsync('DELETE FROM moments WHERE id = ?;', id);
}

/**
 * Groups an array of moments by date ("Today", "Yesterday", or formatted date).
 */
export function groupMomentsByDate(moments: Moment[]): DateGroupedMoments[] {
  const groups: Map<string, DateGroupedMoments> = new Map();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sixDaysAgo = todayStart - 6 * 24 * 60 * 60 * 1000;

  for (const moment of moments) {
    const momentDate = new Date(moment.createdAt);
    const dayStart = new Date(momentDate.getFullYear(), momentDate.getMonth(), momentDate.getDate()).getTime();

    let label: string;
    if (dayStart === todayStart) {
      label = 'Today';
    } else if (dayStart === yesterdayStart) {
      label = 'Yesterday';
    } else if (dayStart >= sixDaysAgo) {
      // Weekday name for 2-6 days ago
      label = momentDate.toLocaleDateString(undefined, { weekday: 'long' });
    } else if (momentDate.getFullYear() === now.getFullYear()) {
      // Same year: "September 4"
      label = momentDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
      });
    } else {
      // Different year: "September 4, 2025"
      label = momentDate.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }

    const key = `${dayStart}`;
    if (!groups.has(key)) {
      groups.set(key, { dateLabel: label, timestamp: dayStart, moments: [] });
    }
    groups.get(key)!.moments.push(moment);
  }

  return Array.from(groups.values()).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Returns grouped moment previews organized into monthly sections per DESIGN-home.md §6.
 * Layouts receive this shared data structure without querying or sorting on their own.
 */
export async function getGroupedMomentPreviews(filter?: {
  categoryId?: string;
  search?: string;
}): Promise<Section[]> {
  const db = await getDatabase();

  let query = `
    SELECT 
      m.id, m.title, m.text, m.created_at, m.updated_at, m.category_id,
      m.audio_uri, m.audio_duration, m.location_name,
      c.name as category_name, c.color as category_color
    FROM moments m
    LEFT JOIN categories c ON m.category_id = c.id
  `;

  const conditions: string[] = [];
  const params: any[] = [];

  if (filter?.categoryId) {
    conditions.push('m.category_id = ?');
    params.push(filter.categoryId);
  }

  if (filter?.search && filter.search.trim().length > 0) {
    conditions.push('(m.text LIKE ? OR m.title LIKE ? OR m.location_name LIKE ?)');
    const searchTerm = `%${filter.search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ' ORDER BY m.created_at DESC;';

  const momentRows = await db.getAllAsync<MomentRow>(query, ...params);
  if (momentRows.length === 0) return [];

  // Fetch images for previews
  const imageRows = await db.getAllAsync<MomentImageRow>(
    'SELECT id, moment_id, uri, order_index, created_at FROM moment_images ORDER BY order_index ASC;'
  );

  const imagesByMomentId = new Map<string, MomentImageRow[]>();
  for (const img of imageRows) {
    const list = imagesByMomentId.get(img.moment_id) || [];
    list.push(img);
    imagesByMomentId.set(img.moment_id, list);
  }

  const currentYear = new Date().getFullYear();
  const sectionsMap = new Map<string, { label: string; moments: MomentPreview[] }>();

  for (const row of momentRows) {
    const date = new Date(row.created_at);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const key = `${year}-${month}`;

    if (!sectionsMap.has(key)) {
      const monthName = date.toLocaleDateString(undefined, { month: 'long' });
      // Current year shows only month name; earlier years show year as well per DESIGN-home.md §2
      const label = year === currentYear ? monthName : `${monthName} ${year}`;
      sectionsMap.set(key, { label, moments: [] });
    }

    const allImages = imagesByMomentId.get(row.id) || [];
    const previewPhotos = allImages.slice(0, 3).map((img) => ({
      thumbUri: img.uri,
    }));

    // Truncate text to ~200 characters per DESIGN-home.md §6 and strip markdown symbols per §4b
    let previewText: string | undefined = undefined;
    if (row.text && row.text.trim().length > 0) {
      const plain = stripMarkdown(row.text);
      previewText = plain.length > 200 ? plain.slice(0, 200) + '...' : plain;
    }

    const preview: MomentPreview = {
      id: row.id,
      createdAt: row.created_at,
      text: previewText,
      category:
        row.category_id && row.category_name
          ? {
              id: row.category_id,
              name: row.category_name,
            }
          : undefined,
      voice: row.audio_uri
        ? {
            durationMs: row.audio_duration || 0,
          }
        : undefined,
      photos: previewPhotos,
      photoCount: allImages.length,
      locationName: row.location_name,
    };

    sectionsMap.get(key)!.moments.push(preview);
  }

  const sections: Section[] = [];
  for (const [key, val] of sectionsMap.entries()) {
    sections.push({
      key,
      label: val.label,
      moments: val.moments,
    });
  }

  return sections;
}

