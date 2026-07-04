export type LatLng = { lat: number; lng: number };

export type ParsedAddress = {
  formatted_address: string;
  village: string;
  district: string;
  state: string;
  country: string;
  postal_code: string;
  google_place_id: string;
};

export type FarmLocation = LatLng &
  ParsedAddress & {
    map_zoom: number;
  };
