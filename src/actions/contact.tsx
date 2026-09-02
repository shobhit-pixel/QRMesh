import { useState, useMemo } from 'react';
import { User, Download } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';
import { Field, TextInput, TextArea, PrimaryButton } from '../components/common/Field';
import { PreviewCard, PreviewRow } from '../components/common/PreviewCard';
import { FileDropzone } from '../components/common/FileDropzone';
import { QrFitMeter } from '../components/common/QrFitMeter';
import { buildVCard, downloadVCard, compressPhotoVariants, VCardFields, MAX_SINGLE_QR_VCARD_LENGTH } from '../utils/vcard';

export type ContactData = VCardFields;

// Contact-specific: once a photo is attached, keep it in the Universal QR no
// matter what — previous behavior silently dropped the photo whenever the
// preferred budget was exceeded, which is worse than a denser-but-still-valid
// QR. Still bounded by HARD_CAP so this can't regress into the original
// "too dense to scan at all" failure.
const HARD_CAP = 1400;

function buildContactUniversalVCard(data: ContactData): string {
  const candidates = data.photoVariants && data.photoVariants.length > 0 ? data.photoVariants : data.photoBase64 ? [data.photoBase64] : [];

  if (candidates.length === 0) {
    const textOnly = buildVCard(data, { includePhoto: false });
    return textOnly.length <= MAX_SINGLE_QR_VCARD_LENGTH ? textOnly : '';
  }

  // Best case: a variant fits within the preferred, comfortably-scannable budget.
  for (const photoBase64 of candidates) {
    const vcard = buildVCard({ ...data, photoBase64 }, { includePhoto: true });
    if (vcard.length <= MAX_SINGLE_QR_VCARD_LENGTH) return vcard;
  }

  // Nothing fit the preferred budget — force the smallest variant in anyway
  // rather than dropping the photo, as long as it stays under the hard cap.
  const smallest = candidates[candidates.length - 1];
  const forced = buildVCard({ ...data, photoBase64: smallest }, { includePhoto: true });
  if (forced.length <= HARD_CAP) return forced;

  // Even the smallest photo pushes past the hard cap — the text fields alone
  // are simply too long for a single QR to carry a photo at all.
  const textOnly = buildVCard(data, { includePhoto: false });
  return textOnly.length <= MAX_SINGLE_QR_VCARD_LENGTH ? textOnly : '';
}

