// Contract C1.3 rules and service. "Published" is private: only the owner and admins can read a listing (founder D-03).
import { supabase } from '../auth/client';
export type ListingValues = { title: string; description: string; sport: string; age_group: string; location: string; price_note: string };
export type ListingView = { is_admin: boolean; eligible: boolean; status: 'draft' | 'published'; published_at: string | null; listing: ListingValues };
export type AdminListing = ListingValues & { user_id: string; owner_name: string; published_at: string };
export const LISTING_FIELDS: { key: keyof ListingValues; label: string; error: string; short: string; multiline?: boolean }[] = [
  { key: 'title', label: 'Listing title', error: 'Enter a title of 3 to 80 characters.', short: 'title' },
  { key: 'description', label: 'Description', error: 'Write a description of at least 20 characters.', short: 'description', multiline: true },
  { key: 'sport', label: 'Sport', error: 'Enter a sport.', short: 'sport' },
  { key: 'age_group', label: 'Age group', error: 'Enter an age group.', short: 'age group' },
  { key: 'location', label: 'Location', error: 'Enter a location.', short: 'location' },
  { key: 'price_note', label: 'Price note', error: 'Enter a price note.', short: 'price note' },
];
const max: Record<keyof ListingValues, number> = { title: 80, description: 1000, sport: 60, age_group: 60, location: 120, price_note: 120 };
export function validateListing(v: ListingValues): Partial<Record<keyof ListingValues, string>> {
  const errors: Partial<Record<keyof ListingValues, string>> = {};
  for (const f of LISTING_FIELDS) {
    const n = v[f.key].trim().length, min = f.key === 'title' ? 3 : f.key === 'description' ? 20 : 1;
    if (n < min || n > max[f.key]) errors[f.key] = f.error;
  }
  return errors;
}
export const sameListing = (a: ListingValues, b: ListingValues) => LISTING_FIELDS.every(f => a[f.key].trim() === b[f.key].trim());
async function rpc<T>(name: string, args?: object): Promise<T> { if (!supabase) throw new Error('Client unavailable'); const r = await supabase.rpc(name, args); if (r.error) throw r.error; return r.data as T; }
export const loadListing = () => rpc<ListingView>('get_my_provider_listing');
export const saveListing = (v: ListingValues) => rpc<ListingView>('save_provider_listing', { p_title: v.title.trim(), p_description: v.description.trim(), p_sport: v.sport.trim(), p_age_group: v.age_group.trim(), p_location: v.location.trim(), p_price_note: v.price_note.trim() });
export const publishListing = () => rpc<ListingView>('publish_provider_listing');
export const unpublishListing = () => rpc<ListingView>('unpublish_provider_listing');
export const loadAdminListings = () => rpc<AdminListing[]>('list_provider_listings');
