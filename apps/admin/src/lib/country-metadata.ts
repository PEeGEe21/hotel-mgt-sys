export type CountryOption = {
  name: string;
  code: string;
  currency: string;
  timezone: string;
  phoneCode: string;
  states: string[];
};

export const COUNTRY_OPTIONS: CountryOption[] = [
  {
    name: 'Nigeria',
    code: 'NG',
    currency: 'NGN',
    timezone: 'Africa/Lagos',
    phoneCode: '+234',
    states: [
      'Abia',
      'Abuja FCT',
      'Adamawa',
      'Akwa Ibom',
      'Anambra',
      'Bauchi',
      'Bayelsa',
      'Benue',
      'Borno',
      'Cross River',
      'Delta',
      'Ebonyi',
      'Edo',
      'Ekiti',
      'Enugu',
      'Gombe',
      'Imo',
      'Jigawa',
      'Kaduna',
      'Kano',
      'Katsina',
      'Kebbi',
      'Kogi',
      'Kwara',
      'Lagos',
      'Nasarawa',
      'Niger',
      'Ogun',
      'Ondo',
      'Osun',
      'Oyo',
      'Plateau',
      'Rivers',
      'Sokoto',
      'Taraba',
      'Yobe',
      'Zamfara',
    ],
  },
  {
    name: 'Ghana',
    code: 'GH',
    currency: 'GHS',
    timezone: 'Africa/Accra',
    phoneCode: '+233',
    states: ['Ahafo', 'Ashanti', 'Bono', 'Central', 'Eastern', 'Greater Accra', 'Northern', 'Volta', 'Western'],
  },
  {
    name: 'Kenya',
    code: 'KE',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    phoneCode: '+254',
    // Kenya: abbreviated list — expand if KE becomes a priority market
    states: ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu'],
  },
  {
    name: 'South Africa',
    code: 'ZA',
    currency: 'ZAR',
    timezone: 'Africa/Johannesburg',
    phoneCode: '+27',
    states: ['Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo', 'Mpumalanga', 'North West', 'Western Cape'],
  },
  {
    name: 'United Arab Emirates',
    code: 'AE',
    currency: 'AED',
    timezone: 'Asia/Dubai',
    phoneCode: '+971',
    states: ['Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al Quwain'],
  },
  {
    name: 'United Kingdom',
    code: 'GB',
    currency: 'GBP',
    timezone: 'Europe/London',
    phoneCode: '+44',
    states: ['England', 'Northern Ireland', 'Scotland', 'Wales'],
  },
  {
    name: 'United States',
    code: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    phoneCode: '+1',
    // United States: abbreviated list — expand if US becomes a priority market
    states: ['California', 'Florida', 'Illinois', 'New York', 'Texas', 'Washington'],
  },
  {
    name: 'Canada',
    code: 'CA',
    currency: 'CAD',
    timezone: 'America/Toronto',
    phoneCode: '+1',
    states: ['Alberta', 'British Columbia', 'Ontario', 'Quebec'],
  },
];

export function getCountryOption(countryName: string) {
  return COUNTRY_OPTIONS.find((option) => option.name === countryName) ?? COUNTRY_OPTIONS[0];
}