function SenderForm({ onCreate }: { onCreate: (d: ContactData) => void }) {
  const [c, setC] = useState<ContactData>({});
  const set = (k: keyof ContactData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setC((prev) => ({ ...prev, [k]: e.target.value }));

  const valid = !!(c.firstName || c.lastName || c.displayName);

  const handlePhoto = async (file: File) => {
    const variants = await compressPhotoVariants(file);
    setC((prev) => ({ ...prev, photoBase64: variants[0], photoVariants: variants }));
  };

  const fitPreview = useMemo(() => {
    const result = buildContactUniversalVCard(c);
    const fits = result !== '';
    const used = fits ? result.length : buildVCard(c, { includePhoto: false }).length;
    return { used, fits, photoIncluded: result.includes('PHOTO') };
  }, [c]);

  return (
    <div className="w-full max-w-md">
      <div className="flex gap-3">
        <Field label="First name"><TextInput value={c.firstName || ''} onChange={set('firstName')} /></Field>
        <Field label="Last name"><TextInput value={c.lastName || ''} onChange={set('lastName')} /></Field>
      </div>
      <Field label="Display name"><TextInput value={c.displayName || ''} onChange={set('displayName')} placeholder="Overrides first/last" /></Field>
      <Field label="Phone"><TextInput type="tel" value={c.phone || ''} onChange={set('phone')} /></Field>
      <Field label="Secondary phone"><TextInput type="tel" value={c.phone2 || ''} onChange={set('phone2')} /></Field>
      <Field label="Email"><TextInput type="email" value={c.email || ''} onChange={set('email')} /></Field>
      <Field label="Company"><TextInput value={c.company || ''} onChange={set('company')} /></Field>
      <Field label="Job title"><TextInput value={c.jobTitle || ''} onChange={set('jobTitle')} /></Field>
      <Field label="Website"><TextInput value={c.website || ''} onChange={set('website')} /></Field>
      <Field label="Address"><TextInput value={c.address || ''} onChange={set('address')} /></Field>
      <div className="flex gap-3">
        <Field label="City"><TextInput value={c.city || ''} onChange={set('city')} /></Field>
        <Field label="State"><TextInput value={c.state || ''} onChange={set('state')} /></Field>
      </div>
      <Field label="Country"><TextInput value={c.country || ''} onChange={set('country')} /></Field>
      <Field label="Notes"><TextArea rows={2} value={c.notes || ''} onChange={set('notes')} /></Field>
      <Field label="Profile photo (optional)">
        <FileDropzone
          accept="image/*"
          onFile={handlePhoto}
          previewUrl={c.photoBase64 ? `data:image/png;base64,${c.photoBase64}` : null}
          onClear={() => setC((prev) => ({ ...prev, photoBase64: undefined }))}
          hint="Compressed to a tiny avatar so the whole card can stay one scannable QR."
        />
      </Field>
      <QrFitMeter used={fitPreview.used} max={MAX_SINGLE_QR_VCARD_LENGTH} hasPhoto={!!c.photoBase64} photoIncluded={fitPreview.photoIncluded} fits={fitPreview.fits} />
      <PrimaryButton disabled={!valid} onClick={() => onCreate(c)}>Create QR</PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: ContactData; onConfirm: () => void; onCancel: () => void }) {
  const name = data.displayName || [data.firstName, data.lastName].filter(Boolean).join(' ');
  return (
    <PreviewCard
      title="Contact Received"
      riskLevel="MEDIUM"
      confirmLabel="Save Contact"
      onConfirm={() => {
        const vcard = buildVCard(data);
        downloadVCard(vcard, name || 'contact');
        onConfirm();
      }}
      onCancel={onCancel}
    >
      <div className="flex items-center gap-3">
        {data.photoBase64 && (
          <img src={`data:image/png;base64,${data.photoBase64}`} className="w-12 h-12 rounded-full border-2 border-[var(--lego-border)] object-cover" />
        )}
        <div>
          <div className="flex items-center gap-2 font-black"><User className="w-4 h-4" />{name || 'Unknown'}</div>
          {data.jobTitle && <div className="text-sm text-[var(--lego-muted)]">{data.jobTitle}{data.company ? ` · ${data.company}` : ''}</div>}
        </div>
      </div>
      {data.phone && <PreviewRow label="Phone" value={data.phone} />}
      {data.email && <PreviewRow label="Email" value={data.email} />}
      <PreviewRow label="Address" value={[data.address, data.city, data.state, data.country].filter(Boolean).join(', ') || undefined} />
      <p className="text-xs text-[var(--lego-muted)] flex items-center gap-1"><Download className="w-3 h-3" /> Saves as a .vcf file your OS can import.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<ContactData> = {
  type: 'CONTACT',
  label: 'Contact',
  description: 'Share a contact card',
  category: 'Communication',
  riskLevel: 'MEDIUM',
  icon: User,
  actionName: 'share_contact',
  validate: (d) => {
    const data = d as ContactData;
    return data?.firstName || data?.lastName || data?.displayName
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['A name is required'] };
  },
  SenderForm,
  ReceiverPreview,
  // Once a photo is attached, it's always kept in the Universal QR (see
  // buildContactUniversalVCard) — backing off to a smaller variant, then
  // accepting a denser-but-bounded QR, rather than silently dropping it.
  universal: {
    format: 'vCard 3.0',
    encode: (data) => buildContactUniversalVCard(data),
  },
};

registerAction(definition);
export default definition;
