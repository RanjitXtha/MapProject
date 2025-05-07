import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useState } from "react";
import TinyQueue from "tinyqueue";

type Node = {
  id: number;
  lat: number;
  lon: number;
};

type Way = {
  id: number;
  nodes: number[];
  tags: Record<string, string>;
};

type Graph = {
  [nodeId: number]: { node: number; dist: number }[];
};

type NodeMap = {
  [nodeId: number]: { lat: number; lon: number };
};

type MarkerType = "start" | "end" | "marker";

type CustomMarker = {
  position: [number, number];
  type: MarkerType;
};

const touristDestinations = [
  { name: "Pashupatinath Temple", lat: 27.710535, lon: 85.348830 },
  { name: "Swayambhunath Temple", lat: 27.714938, lon: 85.290400 },
  { name: "Kathmandu Durbar Square", lat: 27.704347, lon: 85.306735 },
  { name: "Patan Durbar Square", lat: 27.673440, lon:  85.325030 },
  { name: "Central Zoo", lat: 27.673186, lon: 85.310791 },
  { name: "Thamel", lat: 27.717051, lon: 85.311263 },
  { name: "Kopan Monastery", lat: 27.742359, lon: 85.363866 },
  { name: "Narayanhiti Palace", lat: 27.714897, lon: 85.318094 },
  { name: "Bhaktapur Durbar Square", lat: 27.6721, lon: 85.4281 },
  { name: "National History Museum", lat: 27.714515, lon: 85.287831 },
  { name: "Nyatapola Temple", lat: 27.6714097, lon: 85.4293725 },
  { name: "Guhyeshwari Shaktipeeth Temple", lat: 27.711271, lon: 85.353363 },
  { name: "Rani Pokhari", lat: 27.707814,  lon:85.315345 },
  { name: "Boudhanath Stupa", lat: 27.721391, lon: 85.362053 },
  { name: "Dharahara", lat: 27.700599, lon: 85.311866 },
  { name: "Chandragiri Hill Cable Car", lat: 27.686226, lon: 85.214569 },

];

const haversineDistance = (a: { lat: number; lon: number }, b: { lat: number; lon: number }): number => {
  const R = 6371e3;
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const aCalc = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(aCalc), Math.sqrt(1 - aCalc));
};


const aStar = (
  startId: number,
  goalId: number,
  graph: Graph,
  nodeMap: NodeMap
): number[] | null => {
  const queue = new TinyQueue<{ id: number; f: number }>([], (a, b) => a.f - b.f);
  queue.push({ id: startId, f: haversineDistance(nodeMap[startId], nodeMap[goalId]) });

  const cameFrom: Record<number, number> = {};
  const gScore: Record<number, number> = { [startId]: 0 };

  const visited = new Set<number>();

  while (queue.length > 0) {
    const current = queue.pop()!;
    var currentId = current.id;

    if (currentId === goalId) {
      const path: number[] = [currentId];
      while (cameFrom[currentId] !== undefined) {
        currentId = cameFrom[currentId];
        path.push(currentId);
      }
      return path.reverse();
    }

    if (visited.has(currentId)) continue;
    visited.add(currentId);

    for (const neighbor of graph[currentId] || []) {
      const tentativeG = gScore[currentId] + neighbor.dist;

      if (tentativeG < (gScore[neighbor.node] ?? Infinity)) {
        cameFrom[neighbor.node] = currentId;
        gScore[neighbor.node] = tentativeG;
        const f = tentativeG + haversineDistance(nodeMap[neighbor.node], nodeMap[goalId]);
        queue.push({ id: neighbor.node, f });
      }
    }
  }

  return null;
};

const ClickHandler = ({ onMapClick }: { onMapClick: (latlng: [number, number]) => void }) => {
  useMapEvents({
    click(e) {
      onMapClick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
};

const MapView = () => {
  const [customMarkers, setCustomMarkers] = useState<CustomMarker[]>([]);
  const [startNode, setStartNode] = useState<[number, number] | null>(null);
  const [endNode, setEndNode] = useState<[number, number] | null>(null);
  const [pathCoords, setPathCoords] = useState<[number, number][]>([]);
  const [graphData, setGraphData] = useState<{
    graph: Graph;
    nodeMap: NodeMap;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const res = await fetch("/nodes_ways.json");
      const data = await res.json();
      
      const nodes: Node[] = data.nodes
      const ways: Way[] = data.ways
      console.log(nodes.length);
      console.log(ways.length)

      const res1 = await fetch("/graph.json");
      const data1 = await res1.json();

      const { graph, nodeMap } = data1;
      setGraphData({ graph, nodeMap });
    };

    loadData();
  }, []);

  useEffect(() => {
    if (graphData && startNode && endNode) {
      const findNearestNodeId = (lat: number, lon: number): number => {
        let nearestId = -1;
        let minDist = Infinity;
        for (const [idStr, coord] of Object.entries(graphData.nodeMap)) {
          const dist = haversineDistance(coord, { lat, lon });
          if (dist < minDist) {
            minDist = dist;
            nearestId = parseInt(idStr);
          }
        }
        return nearestId;
      };

      const startId = findNearestNodeId(...startNode);
      const endId = findNearestNodeId(...endNode);
      const startTime = performance.now();
      const path = aStar(startId, endId, graphData.graph, graphData.nodeMap);
      const endTime = performance.now();
      console.log(`A* algorithm took ${(endTime - startTime).toFixed(2)} ms`);
      if (path) {
        const coords = path.map((id) => [
          graphData.nodeMap[id].lat,
          graphData.nodeMap[id].lon,
        ] as [number, number]);
        setPathCoords(coords);
      } else {
        setPathCoords([]);
        console.warn("No path found.");
      }
    }
  }, [startNode, endNode, graphData]);

  const handleMapClick = (latlng: [number, number]) => {
    setCustomMarkers((prev) => [...prev, { position: latlng, type: "marker" }]);
  };

  const updateMarkerType = (index: number, type: MarkerType) => {
    const updated = [...customMarkers];
    updated[index].type = type;
    setCustomMarkers(updated);

    if (type === "start") setStartNode(updated[index].position);
    if (type === "end") setEndNode(updated[index].position);
  };

  return (
    <MapContainer center={[27.67, 85.43]} zoom={14} style={{ height: "100vh", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <ClickHandler onMapClick={handleMapClick} />

      {customMarkers.map((marker, i) => (
        <Marker key={i} position={marker.position}>
          <Popup>
            <div>
              <div>Type: <strong>{marker.type}</strong></div>
              <button onClick={() => updateMarkerType(i, "start")}>Set as Start</button><br />
              <button onClick={() => updateMarkerType(i, "end")}>Set as End</button>
            </div>
          </Popup>
        </Marker>
      ))}

{touristDestinations.map((place, idx) => (
        <Marker key={idx} position={[place.lat, place.lon]}>
          <Popup>{place.name}</Popup>
        </Marker>
      ))}

      {pathCoords.length > 0 && (
        <Polyline positions={pathCoords} color="blue" weight={5} />
      )}
    </MapContainer>
  );
};

export default MapView;
