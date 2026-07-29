import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ChevronRight, X,
  AlertCircle, Layers, BookOpen, Award, ListOrdered,
} from 'lucide-react';
import api from '../../api/client';
import styles from './GrilleTab.module.css';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Corps   { id: number; code: string; libelleFr: string; libelleAr: string; descriptionFr?: string; _count?: { agents: number } }
interface Cadre   { id: number; code: string; libelleFr: string; libelleAr: string; corpsId: number;  _count?: { agents: number } }
interface Grade   { id: number; code: string; libelleFr: string; libelleAr: string; cadreId: number;  _count?: { agents: number } }
interface Echelon { id: number; numero: number; dureeMinMois: number; gradeId: number; _count?: { agents: number } }

// ─── Helpers ──────────────────────────────────────────────────────────────────

const COLUMNS = [
  { key: 'corps',   label: 'Corps',    Icon: Layers,      color: '#2563eb', bg: '#dbeafe' },
  { key: 'cadres',  label: 'Cadres',   Icon: BookOpen,    color: '#7c3aed', bg: '#ede9fe' },
  { key: 'grades',  label: 'Grades',   Icon: Award,       color: '#0891b2', bg: '#cffafe' },
  { key: 'echelons',label: 'Échelons', Icon: ListOrdered, color: '#059669', bg: '#d1fae5' },
] as const;

// ─── ItemRow ──────────────────────────────────────────────────────────────────

