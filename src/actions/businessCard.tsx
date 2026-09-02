import { useState, useMemo } from 'react';
import { Contact2, Globe, Download } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { FileDropzone } from '../components/common/FileDropzone';
import { QrFitMeter } from '../components/common/QrFitMeter';
import { buildVCard, buildUniversalVCard, downloadVCard, compressPhotoVariants, VCardFields, MAX_SINGLE_QR_VCARD_LENGTH } from '../utils/vcard';
import { isSafeHttpUrl } from '../utils/urlSafety';

export interface BusinessCardData {
  name: string;
  designation?: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  social?: string;
  address?: string;
  description?: string;
  photoBase64?: string;
  photoVariants?: string[];
}

function toVCardFields(data: Partial<BusinessCardData>): VCardFields {
  return {
    displayName: data.name, company: data.company, jobTitle: data.designation, phone: data.phone, email: data.email,
    website: data.website, address: data.address, notes: data.description, photoBase64: data.photoBase64, photoVariants: data.photoVariants,
  };
}

function SenderForm({ onCreate }: { onCreate: (d: BusinessCardData) => void }) {
  const [d, setD] = useState<Partial<BusinessCardData>>({});
  const set = (k: keyof BusinessCardData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setD((prev) => ({ ...prev, [k]: e.target.value }));
  const valid = !!d.name?.trim();

  const handlePhoto = async (file: File) => {
    const variants = await compressPhotoVariants(file);
    setD((prev) => ({ ...prev, photoBase64: variants[0], photoVariants: variants }));
  };

  const fitPreview = useMemo(() => {
    const vFields = toVCardFields(d);
    const result = buildUniversalVCard(vFields, MAX_SINGLE_QR_VCARD_LENGTH);
    const fits = result !== '';
    const used = fits ? result.length : buildVCard(vFields, { includePhoto: false }).length;
    return { used, fits, photoIncluded: result.includes('PHOTO') };
  }, [d]);

  return (
    <div className="w-full max-w-md">
      <Field label="Name" required><TextInput value={d.name || ''} onChange={set('name')} /></Field>
      <Field label="Designation"><TextInput value={d.designation || ''} onChange={set('designation')} /></Field>
      <Field label="Company"><TextInput value={d.company || ''} onChange={set('company')} /></Field>
      <Field label="Phone"><TextInput type="tel" value={d.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Email"><TextInput type="email" value={d.email || ''} onChange={set('email')} /></Field>
      <Field label="Website"><TextInput value={d.website || ''} onChange={set('website')} /></Field>
      <Field label="Social links"><TextInput value={d.social || ''} onChange={set('social')} placeholder="linkedin.com/in/…" /></Field>
      <Field label="Address"><TextInput value={d.address || ''} onChange={set('address')} /></Field>
      <Field label="Description"><TextArea rows={2} value={d.description || ''} onChange={set('description')} /></Field>
      <Field label="Photo (optional)">
        <FileDropzone
          accept="image/*"
          onFile={handlePhoto}
          previewUrl={d.photoBase64 ? `data:image/png;base64,${d.photoBase64}` : null}
          onClear={() => setD((prev) => ({ ...prev, photoBase64: undefined }))}
          hint="Compressed to a tiny avatar so the whole card can stay one scannable QR."
        />
      </Field>
      <QrFitMeter used={fitPreview.used} max={MAX_SINGLE_QR_VCARD_LENGTH} hasPhoto={!!d.photoBase64} photoIncluded={fitPreview.photoIncluded} fits={fitPreview.fits} />
      <PrimaryButton disabled={!valid} onClick={() => onCreate(d as BusinessCardData)}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: BusinessCardData; onConfirm: () => void; onCancel: () => void }) {
  return (
    <PreviewCard
      title="Business Card Received"
      riskLevel="MEDIUM"
      confirmLabel="Save Contact"
      onConfirm={() => {
        downloadVCard(
          buildVCard({ displayName: data.name, company: data.company, jobTitle: data.designation, phone: data.phone, email: data.email, website: data.website, address: data.address, notes: data.description, photoBase64: data.photoBase64 }, { includePhoto: true }),
          data.name
        );
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-3">
        {data.photoBase64 && <img src={`data:image/png;base64,${data.photoBase64}`} className="w-12 h-12 rounded-full border-2 border-[var(--lego-border)] object-cover" />}
        <div>
          <div className="flex items-center gap-2 font-black"><Contact2 className="w-4 h-4" />{data.name}</div>
          {data.designation && <div className="text-sm text-[var(--lego-muted)]">{data.designation}{data.company ? ` · ${data.company}` : ''}</div>}
        </div>
      </div>
      {data.description && <p className="text-sm">{data.description}</p>}
      <PreviewRow label="Phone" value={data.phone} />
      <PreviewRow label="Email" value={data.email} />
      {data.website && isSafeHttpUrl(data.website) && (
        <a href={data.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-[#0057A6]">
          <Globe className="w-4 h-4" /> {data.website}
        </a>
      )}
      {data.website && !isSafeHttpUrl(data.website) && (
        <p className="text-xs text-[#D01012] font-bold">Website link uses an unsupported scheme and was not made clickable.</p>
      )}
      <p className="text-xs text-[var(--lego-muted)] flex items-center gap-1"><Download className="w-3 h-3" /> Saves as a .vcf contact.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<BusinessCardData> = {
  type: 'BUSINESS_CARD',
  label: 'Business Card',
  description: 'Share a professional card',
  category: 'Communication',
  riskLevel: 'MEDIUM',
  icon: Contact2,
  actionName: 'share_business_card',
  validate: (d) => {
    const data = d as BusinessCardData;
    return data?.name?.trim() ? { valid: true, errors: [] } : { valid: false, errors: ['Name is required'] };
  },
  SenderForm,
  ReceiverPreview,
  // Same adaptive rule as Contact: picks the best-quality photo variant that
  // still fits alongside the card's text in one scannable QR.
  universal: {
    format: 'vCard 3.0',
    encode: (data) => buildUniversalVCard(toVCardFields(data), MAX_SINGLE_QR_VCARD_LENGTH),
  },
};

registerAction(definition);
export default definition;
