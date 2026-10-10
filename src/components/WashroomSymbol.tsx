type Props = { venue?: boolean };

const venueSource = '/facility-icons/venue-sport.png';
const publicSource = '/facility-icons/public-toilet-gender.png';

export function washroomSymbolMarkup(venue: boolean) {
  const kind = venue ? 'is-venue' : 'is-public';
  const source = venue ? venueSource : publicSource;
  return `<img class="washroom-symbol ${kind}" src="${source}" alt="" aria-hidden="true" />`;
}

export function WashroomSymbol({ venue = false }: Props) {
  const kind = venue ? 'is-venue' : 'is-public';
  const source = venue ? venueSource : publicSource;
  return <img className={`washroom-symbol ${kind}`} src={source} alt="" aria-hidden="true" />;
}
