import { useState } from 'react';
import { Layers, Trash2, CheckCircle2, ChevronRight } from 'lucide-react';
import { registerAction, allActions, getAction } from './registry';
import { ActionDefinition } from './types';
import { ActionType } from '../protocol/types';
import { Field, TextInput, Select, PrimaryButton } from '../components/common/Field';
import { PreviewCard } from '../components/common/PreviewCard';

export interface MultiActionItem {
  type: ActionType;
  data: unknown;
}

export interface MultiActionData {
  title?: string;
  items: MultiActionItem[];
}

const excludedFromBundles: ActionType[] = ['MULTI_ACTION', 'IMAGE', 'AUDIO', 'FILE', 'PDF'];

function SenderForm({ onCreate }: { onCreate: (d: MultiActionData) => void }) {
  const [title, setTitle] = useState('');
  const [items, setItems] = useState<MultiActionItem[]>([]);
  const bundlable = allActions().filter((a) => !excludedFromBundles.includes(a.type));
  const [selectedType, setSelectedType] = useState<ActionType>(bundlable[0]?.type);
  const selectedDef = getAction(selectedType);

  return (
    <div className="w-full max-w-lg">
      <Field label="Package title"><TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Event Package" /></Field>

      {items.length > 0 && (
        <div className="mb-4 flex flex-col gap-2">
          {items.map((item, i) => {
            const def = getAction(item.type);
            const Icon = def?.icon;
            return (
              <div key={i} className="flex items-center justify-between bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl px-3 py-2">
                <span className="flex items-center gap-2 font-bold text-sm">{Icon && <Icon className="w-4 h-4" />}{def?.label}</span>
                <button onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}><Trash2 className="w-4 h-4 text-[#D01012]" /></button>
              </div>
            );
          })}
        </div>
      )}

      <div className="border-4 border-[var(--lego-border)] rounded-xl p-4 bg-[var(--lego-card)] mb-4">
        <Field label="Add an action to the bundle">
          <Select value={selectedType} onChange={(e) => setSelectedType(e.target.value as ActionType)}>
            {bundlable.map((a) => <option key={a.type} value={a.type}>{a.label}</option>)}
          </Select>
        </Field>
        {selectedDef && (
          <selectedDef.SenderForm onCreate={(data) => setItems((prev) => [...prev, { type: selectedType, data }])} />
        )}
      </div>

      <PrimaryButton disabled={items.length === 0} onClick={() => onCreate({ title: title || undefined, items })}>
        Create Bundle QR ({items.length} item{items.length === 1 ? '' : 's'})
      </PrimaryButton>
    </div>
  );
}

function ReceiverPreview({ data, onConfirm, onCancel }: { data: MultiActionData; onConfirm: () => void; onCancel: () => void }) {
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [done, setDone] = useState<Set<number>>(new Set());

  if (reviewIndex !== null) {
    const item = data.items[reviewIndex];
    const def = getAction(item.type);
    if (!def) return null;
    return (
      <def.ReceiverPreview
        data={item.data}
        onCancel={() => setReviewIndex(null)}
        onConfirm={() => {
          setDone((prev) => new Set(prev).add(reviewIndex));
          setReviewIndex(null);
        }}
      />
    );
  }

  return (
    <PreviewCard
      title={data.title || 'Package Received'}
      riskLevel="MEDIUM"
      confirmLabel="Finish"
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <Layers className="w-5 h-5 text-[#0057A6]" />
      <div className="flex flex-col gap-2">
        {data.items.map((item, i) => {
          const def = getAction(item.type);
          const Icon = def?.icon;
          const complete = done.has(i);
          return (
            <button
              key={i}
              onClick={() => setReviewIndex(i)}
              className="flex items-center justify-between bg-[var(--lego-bg)] border-2 border-[var(--lego-border)] rounded-xl px-3 py-2 text-left"
            >
              <span className="flex items-center gap-2 font-bold text-sm">
                {complete ? <CheckCircle2 className="w-4 h-4 text-[#00A650]" /> : Icon && <Icon className="w-4 h-4" />}
                {def?.label || item.type}
              </span>
              <ChevronRight className="w-4 h-4" />
            </button>
          );
        })}
      </div>
      <p className="text-xs text-[var(--lego-muted)]">Tap each item to review and confirm it individually — nothing executes until you open it.</p>
    </PreviewCard>
  );
}

const definition: ActionDefinition<MultiActionData> = {
  type: 'MULTI_ACTION',
  label: 'Multi Action',
  description: 'Bundle several actions into one QR package',
  category: 'Advanced',
  riskLevel: 'HIGH',
  icon: Layers,
  actionName: 'multi_action',
  validate: (d) => {
    const data = d as MultiActionData;
    return Array.isArray(data?.items) && data.items.length > 0
      ? { valid: true, errors: [] }
      : { valid: false, errors: ['At least one bundled action is required'] };
  },
  SenderForm,
  ReceiverPreview,
};

registerAction(definition);
export default definition;
