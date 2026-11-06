import {
  GOOGLE_MAPS_SEGMENT_WAYPOINTS,
  GOOGLE_MAPS_SNAPPED_STATIONS,
} from './googleMapsExactPolylines';

export interface StationNode {
  id: string;
  name: string;
  x: number; // Derived directly from real lng for 1:1 Google Maps projection
  y: number; // Derived directly from real lat for 1:1 Google Maps projection
  lat: number;
  lng: number;
  municipality:
    | 'Toronto'
    | 'Mississauga'
    | 'Brampton'
    | 'Vaughan'
    | 'Richmond Hill'
    | 'Markham'
    | 'Scarborough'
    | 'Etobicoke'
    | 'North York'
    | 'Oakville'
    | 'Burlington'
    | 'Hamilton'
    | 'Niagara'
    | 'Milton'
    | 'Halton Hills'
    | 'Guelph'
    | 'Kitchener-Waterloo'
    | 'York Region'
    | 'Barrie'
    | 'Durham-Oshawa';
  lines: string[];
  isInterchange?: boolean;
  accessibility: boolean;
  streetAddress?: string;
}

export interface TransitLine {
  id: string;
  code: string;
  name: string;
  shortName: string;
  mode: 'subway' | 'lrt' | 'bus';
  color: string;
  glowColor: string;
  coreColor: string;
  frequencyPeak: string;
  dailyRidership: string;
  status: 'Operational' | 'Master Plan Expansion';
  description: string;
  stationIds: string[];
  /** Anchor station ID where the snake emergence tether connects from Union Station */
  emergenceAnchorId: string;
}

export interface TorontoLandmark {
  id: string;
  name: string;
  shortLabel?: string;
  category:
    | 'Landmark'
    | 'Airport & Hub'
    | 'University & Hospital'
    | 'Shopping & Culture'
    | 'District';
  stationId: string;
  lat?: number;
  lng?: number;
  walkingMinutes: number;
  walkingMeters: number;
  description: string;
  keywords: string[];
}

export interface RoadPolyline {
  name: string;
  type: 'highway' | 'arterial' | 'local';
  points: [number, number][];
  labelPos?: { x: number; y: number; angle?: number };
  shield?: string;
}

// Fixed central nexus ("The Nest" / Điểm cố định chung) at Union Station, Downtown Toronto
export const TORONTO_CENTRAL_NEXUS = {
  id: 'union',
  name: 'Union Station (Central Hub)',
  x: 960,
  y: 715,
  lat: 43.6453,
  lng: -79.3806,
  canadaMapX: 1032,
  canadaMapY: 822,
};

/**
 * Exact 1-to-1 reversible projection between real-world Google Maps (lat, lng)
 * and the internal (x, y) coordinate space used by computeSnakeEmergenceGeometry.
 * Union Station (43.6453, -79.3806) <-> (960, 715).
 */
export function latLngToCanvasPoint(lat: number, lng: number): { x: number; y: number } {
  return {
    x: Number((960 + (lng - -79.3806) * 1000).toFixed(3)),
    y: Number((715 - (lat - 43.6453) * 1000).toFixed(3)),
  };
}

export function canvasPointToLatLng(x: number, y: number): { lat: number; lng: number } {
  return {
    lat: Number((43.6453 + (715 - y) / 1000).toFixed(5)),
    lng: Number((-79.3806 + (x - 960) / 1000).toFixed(5)),
  };
}

interface RawStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  municipality: StationNode['municipality'];
  streetAddress?: string;
}

/**
 * 100% Real-World Google Maps GPS Coordinates for TTC Subway, LRT, GO Transit Rail,
 * and Regional Rapid Transit Stations across Toronto, Hamilton, Niagara Falls, Kitchener, Guelph & Oshawa.
 */
