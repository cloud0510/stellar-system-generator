import type { Provenance } from '../types';
import { PROVENANCE_LABELS } from '../data/modelProvenance';

export function ProvenanceTag({ kind }: { kind: Provenance }) {
  return (
    <span className={`prov-tag prov-${kind}`} title={PROVENANCE_LABELS[kind].long}>
      {kind}: {PROVENANCE_LABELS[kind].short}
    </span>
  );
}
