import axios from "axios";

const query = `
[out:json];
(
  way["highway"](27.6,85.1,27.9,85.5);
);
out body;
>;
out skel qt;
`;

export const fetchOSMRoads = async () => {
  const res = await axios.post("https://overpass-api.de/api/interpreter", query, {
    headers: {
      "Content-Type": "text/plain"
    }
  });

  return res.data; // You’ll get nodes and ways here
};