const RAW_STATIONS: RawStation[] = [
  // ==================== LINE 1: YONGE–UNIVERSITY SUBWAY (Exact Google Maps Coordinates) ====================
  { id: 'vmc', name: 'Vaughan Metropolitan Centre', lat: 43.7942, lng: -79.5275, municipality: 'Vaughan', streetAddress: 'Millway Ave & Hwy 7' },
  { id: 'hwy407', name: 'Highway 407', lat: 43.7832, lng: -79.5238, municipality: 'Vaughan', streetAddress: 'Jane St & Hwy 407 ETR' },
  { id: 'pioneer-village', name: 'Pioneer Village', lat: 43.7769, lng: -79.5094, municipality: 'North York', streetAddress: 'Steeles Ave W & Northwest Gate' },
  { id: 'york-university', name: 'York University', lat: 43.7741, lng: -79.4998, municipality: 'North York', streetAddress: 'Ian Macdonald Blvd' },
  { id: 'finch-west', name: 'Finch West', lat: 43.7652, lng: -79.4911, municipality: 'North York', streetAddress: 'Keele St & Finch Ave W' },
  { id: 'downsview-park', name: 'Downsview Park', lat: 43.7536, lng: -79.4783, municipality: 'North York', streetAddress: 'Sheppard Ave W & Carl Hall Rd' },
  { id: 'sheppard-west', name: 'Sheppard West', lat: 43.7495, lng: -79.4622, municipality: 'North York', streetAddress: 'Dufferin St & Sheppard Ave W' },
  { id: 'wilson', name: 'Wilson', lat: 43.7345, lng: -79.4501, municipality: 'North York', streetAddress: 'Wilson Ave & Allen Rd' },
  { id: 'yorkdale', name: 'Yorkdale', lat: 43.7246, lng: -79.4475, municipality: 'North York', streetAddress: 'Allen Rd & Yorkdale Rd' },
  { id: 'lawrence-west', name: 'Lawrence West', lat: 43.7156, lng: -79.4442, municipality: 'North York', streetAddress: 'Lawrence Ave W & Allen Rd' },
  { id: 'glencairn', name: 'Glencairn', lat: 43.7089, lng: -79.4408, municipality: 'North York', streetAddress: 'Glencairn Ave & Allen Rd' },
  { id: 'cedarvale', name: 'Cedarvale (Eglinton West)', lat: 43.6992, lng: -79.4361, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Allen Rd' },
  { id: 'st-clair-west', name: 'St. Clair West', lat: 43.6839, lng: -79.4151, municipality: 'Toronto', streetAddress: 'St. Clair Ave W & Bathurst St' },
  { id: 'dupont', name: 'Dupont', lat: 43.6746, lng: -79.4069, municipality: 'Toronto', streetAddress: 'Dupont St & Spadina Rd' },
  { id: 'spadina', name: 'Spadina', lat: 43.6672, lng: -79.4039, municipality: 'Toronto', streetAddress: 'Bloor St W & Spadina Rd' },
  { id: 'st-george', name: 'St. George', lat: 43.6682, lng: -79.3998, municipality: 'Toronto', streetAddress: 'Bloor St W & Bedford Rd' },
  { id: 'museum', name: 'Museum', lat: 43.6671, lng: -79.3936, municipality: 'Toronto', streetAddress: 'Queen’s Park & Charles St W' },
  { id: 'queens-park', name: "Queen's Park", lat: 43.6599, lng: -79.3905, municipality: 'Toronto', streetAddress: 'University Ave & College St' },
  { id: 'st-patrick', name: 'St. Patrick', lat: 43.6548, lng: -79.3883, municipality: 'Toronto', streetAddress: 'University Ave & Dundas St W' },
  { id: 'osgoode', name: 'Osgoode', lat: 43.6508, lng: -79.3867, municipality: 'Toronto', streetAddress: 'University Ave & Queen St W' },
  { id: 'st-andrew', name: 'St. Andrew', lat: 43.6476, lng: -79.3848, municipality: 'Toronto', streetAddress: 'University Ave & King St W' },
  { id: 'union', name: 'Union Station', lat: 43.6453, lng: -79.3806, municipality: 'Toronto', streetAddress: 'Front St W & Bay St' },
  { id: 'king', name: 'King', lat: 43.6491, lng: -79.3779, municipality: 'Toronto', streetAddress: 'Yonge St & King St E' },
  { id: 'queen', name: 'Queen', lat: 43.6524, lng: -79.3792, municipality: 'Toronto', streetAddress: 'Yonge St & Queen St E' },
  { id: 'dundas', name: 'TMU (Dundas)', lat: 43.6563, lng: -79.3809, municipality: 'Toronto', streetAddress: 'Yonge St & Dundas St E' },
  { id: 'college', name: 'College', lat: 43.6613, lng: -79.3831, municipality: 'Toronto', streetAddress: 'Yonge St & College St' },
  { id: 'wellesley', name: 'Wellesley', lat: 43.6654, lng: -79.3839, municipality: 'Toronto', streetAddress: 'Yonge St & Wellesley St E' },
  { id: 'bloor-yonge', name: 'Bloor–Yonge', lat: 43.6709, lng: -79.3857, municipality: 'Toronto', streetAddress: 'Yonge St & Bloor St E' },
  { id: 'rosedale', name: 'Rosedale', lat: 43.6769, lng: -79.3889, municipality: 'Toronto', streetAddress: 'Yonge St & Crescent Rd' },
  { id: 'summerhill', name: 'Summerhill', lat: 43.6822, lng: -79.3908, municipality: 'Toronto', streetAddress: 'Yonge St & Shaftesbury Ave' },
  { id: 'st-clair', name: 'St. Clair', lat: 43.6879, lng: -79.3932, municipality: 'Toronto', streetAddress: 'Yonge St & St. Clair Ave E' },
  { id: 'davisville', name: 'Davisville', lat: 43.6976, lng: -79.3972, municipality: 'Toronto', streetAddress: 'Yonge St & Chaplin Cres' },
  { id: 'eglinton', name: 'Eglinton', lat: 43.7061, lng: -79.3986, municipality: 'Toronto', streetAddress: 'Yonge St & Eglinton Ave' },
  { id: 'lawrence', name: 'Lawrence', lat: 43.7250, lng: -79.4022, municipality: 'North York', streetAddress: 'Yonge St & Lawrence Ave' },
  { id: 'york-mills', name: 'York Mills', lat: 43.7441, lng: -79.4066, municipality: 'North York', streetAddress: 'Yonge St & York Mills Rd' },
  { id: 'sheppard-yonge', name: 'Sheppard–Yonge', lat: 43.7615, lng: -79.4111, municipality: 'North York', streetAddress: 'Yonge St & Sheppard Ave' },
  { id: 'north-york-centre', name: 'North York Centre', lat: 43.7688, lng: -79.4128, municipality: 'North York', streetAddress: 'Yonge St & Empress Ave' },
  { id: 'finch', name: 'Finch', lat: 43.7805, lng: -79.4149, municipality: 'North York', streetAddress: 'Yonge St & Finch Ave' },
  { id: 'richmond-hill-centre', name: 'Langstaff GO (Richmond Hill Centre)', lat: 43.8383, lng: -79.4225, municipality: 'Richmond Hill', streetAddress: 'Yonge St & Hwy 7' },

  // ==================== LINE 2: BLOOR–DANFORTH SUBWAY (Exact Google Maps Coordinates) ====================
  { id: 'kipling', name: 'Kipling', lat: 43.6372, lng: -79.5356, municipality: 'Etobicoke', streetAddress: 'Dundas St W & Kipling Ave' },
  { id: 'islington', name: 'Islington', lat: 43.6453, lng: -79.5244, municipality: 'Etobicoke', streetAddress: 'Bloor St W & Islington Ave' },
  { id: 'royal-york', name: 'Royal York', lat: 43.6481, lng: -79.5113, municipality: 'Etobicoke', streetAddress: 'Bloor St W & Royal York Rd' },
  { id: 'old-mill', name: 'Old Mill', lat: 43.6500, lng: -79.4947, municipality: 'Etobicoke', streetAddress: 'Bloor St W & Old Mill Tr' },
  { id: 'jane', name: 'Jane', lat: 43.6499, lng: -79.4839, municipality: 'Toronto', streetAddress: 'Bloor St W & Jane St' },
  { id: 'runnymede', name: 'Runnymede', lat: 43.6517, lng: -79.4758, municipality: 'Toronto', streetAddress: 'Bloor St W & Runnymede Rd' },
  { id: 'high-park', name: 'High Park', lat: 43.6539, lng: -79.4668, municipality: 'Toronto', streetAddress: 'Bloor St W & Parkside Dr' },
  { id: 'keele', name: 'Keele', lat: 43.6556, lng: -79.4596, municipality: 'Toronto', streetAddress: 'Bloor St W & Keele St' },
  { id: 'dundas-west', name: 'Dundas West (Bloor GO)', lat: 43.6568, lng: -79.4510, municipality: 'Toronto', streetAddress: 'Bloor St W & Dundas St W' },
  { id: 'lansdowne', name: 'Lansdowne', lat: 43.6591, lng: -79.4428, municipality: 'Toronto', streetAddress: 'Bloor St W & Lansdowne Ave' },
  { id: 'dufferin', name: 'Dufferin', lat: 43.6602, lng: -79.4354, municipality: 'Toronto', streetAddress: 'Bloor St W & Dufferin St' },
  { id: 'ossington', name: 'Ossington', lat: 43.6623, lng: -79.4264, municipality: 'Toronto', streetAddress: 'Bloor St W & Ossington Ave' },
  { id: 'christie', name: 'Christie', lat: 43.6641, lng: -79.4184, municipality: 'Toronto', streetAddress: 'Bloor St W & Christie St' },
  { id: 'bathurst', name: 'Bathurst', lat: 43.6660, lng: -79.4112, municipality: 'Toronto', streetAddress: 'Bloor St W & Bathurst St' },
  { id: 'bay', name: 'Bay (Yorkville)', lat: 43.6702, lng: -79.3901, municipality: 'Toronto', streetAddress: 'Bloor St W & Bay St' },
  { id: 'sherbourne', name: 'Sherbourne', lat: 43.6722, lng: -79.3764, municipality: 'Toronto', streetAddress: 'Bloor St E & Sherbourne St' },
  { id: 'castle-frank', name: 'Castle Frank', lat: 43.6738, lng: -79.3688, municipality: 'Toronto', streetAddress: 'Bloor St E & Castle Frank Rd' },
  { id: 'broadview', name: 'Broadview', lat: 43.6769, lng: -79.3584, municipality: 'Toronto', streetAddress: 'Danforth Ave & Broadview Ave' },
  { id: 'chester', name: 'Chester', lat: 43.6783, lng: -79.3524, municipality: 'Toronto', streetAddress: 'Danforth Ave & Chester Ave' },
  { id: 'pape', name: 'Pape', lat: 43.6799, lng: -79.3450, municipality: 'Toronto', streetAddress: 'Danforth Ave & Pape Ave' },
  { id: 'donlands', name: 'Donlands', lat: 43.6811, lng: -79.3378, municipality: 'Toronto', streetAddress: 'Danforth Ave & Donlands Ave' },
  { id: 'greenwood', name: 'Greenwood', lat: 43.6826, lng: -79.3304, municipality: 'Toronto', streetAddress: 'Danforth Ave & Greenwood Ave' },
  { id: 'coxwell', name: 'Coxwell', lat: 43.6841, lng: -79.3231, municipality: 'Toronto', streetAddress: 'Danforth Ave & Coxwell Ave' },
  { id: 'woodbine', name: 'Woodbine', lat: 43.6864, lng: -79.3128, municipality: 'Toronto', streetAddress: 'Danforth Ave & Woodbine Ave' },
  { id: 'main-street', name: 'Main Street (Danforth GO)', lat: 43.6890, lng: -79.3017, municipality: 'Toronto', streetAddress: 'Danforth Ave & Main St' },
  { id: 'victoria-park', name: 'Victoria Park', lat: 43.6950, lng: -79.2886, municipality: 'Scarborough', streetAddress: 'Danforth Ave & Victoria Park Ave' },
  { id: 'warden', name: 'Warden', lat: 43.7114, lng: -79.2797, municipality: 'Scarborough', streetAddress: 'St. Clair Ave E & Warden Ave' },
  { id: 'kennedy', name: 'Kennedy', lat: 43.7324, lng: -79.2637, municipality: 'Scarborough', streetAddress: 'Eglinton Ave E & Kennedy Rd' },
  { id: 'scarborough-centre', name: 'Scarborough Centre', lat: 43.7744, lng: -79.2578, municipality: 'Scarborough', streetAddress: 'Triton Rd & McCowan Rd' },

  // ==================== LINE 4: SHEPPARD SUBWAY ====================
  { id: 'bayview', name: 'Bayview', lat: 43.7669, lng: -79.3867, municipality: 'North York', streetAddress: 'Sheppard Ave E & Bayview Ave' },
  { id: 'bessarion', name: 'Bessarion', lat: 43.7692, lng: -79.3764, municipality: 'North York', streetAddress: 'Sheppard Ave E & Burbank Dr' },
  { id: 'leslie', name: 'Leslie (Oriole GO)', lat: 43.7714, lng: -79.3653, municipality: 'North York', streetAddress: 'Sheppard Ave E & Leslie St' },
  { id: 'don-mills', name: 'Don Mills', lat: 43.7756, lng: -79.3456, municipality: 'North York', streetAddress: 'Sheppard Ave E & Don Mills Rd' },
  { id: 'agincourt', name: 'Agincourt GO', lat: 43.7858, lng: -79.2842, municipality: 'Scarborough', streetAddress: 'Sheppard Ave E & Kennedy Rd' },

  // ==================== LINE 5: EGLINTON CROSSTOWN LRT ====================
  { id: 'pearson-airport', name: 'Pearson International Airport (YYZ)', lat: 43.6817, lng: -79.6120, municipality: 'Mississauga', streetAddress: 'Terminal 1 & 3 Link' },
  { id: 'mount-dennis', name: 'Mount Dennis GO & LRT', lat: 43.68885, lng: -79.49019, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Weston Rd' },
  { id: 'keelesdale', name: 'Keelesdale', lat: 43.69172, lng: -79.47495, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Keele St' },
  { id: 'caledonia', name: 'Caledonia', lat: 43.69357, lng: -79.46511, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Caledonia Rd' },
  { id: 'fairbank', name: 'Fairbank', lat: 43.69645, lng: -79.44986, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Dufferin St' },
  { id: 'forest-hill', name: 'Forest Hill', lat: 43.70107, lng: -79.42529, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Bathurst St' },
  { id: 'chaplin', name: 'Chaplin', lat: 43.70358, lng: -79.41195, municipality: 'Toronto', streetAddress: 'Eglinton Ave W & Chaplin Cres' },
  { id: 'mount-pleasant', name: 'Mount Pleasant', lat: 43.70778, lng: -79.39008, municipality: 'Toronto', streetAddress: 'Eglinton Ave E & Mt Pleasant Rd' },
  { id: 'leaside', name: 'Leaside', lat: 43.71042, lng: -79.37671, municipality: 'Toronto', streetAddress: 'Eglinton Ave E & Bayview Ave' },
  { id: 'laird', name: 'Laird', lat: 43.71286, lng: -79.36434, municipality: 'Toronto', streetAddress: 'Eglinton Ave E & Laird Dr' },
  { id: 'science-centre', name: 'Don Valley (Science Centre)', lat: 43.71803, lng: -79.33818, municipality: 'North York', streetAddress: 'Don Mills Rd & Eglinton Ave E' },
  { id: 'wynford', name: 'Wynford', lat: 43.72050, lng: -79.32567, municipality: 'North York', streetAddress: 'Eglinton Ave E & Wynford Dr' },
  { id: 'golden-mile', name: 'Golden Mile', lat: 43.72723, lng: -79.29157, municipality: 'Scarborough', streetAddress: 'Eglinton Ave E & Warden Ave' },
  { id: 'birchmount-eglinton', name: 'Birchmount', lat: 43.73008, lng: -79.27710, municipality: 'Scarborough', streetAddress: 'Eglinton Ave E & Birchmount Rd' },

  // ==================== LINE 6: FINCH WEST LRT ====================
  { id: 'humber-college', name: 'Humber College', lat: 43.7289, lng: -79.6015, municipality: 'Etobicoke', streetAddress: 'Humber College Blvd & Hwy 27' },
  { id: 'westmore', name: 'Westmore', lat: 43.7369, lng: -79.5919, municipality: 'Etobicoke', streetAddress: 'Finch Ave W & Westmore Dr' },
  { id: 'albion', name: 'Stevenson (Albion)', lat: 43.74152, lng: -79.57544, municipality: 'Etobicoke', streetAddress: 'Finch Ave W & Kipling Ave' },
  { id: 'emery', name: 'Milvan Rumike (Emery)', lat: 43.75074, lng: -79.54262, municipality: 'North York', streetAddress: 'Finch Ave W & Weston Rd' },
  { id: 'jane-finch', name: 'Jane and Finch', lat: 43.75773, lng: -79.51771, municipality: 'North York', streetAddress: 'Finch Ave W & Jane St' },
  { id: 'sentinel', name: 'Sentinel', lat: 43.76160, lng: -79.50394, municipality: 'North York', streetAddress: 'Finch Ave W & Sentinel Rd' },

  // ==================== LAKESHORE WEST GO LINE (To Hamilton & Niagara Falls) ====================
  { id: 'exhibition', name: 'Exhibition GO', lat: 43.6358, lng: -79.4189, municipality: 'Toronto', streetAddress: 'Manitoba Dr & Atlantic Ave' },
  { id: 'mimico-go', name: 'Mimico GO', lat: 43.6164, lng: -79.4970, municipality: 'Etobicoke', streetAddress: 'Royal York Rd & Judson St' },
  { id: 'long-branch-go', name: 'Long Branch GO', lat: 43.5917, lng: -79.5453, municipality: 'Etobicoke', streetAddress: 'Lake Shore Blvd W & Browns Line' },
  { id: 'port-credit', name: 'Port Credit GO', lat: 43.5556, lng: -79.5872, municipality: 'Mississauga', streetAddress: 'Hurontario St & Queen St E' },
  { id: 'clarkson-go', name: 'Clarkson GO', lat: 43.5128, lng: -79.6339, municipality: 'Mississauga', streetAddress: 'Southdown Rd & Bromsgrove Rd' },
  { id: 'oakville-go', name: 'Oakville GO', lat: 43.4547, lng: -79.6825, municipality: 'Oakville', streetAddress: 'Cross Ave & Trafalgar Rd' },
  { id: 'bronte-go', name: 'Bronte GO', lat: 43.4161, lng: -79.7230, municipality: 'Oakville', streetAddress: 'Wyecroft Rd & Bronte Rd' },
  { id: 'appleby-go', name: 'Appleby GO', lat: 43.3792, lng: -79.7628, municipality: 'Burlington', streetAddress: 'Fairview St & Appleby Line' },
  { id: 'burlington-go', name: 'Burlington GO', lat: 43.3414, lng: -79.8092, municipality: 'Burlington', streetAddress: 'Fairview St & Brant St' },
  { id: 'aldershot-go', name: 'Aldershot GO', lat: 43.3128, lng: -79.8556, municipality: 'Burlington', streetAddress: 'Waterdown Rd & Plains Rd E' },
  { id: 'west-harbour-go', name: 'West Harbour GO (Hamilton)', lat: 43.2665, lng: -79.8663, municipality: 'Hamilton', streetAddress: 'James St N & Murray St W' },
  { id: 'hamilton-go', name: 'Hamilton GO Centre', lat: 43.2645, lng: -79.8550, municipality: 'Hamilton', streetAddress: '36 Hunter St E / James St N, Hamilton' },
  { id: 'confederation-go', name: 'Confederation GO (Stoney Creek)', lat: 43.2422, lng: -79.7606, municipality: 'Hamilton', streetAddress: 'Centennial Pkwy N & QEW' },
  { id: 'grimsby-go', name: 'Grimsby', lat: 43.1935, lng: -79.5610, municipality: 'Niagara', streetAddress: 'Casablanca Blvd & QEW' },
  { id: 'st-catharines-go', name: 'St. Catharines GO', lat: 43.1462, lng: -79.2564, municipality: 'Niagara', streetAddress: 'Great Western St, St. Catharines' },
  { id: 'niagara-falls-go', name: 'Niagara Falls GO', lat: 43.1088, lng: -79.0633, municipality: 'Niagara', streetAddress: '4267 Bridge St, Niagara Falls' },

  // ==================== LAKESHORE EAST GO LINE (To Pickering, Whitby & Oshawa) ====================
  { id: 'scarborough-go', name: 'Scarborough GO', lat: 43.7172, lng: -79.2547, municipality: 'Scarborough', streetAddress: 'St. Clair Ave E & Midland Ave' },
  { id: 'eglinton-go', name: 'Eglinton GO', lat: 43.7397, lng: -79.2320, municipality: 'Scarborough', streetAddress: 'Eglinton Ave E & Bellamy Rd' },
  { id: 'guildwood-go', name: 'Guildwood GO', lat: 43.7550, lng: -79.1978, municipality: 'Scarborough', streetAddress: 'Kingston Rd & Celeste Dr' },
  { id: 'rouge-hill-go', name: 'Rouge Hill GO', lat: 43.7803, lng: -79.1306, municipality: 'Scarborough', streetAddress: 'Lawrence Ave E & East Ave' },
  { id: 'pickering-go', name: 'Pickering GO', lat: 43.8314, lng: -79.0853, municipality: 'Durham-Oshawa', streetAddress: 'Bayly St & Liverpool Rd' },
  { id: 'ajax-go', name: 'Ajax GO', lat: 43.8481, lng: -79.0414, municipality: 'Durham-Oshawa', streetAddress: 'Westney Rd S & Hwy 401' },
  { id: 'whitby-go', name: 'Whitby GO', lat: 43.8647, lng: -78.9381, municipality: 'Durham-Oshawa', streetAddress: 'Victoria St W & Brock St S' },
  { id: 'oshawa-go', name: 'Durham College Oshawa GO', lat: 43.8706, lng: -78.8850, municipality: 'Durham-Oshawa', streetAddress: '915 Bloor St W, Oshawa' },
  { id: 'toronto-zoo', name: 'Toronto Zoo & Rouge Park', lat: 43.8177, lng: -79.1859, municipality: 'Scarborough', streetAddress: '2000 Meadowvale Rd' },

  // ==================== KITCHENER GO LINE (To Brampton, Guelph & Kitchener) ====================
  { id: 'weston-go', name: 'Weston GO & UP Express', lat: 43.7001, lng: -79.5142, municipality: 'Toronto', streetAddress: 'Lawrence Ave W & Weston Rd' },
  { id: 'etobicoke-north-go', name: 'Etobicoke North GO', lat: 43.7052, lng: -79.5633, municipality: 'Etobicoke', streetAddress: 'Kipling Ave & Belfield Rd' },
  { id: 'malton-go', name: 'Malton GO', lat: 43.7056, lng: -79.6392, municipality: 'Mississauga', streetAddress: 'Derry Rd E & Airport Rd' },
  { id: 'bramalea-go', name: 'Bramalea GO', lat: 43.7017, lng: -79.6908, municipality: 'Brampton', streetAddress: 'Steeles Ave E & Bramalea Rd' },
  { id: 'brampton-go', name: 'Brampton Innovation District GO', lat: 43.6868, lng: -79.7647, municipality: 'Brampton', streetAddress: 'Church St W & Main St N' },
  { id: 'mount-pleasant-go', name: 'Mount Pleasant GO (Brampton)', lat: 43.6753, lng: -79.8228, municipality: 'Brampton', streetAddress: 'Bovaird Dr W & Mississauga Rd' },
  { id: 'georgetown-go', name: 'Georgetown GO', lat: 43.6556, lng: -79.9189, municipality: 'Halton Hills', streetAddress: 'Queen St & Mountainview Rd N' },
  { id: 'acton-go', name: 'Acton GO', lat: 43.6336, lng: -80.0344, municipality: 'Halton Hills', streetAddress: 'Eastern Ave & Mill St E' },
  { id: 'guelph-go', name: 'Guelph Central GO', lat: 43.5444, lng: -80.2469, municipality: 'Guelph', streetAddress: '79 Carden St, Downtown Guelph' },
  { id: 'kitchener-go', name: 'Kitchener GO', lat: 43.4556, lng: -80.4931, municipality: 'Kitchener-Waterloo', streetAddress: '126 Weber St W, Kitchener' },

  // ==================== MILTON GO & MISSISSAUGA ====================
  { id: 'dixie-go', name: 'Dixie GO', lat: 43.6078, lng: -79.5778, municipality: 'Mississauga', streetAddress: 'Dixie Rd & Dundas St E' },
  { id: 'cooksville', name: 'Cooksville GO', lat: 43.5829, lng: -79.6238, municipality: 'Mississauga', streetAddress: 'Hurontario St & Hillcrest Ave' },
  { id: 'square-one', name: 'Mississauga City Centre (Square One)', lat: 43.5932, lng: -79.6425, municipality: 'Mississauga', streetAddress: 'Rathburn Rd W & Hurontario St' },
  { id: 'erindale-go', name: 'Erindale GO', lat: 43.5686, lng: -79.6692, municipality: 'Mississauga', streetAddress: 'Burnhamthorpe Rd W & Creditview Rd' },
  { id: 'streetsville-go', name: 'Streetsville GO', lat: 43.5761, lng: -79.7089, municipality: 'Mississauga', streetAddress: 'Thomas St & Queen St S' },
  { id: 'meadowvale-go', name: 'Meadowvale GO', lat: 43.5978, lng: -79.7539, municipality: 'Mississauga', streetAddress: 'Aquitaine Ave & Millcreek Dr' },
  { id: 'lisgar-go', name: 'Lisgar GO', lat: 43.5906, lng: -79.7883, municipality: 'Mississauga', streetAddress: 'Argentia Rd & Tenth Line W' },
  { id: 'milton-go', name: 'Milton GO', lat: 43.5236, lng: -79.8669, municipality: 'Milton', streetAddress: 'Main St E & Drew Centre, Milton' },

  // ==================== BARRIE GO LINE (To Vaughan, Aurora, Newmarket & Barrie) ====================
  { id: 'rutherford-go', name: 'Rutherford GO', lat: 43.8383, lng: -79.4983, municipality: 'Vaughan', streetAddress: 'Rutherford Rd & Westburn Dr' },
  { id: 'maple-go', name: 'Maple GO', lat: 43.8594, lng: -79.5069, municipality: 'Vaughan', streetAddress: 'Major Mackenzie Dr & Eagle Rock Way' },
  { id: 'king-city-go', name: 'King City GO', lat: 43.9200, lng: -79.5269, municipality: 'York Region', streetAddress: 'Station Rd & Keele St' },
  { id: 'aurora-go', name: 'Aurora GO', lat: 44.0008, lng: -79.4597, municipality: 'York Region', streetAddress: 'Wellington St E, Aurora' },
  { id: 'newmarket-go', name: 'Newmarket GO', lat: 44.0608, lng: -79.4600, municipality: 'York Region', streetAddress: 'Davis Dr, Newmarket' },
  { id: 'barrie-south-go', name: 'Barrie South GO', lat: 44.3333, lng: -79.6275, municipality: 'Barrie', streetAddress: 'Yonge St & Mapleview Dr E, Barrie' },
  { id: 'allandale-barrie-go', name: 'Allandale Waterfront GO (Barrie)', lat: 44.3739, lng: -79.6872, municipality: 'Barrie', streetAddress: 'Essa Rd & Tiffin St, Barrie' },

  // ==================== STOUFFVILLE & RICHMOND HILL GO LINES (Markham & Stouffville) ====================
  { id: 'milliken-go', name: 'Milliken GO', lat: 43.8233, lng: -79.3017, municipality: 'Markham', streetAddress: 'Steeles Ave E & Kennedy Rd' },
  { id: 'unionville-go', name: 'Unionville GO (Markham Centre)', lat: 43.8517, lng: -79.3142, municipality: 'Markham', streetAddress: 'YMCA Blvd & Kennedy Rd' },
  { id: 'centennial-go', name: 'Centennial GO', lat: 43.8736, lng: -79.2892, municipality: 'Markham', streetAddress: 'Bullock Dr & McCowan Rd' },
  { id: 'markham-go', name: 'Markham GO', lat: 43.8825, lng: -79.2628, municipality: 'Markham', streetAddress: 'Main St Markham N' },
  { id: 'mount-joy-go', name: 'Mount Joy GO', lat: 43.9006, lng: -79.2633, municipality: 'Markham', streetAddress: 'Bur Oak Ave & Markham Rd' },
  { id: 'stouffville-go', name: 'Whitchurch–Stouffville GO', lat: 43.9711, lng: -79.2500, municipality: 'York Region', streetAddress: 'Main St, Stouffville' },
  { id: 'old-cummer-go', name: 'Old Cummer GO', lat: 43.7925, lng: -79.3714, municipality: 'North York', streetAddress: 'Finch Ave E & Leslie St' },
  { id: 'richmond-hill-go', name: 'Richmond Hill GO', lat: 43.8747, lng: -79.4264, municipality: 'Richmond Hill', streetAddress: 'Major Mackenzie Dr E & Newkirk Rd' },
  { id: 'gormley-go', name: 'Gormley GO', lat: 43.9417, lng: -79.3944, municipality: 'Richmond Hill', streetAddress: 'Stouffville Rd & Hwy 404' },
  { id: 'bloomington-go', name: 'Bloomington GO', lat: 43.9719, lng: -79.4036, municipality: 'York Region', streetAddress: 'Bloomington Rd & Hwy 404' },
];

/**
 * High-precision intermediate Google Maps railway/subway curve waypoints between consecutive stations.
 * This ensures every neon polyline hugs the exact physical track drawn by Google Maps TransitLayer
 * instead of cutting straight chords across blocks or water.
 */
const SEGMENT_TRACK_WAYPOINTS: Record<string, [number, number][]> = {
  // ---- Line 1 Yonge–University Subway curves ----
  'vmc->hwy407': [[43.7885, -79.5255]],
  'hwy407->pioneer-village': [[43.7795, -79.5180]],
  'york-university->finch-west': [[43.7702, -79.4945]],
  'finch-west->downsview-park': [[43.7580, -79.4855]],
  'downsview-park->sheppard-west': [[43.7518, -79.4705]],
  'sheppard-west->wilson': [
    [43.7445, -79.4545],
    [43.7395, -79.4515],
  ],
  'cedarvale->st-clair-west': [
    [43.6922, -79.4332],
    [43.6882, -79.4242],
  ],
  'st-clair-west->dupont': [
    [43.6815, -79.4105],
    [43.6788, -79.4085],
  ],
  'spadina->st-george': [[43.6677, -79.4020]],
  'st-george->museum': [[43.6679, -79.3955]],
  'museum->queens-park': [[43.6635, -79.3920]],
  'st-andrew->union': [[43.6451, -79.3836]],
  'union->king': [[43.6460, -79.3774]],
  'bloor-yonge->rosedale': [[43.6745, -79.3872]],

  // ---- Line 2 Bloor–Danforth Subway curves ----
  'kipling->islington': [[43.6410, -79.5305]],
  'castle-frank->broadview': [[43.6755, -79.3625]],
  'victoria-park->warden': [
    [43.7015, -79.2850],
    [43.7065, -79.2825],
  ],
  'warden->kennedy': [
    [43.7195, -79.2725],
    [43.7265, -79.2665],
  ],

  // ---- Line 6 Finch West LRT curve ----
  'humber-college->westmore': [[43.7335, -79.5965]],

  // ---- Shared Union Station West Rail Corridor (Kitchener, UP Express, Milton, Barrie) ----
  'union->dundas-west': [
    [43.6435, -79.3895],
    [43.6412, -79.3985],
    [43.6395, -79.4085],
    [43.6392, -79.4165],
    [43.6388, -79.4265],
    [43.6408, -79.4335],
    [43.6455, -79.4405],
    [43.6512, -79.4458],
  ],
  'dundas-west->mount-dennis': [
    [43.6650, -79.4692],
    [43.6765, -79.4805],
  ],
  'mount-dennis->weston-go': [[43.6940, -79.5025]],

  // ---- UP Express Weston -> Hwy 427 Spur -> Pearson Terminal 1 ----
  'weston-go->pearson-airport': [
    [43.7042, -79.5310],
    [43.7050, -79.5460],
    [43.7052, -79.5633],
    [43.7055, -79.5915],
    [43.7050, -79.6055],
    [43.6990, -79.6155],
    [43.6915, -79.6195],
    [43.6860, -79.6170],
  ],

  // ---- Kitchener GO Line (Weston -> Malton -> Brampton -> Guelph -> Kitchener) ----
  'weston-go->etobicoke-north-go': [
    [43.7042, -79.5310],
    [43.7050, -79.5460],
  ],
  'etobicoke-north-go->malton-go': [
    [43.7055, -79.5915],
    [43.7055, -79.6150],
  ],
  'malton-go->bramalea-go': [[43.7042, -79.6650]],
  'bramalea-go->brampton-go': [
    [43.6960, -79.7250],
    [43.6905, -79.7480],
  ],
  'brampton-go->mount-pleasant-go': [[43.6810, -79.7950]],
  'mount-pleasant-go->georgetown-go': [
    [43.6680, -79.8550],
    [43.6600, -79.8920],
  ],
  'georgetown-go->acton-go': [
    [43.6535, -79.9380],
    [43.6385, -79.9880],
  ],
  'acton-go->guelph-go': [
    [43.6225, -80.0880],
    [43.6145, -80.1380],
    [43.5850, -80.1880],
  ],
  'guelph-go->kitchener-go': [
    [43.5410, -80.2780],
    [43.5350, -80.3150],
    [43.5220, -80.3680],
    [43.5040, -80.4180],
    [43.4750, -80.4620],
  ],

  // ---- Milton GO Line (CP Galt Subdivision via West Toronto Junction & Lambton) ----
  'dundas-west->kipling': [
    [43.6615, -79.4605],
    [43.6665, -79.4685],
    [43.6675, -79.4840],
    [43.6655, -79.4985],
    [43.6615, -79.5065],
    [43.6515, -79.5185],
    [43.6453, -79.5244],
  ],
  'kipling->dixie-go': [[43.6225, -79.5565]],
  'dixie-go->cooksville': [[43.5955, -79.6005]],
  'cooksville->erindale-go': [[43.5750, -79.6460]],
  'erindale-go->streetsville-go': [[43.5715, -79.6890]],
  'streetsville-go->meadowvale-go': [[43.5870, -79.7310]],
  'meadowvale-go->lisgar-go': [[43.5950, -79.7710]],
  'lisgar-go->milton-go': [
    [43.5750, -79.8110],
    [43.5520, -79.8390],
    [43.5320, -79.8580],
  ],

  // ---- Barrie GO Line (CN Newmarket Subdivision) ----
  'union->caledonia': [
    [43.6435, -79.3895],
    [43.6412, -79.3985],
    [43.6395, -79.4085],
    [43.6392, -79.4165],
    [43.6388, -79.4265],
    [43.6408, -79.4335],
    [43.6455, -79.4405],
    [43.6585, -79.4440],
    [43.6695, -79.4468],
    [43.6730, -79.4575],
    [43.6785, -79.4612],
  ],
  'caledonia->downsview-park': [
    [43.7085, -79.4695],
    [43.7255, -79.4730],
    [43.7410, -79.4760],
  ],
  'downsview-park->rutherford-go': [
    [43.7745, -79.4835],
    [43.7980, -79.4890],
    [43.8180, -79.4935],
  ],
  'king-city-go->aurora-go': [
    [43.9550, -79.5050],
    [43.9780, -79.4780],
  ],
  'newmarket-go->barrie-south-go': [
    [44.0775, -79.4555],
    [44.1010, -79.4920],
    [44.1165, -79.5560],
    [44.1550, -79.5460],
    [44.2150, -79.5650],
    [44.2750, -79.6050],
  ],
  'barrie-south-go->allandale-barrie-go': [[44.3550, -79.6550]],

  // ---- Lakeshore West GO Line (Oakville & Grimsby Subdivisions to Hamilton & Niagara Falls) ----
  'union->exhibition': [
    [43.6435, -79.3895],
    [43.6412, -79.3985],
    [43.6392, -79.4090],
    [43.6372, -79.4145],
  ],
  'exhibition->mimico-go': [
    [43.6345, -79.4235],
    [43.6338, -79.4285],
    [43.6358, -79.4365],
    [43.6382, -79.4468],
    [43.6385, -79.4565],
    [43.6378, -79.4655],
    [43.6348, -79.4718],
    [43.6315, -79.4768],
    [43.6242, -79.4858],
    [43.6198, -79.4920],
  ],
  'mimico-go->long-branch-go': [
    [43.6095, -79.5105],
    [43.6005, -79.5280],
  ],
  'long-branch-go->port-credit': [
    [43.5810, -79.5585],
    [43.5680, -79.5730],
  ],
  'port-credit->clarkson-go': [
    [43.5415, -79.6025],
    [43.5265, -79.6190],
  ],
  'clarkson-go->oakville-go': [
    [43.4950, -79.6490],
    [43.4740, -79.6660],
  ],
  'oakville-go->bronte-go': [[43.4355, -79.7025]],
  'bronte-go->appleby-go': [[43.3975, -79.7430]],
  'appleby-go->burlington-go': [[43.3605, -79.7860]],
  'burlington-go->aldershot-go': [[43.3270, -79.8325]],
  'aldershot-go->west-harbour-go': [
    [43.3005, -79.8710],
    [43.2885, -79.8835],
    [43.2755, -79.8815],
    [43.2682, -79.8745],
  ],
  'west-harbour-go->hamilton-go': [[43.2655, -79.8610]],
  'hamilton-go->confederation-go': [
    [43.2615, -79.8350],
    [43.2555, -79.8120],
    [43.2485, -79.7840],
  ],
  'confederation-go->grimsby-go': [
    [43.2280, -79.7150],
    [43.2145, -79.6650],
    [43.2045, -79.6120],
  ],
  'grimsby-go->st-catharines-go': [
    [43.1815, -79.4760],
    [43.1755, -79.4150],
    [43.1725, -79.3580],
    [43.1615, -79.3020],
  ],
  'st-catharines-go->niagara-falls-go': [
    [43.1335, -79.2110],
    [43.1185, -79.1550],
    [43.1125, -79.1050],
  ],

  // ---- Lakeshore East & Stouffville Shared Kingston Subdivision (Union -> Danforth -> Scarborough) ----
  'union->main-street': [
    [43.6468, -79.3715],
    [43.6495, -79.3605],
    [43.6530, -79.3525],
    [43.6585, -79.3425],
    [43.6625, -79.3385],
    [43.6710, -79.3270],
    [43.6795, -79.3130],
    [43.6865, -79.3005],
  ],
  'main-street->scarborough-go': [
    [43.6865, -79.3005],
    [43.6920, -79.2885],
    [43.7005, -79.2745],
    [43.7115, -79.2590],
  ],
  'scarborough-go->eglinton-go': [[43.7285, -79.2435]],
  'eglinton-go->guildwood-go': [[43.7475, -79.2150]],
  'guildwood-go->rouge-hill-go': [
    [43.7640, -79.1720],
    [43.7705, -79.1490],
  ],
  'rouge-hill-go->pickering-go': [
    [43.7980, -79.1150],
    [43.8160, -79.0990],
  ],
  'pickering-go->ajax-go': [[43.8400, -79.0630]],
  'ajax-go->whitby-go': [[43.8560, -78.9900]],
  'whitby-go->oshawa-go': [[43.8680, -78.9110]],

  // ---- Stouffville GO Line (Uxbridge Subdivision north to Markham & Stouffville) ----
  'scarborough-go->kennedy': [[43.7225, -79.2585]],
  'kennedy->agincourt': [
    [43.7504, -79.2704],
    [43.7680, -79.2775],
  ],
  'agincourt->milliken-go': [[43.8045, -79.2930]],
  'milliken-go->unionville-go': [[43.8380, -79.3080]],
  'unionville-go->centennial-go': [
    [43.8555, -79.3020],
    [43.8635, -79.2945],
  ],
  'centennial-go->markham-go': [[43.8780, -79.2750]],
  'mount-joy-go->stouffville-go': [[43.9350, -79.2570]],

  // ---- Richmond Hill GO Line (CN Bala Subdivision through Don River Valley) ----
  'union->leslie': [
    [43.6468, -79.3715],
    [43.6495, -79.3605],
    [43.6515, -79.3545],
    [43.6590, -79.3545],
    [43.6675, -79.3565],
    [43.6765, -79.3595],
    [43.6865, -79.3665],
    [43.6935, -79.3685],
    [43.7005, -79.3635],
    [43.7045, -79.3545],
    [43.7085, -79.3455],
    [43.7145, -79.3420],
    [43.7235, -79.3425],
    [43.7335, -79.3445],
    [43.7425, -79.3495],
    [43.7515, -79.3560],
    [43.7615, -79.3615],
  ],
  'leslie->old-cummer-go': [[43.7820, -79.3685]],
  'old-cummer-go->richmond-hill-centre': [
    [43.8055, -79.3825],
    [43.8185, -79.3985],
    [43.8300, -79.4125],
  ],
  'richmond-hill-centre->richmond-hill-go': [[43.8565, -79.4250]],
  'richmond-hill-go->gormley-go': [
    [43.8950, -79.4180],
    [43.9180, -79.4050],
  ],
  'gormley-go->bloomington-go': [[43.9565, -79.3990]],

  // ---- Highway 407 Express Bus Corridor (Follows Hwy 410 / 403 / 407 / 401 curves) ----
  'brampton-go->square-one': [
    [43.6650, -79.7320],
    [43.6320, -79.6850],
  ],
  'square-one->pearson-airport': [
    [43.6210, -79.6250],
    [43.6520, -79.6050],
  ],
  'pearson-airport->hwy407': [
    [43.7150, -79.6020],
    [43.7580, -79.5680],
  ],
  'vmc->richmond-hill-centre': [
    [43.8120, -79.4850],
    [43.8290, -79.4480],
  ],
  'richmond-hill-centre->unionville-go': [
    [43.8440, -79.3750],
    [43.8490, -79.3380],
  ],
  'unionville-go->agincourt': [[43.8180, -79.2980]],
  'agincourt->scarborough-centre': [[43.7795, -79.2680]],
  'scarborough-centre->toronto-zoo': [[43.7950, -79.2180]],
  'toronto-zoo->pickering-go': [[43.8240, -79.1350]],
};

export const TRANSIT_LINES: TransitLine[] = [
  {
    id: 'line-1',
    code: '1',
    name: 'Line 1 Yonge–University Subway',
    shortName: 'Line 1 Yonge–University',
    mode: 'subway',
    color: '#FFD600',
    glowColor: 'rgba(255, 214, 0, 0.78)',
    coreColor: '#FFF9C4',
    frequencyPeak: '2–3 min',
    dailyRidership: '845,000',
    status: 'Operational',
    description:
      'Toronto’s primary U-shaped subway spine connecting Vaughan Metropolitan Centre through Spadina, University Ave, and Union Station north along Yonge Street to Finch.',
    emergenceAnchorId: 'union',
    stationIds: [
      'vmc',
      'hwy407',
      'pioneer-village',
      'york-university',
      'finch-west',
      'downsview-park',
      'sheppard-west',
      'wilson',
      'yorkdale',
      'lawrence-west',
      'glencairn',
      'cedarvale',
      'st-clair-west',
      'dupont',
      'spadina',
      'st-george',
      'museum',
      'queens-park',
      'st-patrick',
      'osgoode',
      'st-andrew',
      'union',
      'king',
      'queen',
      'dundas',
      'college',
      'wellesley',
      'bloor-yonge',
      'rosedale',
      'summerhill',
      'st-clair',
      'davisville',
      'eglinton',
      'lawrence',
      'york-mills',
      'sheppard-yonge',
      'north-york-centre',
      'finch',
    ],
  },
  {
    id: 'line-2',
    code: '2',
    name: 'Line 2 Bloor–Danforth Subway',
    shortName: 'Line 2 Bloor–Danforth',
    mode: 'subway',
    color: '#00E676',
    glowColor: 'rgba(0, 230, 118, 0.78)',
    coreColor: '#DCFCE7',
    frequencyPeak: '2–3 min',
    dailyRidership: '580,000',
    status: 'Operational',
    description:
      'Toronto’s east–west heavy rail arterial running along Bloor Street and Danforth Avenue from Kipling in Etobicoke through St. George and Bloor–Yonge to Kennedy.',
    emergenceAnchorId: 'bloor-yonge',
    stationIds: [
      'kipling',
      'islington',
      'royal-york',
      'old-mill',
      'jane',
      'runnymede',
      'high-park',
      'keele',
      'dundas-west',
      'lansdowne',
      'dufferin',
      'ossington',
      'christie',
      'bathurst',
      'spadina',
      'st-george',
      'bay',
      'bloor-yonge',
      'sherbourne',
      'castle-frank',
      'broadview',
      'chester',
      'pape',
      'donlands',
      'greenwood',
      'coxwell',
      'woodbine',
      'main-street',
      'victoria-park',
      'warden',
      'kennedy',
    ],
  },
  {
    id: 'line-4',
    code: '4',
    name: 'Line 4 Sheppard Subway',
    shortName: 'Line 4 Sheppard',
    mode: 'subway',
    color: '#D500F9',
    glowColor: 'rgba(213, 0, 249, 0.78)',
    coreColor: '#F3E8FF',
    frequencyPeak: '4 min',
    dailyRidership: '185,000',
    status: 'Operational',
    description:
      'North York rapid transit corridor running along Sheppard Avenue East from Sheppard–Yonge through Bayview, Bessarion, and Leslie to Don Mills.',
    emergenceAnchorId: 'sheppard-yonge',
    stationIds: ['sheppard-yonge', 'bayview', 'bessarion', 'leslie', 'don-mills'],
  },
  {
    id: 'line-5',
    code: '5',
    name: 'Line 5 Eglinton Crosstown LRT',
    shortName: 'Line 5 Eglinton LRT',
    mode: 'lrt',
    color: '#FF6D00',
    glowColor: 'rgba(255, 109, 0, 0.78)',
    coreColor: '#FFE0B2',
    frequencyPeak: '3–4 min',
    dailyRidership: '310,000',
    status: 'Master Plan Expansion',
    description:
      'Midtown rapid light rail spanning Eglinton Avenue from Mount Dennis through Caledonia, Cedarvale, Eglinton–Yonge, Don Valley Science Centre, and Kennedy.',
    emergenceAnchorId: 'eglinton',
    stationIds: [
      'mount-dennis',
      'keelesdale',
      'caledonia',
      'fairbank',
      'cedarvale',
      'forest-hill',
      'chaplin',
      'eglinton',
      'mount-pleasant',
      'leaside',
      'laird',
      'science-centre',
      'wynford',
      'golden-mile',
      'birchmount-eglinton',
      'kennedy',
    ],
  },
  {
    id: 'line-6',
    code: '6',
    name: 'Line 6 Finch West LRT',
    shortName: 'Line 6 Finch West',
    mode: 'lrt',
    color: '#CBD5E1',
    glowColor: 'rgba(203, 213, 225, 0.75)',
    coreColor: '#F8FAFC',
    frequencyPeak: '4 min',
    dailyRidership: '140,000',
    status: 'Master Plan Expansion',
    description:
      'Northwest light rail corridor along Finch Avenue West linking Humber College, Albion, Emery, Jane & Finch, Sentinel, and Finch West Subway Station.',
    emergenceAnchorId: 'finch-west',
    stationIds: [
      'humber-college',
      'westmore',
      'albion',
      'emery',
      'jane-finch',
      'sentinel',
      'finch-west',
    ],
  },
  {
    id: 'line-10',
    code: 'UP',
    name: 'UP Express (Union Pearson Airport Rail)',
    shortName: 'UP Express (Airport)',
    mode: 'subway',
    color: '#38BDF8',
    glowColor: 'rgba(56, 189, 248, 0.78)',
    coreColor: '#E0F2FE',
    frequencyPeak: '15 min',
    dailyRidership: '210,000',
    status: 'Operational',
    description:
      'Dedicated airport rail link from Union Station along the Weston rail corridor via Bloor GO, Mount Dennis, and Weston directly into Pearson International Airport (YYZ).',
    emergenceAnchorId: 'union',
    stationIds: ['union', 'dundas-west', 'mount-dennis', 'weston-go', 'pearson-airport'],
  },
  {
    id: 'go-lakeshore-west',
    code: 'LW',
    name: 'Lakeshore West Line (Hamilton & Niagara Falls)',
    shortName: 'LW Lakeshore West (Niagara)',
    mode: 'subway',
    color: '#FF1744',
    glowColor: 'rgba(255, 23, 68, 0.80)',
    coreColor: '#FFE4E6',
    frequencyPeak: '15 min',
    dailyRidership: '295,000',
    status: 'Operational',
    description:
      'High-frequency regional rail line from Union Station along Lake Ontario through Mimico, Port Credit, Oakville, and Burlington to Hamilton GO, St. Catharines, and Niagara Falls.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'exhibition',
      'mimico-go',
      'long-branch-go',
      'port-credit',
      'clarkson-go',
      'oakville-go',
      'bronte-go',
      'appleby-go',
      'burlington-go',
      'aldershot-go',
      'west-harbour-go',
      'hamilton-go',
      'confederation-go',
      'grimsby-go',
      'st-catharines-go',
      'niagara-falls-go',
    ],
  },
  {
    id: 'go-lakeshore-east',
    code: 'LE',
    name: 'Lakeshore East Line (Pickering, Whitby & Oshawa)',
    shortName: 'LE Lakeshore East (Oshawa)',
    mode: 'subway',
    color: '#FF5252',
    glowColor: 'rgba(255, 82, 82, 0.78)',
    coreColor: '#FEE2E2',
    frequencyPeak: '15 min',
    dailyRidership: '235,000',
    status: 'Operational',
    description:
      'Eastern lakeshore rail corridor linking Union Station, Danforth, Scarborough, Eglinton, Guildwood, and Rouge Hill to Pickering, Ajax, Whitby, and Oshawa GO.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'main-street',
      'scarborough-go',
      'eglinton-go',
      'guildwood-go',
      'rouge-hill-go',
      'pickering-go',
      'ajax-go',
      'whitby-go',
      'oshawa-go',
    ],
  },
  {
    id: 'go-kitchener',
    code: 'KI',
    name: 'Kitchener Line (Brampton, Guelph & Kitchener)',
    shortName: 'KI Kitchener–Guelph Line',
    mode: 'subway',
    color: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.78)',
    coreColor: '#D1FAE5',
    frequencyPeak: '15–30 min',
    dailyRidership: '190,000',
    status: 'Operational',
    description:
      'Western innovation rail corridor from Union Station through Bloor GO, Weston, Malton, Bramalea, Downtown Brampton, Georgetown, and Acton to Guelph Central and Kitchener GO.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'dundas-west',
      'mount-dennis',
      'weston-go',
      'etobicoke-north-go',
      'malton-go',
      'bramalea-go',
      'brampton-go',
      'mount-pleasant-go',
      'georgetown-go',
      'acton-go',
      'guelph-go',
      'kitchener-go',
    ],
  },
  {
    id: 'go-milton',
    code: 'MI',
    name: 'Milton Line (Mississauga & Milton)',
    shortName: 'MI Milton Line',
    mode: 'subway',
    color: '#F59E0B',
    glowColor: 'rgba(245, 158, 11, 0.76)',
    coreColor: '#FEF3C7',
    frequencyPeak: '15–30 min',
    dailyRidership: '145,000',
    status: 'Operational',
    description:
      'Connects Union Station along the CP Galt Subdivision through Bloor GO, Kipling, Dixie, Cooksville, Erindale, Streetsville, Meadowvale, and Lisgar directly to Milton GO.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'dundas-west',
      'kipling',
      'dixie-go',
      'cooksville',
      'erindale-go',
      'streetsville-go',
      'meadowvale-go',
      'lisgar-go',
      'milton-go',
    ],
  },
  {
    id: 'go-barrie',
    code: 'BR',
    name: 'Barrie Line (Vaughan, Aurora, Newmarket & Barrie)',
    shortName: 'BR Barrie Line',
    mode: 'subway',
    color: '#3B82F6',
    glowColor: 'rgba(59, 130, 246, 0.78)',
    coreColor: '#DBEAFE',
    frequencyPeak: '15–30 min',
    dailyRidership: '160,000',
    status: 'Operational',
    description:
      'Northern rail corridor linking Union Station, Caledonia, and Downsview Park through Vaughan (Rutherford, Maple), King City, Aurora, and Newmarket to Barrie Allandale Waterfront.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'caledonia',
      'downsview-park',
      'rutherford-go',
      'maple-go',
      'king-city-go',
      'aurora-go',
      'newmarket-go',
      'barrie-south-go',
      'allandale-barrie-go',
    ],
  },
  {
    id: 'go-stouffville',
    code: 'ST',
    name: 'Stouffville Line (Scarborough, Markham & Stouffville)',
    shortName: 'ST Stouffville–Markham',
    mode: 'subway',
    color: '#A855F7',
    glowColor: 'rgba(168, 85, 247, 0.78)',
    coreColor: '#F3E8FF',
    frequencyPeak: '15–30 min',
    dailyRidership: '135,000',
    status: 'Operational',
    description:
      'Connects Union Station, Danforth, Scarborough, and Kennedy north through Agincourt, Milliken, Unionville (Markham Centre), Markham, and Mount Joy to Whitchurch–Stouffville.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'main-street',
      'scarborough-go',
      'kennedy',
      'agincourt',
      'milliken-go',
      'unionville-go',
      'centennial-go',
      'markham-go',
      'mount-joy-go',
      'stouffville-go',
    ],
  },
  {
    id: 'go-richmond-hill',
    code: 'RH',
    name: 'Richmond Hill Line (North York & Richmond Hill)',
    shortName: 'RH Richmond Hill Line',
    mode: 'subway',
    color: '#14B8A6',
    glowColor: 'rgba(20, 184, 166, 0.78)',
    coreColor: '#CCFBF1',
    frequencyPeak: '30 min',
    dailyRidership: '95,000',
    status: 'Operational',
    description:
      'Don Valley rail corridor connecting Union Station north through Oriole (Leslie), Old Cummer, Langstaff (Richmond Hill Centre), Richmond Hill, Gormley, and Bloomington.',
    emergenceAnchorId: 'union',
    stationIds: [
      'union',
      'leslie',
      'old-cummer-go',
      'richmond-hill-centre',
      'richmond-hill-go',
      'gormley-go',
      'bloomington-go',
    ],
  },
  {
    id: 'bus-407',
    code: '407',
    name: 'Highway 407 & GTA Orbital Express Bus',
    shortName: '407 Express Bus',
    mode: 'bus',
    color: '#A3E635',
    glowColor: 'rgba(163, 230, 53, 0.70)',
    coreColor: '#ECFCCB',
    frequencyPeak: '10 min',
    dailyRidership: '110,000',
    status: 'Master Plan Expansion',
    description:
      'High-speed orbital express busway linking Brampton, Square One Mississauga, Pearson Airport, Highway 407 Station, Vaughan MC, Richmond Hill Centre, Unionville Markham, Scarborough Centre, Toronto Zoo, and Oshawa.',
    emergenceAnchorId: 'hwy407',
    stationIds: [
      'brampton-go',
      'square-one',
      'pearson-airport',
      'hwy407',
      'vmc',
      'richmond-hill-centre',
      'unionville-go',
      'agincourt',
      'scarborough-centre',
      'toronto-zoo',
      'pickering-go',
      'oshawa-go',
    ],
  },
];

