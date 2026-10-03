// magvar ships CommonJS without types. Only what we call.
declare module "magvar" {
  /** Declination in degrees: positive when magnetic north is east of true north (WMM2025). */
  export function magvar(latitude: number, longitude: number, altitudeKm?: number, when?: number | Date): number;
}
