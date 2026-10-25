import { getDatabase } from './database';
import { Moment, Category, CreateMomentInput, UpdateMomentInput, MomentImage, DateGroupedMoments } from '@/types/moment';
import { persistMediaFile, deleteMediaFile } from '../media/mediaService';

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

  await db.runAsync(
    `INSERT INTO moments (id, title, text, created_at, updated_at, category_id, audio_uri, audio_duration, location_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    momentId,
    input.title ?? null,
    input.text ?? null,
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

/**
 * Updates an existing moment.
 */
export async function updateMoment(input: UpdateMomentInput): Promise<Moment> {
  const db = await getDatabase();
  const now = Date.now();

  const existing = await getMomentById(input.id);
  if (!existing) {
    throw new Error(`Moment with id ${input.id} not found`);
  }

  await db.runAsync(
    `UPDATE moments 
     SET title = ?, text = ?, category_id = ?, updated_at = ?, location_name = ?
     WHERE id = ?;`,
    input.title !== undefined ? (input.title ?? null) : (existing.title ?? null),
    input.text !== undefined ? (input.text ?? null) : (existing.text ?? null),
    input.categoryId !== undefined ? (input.categoryId ?? null) : (existing.categoryId ?? null),
    now,
    input.locationName !== undefined ? (input.locationName ?? null) : (existing.locationName ?? null),
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