// Build complete station map with line memberships and interchange flags, snapped 100% onto Google Maps transit tracks
export const STATIONS_BY_ID: Record<string, StationNode> = {};

for (const raw of RAW_STATIONS) {
  const snapped = GOOGLE_MAPS_SNAPPED_STATIONS[raw.id];
  const lat = snapped ? snapped[0] : raw.lat;
  const lng = snapped ? snapped[1] : raw.lng;
  const { x, y } = latLngToCanvasPoint(lat, lng);
  STATIONS_BY_ID[raw.id] = {
    ...raw,
    lat,
    lng,
    x,
    y,
    lines: [],
    isInterchange: false,
    accessibility: true,
  };
}

for (const line of TRANSIT_LINES) {
  for (const stId of line.stationIds) {
    const st = STATIONS_BY_ID[stId];
    if (st && !st.lines.includes(line.id)) {
      st.lines.push(line.id);
    }
  }
}

for (const st of Object.values(STATIONS_BY_ID)) {
  st.isInterchange = st.lines.length > 1;
}

export const ALL_STATIONS: StationNode[] = Object.values(STATIONS_BY_ID).filter(
  (st) => st.lines.length > 0
);

/**
 * Returns the intermediate (lat, lng) curve waypoints between two adjacent stations.
 * Uses the 100% exact Google Maps transit step polylines first, with fallback to SEGMENT_TRACK_WAYPOINTS.
 */
