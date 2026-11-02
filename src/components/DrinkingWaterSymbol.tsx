import { publicAsset } from '../api/site';

export const DRINKING_WATER_SYMBOL_URL = publicAsset('icons/drinking-water.svg');
export function DrinkingWaterSymbol() {
  return <img className="drinking-water-symbol" src={DRINKING_WATER_SYMBOL_URL} alt="" aria-hidden="true" />;
}
