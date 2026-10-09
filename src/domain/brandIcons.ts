import brandIcons from '../data/brand-icons.json';
import { publicAsset } from '../api/site';

type FacilityKind = 'fuel' | 'atm';
type BrandIconDefinition = { id: string; site: string };
type BrandIconConfig = Record<FacilityKind, Record<string, BrandIconDefinition>>;

const config = brandIcons as BrandIconConfig;

export function getFacilityBrandIcon(kind: FacilityKind, brand?: string) {
  const definition = brand ? config[kind][brand] : undefined;
  return definition ? { id: definition.id, src: publicAsset(`brand-icons/${definition.id}.png`) } : undefined;
}