export function getIntermediateTrackWaypoints(
  fromId: string,
  toId: string
): [number, number][] {
  const forwardKey = `${fromId}->${toId}`;
  if (GOOGLE_MAPS_SEGMENT_WAYPOINTS[forwardKey]?.length) {
    return GOOGLE_MAPS_SEGMENT_WAYPOINTS[forwardKey];
  }
  const reverseKey = `${toId}->${fromId}`;
  if (GOOGLE_MAPS_SEGMENT_WAYPOINTS[reverseKey]?.length) {
    return [...GOOGLE_MAPS_SEGMENT_WAYPOINTS[reverseKey]].reverse();
  }
  if (SEGMENT_TRACK_WAYPOINTS[forwardKey]?.length) {
    return SEGMENT_TRACK_WAYPOINTS[forwardKey];
  }
  if (SEGMENT_TRACK_WAYPOINTS[reverseKey]?.length) {
    return [...SEGMENT_TRACK_WAYPOINTS[reverseKey]].reverse();
  }
  return [];
}

/**
 * Parallel corridor lane offset configuration (in canvas units, ~95m per 1.0 unit)
 * for segments where multiple lines share the same railway or transit corridor.
 * Offsets are defined along each line's canonical stationIds direction using
 * the right-hand normal vector (-ty, tx).
 */
