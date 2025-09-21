// src/types/address.ts
export interface AddressSuggestion {
  label: string;
  context: string;
  coordinates: [number, number]; // [longitude, latitude]
  score: number;
  postcode: string;
  city: string;
  type?: string;
  housenumber?: string;
  street?: string;
}

export interface AddressValidationResult {
  isValid: boolean;
  suggestions: AddressSuggestion[];
  coordinates?: {
    lat: number;
    lng: number;
  };
  formattedAddress?: string;
  confidence?: number;
  error?: string;
}

export interface AddressData {
  id?: string;
  fullAddress: string;
  streetNumber?: string;
  streetName?: string;
  building?: string;
  floor?: string;
  postalCode: string;
  city: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  formattedAddress?: string;
  confidence?: number;
  validatedAt?: string;
}

export interface AddressValidationError {
  type: 'network' | 'format' | 'notfound' | 'invalid';
  message: string;
  suggestions?: string[];
}