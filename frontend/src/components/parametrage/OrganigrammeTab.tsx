import React, { useEffect, useState, useCallback } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  Users,
  Building2,
  AlertCircle,
  X,
} from 'lucide-react';
import api from '../../api/client';
import styles from './OrganigrammeTab.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StructureNode {
  id: number;
  code: string;
  libelleFr: string;
  libelleAr: string;
  type: string;
  parentId: number | null;
  agentCount: number;
  enfants: StructureNode[];
}

interface FormState {
  code: string;
  libelleFr: string;
  libelleAr: string;
  type: string;
  parentId: number | null;
}

interface ModalState {
  mode: 'add' | 'edit';
  node?: StructureNode;       // nœud à éditer
  parentNode?: StructureNode; // nœud parent pour un ajout
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  PRESIDENT:          { label: 'Président',          color: '#fff',    bg: '#1e3a5f' },
  DIRECTION_GENERALE: { label: 'Direction Générale', color: '#fff',    bg: '#1d4ed8' },
  DIRECTION:          { label: 'Direction',          color: '#fff',    bg: '#2563eb' },
  DIVISION:           { label: 'Division',           color: '#fff',    bg: '#0d9488' },
  SERVICE:            { label: 'Service',            color: '#374151', bg: '#e2e8f0' },
};

const TYPE_ORDER = ['PRESIDENT', 'DIRECTION_GENERALE', 'DIRECTION', 'DIVISION', 'SERVICE'];

function suggestChildType(parentType: string): string {
  const idx = TYPE_ORDER.indexOf(parentType);
  return idx >= 0 && idx < TYPE_ORDER.length - 1 ? TYPE_ORDER[idx + 1] : 'SERVICE';
}

function flattenTree(nodes: StructureNode[]): StructureNode[] {
  const result: StructureNode[] = [];
  const walk = (list: StructureNode[]) => {
    for (const n of list) { result.push(n); walk(n.enfants); }
  };
  walk(nodes);
  return result;
}

// ─── TypeBadge ────────────────────────────────────────────────────────────────

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const meta = TYPE_META[type] ?? { label: type, color: '#374151', bg: '#e2e8f0' };
  return (
    <span className={styles['type-badge']} style={{ color: meta.color, background: meta.bg }}>
      {meta.label}
    </span>
  );
};

