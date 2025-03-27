'use client'; // If using Next.js App Router

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false },
);
const Popup = dynamic(() => import('react-leaflet').then((mod) => mod.Popup), {
  ssr: false,
});

export const MarkerComponent = ({ x_coordinate, y_coordinate }) => {
  return (
    <>
      {/* Stanford Court, Irvine */}
      <Marker
        position={[x_coordinate, y_coordinate]}
        icon={L.icon({
          iconUrl: markerIconPng.src,
          shadowUrl: markerShadowPng.src,
          iconSize: [25, 41],
          iconAnchor: [12, 41],
        })}
      >
        <Popup>Stanford Court, Irvine</Popup>
      </Marker>
    </>
  );
};
