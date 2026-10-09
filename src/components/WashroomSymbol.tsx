type Props = { venue?: boolean };

const publicWashroom = <><path d="M4.5 3.5h6v17h-6z" /><path d="M13.5 3.5h6v17h-6z" /><path d="M7.5 7.5h1" /><path d="M16.5 7.5h1" /></>;
const venueWashroom = <><path d="M5 12h14v2.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 5 14.5z" /><path d="M9 12V8.5a3 3 0 0 1 6 0V12" /><path d="M11 6h3" /><path d="M12.5 12v2" /></>;

export function washroomSymbolMarkup(venue: boolean) {
  const paths = venue
    ? '<path d="M5 12h14v2.5a4.5 4.5 0 0 1-4.5 4.5h-5A4.5 4.5 0 0 1 5 14.5z"/><path d="M9 12V8.5a3 3 0 0 1 6 0V12"/><path d="M11 6h3"/><path d="M12.5 12v2"/>'
    : '<path d="M4.5 3.5h6v17h-6z"/><path d="M13.5 3.5h6v17h-6z"/><path d="M7.5 7.5h1"/><path d="M16.5 7.5h1"/>';
  return `<svg class="washroom-symbol${venue ? ' is-venue' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
}

export function WashroomSymbol({ venue = false }: Props) {
  return <svg className={`washroom-symbol${venue ? ' is-venue' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{venue ? venueWashroom : publicWashroom}</svg>;
}
