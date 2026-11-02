export interface CityConfig {
  readonly name: string;
  readonly center: { readonly lat: number; readonly lng: number };
  readonly bounds: {
    readonly minLat: number;
    readonly maxLat: number;
    readonly minLng: number;
    readonly maxLng: number;
  };
}

export const AMRITSAR: CityConfig = {
  name: 'Amritsar',
  center: { lat: 31.634, lng: 74.8723 },
  bounds: {
    minLat: 31.57,
    maxLat: 31.7,
    minLng: 74.8,
    maxLng: 74.95,
  },
};