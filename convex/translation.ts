/**
 * Translation utilities
 */

import { action } from './_generated/server'
import { v } from 'convex/values'

/**
 * Translate German text to English using free translation API
 * Uses action (not mutation) because we need to call external APIs
 */
export const translateDeToEn = action({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    try {
      // Try MyMemory API first (free, no key needed)
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(args.text)}&langpair=de|en`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        return {
          success: true,
          translatedText: data.responseData.translatedText,
        };
      }

      throw new Error(data.responseDetails || 'Translation failed');
    } catch (err) {
      console.error('[Translation Error]', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  },
});
