import { Map } from '@/library/map/map';
import GoogleMaps from '@/library/map/googleMaps';
import Image from 'next/image';

export default function Home() {
  // Use this for Mapbox
  // return <Map></Map>;
  // Use this for Google Maps
  return <GoogleMaps />;
}
