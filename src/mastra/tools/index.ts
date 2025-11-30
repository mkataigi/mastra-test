import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getWeatherCondition } from '../utils/weather';

type GeocodingResult = {
  latitude: number;
  longitude: number;
  name: string;
};

type GeocodingResponse = {
  results?: GeocodingResult[];
};

type WeatherResponse = {
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    wind_gusts_10m: number;
    weather_code: number;
  };
};

type WeatherSnapshot = {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  conditions: string;
  location: string;
};

const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch data from ${url}`);
  }

  return (await response.json()) as T;
};

const getWeather = async (location: string): Promise<WeatherSnapshot> => {
  const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
  const geocodingData = await fetchJson<GeocodingResponse>(geocodingUrl);
  const geocodingResult = geocodingData.results?.[0];

  if (!geocodingResult) {
    throw new Error(`Location '${location}' not found`);
  }

  const { latitude, longitude, name } = geocodingResult;
  const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;
  const weatherData = await fetchJson<WeatherResponse>(weatherUrl);

  return {
    temperature: weatherData.current.temperature_2m,
    feelsLike: weatherData.current.apparent_temperature,
    humidity: weatherData.current.relative_humidity_2m,
    windSpeed: weatherData.current.wind_speed_10m,
    windGust: weatherData.current.wind_gusts_10m,
    conditions: getWeatherCondition(weatherData.current.weather_code),
    location: name,
  };
};

export const weatherTool = createTool({
  id: 'get-weather',
  description: 'Get current weather for a location',
  inputSchema: z.object({
    location: z.string().describe('City name'),
  }),
  outputSchema: z.object({
    temperature: z.number(),
    feelsLike: z.number(),
    humidity: z.number(),
    windSpeed: z.number(),
    windGust: z.number(),
    conditions: z.string(),
    location: z.string(),
  }),
  execute: async ({ context }) => {
    return await getWeather(context.location);
  },
});