// ─── TreeNode ─────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  node: StructureNode;
  depth: number;
  forceOpen?: boolean;
  onAdd: (parent: StructureNode) => void;
  onEdit: (node: StructureNode) => void;
  onDelete: (node: StructureNode) => void;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, depth, forceOpen, onAdd, onEdit, onDelete }) => {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren = node.enfants.length > 0;

  // forceOpen prop lets parent "expand all / collapse all"
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen);
  }, [forceOpen]);

  return (
    <div className={styles['tree-node']}>
      <div className={`${styles['node-row']} ${depth === 0 ? styles['node-root'] : ''}`}>
        {/* Toggle */}
        <button
          className={styles['toggle-btn']}
          onClick={() => hasChildren && setOpen((v) => !v)}
          disabled={!hasChildren}
          aria-label={open ? 'Replier' : 'Développer'}
        >
          {hasChildren ? (open ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : (
            <span className={styles['leaf-dot']} />
          )}
        </button>

        {/* Node info */}
        <div className={styles['node-info']}>
          <TypeBadge type={node.type} />
          <span className={styles['node-label']}>{node.libelleFr}</span>
          {node.libelleAr && (
            <span className={styles['node-label-ar']} dir="rtl">{node.libelleAr}</span>
          )}
          <span className={styles['node-code']}>{node.code}</span>
        </div>

        {/* Badges + actions */}
        <div className={styles['node-actions']}>
          {node.agentCount > 0 && (
            <span className={styles['agent-badge']}>
              <Users size={11} />
              {node.agentCount}
            </span>
          )}
          <button className={`${styles['action-btn']} ${styles['add']}`} onClick={() => onAdd(node)} title="Ajouter une sous-entité">
            <Plus size={14} />
          </button>
          <button className={`${styles['action-btn']} ${styles['edit']}`} onClick={() => onEdit(node)} title="Modifier">
            <Pencil size={14} />
          </button>
          <button className={`${styles['action-btn']} ${styles['delete']}`} onClick={() => onDelete(node)} title="Supprimer">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasChildren && open && (
        <div className={styles['node-children']}>
          {node.enfants.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              forceOpen={forceOpen}
              onAdd={onAdd}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── NodeModal ────────────────────────────────────────────────────────────────

interface NodeModalProps {
  modal: ModalState;
  allNodes: StructureNode[];
  onClose: () => void;
  onSave: () => void;
}

const NodeModal: React.FC<NodeModalProps> = ({ modal, allNodes, onClose, onSave }) => {
  const isEdit = modal.mode === 'edit';
  const node = modal.node;
  const parentNode = modal.parentNode;

  const suggestedType = isEdit
    ? (node?.type ?? 'SERVICE')
    : suggestChildType(parentNode?.type ?? 'SERVICE');

  const [form, setForm] = useState<FormState>({
    code: isEdit ? (node?.code ?? '') : (parentNode ? `${parentNode.code}-` : ''),
    libelleFr: isEdit ? (node?.libelleFr ?? '') : '',
    libelleAr: isEdit ? (node?.libelleAr ?? '') : '',
    type: suggestedType,
    parentId: isEdit ? (node?.parentId ?? null) : (parentNode?.id ?? null),
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k: keyof FormState, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.libelleFr.trim()) { setError('Le libellé (FR) est obligatoire.'); return; }
    if (!form.code.trim()) { setError('Le code est obligatoire.'); return; }
    setSaving(true);
    setError('');
    try {
      if (isEdit && node) {
        await api.put(`/parametrage/structures/${node.id}`, {
          code: form.code.trim(),
          libelleFr: form.libelleFr.trim(),
          libelleAr: form.libelleAr.trim(),
          type: form.type,
          parentId: form.parentId,
        });
      } else {
        await api.post('/parametrage/structures', {
          code: form.code.trim(),
          libelleFr: form.libelleFr.trim(),
          libelleAr: form.libelleAr.trim(),
          type: form.type,
          parentId: form.parentId,
        });
      }
      onSave();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue.');
    } finally {
      setSaving(false);
    }
  };

  // Flatten pour le select parent (exclut le nœud en cours d'édition et ses descendants)
  const forbidden = new Set<number>();
  if (isEdit && node) {
    const mark = (n: StructureNode) => { forbidden.add(n.id); n.enfants.forEach(mark); };
    mark(node);
  }
  const parentOptions = allNodes.filter((n) => !forbidden.has(n.id));

  return (
    <div className={styles['modal-backdrop']} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles['modal']}>
        <div className={styles['modal-header']}>
          <div className={styles['modal-title']}>
            {isEdit ? (
              <><Pencil size={18} /> Modifier l'entité</>
            ) : (
              <><Plus size={18} /> Ajouter une entité{parentNode ? ` sous « ${parentNode.libelleFr} »` : ''}</>
            )}
          </div>
          <button className={styles['modal-close']} onClick={onClose}><X size={18} /></button>
        </div>

        <form className={styles['modal-body']} onSubmit={handleSubmit}>
          {/* Libellé FR */}
          <div className="form-group">
            <label className="form-label">Libellé (FR) <span className={styles.required}>*</span></label>
            <input
              className="form-input"
              value={form.libelleFr}
              onChange={(e) => set('libelleFr', e.target.value)}
              placeholder="ex. Direction des Affaires Économiques"
              autoFocus
            />
          </div>

          {/* Libellé AR */}
          <div className="form-group">
            <label className="form-label" dir="rtl">التسمية (العربية)</label>
            <input
              className="form-input text-right"
              dir="rtl"
              value={form.libelleAr}
              onChange={(e) => set('libelleAr', e.target.value)}
              placeholder="الاسم بالعربية"
            />
          </div>

          <div className="form-row">
            {/* Code */}
            <div className="form-group">
              <label className="form-label">Code <span className={styles.required}>*</span></label>
              <input
                className="form-input"
                value={form.code}
                onChange={(e) => set('code', e.target.value.toUpperCase())}
                placeholder="ex. DAES-DIV1"
              />
              <p className={styles['field-hint']}>Identifiant court unique (lettres, chiffres, tirets)</p>
            </div>

            {/* Type */}
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.type} onChange={(e) => set('type', e.target.value)}>
                {TYPE_ORDER.map((t) => (
                  <option key={t} value={t}>{TYPE_META[t]?.label ?? t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Parent — seulement en mode édition */}
          {isEdit && (
            <div className="form-group">
              <label className="form-label">Rattachement (entité parente)</label>
              <select
                className="form-select"
                value={form.parentId ?? ''}
                onChange={(e) => set('parentId', e.target.value === '' ? null : Number(e.target.value))}
              >
                <option value="">— Aucun (racine) —</option>
                {parentOptions.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.libelleFr} ({n.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className={styles['modal-error']}>
              <AlertCircle size={15} /> {error}
            </div>
          )}

          <div className={styles['modal-footer']}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── DeleteConfirm ────────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  node: StructureNode;
  onClose: () => void;
  onConfirmed: () => void;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ node, onClose, onConfirmed }) => {
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/parametrage/structures/${node.id}`);
      onConfirmed();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Suppression impossible.');
      setDeleting(false);
    }
  };

  return (
    <div className={styles['modal-backdrop']} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`${styles['modal']} ${styles['modal-sm']}`}>
        <div className={styles['modal-header']}>
          <div className={styles['modal-title']}><Trash2 size={18} /> Confirmer la suppression</div>
          <button className={styles['modal-close']} onClick={onClose}><X size={18} /></button>
        </div>
        <div className={styles['modal-body']}>
          <p className={styles['delete-msg']}>
            Supprimer <strong>{node.libelleFr}</strong> (<code>{node.code}</code>) ?
            Cette action est irréversible.
          </p>
          {error && <div className={styles['modal-error']}><AlertCircle size={15} /> {error}</div>}
          <div className={styles['modal-footer']}>
            <button className="btn btn-ghost" onClick={onClose}>Annuler</button>
            <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Suppression…' : 'Supprimer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── OrganigrammeTab (main) ───────────────────────────────────────────────────

const OrganigrammeTab: React.FC = () => {
  const [tree, setTree] = useState<StructureNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StructureNode | null>(null);
  const [forceOpen, setForceOpen] = useState<boolean | undefined>(undefined);

  const fetchTree = useCallback(async () => {
    try {
      const { data } = await api.get<StructureNode[]>('/parametrage/structures/arbre');
      setTree(data);
      setError('');
    } catch {
      setError('Impossible de charger l\'organigramme.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTree(); }, [fetchTree]);

  const allFlat = flattenTree(tree);

  const handleSaved = () => {
    setModal(null);
    fetchTree();
  };

  const handleDeleted = () => {
    setDeleteTarget(null);
    fetchTree();
  };

  const totalNodes = allFlat.length;
  const totalAgents = allFlat.reduce((s, n) => s + n.agentCount, 0);

  return (
    <div className={styles['org-tab']}>
      {/* ── Toolbar ── */}
      <div className={styles['toolbar']}>
        <div className={styles['toolbar-stats']}>
          <span><Building2 size={14} /> <strong>{totalNodes}</strong> entités</span>
          {totalAgents > 0 && <span><Users size={14} /> <strong>{totalAgents}</strong> agents rattachés</span>}
        </div>
        <div className={styles['toolbar-actions']}>
          <button className="btn btn-ghost btn-sm" onClick={() => setForceOpen(true)}>Tout développer</button>
          <button className="btn btn-ghost btn-sm" onClick={() => setForceOpen(false)}>Tout replier</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setModal({ mode: 'add' })}
          >
            <Plus size={15} /> Ajouter
          </button>
        </div>
      </div>

      {/* ── Tree ── */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : error ? (
        <div className={styles['load-error']}><AlertCircle size={18} /> {error}</div>
      ) : tree.length === 0 ? (
        <div className="empty-state">
          <Building2 size={40} />
          <h3>Aucune structure</h3>
          <p>Commencez par ajouter l'entité racine (Président).</p>
        </div>
      ) : (
        <div className={styles['tree-root']}>
          {tree.map((root) => (
            <TreeNode
              key={root.id}
              node={root}
              depth={0}
              forceOpen={forceOpen}
              onAdd={(p) => setModal({ mode: 'add', parentNode: p })}
              onEdit={(n) => setModal({ mode: 'edit', node: n })}
              onDelete={(n) => setDeleteTarget(n)}
            />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {modal && (
        <NodeModal
          modal={modal}
          allNodes={allFlat}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          node={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirmed={handleDeleted}
        />
      )}
    </div>
  );
};

export default OrganigrammeTab;
