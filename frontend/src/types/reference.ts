export type CountryOption = {
  id: number;
  name: string;
  slug: string;
  region: string;
  iso2: string;
  iso3: string;
  calling_code: string;
  display_order: number;
};

export type CountryListResponse = {
  count: number;
  results: CountryOption[];
  regions: Record<string, string[]>;
};

export type StudyFieldOption = {
  id: number;
  name: string;
  slug: string;
  category: string;
  aliases: string[];
  display_order: number;
};

export type StudyFieldListResponse = {
  count: number;
  results: StudyFieldOption[];
  categories: Record<string, string[]>;
};