const PARALLEL_SEGMENT_OFFSETS_BY_LINE: Record<string, Record<string, number>> = {
  // UP Express (Sky Blue): North-East parallel track along the entire Union -> Weston -> Pearson Spur corridor
  'line-10': {
    'union->dundas-west': 1.25,
    'dundas-west->mount-dennis': 1.25,
    'mount-dennis->weston-go': 1.25,
    'weston-go->pearson-airport': 1.25,
  },
  // Kitchener GO Line (Emerald Green): South-West parallel track beside UP Express along Union -> Weston -> Malton
  'go-kitchener': {
    'union->dundas-west': -1.25,
    'dundas-west->mount-dennis': -1.25,
    'mount-dennis->weston-go': -1.25,
    'weston-go->etobicoke-north-go': -1.25,
    'etobicoke-north-go->malton-go': -1.25,
  },
  // Milton GO Line (Amber): Parallel south-west of Kitchener on Union -> Dundas West, and parallel north of Line 2 approaching Kipling
  'go-milton': {
    'union->dundas-west': -2.5,
    'dundas-west->kipling': 1.0,
  },
  // Barrie GO Line (Royal Blue): Parallel north-east of UP Express on the shared Union West exit
  'go-barrie': {
    'union->caledonia': 2.5,
  },
  // Lakeshore West GO Line (Crimson Red): Southernmost parallel track exiting Union West toward Exhibition
  'go-lakeshore-west': {
    'union->exhibition': -3.4,
  },
  // Lakeshore East GO Line (Coral Red): South/Lake parallel track along shared Kingston corridor (Union -> Main St -> Scarborough)
  'go-lakeshore-east': {
    'union->main-street': 1.25,
    'main-street->scarborough-go': 1.25,
  },
  // Stouffville GO Line (Purple): North/Inland parallel track beside Lakeshore East (Union -> Main St -> Scarborough -> Kennedy)
  'go-stouffville': {
    'union->main-street': -1.25,
    'main-street->scarborough-go': -1.25,
    'scarborough-go->kennedy': 0.9,
  },
  // Richmond Hill GO Line (Teal): Northernmost parallel track exiting Union East toward the Don Valley
  'go-richmond-hill': {
    'union->leslie': -2.4,
  },
  // Line 1 & Line 2 parallel along Downtown Bloor corridor (Spadina <-> St. George)
  'line-1': {
    'vmc->hwy407': -0.7,
    'dupont->spadina': -0.45,
    'spadina->st-george': -0.9,
    'st-george->museum': -0.45,
  },
  'line-2': {
    'bathurst->spadina': 0.45,
    'spadina->st-george': 0.9,
    'st-george->bay': 0.45,
  },
  // Highway 407 Express Bus: Parallel offset where it shares station pairs with rail/subway
  'bus-407': {
    'hwy407->vmc': -1.2,
    'unionville-go->agincourt': -1.2,
    'pickering-go->oshawa-go': -1.3,
  },
};

