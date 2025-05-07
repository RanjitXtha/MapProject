import axios from "axios";
const bbox = "27.716,85.322,27.728,85.340";

const query = `
[out:json][timeout:25];
(
  way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential)$"](${bbox});
  >;
);
out body;
`;

export const fetchOSMRoads = async () => {
  const res = await axios.get(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
  
  return res.data; // You’ll get nodes and ways here
};
 