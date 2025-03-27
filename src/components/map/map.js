// src/components/map/map.js
'use client'; // If using Next.js App Router

import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIconPng from 'leaflet/dist/images/marker-icon.png';
import markerShadowPng from 'leaflet/dist/images/marker-shadow.png';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { MarkerComponent } from './marker'; // Corrected import path

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);

export const Map = () => {
  const [locations, setLocations] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  useEffect(() => {
    const fetchCoordinates = async () => {
      try {
        const res = await axios.get('http://localhost:3003/v1/coordinates');
        console.log('Fetched Data:', res.data);
        setLocations(res.data);
      } catch (error) {
        console.error('Error fetching coordinates:', error);
      }
    };

    fetchCoordinates();

    // // Get current user location
    // navigator.geolocation.getCurrentPosition((position) => {
    //   console.log('User location:', position.coords);
    // });

    const getUserLocation = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        console.log('User location:', position.coords);
        setUserLocation(position.coords);
      } catch (error) {
        console.error('Error fetching user location:', error);
      }
    };

    getUserLocation();
  }, []);

  return (
    <MapContainer
      center={[33.6846, -117.8265]}
      zoom={13}
      style={{ height: '100vh' }}
    >
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {locations.map((location) => (
        <MarkerComponent
          key={location.id}
          x_coordinate={location.x_coordinate}
          y_coordinate={location.y_coordinate}
        />
      ))}

      {userLocation && (
        <MarkerComponent
          x_coordinate={userLocation.latitude}
          y_coordinate={userLocation.longitude}
        />
      )}
    </MapContainer>
  );
};
