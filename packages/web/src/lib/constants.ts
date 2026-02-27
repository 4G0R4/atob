import type { Coords } from './types';

export const defaultCenter: Coords = { lng: 2.1734, lat: 41.3851 }; // Barcelona

export const CURRENCIES = [
	'SATS', // Satoshis
	'BTC', // Bitcoin
	'USD', // United States Dollar
	'EUR', // Euro
	'JPY', // Japanese Yen
	'GBP', // Pound Sterling
	'CHF', // Swiss Franc
	'CNY', // Chinese Renminbi (RMB)
	'AUD', // Australian Dollar
	'CAD', // Canadian Dollar
	'HKD', // Hong Kong Dollar
	'SGD', // Singapore Dollar
	'INR', // Indian Rupee
	'MXN', // Mexican Peso
	'RUB', // Russian Ruble
	'BRL', // Brazilian Real
	'TRY', // Turkish Lira
	'KRW', // South Korean Won
	'ZAR', // South African Rand
	'ARS', // Argentine Peso
	'CLP', // Chilean Peso
	'COP', // Colombian Peso
	'PEN', // Peruvian Sol
	'UYU', // Uruguayan Peso
	'PHP', // Philippine Peso
	'THB', // Thai Baht
	'IDR', // Indonesian Rupiah
	'MYR' // Malaysian Ringgit
] as const;
