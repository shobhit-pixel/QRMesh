// Image / Audio / File / PDF don't fit the single-QR JSON action flow — they
// reuse the existing multi-frame chunked transport (SendMode/ReceiveMode).
// These registry entries exist only so they appear in the action selector;
// the shell recognizes `special: 'binary-transfer'` and routes to that screen
// instead of rendering SenderForm/ReceiverPreview.
import { ImageIcon, Music, File as FileIcon, FileText } from 'lucide-react';
import { registerAction } from './registry';
import { ActionDefinition } from './types';

function Noop() {
  return null;
}

const shared = {
  actionName: 'binary_transfer',
  validate: () => ({ valid: true, errors: [] }),
  SenderForm: Noop,
  ReceiverPreview: Noop,
  special: 'binary-transfer' as const,
};

registerAction({
  ...shared,
  type: 'IMAGE',
  label: 'Image',
  description: 'Beam a photo across using QR frames',
  category: 'Files & Media',
  riskLevel: 'LOW',
  icon: ImageIcon,
});

registerAction({
  ...shared,
  type: 'AUDIO',
  label: 'Audio',
  description: 'Beam a short audio clip across',
  category: 'Files & Media',
  riskLevel: 'LOW',
  icon: Music,
});

registerAction({
  ...shared,
  type: 'FILE',
  label: 'File',
  description: 'Send any small file (up to 2MB)',
  category: 'Files & Media',
  riskLevel: 'LOW',
  icon: FileIcon,
});

registerAction({
  ...shared,
  type: 'PDF',
  label: 'PDF',
  description: 'Send a PDF document (up to 2MB)',
  category: 'Files & Media',
  riskLevel: 'LOW',
  icon: FileText,
});