interface ItemRowProps {
  label: string;
  sub?: string;
  selected?: boolean;
  hasChildren?: boolean;
  agentCount?: number;
  onSelect?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
const ItemRow: React.FC<ItemRowProps> = ({ label, sub, selected, hasChildren, agentCount, onSelect, onEdit, onDelete }) => (
  <div
    className={`${styles.row} ${selected ? styles.rowSelected : ''} ${onSelect ? styles.rowClickable : ''}`}
    onClick={onSelect}
  >
    <div className={styles.rowBody}>
      <span className={styles.rowLabel}>{label}</span>
      {sub && <span className={styles.rowSub}>{sub}</span>}
      {agentCount !== undefined && agentCount > 0 && (
        <span className={styles.badge}>{agentCount} agent{agentCount > 1 ? 's' : ''}</span>
      )}
    </div>
    <div className={styles.rowActions}>
      <button className={styles.actionBtn} title="Modifier" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
        <Pencil size={13} />
      </button>
      <button className={`${styles.actionBtn} ${styles.actionDanger}`} title="Supprimer" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
        <Trash2 size={13} />
      </button>
    </div>
    {hasChildren && selected && <ChevronRight size={14} className={styles.chevron} />}
  </div>
);

// ─── Column ───────────────────────────────────────────────────────────────────

interface ColumnProps {
  title: string;
  Icon: React.FC<any>;
  color: string;
  bg: string;
  items: any[];
  selectedId: number | null;
  disabled?: boolean;
  renderLabel: (item: any) => string;
  renderSub?: (item: any) => string;
  hasChildren?: boolean;
  onSelect: (id: number) => void;
  onAdd: () => void;
  onEdit: (item: any) => void;
  onDelete: (item: any) => void;
  emptyMsg: string;
}

const Column: React.FC<ColumnProps> = ({
  title, Icon, color, bg, items, selectedId, disabled,
  renderLabel, renderSub, hasChildren, onSelect, onAdd, onEdit, onDelete, emptyMsg,
}) => (
  <div className={`${styles.column} ${disabled ? styles.columnDisabled : ''}`}>
    <div className={styles.colHeader}>
      <div className={styles.colIconWrap} style={{ background: bg }}>
        <Icon size={16} style={{ color }} />
      </div>
      <span className={styles.colTitle}>{title}</span>
      <button
        className={styles.addBtn}
        onClick={onAdd}
        disabled={disabled}
        title={`Ajouter un ${title.slice(0, -1).toLowerCase()}`}
      >
        <Plus size={14} />
      </button>
    </div>

    <div className={styles.colBody}>
      {disabled ? (
        <p className={styles.emptyHint}>← Sélectionnez un élément</p>
      ) : items.length === 0 ? (
        <p className={styles.emptyHint}>{emptyMsg}</p>
      ) : (
        items.map((item) => (
          <ItemRow
            key={item.id}
            label={renderLabel(item)}
            sub={renderSub?.(item)}
            selected={item.id === selectedId}
            hasChildren={hasChildren}
            agentCount={item._count?.agents}
            onSelect={hasChildren ? () => onSelect(item.id) : undefined}
            onEdit={() => onEdit(item)}
            onDelete={() => onDelete(item)}
          />
        ))
      )}
    </div>
  </div>
);

// ─── Modal ────────────────────────────────────────────────────────────────────

type ModalKind = 'corps' | 'cadre' | 'grade' | 'echelon';
type ModalMode = 'add' | 'edit';

interface ModalState {
  kind: ModalKind;
  mode: ModalMode;
  item?: any;
}

interface FormModalProps {
  state: ModalState;
  onClose: () => void;
  onSaved: () => void;
  // context IDs for add mode
  selectedCorpsId: number | null;
  selectedCadreId: number | null;
  selectedGradeId: number | null;
}

const FIELD_DEFS: Record<ModalKind, { key: ModalKind; icon: any; color: string; bg: string }> = {
  corps:   { key: 'corps',   icon: Layers,      color: '#2563eb', bg: '#dbeafe' },
  cadre:   { key: 'cadre',   icon: BookOpen,    color: '#7c3aed', bg: '#ede9fe' },
  grade:   { key: 'grade',   icon: Award,       color: '#0891b2', bg: '#cffafe' },
  echelon: { key: 'echelon', icon: ListOrdered, color: '#059669', bg: '#d1fae5' },
};

const LABELS: Record<ModalKind, string> = {
  corps: 'Corps', cadre: 'Cadre', grade: 'Grade', echelon: 'Échelon',
};

const FormModal: React.FC<FormModalProps> = ({ state, onClose, onSaved, selectedCorpsId, selectedCadreId, selectedGradeId }) => {
  const { kind, mode, item } = state;
  const isEdit = mode === 'edit';
  const meta = FIELD_DEFS[kind];
  const Icon = meta.icon;

  const isEchelon = kind === 'echelon';

  const [form, setForm] = useState({
    code:         item?.code         ?? '',
    libelleFr:    item?.libelleFr    ?? '',
    libelleAr:    item?.libelleAr    ?? '',
    numero:       item?.numero       ?? '',
    dureeMinMois: item?.dureeMinMois ?? 24,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEchelon && !form.libelleFr.trim()) { setError('Le libellé est obligatoire.'); return; }
    if (!isEchelon && !form.code.trim())      { setError('Le code est obligatoire.'); return; }
    if (isEchelon  && !form.numero)           { setError('Le numéro d\'échelon est obligatoire.'); return; }

    setSaving(true); setError('');
    try {
      if (isEdit) {
        if (isEchelon) {
          await api.put(`/parametrage/echelons/${item.id}`, { numero: Number(form.numero), dureeMinMois: Number(form.dureeMinMois) });
        } else {
          await api.put(`/parametrage/${kind}s/${item.id}`, { code: form.code, libelleFr: form.libelleFr, libelleAr: form.libelleAr });
        }
      } else {
        if (kind === 'corps') {
          await api.post('/parametrage/corps', { code: form.code, libelleFr: form.libelleFr, libelleAr: form.libelleAr });
        } else if (kind === 'cadre') {
          await api.post('/parametrage/cadres', { code: form.code, libelleFr: form.libelleFr, libelleAr: form.libelleAr, corpsId: selectedCorpsId });
        } else if (kind === 'grade') {
          await api.post('/parametrage/grades', { code: form.code, libelleFr: form.libelleFr, libelleAr: form.libelleAr, cadreId: selectedCadreId });
        } else {
          await api.post('/parametrage/echelons', { gradeId: selectedGradeId, numero: Number(form.numero), dureeMinMois: Number(form.dureeMinMois) });
        }
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Une erreur est survenue.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className={styles['fm-header']}>
          <div className={styles['fm-icon']} style={{ background: meta.bg }}>
            <Icon size={20} style={{ color: meta.color }} />
          </div>
          <div className={styles['fm-title-group']}>
            <span className={styles['fm-title']}>
              {isEdit ? `Modifier — ${LABELS[kind]}` : `Ajouter — ${LABELS[kind]}`}
            </span>
            {isEdit && item && !isEchelon && (
              <span className={styles['fm-sub']}>{item.code}</span>
            )}
          </div>
          <button className="btn-icon" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {isEchelon ? (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Numéro <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" type="number" min={1} value={form.numero}
                    onChange={(e) => set('numero', e.target.value)} placeholder="ex. 1" autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Durée min. (mois)</label>
                  <input className="form-input" type="number" min={1} value={form.dureeMinMois}
                    onChange={(e) => set('dureeMinMois', e.target.value)} />
                </div>
              </div>
            ) : (
              <>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Code <span style={{ color: 'var(--danger)' }}>*</span></label>
                    <input className="form-input" value={form.code}
                      onChange={(e) => set('code', e.target.value.toUpperCase())}
                      placeholder="ex. GR-ING-E1" autoFocus />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Libellé (FR) <span style={{ color: 'var(--danger)' }}>*</span></label>
                  <input className="form-input" value={form.libelleFr}
                    onChange={(e) => set('libelleFr', e.target.value)}
                    placeholder="ex. Ingénieur Principal" />
                </div>
                <div className="form-group">
                  <label className="form-label" dir="rtl">التسمية (عربية)</label>
                  <input className="form-input text-right" dir="rtl" value={form.libelleAr}
                    onChange={(e) => set('libelleAr', e.target.value)}
                    placeholder="الاسم بالعربية" />
                </div>
              </>
            )}

            {error && (
              <div className={styles['inline-error']}>
                <AlertCircle size={15} /> {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 110 }}>
              {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : 'Ajouter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── DeleteConfirm ────────────────────────────────────────────────────────────

interface DeleteProps {
  kind: ModalKind;
  item: any;
  onClose: () => void;
  onConfirmed: () => void;
}
const DeleteConfirm: React.FC<DeleteProps> = ({ kind, item, onClose, onConfirmed }) => {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState('');

  const label = kind === 'echelon' ? `Échelon ${item.numero}` : item.libelleFr;
  const ENDPOINTS: Record<string, string> = { corps: 'corps', cadre: 'cadres', grade: 'grades', echelon: 'echelons' };
  const endpoint = ENDPOINTS[kind];

  const handleDelete = async () => {
    setDeleting(true); setError('');
    try {
      await api.delete(`/parametrage/${endpoint}/${item.id}`);
      onConfirmed();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Suppression impossible.');
      setDeleting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal confirm-modal">
        <div className="modal-header" style={{ position: 'relative' }}>
          <div className="confirm-icon bg-red-100 text-red-600"><Trash2 size={28} /></div>
          <button className="btn-icon" style={{ position: 'absolute', top: 16, right: 16, color: 'var(--text-muted)' }} onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body text-center" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h3 className="confirm-title">Supprimer ?</h3>
          <p className="confirm-message">
            Voulez-vous supprimer <strong>{label}</strong> ? Cette action est irréversible.
          </p>
          {error && (
            <div className={styles['inline-error']} style={{ textAlign: 'left' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} /> <span>{error}</span>
            </div>
          )}
        </div>
        <div className="modal-footer justify-center gap-3" style={{ paddingBottom: 28 }}>
          <button className="btn btn-outline px-6" onClick={onClose} disabled={deleting}>Annuler</button>
          <button className="btn btn-danger px-6" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Suppression…' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── GrilleTab (main) ─────────────────────────────────────────────────────────

const GrilleTab: React.FC = () => {
  const [corps,    setCorps]    = useState<Corps[]>([]);
  const [cadres,   setCadres]   = useState<Cadre[]>([]);
  const [grades,   setGrades]   = useState<Grade[]>([]);
  const [echelons, setEchelons] = useState<Echelon[]>([]);

  const [selectedCorps,  setSelectedCorps]  = useState<number | null>(null);
  const [selectedCadre,  setSelectedCadre]  = useState<number | null>(null);
  const [selectedGrade,  setSelectedGrade]  = useState<number | null>(null);

  const [modal,  setModal]  = useState<ModalState | null>(null);
  const [delTarget, setDelTarget] = useState<{ kind: ModalKind; item: any } | null>(null);

  // ── Data loaders ──────────────────────────────────────────────────────────

  const loadCorps = useCallback(async () => {
    try {
      const res = await api.get('/parametrage/corps');
      // flatten: corps list with agent counts
      setCorps(res.data.map((c: any) => ({ ...c, _count: { agents: c._count?.agents ?? 0 } })));
    } catch { setCorps([]); }
  }, []);

  const loadCadres = useCallback(async (corpsId: number) => {
    try {
      const res = await api.get(`/parametrage/corps/${corpsId}/cadres`);
      setCadres(res.data);
    } catch { setCadres([]); }
  }, []);

  const loadGrades = useCallback(async (cadreId: number) => {
    try {
      const res = await api.get(`/parametrage/cadres/${cadreId}/grades`);
      setGrades(res.data);
    } catch { setGrades([]); }
  }, []);

  const loadEchelons = useCallback(async (gradeId: number) => {
    try {
      const res = await api.get(`/parametrage/grades/${gradeId}/echelons`);
      setEchelons(res.data);
    } catch { setEchelons([]); }
  }, []);

  useEffect(() => { loadCorps(); }, [loadCorps]);

  // ── Selection handlers ────────────────────────────────────────────────────

  const handleSelectCorps = (id: number) => {
    setSelectedCorps(id);
    setSelectedCadre(null);
    setSelectedGrade(null);
    setCadres([]); setGrades([]); setEchelons([]);
    loadCadres(id);
  };

  const handleSelectCadre = (id: number) => {
    setSelectedCadre(id);
    setSelectedGrade(null);
    setGrades([]); setEchelons([]);
    loadGrades(id);
  };

  const handleSelectGrade = (id: number) => {
    setSelectedGrade(id);
    setEchelons([]);
    loadEchelons(id);
  };

  // ── After save/delete refresh ─────────────────────────────────────────────

  const handleSaved = () => {
    const kind = modal?.kind;
    setModal(null);
    if (kind === 'corps')   { loadCorps(); }
    if (kind === 'cadre'  && selectedCorps)  loadCadres(selectedCorps);
    if (kind === 'grade'  && selectedCadre)  loadGrades(selectedCadre);
    if (kind === 'echelon'&& selectedGrade)  loadEchelons(selectedGrade);
  };

  const handleDeleted = () => {
    const kind = delTarget?.kind;
    const item = delTarget?.item;
    setDelTarget(null);

    if (kind === 'corps') {
      if (item?.id === selectedCorps) { setSelectedCorps(null); setCadres([]); setGrades([]); setEchelons([]); }
      loadCorps();
    }
    if (kind === 'cadre') {
      if (item?.id === selectedCadre) { setSelectedCadre(null); setGrades([]); setEchelons([]); }
      if (selectedCorps) loadCadres(selectedCorps);
    }
    if (kind === 'grade') {
      if (item?.id === selectedGrade) { setSelectedGrade(null); setEchelons([]); }
      if (selectedCadre) loadGrades(selectedCadre);
    }
    if (kind === 'echelon' && selectedGrade) loadEchelons(selectedGrade);
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.container}>

      {/* ── Breadcrumb context ─── */}
      {(selectedCorps || selectedCadre || selectedGrade) && (
        <div className={styles.breadcrumb}>
          {selectedCorps  && <><span>{corps.find(c => c.id === selectedCorps)?.libelleFr}</span><ChevronRight size={12} /></>}
          {selectedCadre  && <><span>{cadres.find(c => c.id === selectedCadre)?.libelleFr}</span><ChevronRight size={12} /></>}
          {selectedGrade  && <span>{grades.find(g => g.id === selectedGrade)?.libelleFr}</span>}
        </div>
      )}

      {/* ── 4 columns ─── */}
      <div className={styles.columns}>

        <Column
          title="Corps" Icon={COLUMNS[0].Icon} color={COLUMNS[0].color} bg={COLUMNS[0].bg}
          items={corps} selectedId={selectedCorps}
          renderLabel={(c) => c.libelleFr}
          renderSub={(c)   => c.code}
          hasChildren
          onSelect={handleSelectCorps}
          onAdd={() => setModal({ kind: 'corps', mode: 'add' })}
          onEdit={(item) => setModal({ kind: 'corps', mode: 'edit', item })}
          onDelete={(item) => setDelTarget({ kind: 'corps', item })}
          emptyMsg="Aucun corps. Ajoutez-en un."
        />

        <Column
          title="Cadres" Icon={COLUMNS[1].Icon} color={COLUMNS[1].color} bg={COLUMNS[1].bg}
          items={cadres} selectedId={selectedCadre} disabled={!selectedCorps}
          renderLabel={(c) => c.libelleFr}
          renderSub={(c)   => c.code}
          hasChildren
          onSelect={handleSelectCadre}
          onAdd={() => setModal({ kind: 'cadre', mode: 'add' })}
          onEdit={(item) => setModal({ kind: 'cadre', mode: 'edit', item })}
          onDelete={(item) => setDelTarget({ kind: 'cadre', item })}
          emptyMsg="Aucun cadre pour ce corps."
        />

        <Column
          title="Grades" Icon={COLUMNS[2].Icon} color={COLUMNS[2].color} bg={COLUMNS[2].bg}
          items={grades} selectedId={selectedGrade} disabled={!selectedCadre}
          renderLabel={(g) => g.libelleFr}
          renderSub={(g)   => g.code}
          hasChildren
          onSelect={handleSelectGrade}
          onAdd={() => setModal({ kind: 'grade', mode: 'add' })}
          onEdit={(item) => setModal({ kind: 'grade', mode: 'edit', item })}
          onDelete={(item) => setDelTarget({ kind: 'grade', item })}
          emptyMsg="Aucun grade pour ce cadre."
        />

        <Column
          title="Échelons" Icon={COLUMNS[3].Icon} color={COLUMNS[3].color} bg={COLUMNS[3].bg}
          items={echelons} selectedId={null} disabled={!selectedGrade}
          renderLabel={(e) => `Échelon ${e.numero}`}
          renderSub={(e)   => `Ancienneté min. : ${e.dureeMinMois} mois`}
          hasChildren={false}
          onSelect={() => {}}
          onAdd={() => setModal({ kind: 'echelon', mode: 'add' })}
          onEdit={(item) => setModal({ kind: 'echelon', mode: 'edit', item })}
          onDelete={(item) => setDelTarget({ kind: 'echelon', item })}
          emptyMsg="Aucun échelon pour ce grade."
        />
      </div>

      {/* ── Modals ─── */}
      {modal && (
        <FormModal
          state={modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
          selectedCorpsId={selectedCorps}
          selectedCadreId={selectedCadre}
          selectedGradeId={selectedGrade}
        />
      )}
      {delTarget && (
        <DeleteConfirm
          kind={delTarget.kind}
          item={delTarget.item}
          onClose={() => setDelTarget(null)}
          onConfirmed={handleDeleted}
        />
      )}
    </div>
  );
};

export default GrilleTab;
