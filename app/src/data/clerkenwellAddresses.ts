/* ------------------------------------------------------------------ */
/*  Sample delivery addresses - Clerkenwell, London                    */
/*  Stored locally for workshops, replacing the Google Places lookup.  */
/*  Company names are fictional; streets and postcodes are realistic.  */
/* ------------------------------------------------------------------ */
export interface DeliveryAddress {
  companyName: string;
  line1: string;
  line2: string;
  line3: string;
  line4: string;
  city: string;
  county: string;
  postcode: string;
  countryCode: string;
}

type Sample = Pick<DeliveryAddress, 'companyName' | 'line1' | 'line2' | 'postcode'>;

const SAMPLES: Sample[] = [
  { companyName: 'Hatton & Reed Architects',      line1: '14 St John Street',          line2: '2nd Floor',        postcode: 'EC1M 4AY' },
  { companyName: 'Farringdon Works Studio',       line1: '82 Farringdon Road',         line2: 'Unit 4',           postcode: 'EC1R 3EU' },
  { companyName: 'Exmouth Market Design Co',      line1: '31 Exmouth Market',          line2: '',                 postcode: 'EC1R 4QL' },
  { companyName: 'Clerkenwell Green Partners',    line1: '9 Clerkenwell Green',        line2: '1st Floor',        postcode: 'EC1R 0DP' },
  { companyName: 'Britton Street Creative',       line1: '22 Britton Street',          line2: '',                 postcode: 'EC1M 5UD' },
  { companyName: 'Goswell Road Interiors',        line1: '145 Goswell Road',           line2: '3rd Floor',        postcode: 'EC1V 7ET' },
  { companyName: 'St John Square Legal LLP',      line1: '6 St John\'s Square',        line2: '',                 postcode: 'EC1M 4NH' },
  { companyName: 'Turnmill Digital',              line1: '40 Turnmill Street',         line2: 'Floor 5',          postcode: 'EC1M 5QU' },
  { companyName: 'Charterhouse Workspace',        line1: '55 Charterhouse Street',     line2: 'Suite 2',          postcode: 'EC1M 6HA' },
  { companyName: 'Cowcross & Co',                 line1: '18 Cowcross Street',         line2: '',                 postcode: 'EC1M 6DG' },
  { companyName: 'Great Sutton Media',            line1: '71 Great Sutton Street',     line2: 'Ground Floor',     postcode: 'EC1V 0AB' },
  { companyName: 'Skinner Street Surveyors',      line1: '12 Skinner Street',          line2: '',                 postcode: 'EC1R 0DS' },
  { companyName: 'Rosebery Avenue Consulting',    line1: '104 Rosebery Avenue',        line2: '4th Floor',        postcode: 'EC1R 4QY' },
  { companyName: 'Amwell Street Architecture',    line1: '27 Amwell Street',           line2: '',                 postcode: 'EC1R 1UN' },
  { companyName: 'Corporation Row Studios',       line1: '3 Corporation Row',          line2: 'Unit 1',           postcode: 'EC1R 3DJ' },
  { companyName: 'Bowling Green Lane Brands',     line1: '16 Bowling Green Lane',      line2: '2nd Floor',        postcode: 'EC1R 0BD' },
  { companyName: 'St John\'s Lane Property',      line1: '9 St John\'s Lane',          line2: '',                 postcode: 'EC1M 4BF' },
  { companyName: 'Hatton Garden Finance',         line1: '33 Hatton Garden',           line2: '1st Floor',        postcode: 'EC1N 8DX' },
  { companyName: 'Greville Street Engineering',   line1: '24 Greville Street',         line2: '',                 postcode: 'EC1N 8SS' },
  { companyName: 'Aylesbury Street Holdings',     line1: '47 Aylesbury Street',        line2: 'Suite 3',          postcode: 'EC1R 0DR' },
  { companyName: 'Woodbridge Street Labs',        line1: '8 Woodbridge Street',        line2: '',                 postcode: 'EC1R 0LL' },
  { companyName: 'Back Hill Communications',      line1: '11 Back Hill',               line2: '3rd Floor',        postcode: 'EC1R 5EN' },
  { companyName: 'Clerkenwell Road Developments', line1: '120 Clerkenwell Road',       line2: '',                 postcode: 'EC1R 5DF' },
  { companyName: 'Cloth Fair Advisory',           line1: '5 Cloth Fair',               line2: 'Ground Floor',     postcode: 'EC1A 7JQ' },
  { companyName: 'Warner Street Furniture Hire',  line1: '19 Warner Street',           line2: 'Unit 2',           postcode: 'EC1R 5HB' },
];

export const CLERKENWELL_ADDRESSES: DeliveryAddress[] = SAMPLES.map((s) => ({
  ...s,
  line3: '',
  line4: '',
  city: 'London',
  county: 'Greater London',
  countryCode: 'GB',
}));