function getSegmentParallelOffset(
  lineId: string | undefined,
  fromId: string,
  toId: string
): number {
  if (!lineId) return 0;
  const lineMap = PARALLEL_SEGMENT_OFFSETS_BY_LINE[lineId];
  if (!lineMap) return 0;
  const forwardKey = `${fromId}->${toId}`;
  if (lineMap[forwardKey] !== undefined) {
    return lineMap[forwardKey];
  }
  const reverseKey = `${toId}->${fromId}`;
  if (lineMap[reverseKey] !== undefined) {
    return -lineMap[reverseKey];
  }
  return 0;
}

interface CanonicalLineTrackData {
  canvasPoints: [number, number][];
  stationVertexIndices: Record<string, number>;
}

const CANONICAL_LINE_TRACK_CACHE: Record<string, CanonicalLineTrackData> = {};

function buildCanonicalLineTrack(line: TransitLine): CanonicalLineTrackData {
  const stations = line.stationIds
    .map((id) => STATIONS_BY_ID[id])
    .filter((s): s is StationNode => Boolean(s));

  if (stations.length === 0) {
    return { canvasPoints: [], stationVertexIndices: {} };
  }
  if (stations.length === 1) {
    return {
      canvasPoints: [[stations[0].x, stations[0].y]],
      stationVertexIndices: { [stations[0].id]: 0 },
    };
  }

  const rawPoints: [number, number][] = [];
  const rawOffsets: number[] = [];
  const stationVertexIndices: Record<string, number> = {};

  const pushVertex = (pt: [number, number], offset: number, stationId?: string) => {
    if (rawPoints.length > 0) {
      const prev = rawPoints[rawPoints.length - 1];
      const minSpacing = stationId
        ? 0.02
        : Math.max(0.25, Math.abs(offset) * 0.55);
      if (Math.hypot(pt[0] - prev[0], pt[1] - prev[1]) < minSpacing) {
        if (stationId) {
          rawPoints[rawPoints.length - 1] = pt;
          rawOffsets[rawOffsets.length - 1] = offset;
          stationVertexIndices[stationId] = rawPoints.length - 1;
        }
        return;
      }
    }
    rawPoints.push(pt);
    rawOffsets.push(offset);
    if (stationId) {
      stationVertexIndices[stationId] = rawPoints.length - 1;
    }
  };

  const firstSegOffset = getSegmentParallelOffset(
    line.id,
    stations[0].id,
    stations[1].id
  );
  pushVertex([stations[0].x, stations[0].y], firstSegOffset, stations[0].id);

  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    const segOffset = getSegmentParallelOffset(line.id, a.id, b.id);
    const nextSegOffset =
      i + 2 < stations.length
        ? getSegmentParallelOffset(line.id, b.id, stations[i + 2].id)
        : segOffset;

    const waypoints = getIntermediateTrackWaypoints(a.id, b.id);
    const totalWps = waypoints.length;
    const endpointBuffer = Math.max(1.5, Math.abs(segOffset) * 1.1);

    for (let w = 0; w < totalWps; w++) {
      const [lat, lng] = waypoints[w];
      const { x, y } = latLngToCanvasPoint(lat, lng);

      // Avoid micro-hooks right next to station endpoints (e.g. Union Station Front St vs GO train shed)
      const distToA = Math.hypot(x - a.x, y - a.y);
      const distToB = Math.hypot(x - b.x, y - b.y);
      if (distToA < endpointBuffer || distToB < endpointBuffer) {
        continue;
      }

      let wpOffset = segOffset;

      // On UP Express weston-go->pearson-airport, taper offset smoothly after leaving the shared Weston corridor into the Pearson Airport terminal spur
      if (
        line.id === 'line-10' &&
        a.id === 'weston-go' &&
        b.id === 'pearson-airport' &&
        w > 12
      ) {
        const t = Math.min(1, (w - 12) / Math.max(1, totalWps - 12));
        wpOffset = segOffset * (1 - t * 0.85);
      }

      // On Richmond Hill GO union->leslie, taper parallel offset after exiting the shared Union East rail corridor into the Don River Valley
      if (
        line.id === 'go-richmond-hill' &&
        a.id === 'union' &&
        b.id === 'leslie' &&
        w > 2
      ) {
        const t = Math.min(1, (w - 2) / 5);
        wpOffset = segOffset * (1 - t);
      }

      pushVertex([x, y], wpOffset);
    }

    // At station b, if b is an intermediate station whose building/interchange coordinate sits slightly off the straight track chord between incoming and outgoing track points, project b directly onto the straight track chord
    let bx = b.x;
    let by = b.y;
    if (i + 2 < stations.length && rawPoints.length > 0) {
      const c = stations[i + 2];
      const nextWps = getIntermediateTrackWaypoints(b.id, c.id);
      let pOut: [number, number] = [c.x, c.y];
      for (const [nLat, nLng] of nextWps) {
        const cand = latLngToCanvasPoint(nLat, nLng);
        if (Math.hypot(cand.x - b.x, cand.y - b.y) >= 0.35) {
          pOut = [cand.x, cand.y];
          break;
        }
      }
      const pIn = rawPoints[rawPoints.length - 1];
      const dx = pOut[0] - pIn[0];
      const dy = pOut[1] - pIn[1];
      const chordLen = Math.hypot(dx, dy);
      const distIn = Math.hypot(bx - pIn[0], by - pIn[1]);
      const distOut = Math.hypot(pOut[0] - bx, pOut[1] - by);
      if (chordLen > 0.2 && chordLen < 45 && distIn > 0.05 && distOut > 0.05) {
        const v1x = bx - pIn[0];
        const v1y = by - pIn[1];
        const v2x = pOut[0] - bx;
        const v2y = pOut[1] - by;
        const dot = (v1x * v2x + v1y * v2y) / (distIn * distOut);
        const turnDeg =
          (Math.acos(Math.max(-1, Math.min(1, dot))) * 180) / Math.PI;
        if (turnDeg > 2.5) {
          const rawT =
            ((bx - pIn[0]) * dx + (by - pIn[1]) * dy) / (chordLen * chordLen);
          const clampedT = Math.max(0.15, Math.min(0.85, rawT));
          bx = Number((pIn[0] + clampedT * dx).toFixed(3));
          by = Number((pIn[1] + clampedT * dy).toFixed(3));
        }
      }
    }

    // At station b, average incoming and outgoing segment offsets for seamless transition
    const effectiveSegOffset =
      line.id === 'go-richmond-hill' && a.id === 'union' && b.id === 'leslie'
        ? 0
        : segOffset;
    const stationOffset =
      effectiveSegOffset === nextSegOffset
        ? effectiveSegOffset
        : (effectiveSegOffset + nextSegOffset) * 0.5;
    pushVertex([bx, by], stationOffset, b.id);
  }

  // Smooth the offset profile (2-pass 3-point filter) so lane transitions are completely kink-free
  let smoothedOffsets = [...rawOffsets];
  for (let pass = 0; pass < 2; pass++) {
    const next = [...smoothedOffsets];
    for (let i = 1; i < smoothedOffsets.length - 1; i++) {
      next[i] =
        0.25 * smoothedOffsets[i - 1] +
        0.5 * smoothedOffsets[i] +
        0.25 * smoothedOffsets[i + 1];
    }
    smoothedOffsets = next;
  }

  // Compute segment unit normals (-ty, tx)
  const nPts = rawPoints.length;
  const segNormals: [number, number][] = [];
  for (let i = 0; i < nPts - 1; i++) {
    const dx = rawPoints[i + 1][0] - rawPoints[i][0];
    const dy = rawPoints[i + 1][1] - rawPoints[i][1];
    const len = Math.hypot(dx, dy) || 1;
    const tx = dx / len;
    const ty = dy / len;
    segNormals.push([-ty, tx]);
  }

  // Compute per-vertex normals and smooth them so parallel lines never zig-zag on curved segments
  let vertexNormals: [number, number][] = [];
  for (let i = 0; i < nPts; i++) {
    if (segNormals.length === 0) {
      vertexNormals.push([0, 0]);
    } else if (i === 0) {
      vertexNormals.push(segNormals[0]);
    } else if (i === nPts - 1) {
      vertexNormals.push(segNormals[segNormals.length - 1]);
    } else {
      const n0 = segNormals[i - 1];
      const n1 = segNormals[i];
      const bx = n0[0] + n1[0];
      const by = n0[1] + n1[1];
      const bLen = Math.hypot(bx, by);
      if (bLen < 1e-3) {
        vertexNormals.push(n1);
      } else {
        vertexNormals.push([bx / bLen, by / bLen]);
      }
    }
  }

  for (let pass = 0; pass < 2; pass++) {
    const nextNormals: [number, number][] = [...vertexNormals];
    for (let i = 1; i < nPts - 1; i++) {
      const sx =
        0.25 * vertexNormals[i - 1][0] +
        0.5 * vertexNormals[i][0] +
        0.25 * vertexNormals[i + 1][0];
      const sy =
        0.25 * vertexNormals[i - 1][1] +
        0.5 * vertexNormals[i][1] +
        0.25 * vertexNormals[i + 1][1];
      const sLen = Math.hypot(sx, sy) || 1;
      nextNormals[i] = [sx / sLen, sy / sLen];
    }
    vertexNormals = nextNormals;
  }

  const offsetPoints: [number, number][] = [];
  for (let i = 0; i < nPts; i++) {
    const d = smoothedOffsets[i];
    if (Math.abs(d) < 1e-4 || segNormals.length === 0) {
      offsetPoints.push([rawPoints[i][0], rawPoints[i][1]]);
      continue;
    }

    const [nx, ny] = vertexNormals[i];
    offsetPoints.push([
      Number((rawPoints[i][0] + nx * d).toFixed(3)),
      Number((rawPoints[i][1] + ny * d).toFixed(3)),
    ]);
  }

  return { canvasPoints: offsetPoints, stationVertexIndices };
}

