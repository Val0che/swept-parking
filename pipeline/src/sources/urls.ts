export const SOURCES = {
  signs:
    'https://donnees.montreal.ca/dataset/8ac6dd33-b0d3-4eab-a334-5a6283eb7940/resource/7f1d4ae9-1a12-46d7-953e-6b9c18c78680/download/signalisation_stationnement.csv',
  sides:
    'https://donnees.montreal.ca/dataset/88493b16-220f-4709-b57b-1ea57c5ba405/resource/16f7fa0a-9ce6-4b29-a7fc-00842c593927/download/gbdouble.json',
} as const;

export const CACHE_DIR = new URL('../../.cache/', import.meta.url);

export const cachePath = (name: keyof typeof SOURCES) =>
  new URL(name === 'signs' ? 'signs.csv' : 'gbdouble.json', CACHE_DIR);
