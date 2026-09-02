import { useState } from 'react';
import { MapPin, Navigation, Copy } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, PrimaryButton } from '../components/common/Field';
import { PreviewCard } from '../components/common/PreviewCard';
import { encodeGeo } from '../protocol/standardFormats';

export interface LocationData {
  lat: number;
  lng: number;
  name?: string;
  address?: string;
  notes?: string;
}

function SenderForm({ onCreate }: { onCreate: (d: LocationData) => void }) {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const latNum = parseFloat(lat);
  const lngNum = parseFloat(lng);
  const valid = !Number.isNaN(latNum) && !Number.isNaN(lngNum) && Math.abs(latNum) <= 90 && Math.abs(lngNum) <= 180;

  const useCurrentLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setLat(String(pos.coords.latitude));
      setLng(String(pos.coords.longitude));
    });
  };

  return (
    <div className="w-full max-w-md">
      <button onClick={useCurrentLocation} type="button" className="mb-4 flex items-center gap-2 text-sm font-bold text-[#0057A6]">
        <Navigation className="w-4 h-4" /> Use my current location
      </button>
      <div className="flex gap-3">
        <Field label="Latitude" required>
          <TextInput value={lat} onChange={(e) => setLat(e.target.value)} placeholder="23.0225" />
        </Field>
        <Field label="Longitude" required>
          <TextInput value={lng} onChange={(e) => setLng(e.target.value)} placeholder="72.5714" />
        </Field>
      </div>
      <Field label="Place name (optional)">
        <TextInput value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Address (optional)">
        <TextInput value={address} onChange={(e) => setAddress(e.target.value)} />
      </Field>
      <PrimaryButton
        disabled={!valid}
        onClick={() => onCreate({ lat: latNum, lng: lngNum, name: name || undefined, address: address || undefined })}
      >
        Create QR
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: LocationData; onConfirm: () => void; onCancel: () => void }) {
  const mapsUrl = `https://www.google.com/maps?q=${data.lat},${data.lng}`;
  return (
    <PreviewCard title="Location Received" riskLevel="LOW" onConfirm={() => { window.open(mapsUrl, '_blank', 'noopener,noreferrer'); onConfirm(); }} onCancel={onCancel} confirmLabel="Open in Maps">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-[#D01012] shrink-0" />
        <span className="font-black">{data.name || 'Shared location'}</span>
      </div>
      {data.address && <p className="text-sm text-[var(--lego-muted)]">{data.address}</p>}
      <p className="text-sm font-mono bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl p-2">
        {data.lat.toFixed(6)}, {data.lng.toFixed(6)}
      </p>
      <button onClick={() => navigator.clipboard.writeText(`${data.lat}, ${data.lng}`)} className="flex items-center gap-2 text-sm font-bold text-[#0057A6]">
        <Copy className="w-4 h-4" /> Copy coordinates
      </button>
    </PreviewCard>
  );
}

const definition: ActionDefinition<LocationData> = {
  type: 'LOCATION',
  label: 'Location',
  description: 'Share a map location',
  category: 'Navigation',
  riskLevel: 'LOW',
  icon: MapPin,
  actionName: 'share_location',
  validate: (d) => {
    const data = d as LocationData;
    return typeof data?.lat === 'number' && typeof data?.lng === 'number'
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['Latitude and longitude are required'] };
  },
  SenderForm,
  ReceiverPreview,
  universal: { format: 'geo:', encode: (data) => encodeGeo(data.lat, data.lng, data.name) },
};

registerAction(definition);
export default definition;
