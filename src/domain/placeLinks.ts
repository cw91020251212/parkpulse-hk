export function googleMapsPlaceUrl(name: string, address: string | undefined, latitude: number, longitude: number) {
  const query = address?.trim() ? `${name}, ${address.trim()}` : `${latitude},${longitude}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
