const fs = require('fs');
const path = require('path');

// Load the OSM JSON file
const rawData = fs.readFileSync(path.join(__dirname, 'interpreter3.json'));
const data = JSON.parse(rawData);

// Step 1: Filter nodes and ways
const nodes = data.elements.filter(e => e.type === 'node');
const ways = data.elements.filter(e => e.type === 'way');

// Step 2: Save filtered nodes and ways to a file
const output1 = {
  nodes,
  ways,
};

fs.writeFileSync(
  path.join(__dirname, '..', 'mapproject', 'public', 'nodes_ways.json'),
  JSON.stringify(output1)
);
console.log('✅ nodes_ways.json saved');

// Step 3: Build graph and nodeMap
const haversineDistance = (a, b) => {
  const R = 6371e3; // meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const aVal = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1 - aVal));

  return R * c;
};

const graph = {};
const nodeMap = {};

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

// Step 4: Save preprocessed graph and nodeMap
const output2 = {
  graph,
  nodeMap
};

fs.writeFileSync(
  path.join(__dirname, '..', 'mapproject', 'public', 'graph.json'),
  JSON.stringify(output2)
);
console.log('✅ graph.json saved');
