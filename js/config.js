// Constants for UI dimensions and scaling
const GUI_HEIGHT_DIVISOR = 12;        // Top GUI bar height
const TIMELINE_HEIGHT_DIVISOR = 14;   // Bottom timeline height
const TIMELINE_HEIGHT_DIVISOR_SMALL = 36; // Small timeline elements
const TEXT_SIZE_DIVISOR_MEDIUM = 48;  // Medium text scaling
const TEXT_SIZE_DIVISOR_SMALL = 60;   // Small text scaling
const TEXT_SIZE_DIVISOR_TINY = 70;    // Tiny text scaling
const SHIFT_OFFSET = 15;              // Left margin offset
const DATA_PANEL_HEIGHT_DIVISOR = 3;  // Data panel height

// Constants for zoom and scrolling
const DEFAULT_SCROLL_VALUE = 25;      // Starting zoom level
const MAX_SCROLL_VALUE = 15000000000; // Max zoom out (cosmological scale)

// Constants for color and transparency
const BACKGROUND_ALPHA = 128;         // Standard background transparency
const BACKGROUND_ALPHA_HIGH = 230;    // High opacity background
const STROKE_ALPHA_LOW = 64;          // Low opacity stroke
const TIMELINE_LABEL_MIN_SPACING = 70;
const CALENDAR_MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SOLAR_DENSE_SMOOTH_START_TIME = -100; // 1850 CE in year-1950 axis
const SOLAR_DENSE_SMOOTH_WINDOW_DAYS = 50; // Full width of the centered window
const SOLAR_ANNUAL_VIEW_YEARS = 200; // Match the older record's annual resolution in long views.
const SOLAR_ALIGNMENT_WINDOW_YEARS = 22; // Approximately two solar cycles near the historical join.
const SOLAR_ALIGNMENT_MIN_DAYS = 15;
const SOLAR_ALIGNMENT_MIN_MONTHS = 12;
const ORBITAL_EPOCH_CE = 2000; // ZB18a uses J2000; see Kocken & Zeebe (2026), section 2.1.

const SOURCE_INFO = {
  giss: { short: 'GISS', label: 'NASA GISS • monthly observations', cadence: 'month' },
  pages: { short: 'PAGES2k', label: 'PAGES2k • annual April–March reconstruction', cadence: 'year', period: 'Apr–Mar annual', uncertainty: '95% ensemble' },
  osman: { short: 'Osman', label: 'Osman 2021 • 200-year means • estimated baseline', period: '200-year mean', uncertainty: '±1σ ensemble' },
  snyder: { short: 'Snyder', label: 'Snyder 2016 • global surface reconstruction • estimated baseline', period: '1,000-year grid', uncertainty: '95% reconstruction' },
  hansen: { short: 'Hansen', label: 'Hansen 2013 • coarse global temperature estimate' },
  'co2-noaa': { short: 'NOAA', label: 'NOAA • Mauna Loa / Maunakea daily observations', cadence: 'day' },
  'co2-scripps': { short: 'Scripps', label: 'Scripps • Mauna Loa daily observations', cadence: 'day' },
  'co2-ice': { short: 'Ice cores', label: 'Bereiter 2015 • Antarctic ice-core composite', uncertainty: '±1σ measurement' },
  'co2-cencopip': { short: 'CenCO₂PIP', label: 'CenCO₂PIP 2023 • 500,000-year means • median reconstruction', period: '500,000-year mean', uncertainty: '95% credible' },
  'sea-satellite': { short: 'Satellites', label: 'Colorado • satellite sea level • overlap-aligned', cadence: 'day' },
  'sea-gauges': { short: 'Tide gauges', label: 'Jevrejeva 2014 • monthly global reconstruction', cadence: 'month', uncertainty: 'published error' },
  'sea-kopp': { short: 'Kopp', label: 'Kopp 2016 • global sea-level reconstruction', uncertainty: '±1σ posterior' },
  'sea-lambeck': { short: 'Lambeck', label: 'Lambeck 2014 • ice-volume-equivalent sea level', uncertainty: '±2σ accuracy' },
  'sea-miller': { short: 'Miller', label: 'Miller 2024 • geological global sea-level estimate' },
  'solar-satire-m': { short: 'SATIRE-M', label: 'SATIRE-M / PMIP4 • annual proxy reconstruction • adjusted reference', cadence: 'year' },
  'solar-satire-t': { short: 'SATIRE-T', label: 'SATIRE-T / PMIP4 • annual sunspot reconstruction • adjusted reference', cadence: 'year' },
  'solar-cmip6': { short: 'CMIP6', label: 'CMIP6 • SATIRE/NRL model composite • adjusted reference', cadence: 'day' },
  'solar-nnl': { short: 'NNL', label: 'NASA/NOAA/LASP NNL • model • aligned to TSIS', cadence: 'day' },
  'solar-tsis': { short: 'TSIS', label: 'TSIS • observed irradiance at 1 AU', cadence: 'day' },
  'volcano-holvol': { short: 'HolVol', label: 'HolVol v1 • annual mean stratospheric optical depth', cadence: 'year' },
  'volcano-evolv2k': { short: 'eVolv2k', label: 'eVolv2k v3 • annual mean stratospheric optical depth', cadence: 'year' },
  'volcano-cmip6': { short: 'CMIP6', label: 'CMIP6 v3 • annual mean stratospheric optical depth', cadence: 'year' },
  'orbit-zeebe': { short: 'ZB18a', label: 'Zeebe 2019 ZB18a • 1,600-year spacing • 2000 epoch' },
  'population-history': { short: 'Estimates', label: 'OWID • historical population estimates', cadence: 'year' },
  'population-projection': { short: 'Projections', label: 'OWID • population projection, not an observation', cadence: 'year' }
};
