import { MapContainer, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

const MapView = () => {
  return (
    <MapContainer
      center={[27.7, 85.3]}
      zoom={12}
      style={{ height: "100vh", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
    </MapContainer>
  );
};

export default MapView;
