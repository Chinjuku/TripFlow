/**
 * Builds a Google Maps "directions" deep link.
 * On mobile with the Google Maps app installed, tapping this URL opens
 * the app directly. Otherwise it falls back to maps.google.com.
 *
 * Spec: https://developers.google.com/maps/documentation/urls/get-started
 */
export function buildDirectionsUrl(destination: { lat: number; lng: number }): string {
  const url = new URL('https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
  url.searchParams.set('travelmode', 'driving');
  return url.toString();
}