for (const line of TRANSIT_LINES) {
  CANONICAL_LINE_TRACK_CACHE[line.id] = buildCanonicalLineTrack(line);
}

/**
 * Returns the exact { lat, lng } coordinate of a station ON the rendered track polyline
 * of the given lineId (including parallel corridor lane offsets and straight-chord snapping).
 */
export function getStationTrackLatLng(
  stationId: string,
  lineId?: string
): { lat: number; lng: number } {
  if (lineId && CANONICAL_LINE_TRACK_CACHE[lineId]) {
    const cached = CANONICAL_LINE_TRACK_CACHE[lineId];
    const vertexIdx = cached.stationVertexIndices[stationId];
    if (vertexIdx !== undefined && cached.canvasPoints[vertexIdx]) {
      const [x, y] = cached.canvasPoints[vertexIdx];
      return canvasPointToLatLng(x, y);
    }
  }
  const st = STATIONS_BY_ID[stationId];
  if (st) {
    const fallbackLineId = st.lines[0];
    if (fallbackLineId && CANONICAL_LINE_TRACK_CACHE[fallbackLineId]) {
      const cached = CANONICAL_LINE_TRACK_CACHE[fallbackLineId];
      const vertexIdx = cached.stationVertexIndices[stationId];
      if (vertexIdx !== undefined && cached.canvasPoints[vertexIdx]) {
        const [x, y] = cached.canvasPoints[vertexIdx];
        return canvasPointToLatLng(x, y);
      }
    }
    return { lat: st.lat, lng: st.lng };
  }
  return { lat: TORONTO_CENTRAL_NEXUS.lat, lng: TORONTO_CENTRAL_NEXUS.lng };
}

/**
 * Expands an ordered array of StationNodes into a high-resolution array of [x, y] canvas coordinates
 * that trace every railway curve and subway bend on Google Maps, with parallel lane offsets for shared corridors.
 */
export function getStationChainTrackCanvasPoints(
  stations: StationNode[],
  lineId?: string
): [number, number][] {
  if (stations.length === 0) return [];
  if (stations.length === 1) return [[stations[0].x, stations[0].y]];

  if (lineId && CANONICAL_LINE_TRACK_CACHE[lineId]) {
    const cached = CANONICAL_LINE_TRACK_CACHE[lineId];
    const startIdx = cached.stationVertexIndices[stations[0].id];
    const endIdx = cached.stationVertexIndices[stations[stations.length - 1].id];
    if (startIdx !== undefined && endIdx !== undefined) {
      if (startIdx <= endIdx) {
        return cached.canvasPoints.slice(startIdx, endIdx + 1);
      }
      return cached.canvasPoints.slice(endIdx, startIdx + 1).reverse();
    }
  }

  const pts: [number, number][] = [[stations[0].x, stations[0].y]];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    const waypoints = getIntermediateTrackWaypoints(a.id, b.id);
    for (const [lat, lng] of waypoints) {
      const { x, y } = latLngToCanvasPoint(lat, lng);
      pts.push([x, y]);
    }
    pts.push([b.x, b.y]);
  }
  return pts;
}

