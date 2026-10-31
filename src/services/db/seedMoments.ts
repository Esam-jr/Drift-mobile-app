import { getDatabase } from './database';
import { getCategories } from './momentRepository';

// Sample curated thought fragments across different moods and themes
const SAMPLE_TEXTS = [
  'Morning light through the kitchen window. The world is very quiet right now.',
  'Coffee before anyone else woke up. A rare hour of absolute stillness.',
  'Finally made real progress on the side project today. Things are starting to connect.',
  'Walked through the park as the leaves were turning amber and gold. Autumn always feels like a deep breath.',
  'A short conversation with an old friend on the train. Strange how easily years fall away.',
  'Rain beating steadily against the glass. A good evening for reading.',
  'The smell of old paper and cedar in the library downtown.',
  'Working late while everyone is asleep. The city feels completely different at 2 AM.',
  'Sitting on the bench by the water, listening to the small waves lap against the dock.',
  'A fleeting thought about how much has changed in just six months.',
  'Tried a new recipe for dinner. Not quite perfect, but warm and comforting.',
  'Watching the sunset fade from bright tangerine into deep indigo.',
  'Woke up early and watched the fog slowly lift from the valley below.',
  'A moment of quiet gratitude during an otherwise hectic week.',
  'Finished reading the final chapter. Lingering with the ending for a while.',
  'The evening air smells like woodsmoke and damp earth.',
  'Notes for a new idea: keep it simple, strip away everything that does not matter.',
  'Unexpected kind words from a colleague today. It meant more than they probably realized.',
  'Long shadows stretching across the grass in the late afternoon sun.',
  'The train was delayed, but having an unhurried half hour with a notebook turned out to be a gift.',
];

// Curated royalty-free sample image URLs for realistic photo testing
const SAMPLE_IMAGE_URLS = [
  'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
  'https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=800&q=80',
  'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?w=800&q=80',
  'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=800&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
  'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&q=80',
  'https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=800&q=80',
];

const SAMPLE_LOCATIONS = [
  'Kyoto',
  'Paris',
  'Copenhagen',
  'San Francisco',
  'Zurich',
  'Coffeehouse',
  'Botanical Garden',
  'Old Town',
  'Lakefront',
];

/**
 * Creates 150 diverse sample moments across the past ~8 months for testing high volume,
 * virtualization, layouts, and the scrub rail per DESIGN-home.md §9.
 */
export async function seedSampleMoments(total = 150): Promise<number> {
  const db = await getDatabase();
  const categories = await getCategories();
  const categoryIds = categories.map((c) => c.id);

  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Distribute 150 moments across ~120 days going backward
  // Some days will have 2-4 moments to test same-day grouping behavior
  let currentDayOffset = 0;
  let seededCount = 0;

  await db.withTransactionAsync(async () => {
    for (let i = 0; i < total; i++) {
      const momentId = `seed-${now}-${i}-${Math.random().toString(36).substring(2, 7)}`;

      // Every 1 to 3 items, step back another half to 2 days
      if (i > 0 && Math.random() > 0.4) {
        currentDayOffset += 0.4 + Math.random() * 1.5;
      }

      const momentTime = now - Math.floor(currentDayOffset * dayMs) - Math.floor(Math.random() * 3600000 * 8);

      // Determine content type mix:
      // 40% text-only, 20% voice-only, 20% photo-only, 20% mixed
      const roll = Math.random();
      let text: string | null = null;
      let hasVoice = false;
      let voiceDuration: number | null = null;
      let imageCount = 0;

      if (roll < 0.4) {
        // Text only
        text = SAMPLE_TEXTS[i % SAMPLE_TEXTS.length];
      } else if (roll < 0.6) {
        // Voice only
        hasVoice = true;
        voiceDuration = Math.floor(15000 + Math.random() * 120000); // 15s to 2m15s
      } else if (roll < 0.8) {
        // Photo only (1 to 4 photos)
        imageCount = Math.floor(1 + Math.random() * 4);
      } else {
        // Mixed: text + voice or photo or both
        text = SAMPLE_TEXTS[i % SAMPLE_TEXTS.length];
        if (Math.random() > 0.4) {
          hasVoice = true;
          voiceDuration = Math.floor(20000 + Math.random() * 90000);
        }
        imageCount = Math.floor(1 + Math.random() * 3);
      }

      const categoryId = Math.random() > 0.25 ? categoryIds[Math.floor(Math.random() * categoryIds.length)] : null;
      const location = Math.random() > 0.65 ? SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)] : null;
      const audioUri = hasVoice ? `drift://mock-audio/seed-${i}.m4a` : null;

      await db.runAsync(
        `INSERT INTO moments (id, title, text, created_at, updated_at, category_id, audio_uri, audio_duration, location_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        momentId,
        null,
        text,
        momentTime,
        momentTime,
        categoryId,
        audioUri,
        voiceDuration,
        location
      );

      // Insert images if applicable
      for (let imgIdx = 0; imgIdx < imageCount; imgIdx++) {
        const imgId = `img-seed-${i}-${imgIdx}`;
        const imgUrl = SAMPLE_IMAGE_URLS[(i + imgIdx) % SAMPLE_IMAGE_URLS.length];
        await db.runAsync(
          `INSERT INTO moment_images (id, moment_id, uri, order_index, created_at)
           VALUES (?, ?, ?, ?, ?);`,
          imgId,
          momentId,
          imgUrl,
          imgIdx,
          momentTime
        );
      }

      seededCount++;
    }
  });

  return seededCount;
}
