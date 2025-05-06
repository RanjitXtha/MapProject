import { useEffect, useState } from 'react';

const RoadNetwork = () => {
  const [roads, setRoads] = useState([]);

  useEffect(() => {
    const fetchRoadData = async () => {
      const query = `
        [out:json];
        (
          way["highway"](27.6,85.2,27.8,85.5);
        );
        (._;>;);
        out;
      `;

      try {
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: query,
        });
        const data = await res.json();
     
        setRoads(data.elements);
      } catch (err) {
        console.error('Failed to fetch road data', err);
      }
    };

    fetchRoadData();
  }, []);
return <div>Hello</div>
  return <pre>{JSON.stringify(roads, null, 2)}</pre>;
};

export default RoadNetwork;