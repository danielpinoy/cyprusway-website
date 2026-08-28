import { getSupabase } from './supabase';

/**
 * Download a trip as a PDF, through the deployed `trip-pdf` function.
 *
 * `POST { itinerary_id }` with the caller's JWT. It spends nothing — no LLM, no API — and
 * returns `application/pdf` bytes directly, with a `Content-Disposition` naming the file.
 * A non-premium caller is refused with **403 `premium_required`**, which is why the button
 * is only rendered for an account that can use it (see profile.ts `fetchIsPremium`).
 *
 * The bytes come back in the response rather than as a URL, so this cannot be a plain
 * link: the blob is turned into an object URL, handed to a synthetic anchor, and revoked.
 */
export async function downloadTripPdf(itineraryId: string, name: string | null): Promise<void> {
  const { data } = await getSupabase().auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('no_session');

  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trip-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ itinerary_id: itineraryId }),
  });

  if (!response.ok) {
    console.warn('[tripPdf] HTTP', response.status);
    throw new Error('pdf_failed');
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    /* The server names the file `trip-<first 8 of the uuid>.pdf`; the trip's own name is
       friendlier and is what the reader recognises. Punctuation that a filesystem would
       refuse is replaced rather than stripped, so two trips cannot collapse to one name. */
    anchor.download = `${(name ?? 'trip').replace(/[^\p{L}\p{N} _-]/gu, '-').slice(0, 60)}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}