/**
 * Expands an ordered array of StationNodes into a high-resolution array of { lat, lng } coordinates
 * for active route highlighting directly on top of the line's parallel track.
 */
export function getStationChainTrackLatLngs(
  stations: StationNode[],
  lineId?: string
): Array<{ lat: number; lng: number }> {
  if (stations.length === 0) return [];
  if (stations.length === 1) {
    return [getStationTrackLatLng(stations[0].id, lineId)];
  }

  if (lineId && CANONICAL_LINE_TRACK_CACHE[lineId]) {
    const canvasPts = getStationChainTrackCanvasPoints(stations, lineId);
    return canvasPts.map(([x, y]) => canvasPointToLatLng(x, y));
  }

  const pts: Array<{ lat: number; lng: number }> = [
    { lat: stations[0].lat, lng: stations[0].lng },
  ];
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i];
    const b = stations[i + 1];
    const waypoints = getIntermediateTrackWaypoints(a.id, b.id);
    for (const [lat, lng] of waypoints) {
      pts.push({ lat, lng });
    }
    pts.push({ lat: b.lat, lng: b.lng });
  }
  return pts;
}

// Landmarks & Places across Toronto, Niagara Falls, Hamilton, Kitchener, Guelph & Oshawa
export const TORONTO_LANDMARKS: TorontoLandmark[] = [
  {
    id: 'lm-cn-tower',
    name: 'CN Tower & Ripley’s Aquarium',
    shortLabel: 'CN Tower',
    category: 'Landmark',
    stationId: 'union',
    lat: 43.6426,
    lng: -79.3871,
    walkingMinutes: 6,
    walkingMeters: 480,
    description:
      'Iconic 553m communications tower and observation deck on Bremner Blvd via SkyWalk from Union Station.',
    keywords: ['cn tower', 'thap cn', 'tháp cn', 'aquarium', 'skywalk', 'bremner', 'downtown', 'landmark'],
  },
  {
    id: 'lm-niagara-falls',
    name: 'Niagara Falls & Clifton Hill (Horseshoe Falls)',
    shortLabel: 'Niagara Falls',
    category: 'Landmark',
    stationId: 'niagara-falls-go',
    lat: 43.0896,
    lng: -79.0849,
    walkingMinutes: 8,
    walkingMeters: 650,
    description:
      'World-famous Horseshoe Falls and Niagara Parkway accessible via GO Lakeshore West train from Union Station.',
    keywords: ['niagara falls', 'horseshoe falls', 'clifton hill', 'niagara'],
  },
  {
    id: 'lm-hamilton',
    name: 'Downtown Hamilton & McMaster Innovation Park',
    shortLabel: 'Hamilton Centre',
    category: 'District',
    stationId: 'hamilton-go',
    lat: 43.2557,
    lng: -79.8711,
    walkingMinutes: 3,
    walkingMeters: 220,
    description:
      'Downtown Hamilton hub served by the Lakeshore West GO line at Hamilton GO Centre and West Harbour.',
    keywords: ['hamilton', 'mcmaster', 'west harbour', 'steeltown'],
  },
  {
    id: 'lm-kitchener',
    name: 'Kitchener–Waterloo Tech Hub & University of Waterloo',
    shortLabel: 'Kitchener–Waterloo',
    category: 'University & Hospital',
    stationId: 'kitchener-go',
    lat: 43.4516,
    lng: -80.4925,
    walkingMinutes: 4,
    walkingMeters: 300,
    description:
      'Downtown Kitchener and Waterloo innovation corridor served by the GO Kitchener Line.',
    keywords: ['kitchener', 'waterloo', 'university of waterloo', 'ion lrt'],
  },
  {
    id: 'lm-guelph',
    name: 'Downtown Guelph & University of Guelph',
    shortLabel: 'Guelph Central',
    category: 'University & Hospital',
    stationId: 'guelph-go',
    lat: 43.5448,
    lng: -80.2482,
    walkingMinutes: 2,
    walkingMeters: 160,
    description:
      'Historic limestone city centre and Basilica of Our Lady Immaculate at Guelph Central GO.',
    keywords: ['guelph', 'university of guelph', 'carden street'],
  },
  {
    id: 'lm-oshawa',
    name: 'Oshawa Centre & Durham Region Hub',
    shortLabel: 'Oshawa Hub',
    category: 'Shopping & Culture',
    stationId: 'oshawa-go',
    lat: 43.8752,
    lng: -78.8825,
    walkingMinutes: 5,
    walkingMeters: 400,
    description:
      'Eastern terminus of the Lakeshore East GO Line serving Oshawa and Durham Region.',
    keywords: ['oshawa', 'durham', 'whitby', 'ajax', 'pickering'],
  },
  {
    id: 'lm-rogers-centre',
    name: 'Rogers Centre & Scotiabank Arena',
    shortLabel: 'Rogers Centre',
    category: 'Landmark',
    stationId: 'union',
    lat: 43.6414,
    lng: -79.3894,
    walkingMinutes: 4,
    walkingMeters: 320,
    description: 'Major sports and concert venues connected directly to Union Station.',
    keywords: [
      'rogers centre',
      'scotiabank arena',
      'blue jays',
      'raptors',
      'maple leafs',
      'stadium',
    ],
  },
  {
    id: 'lm-eaton-centre',
    name: 'CF Toronto Eaton Centre & Yonge–Dundas Square',
    shortLabel: 'CF Eaton Centre',
    category: 'Shopping & Culture',
    stationId: 'dundas',
    lat: 43.6544,
    lng: -79.3807,
    walkingMinutes: 1,
    walkingMeters: 80,
    description:
      'Downtown Toronto’s premier shopping galleria with 230+ stores at Yonge & Dundas.',
    keywords: ['eaton centre', 'shopping', 'mall', 'shops', 'yonge dundas square', 'sankofa'],
  },
  {
    id: 'lm-pearson',
    name: 'Toronto Pearson International Airport (YYZ)',
    shortLabel: 'Pearson Airport (YYZ)',
    category: 'Airport & Hub',
    stationId: 'pearson-airport',
    lat: 43.6817,
    lng: -79.6120,
    walkingMinutes: 2,
    walkingMeters: 150,
    description: 'Canada’s largest international airport hub serving Terminals 1 and 3.',
    keywords: ['airport', 'yyz', 'pearson', 'san bay', 'sân bay', 'sân bay pearson', 'flights', 'terminal 1', 'terminal 3'],
  },
  {
    id: 'lm-uoft',
    name: 'University of Toronto (St. George Campus)',
    shortLabel: 'U of T Campus',
    category: 'University & Hospital',
    stationId: 'st-george',
    lat: 43.6629,
    lng: -79.3957,
    walkingMinutes: 3,
    walkingMeters: 220,
    description: 'Historic downtown campus of the University of Toronto near Bloor and Bedford.',
    keywords: [
      'uoft',
      'university of toronto',
      'campus',
      'college',
      'robarts',
      'convocation hall',
    ],
  },
  {
    id: 'lm-rom',
    name: 'Royal Ontario Museum (ROM)',
    shortLabel: 'Royal Ontario Museum',
    category: 'Shopping & Culture',
    stationId: 'museum',
    lat: 43.6677,
    lng: -79.3948,
    walkingMinutes: 1,
    walkingMeters: 90,
    description:
      'Canada’s largest museum of world cultures and natural history at Bloor & Avenue Rd.',
    keywords: ['rom', 'royal ontario museum', 'museum', 'crystal', 'bloor'],
  },
  {
    id: 'lm-casa-loma',
    name: 'Casa Loma Castle',
    shortLabel: 'Casa Loma',
    category: 'Landmark',
    stationId: 'dupont',
    lat: 43.6780,
    lng: -79.4094,
    walkingMinutes: 6,
    walkingMeters: 450,
    description: 'Gothic Revival castle and gardens perched on Davenport Hill.',
    keywords: ['casa loma', 'castle', 'davenport', 'spadina'],
  },
  {
    id: 'lm-distillery',
    name: 'The Distillery Historic District',
    shortLabel: 'Distillery District',
    category: 'District',
    stationId: 'king',
    lat: 43.6503,
    lng: -79.3596,
    walkingMinutes: 8,
    walkingMeters: 620,
    description:
      'Pedestrian-only Victorian industrial village of heritage brick architecture, artisan shops, cafes, and galleries.',
    keywords: ['distillery district', 'corktown', 'mill street', 'shops', 'christmas market'],
  },
  {
    id: 'lm-kensington',
    name: 'Kensington Market & Chinatown',
    shortLabel: 'Kensington Market',
    category: 'District',
    stationId: 'st-patrick',
    lat: 43.6547,
    lng: -79.4005,
    walkingMinutes: 6,
    walkingMeters: 480,
    description:
      'Vibrant multicultural neighborhood famous for indie shops, vintage markets, and food stalls.',
    keywords: ['kensington market', 'chinatown', 'spadina', 'augusta', 'shops'],
  },
  {
    id: 'lm-yorkdale',
    name: 'Yorkdale Shopping Centre',
    shortLabel: 'Yorkdale Mall',
    category: 'Shopping & Culture',
    stationId: 'yorkdale',
    lat: 43.7248,
    lng: -79.4521,
    walkingMinutes: 2,
    walkingMeters: 140,
    description:
      'Premier luxury shopping mall with 270+ stores at Highway 401 and Allen Road.',
    keywords: ['yorkdale', 'mall', 'luxury shopping', 'shops', 'allen road'],
  },
  {
    id: 'lm-square-one',
    name: 'Square One Mississauga & Celebration Square',
    shortLabel: 'Square One Mall',
    category: 'Shopping & Culture',
    stationId: 'square-one',
    lat: 43.5932,
    lng: -79.6425,
    walkingMinutes: 2,
    walkingMeters: 160,
    description:
      'Ontario’s largest shopping centre and civic square in downtown Mississauga.',
    keywords: ['square one', 'mississauga', 'celebration square', 'mall', 'shops'],
  },
  {
    id: 'lm-toronto-zoo',
    name: 'Toronto Zoo & Rouge National Urban Park',
    shortLabel: 'Toronto Zoo',
    category: 'Landmark',
    stationId: 'toronto-zoo',
    lat: 43.8177,
    lng: -79.1859,
    walkingMinutes: 3,
    walkingMeters: 210,
    description: 'World-renowned 287-hectare zoo in the Rouge Valley of eastern Scarborough.',
    keywords: ['toronto zoo', 'zoo', 'rouge park', 'animals', 'scarborough'],
  },
];

export const TORONTO_ROAD_NETWORK: RoadPolyline[] = [];
export const WATER_FEATURES = {
  lakeOntarioPolygon: [] as [number, number][],
  torontoIslands: [] as [number, number][][],
  humberRiver: [] as [number, number][],
  donRiver: [] as [number, number][],
};
export const MUNICIPAL_ZONES: Array<{ name: string; x: number; y: number }> = [];
