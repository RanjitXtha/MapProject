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

const buildGraph = (nodes: Node[], ways: Way[]): { graph: Graph; nodeMap: NodeMap } => {
  const graph: Graph = {};
  const nodeMap: NodeMap = {};

  for (const node of nodes) {
    nodeMap[node.id] = { lat: node.lat, lon: node.lon };
    graph[node.id] = [];
  }

  for (const way of ways) {
    for (let i = 0; i < way.nodes.length - 1; i++) {
      const a = way.nodes[i];
      const b = way.nodes[i + 1];

      if (nodeMap[a] && nodeMap[b]) {
        const dist = haversineDistance(nodeMap[a], nodeMap[b]);
        graph[a].push({ node: b, dist });
        graph[b].push({ node: a, dist });
      }
    }
  }

  return { graph, nodeMap };
};

const aStar = (startId: number, goalId: number, graph: Graph, nodeMap: NodeMap): number[] | null => {
  const openSet = new Set<number>([startId]);
  const cameFrom: Record<number, number> = {};

  const gScore: Record<number, number> = { [startId]: 0 };
  const fScore: Record<number, number> = {
    [startId]: haversineDistance(nodeMap[startId], nodeMap[goalId]),
  };

  while (openSet.size > 0) {
    let current = [...openSet].reduce((a, b) =>
      (fScore[a] ?? Infinity) < (fScore[b] ?? Infinity) ? a : b
    );

    if (current === goalId) {
      const path: number[] = [current];
      while (cameFrom[current] !== undefined) {
        current = cameFrom[current];
        path.push(current);
      }
      return path.reverse();
    }

    openSet.delete(current);

    for (const neighbor of graph[current] || []) {
      const tentativeG = (gScore[current] ?? Infinity) + neighbor.dist;

      if (tentativeG < (gScore[neighbor.node] ?? Infinity)) {
        cameFrom[neighbor.node] = current;
        gScore[neighbor.node] = tentativeG;
        fScore[neighbor.node] =
          tentativeG + haversineDistance(nodeMap[neighbor.node], nodeMap[goalId]);
        openSet.add(neighbor.node);
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
      const res = await fetch("/interpreter.json");
      const data = await res.json();
      
      const nodes: Node[] = data.elements.filter((e: any) => e.type === "node");
      const ways: Way[] = data.elements.filter((e: any) => e.type === "way");
      console.log(nodes.length);
      console.log(ways.length)
      const { graph, nodeMap } = buildGraph(nodes, ways);
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

      const path = aStar(startId, endId, graphData.graph, graphData.nodeMap);
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

      {pathCoords.length > 0 && (
        <Polyline positions={pathCoords} color="blue" weight={5} />
      )}
    </MapContainer>
  );
};

export default MapView;
