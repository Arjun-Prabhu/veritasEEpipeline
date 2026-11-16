import type { ContinentId } from "@/lib/continents";

export type ExploreContinent = Exclude<ContinentId, "antarctica">;

export type Landmark = {
  id: string;
  name: string;
  place: string;
  lat: number;
  lon: number;
  continent: ExploreContinent;
};

const PLACES: Array<[ExploreContinent, string, string, number, number]> = [
  ["north-america", "statue-of-liberty", "Statue of Liberty", 40.6892, -74.0445],
  ["north-america", "grand-canyon", "Grand Canyon", 36.0544, -112.1401],
  ["north-america", "golden-gate", "Golden Gate Bridge", 37.8199, -122.4783],
  ["north-america", "niagara", "Niagara Falls", 43.0799, -79.0747],
  ["north-america", "rushmore", "Mount Rushmore", 43.8791, -103.4591],
  ["north-america", "cn-tower", "CN Tower", 43.6426, -79.3871],
  ["north-america", "chichen-itza", "Chichen Itza", 20.6843, -88.5678],
  ["north-america", "yellowstone", "Old Faithful", 44.4605, -110.8281],
  ["north-america", "willis-tower", "Willis Tower", 41.8789, -87.6359],
  ["north-america", "zocalo", "Mexico City Zócalo", 19.4326, -99.1332],
  ["north-america", "lake-louise", "Lake Louise", 51.4254, -116.1773],
  ["north-america", "washington-monument", "Washington Monument", 38.8895, -77.0353],
  ["south-america", "christ-redeemer", "Christ the Redeemer", -22.9519, -43.2105],
  ["south-america", "machu-picchu", "Machu Picchu", -13.1631, -72.545],
  ["south-america", "iguazu", "Iguazu Falls", -25.6953, -54.4367],
  ["south-america", "manaus", "Meeting of the Waters", -3.1316, -59.9058],
  ["south-america", "atacama", "Valle de la Luna", -22.91, -68.29],
  ["south-america", "ushuaia", "Ushuaia", -54.8019, -68.303],
  ["south-america", "uyuni", "Salar de Uyuni", -20.1338, -67.4891],
  ["south-america", "galapagos", "Baltra, Galápagos", -0.458, -90.267],
  ["south-america", "obelisco", "Obelisco, Buenos Aires", -34.6037, -58.3816],
  ["south-america", "paulista", "Avenida Paulista", -23.5614, -46.656],
  ["south-america", "cartagena", "Cartagena walls", 10.4236, -75.5478],
  ["south-america", "torres-del-paine", "Torres del Paine", -50.9423, -73.4068],
  ["europe", "eiffel", "Eiffel Tower", 48.8584, 2.2945],
  ["europe", "colosseum", "Colosseum", 41.8902, 12.4922],
  ["europe", "big-ben", "Big Ben", 51.5007, -0.1246],
  ["europe", "sagrada", "Sagrada Família", 41.4036, 2.1744],
  ["europe", "acropolis", "Acropolis", 37.9715, 23.7267],
  ["europe", "amsterdam", "Amsterdam canals", 52.3676, 4.9041],
  ["europe", "prague", "Prague Castle", 50.0909, 14.4005],
  ["europe", "neuschwanstein", "Neuschwanstein", 47.5576, 10.7498],
  ["europe", "venice", "St Mark's Square", 45.4341, 12.3388],
  ["europe", "matterhorn", "Matterhorn", 45.9763, 7.6586],
  ["europe", "blue-lagoon", "Blue Lagoon", 63.8804, -22.4495],
  ["europe", "stockholm", "Gamla Stan", 59.3251, 18.0711],
  ["africa", "giza", "Pyramids of Giza", 29.9792, 31.1342],
  ["africa", "table-mountain", "Table Mountain", -33.9628, 18.4098],
  ["africa", "victoria-falls", "Victoria Falls", -17.9243, 25.8572],
  ["africa", "sahara", "Erg Chebbi", 31.1597, -3.988],
  ["africa", "serengeti", "Serengeti", -2.3333, 34.8333],
  ["africa", "kilimanjaro", "Kilimanjaro", -3.0674, 37.3556],
  ["africa", "lagos", "Lagos Island", 6.4541, 3.3947],
  ["africa", "nairobi", "Nairobi", -1.2921, 36.8219],
  ["africa", "marrakech", "Marrakech medina", 31.6295, -7.9811],
  ["africa", "cape-point", "Cape of Good Hope", -34.3568, 18.474],
  ["africa", "djenne", "Great Mosque of Djenné", 13.9056, -4.555],
  ["africa", "okavango", "Okavango Delta", -19.2833, 22.7833],
  ["asia", "great-wall", "Mutianyu Great Wall", 40.4319, 116.5704],
  ["asia", "taj-mahal", "Taj Mahal", 27.1751, 78.0421],
  ["asia", "shibuya", "Shibuya Crossing", 35.6595, 139.7004],
  ["asia", "petra", "Petra", 30.3285, 35.4444],
  ["asia", "angkor", "Angkor Wat", 13.4125, 103.867],
  ["asia", "burj", "Burj Khalifa", 25.1972, 55.2744],
  ["asia", "fuji", "Mount Fuji", 35.3606, 138.7274],
  ["asia", "halong", "Ha Long Bay", 20.9101, 107.1839],
  ["asia", "marina-bay", "Marina Bay", 1.2834, 103.8607],
  ["asia", "gyeongbokgung", "Gyeongbokgung", 37.5796, 126.977],
  ["asia", "tanah-lot", "Tanah Lot", -8.6211, 115.0868],
  ["asia", "everest", "Everest base", 28.0026, 86.8528],
  ["australia", "opera-house", "Sydney Opera House", -33.8568, 151.2153],
  ["australia", "uluru", "Uluru", -25.3444, 131.0369],
  ["australia", "whitsundays", "Whitsunday Islands", -20.2675, 148.997],
  ["australia", "melbourne", "Melbourne", -37.8136, 144.9631],
  ["australia", "twelve-apostles", "Twelve Apostles", -38.6655, 143.1048],
  ["australia", "kakadu", "Kakadu", -13.0923, 132.3938],
  ["australia", "bondi", "Bondi Beach", -33.8915, 151.2767],
  ["australia", "three-sisters", "Three Sisters", -33.731, 150.312],
  ["australia", "perth", "Perth", -31.9523, 115.8613],
  ["australia", "daintree", "Daintree", -16.17, 145.4185],
  ["australia", "canberra", "Parliament House", -35.3082, 149.1244],
  ["australia", "kgari", "K'gari", -25.239, 153.133],
];

export const LANDMARKS: Landmark[] = PLACES.map(([continent, id, name, lat, lon]) => ({
  id: `${continent}-${id}`,
  name,
  place: name,
  lat,
  lon,
  continent,
}));

export function landmarksFor(continent: ExploreContinent) {
  return LANDMARKS.filter((item) => item.continent === continent);
}

export function landmarkPrompt(item: Landmark) {
  return `How has the land at ${item.name}, latitude ${item.lat.toFixed(4)}, longitude ${item.lon.toFixed(4)}, changed since 2021?`;
}

export function landmarkImage(item: Landmark) {
  const bbox = [item.lon - 0.08, item.lat - 0.05, item.lon + 0.08, item.lat + 0.05].join(",");
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export?bbox=${encodeURIComponent(bbox)}&bboxSR=4326&imageSR=4326&size=640,400&format=jpg&f=image`;
}
