import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  Save,
  User,
  Briefcase,
  IdCard,
  Users,
  UserCheck,
  FileUser,
  XCircle,
  Mail,
  Phone,
  MapPin,
  Heart,
  Globe,
  Calendar,
  Award,
  Building2,
  GraduationCap,
  CalendarClock,
  Plus,
  Trash2,
} from 'lucide-react';
import api from '../../api/client';
import { STATUT_STYLES } from '../../utils/agentHelpers';
import styles from './AgentForm.module.css';

const AgentForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    // Identité
    matricule: '',
    cin: '',
    nomFr: '',
    nomAr: '',
    prenomFr: '',
    prenomAr: '',
    sexe: 'M',
    dateNaissance: '',
    lieuNaissanceFr: '',
    lieuNaissanceAr: '',
    nationalite: 'Marocaine',
    // Situation familiale
    situationFamiliale: 'CELIBATAIRE',
    nbEnfants: 0,
    // Coordonnées
    adresseFr: '',
    adresseAr: '',
    telephone: '',
    email: '',
    // Statut & carrière
    statut: 'TITULAIRE',
    statutCarriere: 'EN_ACTIVITE',
    dateRecrutement: '',
    dateTitularisation: '',
    dateFinContrat: '',
    // Positionnement grille
    corpsId: '',
    cadreId: '',
    gradeId: '',
    echelleId: '',
    echelonId: '',
    indice: '',
    // Retraite
    caisseRetraite: 'CMR',
    matriculeRetraite: '',
    // Affectation
    structureId: '',
    fonctionFr: '',
    fonctionAr: '',
  });

  const [structures, setStructures] = useState<any[]>([]);
  const [structureSearch, setStructureSearch] = useState('');
  const [corps, setCorps] = useState<any[]>([]);
  const [cadres, setCadres] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [echelles, setEchelles] = useState<any[]>([]);
  const [echelons, setEchelons] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Diplômes (modifiables)
  const [diplomes, setDiplomes] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      api.get('/parametrage/structures'),
      api.get('/parametrage/corps'),
    ])
      .then(([resStr, resCorps]) => {
        setStructures(resStr.data);
        setCorps(resCorps.data);
      })
      .catch(console.error);

    if (isEdit) {
      api
        .get(`/agents/${id}`)
        .then((res) => {
          const d = res.data;
          // structureSearch sera synchronisé par le useEffect ci-dessous
          setFormData({
            matricule: d.matricule || '',
            cin: d.cin || '',
            nomFr: d.nomFr || '',
            nomAr: d.nomAr || '',
            prenomFr: d.prenomFr || '',
            prenomAr: d.prenomAr || '',
            sexe: d.sexe || 'M',
            dateNaissance: d.dateNaissance ? d.dateNaissance.split('T')[0] : '',
            lieuNaissanceFr: d.lieuNaissanceFr || '',
            lieuNaissanceAr: d.lieuNaissanceAr || '',
            nationalite: d.nationalite || 'Marocaine',
            situationFamiliale: d.situationFamiliale || 'CELIBATAIRE',
            nbEnfants: d.nbEnfants ?? 0,
            adresseFr: d.adresseFr || '',
            adresseAr: d.adresseAr || '',
            telephone: d.telephone || '',
            email: d.email || '',
            statut: d.statut || 'TITULAIRE',
            statutCarriere: d.statutCarriere || 'EN_ACTIVITE',
            dateRecrutement: d.dateRecrutement ? d.dateRecrutement.split('T')[0] : '',
            dateTitularisation: d.dateTitularisation ? d.dateTitularisation.split('T')[0] : '',
            dateFinContrat: d.dateFinContrat ? d.dateFinContrat.split('T')[0] : '',
            corpsId: d.corpsId ? String(d.corpsId) : '',
            cadreId: d.cadreId ? String(d.cadreId) : '',
            gradeId: d.gradeId ? String(d.gradeId) : '',
            echelleId: d.echelleId ? String(d.echelleId) : '',
            echelonId: d.echelonId ? String(d.echelonId) : '',
            indice: d.indice ? String(d.indice) : '',
            caisseRetraite: d.caisseRetraite || 'CMR',
            matriculeRetraite: d.matriculeRetraite || '',
            structureId: d.structureId ? String(d.structureId) : '',
            fonctionFr: d.fonctionFr || '',
            fonctionAr: d.fonctionAr || '',
          });
          setDiplomes(d.diplomes || []);
          // Load cascading hierarchy
          if (d.corpsId) loadCadres(d.corpsId);
          if (d.cadreId) loadGrades(d.cadreId);
          if (d.gradeId) loadEchelles(d.gradeId);
          if (d.echelleId) loadEchelons(d.echelleId);
        })
        .catch((err) => {
          setError("Erreur lors du chargement de l'agent.");
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [id, isEdit]);

  // Sync structureSearch label when structures load (mode édition)
  useEffect(() => {
    if (formData.structureId && structures.length > 0 && !structureSearch) {
      const match = structures.find((s) => String(s.id) === formData.structureId);
      if (match) setStructureSearch(match.libelleFr);
    }
  }, [structures, formData.structureId]);

  const loadCadres = async (corpsId: number) => {
    try {
      const res = await api.get(`/parametrage/corps/${corpsId}/cadres`);
      setCadres(res.data);
    } catch {
      setCadres([]);
    }
  };

  const loadGrades = async (cadreId: number) => {
    try {
      const res = await api.get(`/parametrage/cadres/${cadreId}/grades`);
      setGrades(res.data);
    } catch {
      setGrades([]);
    }
  };

  const loadEchelles = async (gradeId: number) => {
    try {
      const res = await api.get(`/parametrage/grades/${gradeId}/echelles`);
      setEchelles(res.data);
    } catch {
      setEchelles([]);
    }
  };

  const loadEchelons = async (echelleId: number) => {
    try {
      const res = await api.get(`/parametrage/echelles/${echelleId}/echelons`);
      setEchelons(res.data);
    } catch {
      setEchelons([]);
    }
  };

  const handleCorpsChange = (value: string) => {
    setFormData({ ...formData, corpsId: value, cadreId: '', gradeId: '', echelleId: '', echelonId: '' });
    setCadres([]);
    setGrades([]);
    setEchelles([]);
    setEchelons([]);
    if (value) loadCadres(Number(value));
  };

  const handleCadreChange = (value: string) => {
    setFormData({ ...formData, cadreId: value, gradeId: '', echelleId: '', echelonId: '' });
    setGrades([]);
    setEchelles([]);
    setEchelons([]);
    if (value) loadGrades(Number(value));
  };

  const handleGradeChange = (value: string) => {
    setFormData({ ...formData, gradeId: value, echelleId: '', echelonId: '' });
    setEchelles([]);
    setEchelons([]);
    if (value) loadEchelles(Number(value));
  };

  const handleEchelleChange = (value: string) => {
    setFormData({ ...formData, echelleId: value, echelonId: '' });
    setEchelons([]);
    if (value) loadEchelons(Number(value));
  };

  const clearFieldError = (field: string) =>
    setFormErrors((prev) => (prev[field] ? { ...prev, [field]: '' } : prev));

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.nomFr.trim()) errors.nomFr = 'Le nom est obligatoire.';
    if (!formData.prenomFr.trim()) errors.prenomFr = 'Le prénom est obligatoire.';
    if (!formData.matricule.trim()) errors.matricule = 'Le matricule est obligatoire.';

    if (!formData.cin.trim()) {
      errors.cin = 'Le CIN est obligatoire.';
    } else if (!/^[A-Za-z]{1,2}\d{2,7}$/.test(formData.cin.trim())) {
      errors.cin = 'Format CIN invalide (ex : AB123456).';
    }

    if (!formData.corpsId) {
      errors.corpsId = "Le corps d'appartenance est obligatoire.";
    }

    if (!formData.dateNaissance) {
      errors.dateNaissance = 'La date de naissance est obligatoire.';
    } else {
      const dob = new Date(formData.dateNaissance);
      const today = new Date();
      const ageFull =
        today.getFullYear() -
        dob.getFullYear() -
        (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
      if (dob >= today) errors.dateNaissance = 'La date de naissance doit être dans le passé.';
      else if (ageFull < 18) errors.dateNaissance = "L'agent doit avoir au moins 18 ans.";
    }

    if (!formData.dateRecrutement) {
      errors.dateRecrutement = 'La date de recrutement est obligatoire.';
    } else if (formData.dateNaissance) {
      const dob = new Date(formData.dateNaissance);
      const drec = new Date(formData.dateRecrutement);
      if (drec <= dob) {
        errors.dateRecrutement = 'La date de recrutement doit être postérieure à la naissance.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    setError('');

    // Only send fields accepted by the backend DTO
    const payload: Record<string, any> = {};
    const fields = [
      'matricule', 'cin', 'nomFr', 'nomAr', 'prenomFr', 'prenomAr',
      'dateNaissance', 'lieuNaissanceFr', 'sexe', 'nationalite',
      'situationFamiliale', 'telephone', 'email',
      'statut', 'dateRecrutement', 'dateTitularisation',
      'caisseRetraite', 'matriculeRetraite', 'fonctionFr', 'fonctionAr',
    ];
    fields.forEach((f) => {
      const val = (formData as any)[f];
      // Convert empty date strings to undefined
      if (f.startsWith('date') && val === '') return;
      if (val !== undefined && val !== '') payload[f] = val;
    });

    payload.nbEnfants = Number(formData.nbEnfants);
    payload.corpsId = parseInt(formData.corpsId);
    if (formData.cadreId) payload.cadreId = parseInt(formData.cadreId);
    if (formData.gradeId) payload.gradeId = parseInt(formData.gradeId);
    if (formData.echelleId) payload.echelleId = parseInt(formData.echelleId);
    if (formData.echelonId) payload.echelonId = parseInt(formData.echelonId);
    if (formData.indice) payload.indice = parseInt(formData.indice);
    if (formData.structureId) payload.structureId = parseInt(formData.structureId);
    // Only set dateFinContrat if it has a value
    if (formData.dateFinContrat) payload.dateFinContrat = formData.dateFinContrat;

    try {
      if (isEdit) {
        await api.put(`/agents/${id}`, payload);
      } else {
        await api.post('/agents', payload);
      }
      navigate('/agents');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatutLabel = (statut: string) => {
    const labels: Record<string, string> = {
      TITULAIRE: t('agents.titulaires'),
      STAGIAIRE: t('agents.stagiaires'),
      CONTRACTUEL: t('agents.contractuels'),
      JOURNALIER: t('agents.contractuels'),
    };
    return labels[statut] || statut;
  };

  const addDiplome = () => {
    setDiplomes([...diplomes, { intituleFr: '', intituleAr: '', etablissement: '', anneeObtention: '' }]);
  };

  const removeDiplome = (index: number) => {
    setDiplomes(diplomes.filter((_, i) => i !== index));
  };

  const updateDiplome = (index: number, field: string, value: string) => {
    const updated = [...diplomes];
    updated[index] = { ...updated[index], [field]: value };
    setDiplomes(updated);
  };

  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className="page-header">
          <div className="flex items-center gap-4">
            <Link
              to="/agents"
              className="btn-icon text-gray-500 hover:text-gray-900 bg-white shadow-sm border border-gray-200"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1>{isEdit ? 'Modifier Agent' : 'Nouvel Agent'}</h1>
          </div>
        </div>
        <div className="flex justify-center py-16">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-4">
          <Link
            to="/agents"
            className="btn-icon text-gray-500 hover:text-gray-900 bg-white shadow-sm border border-gray-200"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1>{isEdit ? 'Modifier Agent' : 'Nouvel Agent'}</h1>
            <p className="page-subtitle">
              {isEdit
                ? `Modification de ${formData.prenomFr} ${formData.nomFr}`
                : 'Remplissez les informations pour créer un nouvel agent'}
            </p>
          </div>
        </div>
        <div className="page-actions">
          <Link to="/agents" className="btn btn-outline">
            <XCircle size={18} />
            Annuler
          </Link>
          <button
            type="submit"
            form="agent-form"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            <Save size={18} />
            {isSubmitting ? 'Traitement...' : 'Enregistrer le dossier'}
          </button>
        </div>
      </div>

      {/* Stats Résumé */}
      {isEdit && (
        <div className="stats-grid stats-grid-agents mb-6">
          <div className="stat-card stat-card-enhanced blue">
            <div className="stat-card-top-row">
              <div className="stat-icon blue">
                <Users />
              </div>
              <div className="stat-content min-w-0">
                <div className="stat-value text-lg truncate" title={`${formData.prenomFr} ${formData.nomFr}`}>
                  {formData.prenomFr} {formData.nomFr}
                </div>
                <div className="stat-label">Agent</div>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-enhanced green">
            <div className="stat-card-top-row">
              <div className="stat-icon green">
                <UserCheck />
              </div>
              <div className="stat-content">
                <div className="stat-value text-2xl">{formData.matricule || '-'}</div>
                <div className="stat-label">Matricule</div>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-enhanced gold">
            <div className="stat-card-top-row">
              <div className="stat-icon gold">
                <IdCard />
              </div>
              <div className="stat-content">
                <div className="stat-value text-2xl">{formData.cin || '-'}</div>
                <div className="stat-label">CIN</div>
              </div>
            </div>
          </div>

          <div className="stat-card stat-card-enhanced red">
            <div className="stat-card-top-row">
              <div className="stat-icon red">
                <FileUser />
              </div>
              <div className="stat-content">
                <div className="stat-value">
                  <span
                    className={`badge badge-dot ${
                      STATUT_STYLES[formData.statut]?.badge || 'badge-gray'
                    }`}
                  >
                    {getStatutLabel(formData.statut)}
                  </span>
                </div>
                <div className="stat-label">Statut</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="card mb-6 border-red-200 bg-red-50">
          <div className="card-body flex items-center gap-3 text-red-600">
            <XCircle size={20} />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Main Form Card */}
      <div className="card">
        <form id="agent-form" onSubmit={handleSubmit}>
          {/* ===== Section 1: Identité ===== */}
          <div className="p-6 pb-0">
            <div className="form-section">
              <h3 className="form-section-title">
                <User size={20} />
                Identité
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className={`form-group form-floating${formErrors.nomFr ? ' has-error' : ''}`}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.nomFr}
                    onChange={(e) => { setFormData({ ...formData, nomFr: e.target.value }); clearFieldError('nomFr'); }}
                  />
                  <label>Nom (Fr) <span className="form-required">*</span></label>
                  {formErrors.nomFr && <p className="form-error-msg">{formErrors.nomFr}</p>}
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.nomAr}
                    onChange={(e) => setFormData({ ...formData, nomAr: e.target.value })}
                  />
                  <label>Nom (Ar)</label>
                </div>
                <div className={`form-group form-floating${formErrors.prenomFr ? ' has-error' : ''}`}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.prenomFr}
                    onChange={(e) => { setFormData({ ...formData, prenomFr: e.target.value }); clearFieldError('prenomFr'); }}
                  />
                  <label>Prénom (Fr) <span className="form-required">*</span></label>
                  {formErrors.prenomFr && <p className="form-error-msg">{formErrors.prenomFr}</p>}
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.prenomAr}
                    onChange={(e) => setFormData({ ...formData, prenomAr: e.target.value })}
                  />
                  <label>Prénom (Ar)</label>
                </div>
                <div className={`form-group form-floating${formErrors.cin ? ' has-error' : ''}`}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.cin}
                    onChange={(e) => { setFormData({ ...formData, cin: e.target.value }); clearFieldError('cin'); }}
                  />
                  <label>CIN <span className="form-required">*</span></label>
                  {formErrors.cin && <p className="form-error-msg">{formErrors.cin}</p>}
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    required
                    value={formData.sexe}
                    onChange={(e) => setFormData({ ...formData, sexe: e.target.value })}
                  >
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                  </select>
                  <label>Sexe <span className="form-required">*</span></label>
                </div>
                <div className={`form-group form-floating${formErrors.dateNaissance ? ' has-error' : ''}`}>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateNaissance}
                    onChange={(e) => { setFormData({ ...formData, dateNaissance: e.target.value }); clearFieldError('dateNaissance'); }}
                  />
                  <label>Date de Naissance <span className="form-required">*</span></label>
                  {formErrors.dateNaissance && <p className="form-error-msg">{formErrors.dateNaissance}</p>}
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.lieuNaissanceFr}
                    onChange={(e) => setFormData({ ...formData, lieuNaissanceFr: e.target.value })}
                  />
                  <label>Lieu de naissance (Fr)</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.lieuNaissanceAr}
                    onChange={(e) => setFormData({ ...formData, lieuNaissanceAr: e.target.value })}
                  />
                  <label>Lieu de naissance (Ar)</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.nationalite}
                    onChange={(e) => setFormData({ ...formData, nationalite: e.target.value })}
                  />
                  <label>Nationalité</label>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 2: Situation Familiale ===== */}
          <div className="p-6 pt-0">
            <div className="form-section">
              <h3 className="form-section-title">
                <Heart size={20} />
                Situation Familiale
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.situationFamiliale}
                    onChange={(e) => setFormData({ ...formData, situationFamiliale: e.target.value })}
                  >
                    <option value="CELIBATAIRE">Célibataire</option>
                    <option value="MARIE">Marié(e)</option>
                    <option value="DIVORCE">Divorcé(e)</option>
                    <option value="VEUF">Veuf/Veuve</option>
                  </select>
                  <label>Situation familiale</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="number"
                    className="form-input"
                    placeholder=" "
                    min="0"
                    value={formData.nbEnfants}
                    onChange={(e) => setFormData({ ...formData, nbEnfants: Number(e.target.value) })}
                  />
                  <label>Nombre d'enfants</label>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 3: Coordonnées ===== */}
          <div className="p-6 pt-0">
            <div className="form-section">
              <h3 className="form-section-title">
                <Mail size={20} />
                Coordonnées
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="form-group form-floating">
                  <input
                    type="email"
                    className="form-input"
                    placeholder=" "
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <label>Email</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="tel"
                    className="form-input"
                    placeholder=" "
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  />
                  <label>Téléphone</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.adresseFr}
                    onChange={(e) => setFormData({ ...formData, adresseFr: e.target.value })}
                  />
                  <label>Adresse (Fr)</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.adresseAr}
                    onChange={(e) => setFormData({ ...formData, adresseAr: e.target.value })}
                  />
                  <label>Adresse (Ar)</label>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 4: Informations Professionnelles ===== */}
          <div className="p-6 pt-0">
            <div className="form-section">
              <h3 className="form-section-title">
                <Briefcase size={20} />
                Informations Professionnelles
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className={`form-group form-floating${formErrors.matricule ? ' has-error' : ''}`}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.matricule}
                    onChange={(e) => { setFormData({ ...formData, matricule: e.target.value }); clearFieldError('matricule'); }}
                  />
                  <label>Matricule <span className="form-required">*</span></label>
                  {formErrors.matricule && <p className="form-error-msg">{formErrors.matricule}</p>}
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    required
                    value={formData.statut}
                    onChange={(e) => setFormData({ ...formData, statut: e.target.value })}
                  >
                    <option value="TITULAIRE">Titulaire</option>
                    <option value="STAGIAIRE">Stagiaire</option>
                    <option value="CONTRACTUEL">Contractuel</option>
                    <option value="JOURNALIER">Journalier</option>
                  </select>
                  <label>Statut <span className="form-required">*</span></label>
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.statutCarriere}
                    onChange={(e) => setFormData({ ...formData, statutCarriere: e.target.value })}
                  >
                    <option value="EN_ACTIVITE">En activité</option>
                    <option value="DETACHEMENT">Détachement</option>
                    <option value="DISPONIBILITE">Disponibilité</option>
                    <option value="MIS_A_DISPOSITION">Mis à disposition</option>
                    <option value="REINTEGRATION">Réintégration</option>
                    <option value="RETRAITE">Retraité</option>
                    <option value="DEMISSION">Démission</option>
                  </select>
                  <label>Statut de carrière</label>
                </div>
                <div className={`form-group form-floating${formErrors.dateRecrutement ? ' has-error' : ''}`}>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateRecrutement}
                    onChange={(e) => { setFormData({ ...formData, dateRecrutement: e.target.value }); clearFieldError('dateRecrutement'); }}
                  />
                  <label>Date de Recrutement <span className="form-required">*</span></label>
                  {formErrors.dateRecrutement && <p className="form-error-msg">{formErrors.dateRecrutement}</p>}
                </div>
                <div className="form-group form-floating">
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateTitularisation}
                    onChange={(e) => setFormData({ ...formData, dateTitularisation: e.target.value })}
                  />
                  <label>Date de Titularisation</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="date"
                    className="form-input"
                    value={formData.dateFinContrat}
                    onChange={(e) => setFormData({ ...formData, dateFinContrat: e.target.value })}
                  />
                  <label>Date de fin de contrat</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.fonctionFr}
                    onChange={(e) => setFormData({ ...formData, fonctionFr: e.target.value })}
                  />
                  <label>Fonction (Fr)</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.fonctionAr}
                    onChange={(e) => setFormData({ ...formData, fonctionAr: e.target.value })}
                  />
                  <label>Fonction (Ar)</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    className="form-input"
                    list="structures-datalist"
                    placeholder=" "
                    value={structureSearch}
                    autoComplete="off"
                    onChange={(e) => {
                      const val = e.target.value;
                      setStructureSearch(val);
                      const match = structures.find((s) => s.libelleFr === val);
                      setFormData((prev) => ({ ...prev, structureId: match ? String(match.id) : '' }));
                    }}
                  />
                  <datalist id="structures-datalist">
                    {structures.map((s) => (
                      <option key={s.id} value={s.libelleFr} />
                    ))}
                  </datalist>
                  <label>Structure (Affectation)</label>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 5: Positionnement Grille ===== */}
          <div className="p-6 pt-0">
            <div className="form-section">
              <h3 className="form-section-title">
                <Award size={20} />
                Positionnement Grille
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className={`form-group form-floating${formErrors.corpsId ? ' has-error' : ''}`}>
                  <select
                    className="form-select"
                    value={formData.corpsId}
                    onChange={(e) => { handleCorpsChange(e.target.value); clearFieldError('corpsId'); }}
                  >
                    <option value="" disabled hidden></option>
                    {corps.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.libelleFr}
                      </option>
                    ))}
                  </select>
                  <label>Corps d'appartenance <span className="form-required">*</span></label>
                  {formErrors.corpsId && <p className="form-error-msg">{formErrors.corpsId}</p>}
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.cadreId}
                    onChange={(e) => handleCadreChange(e.target.value)}
                    disabled={!formData.corpsId}
                  >
                    <option value="" disabled hidden></option>
                    {cadres.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.libelleFr}
                      </option>
                    ))}
                  </select>
                  <label>Cadre</label>
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.gradeId}
                    onChange={(e) => handleGradeChange(e.target.value)}
                    disabled={!formData.cadreId}
                  >
                    <option value="" disabled hidden></option>
                    {grades.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.libelleFr}
                      </option>
                    ))}
                  </select>
                  <label>Grade</label>
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.echelleId}
                    onChange={(e) => handleEchelleChange(e.target.value)}
                    disabled={!formData.gradeId}
                  >
                    <option value="" disabled hidden></option>
                    {echelles.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.libelleFr}
                      </option>
                    ))}
                  </select>
                  <label>Échelle <span className="form-required">*</span></label>
                </div>
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.echelonId}
                    onChange={(e) => setFormData({ ...formData, echelonId: e.target.value })}
                    disabled={!formData.echelleId}
                  >
                    <option value="" disabled hidden></option>
                    {echelons.map((e) => (
                      <option key={e.id} value={e.id}>
                        Échelon {e.numero} (Indice {e.indice})
                      </option>
                    ))}
                  </select>
                  <label>Échelon</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="number"
                    className="form-input"
                    placeholder=" "
                    value={formData.indice}
                    onChange={(e) => setFormData({ ...formData, indice: e.target.value })}
                  />
                  <label>Indice</label>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 6: Retraite ===== */}
          <div className="p-6 pt-0">
            <div className="form-section">
              <h3 className="form-section-title">
                <CalendarClock size={20} />
                Retraite
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="form-group form-floating">
                  <select
                    className="form-select"
                    value={formData.caisseRetraite}
                    onChange={(e) => setFormData({ ...formData, caisseRetraite: e.target.value })}
                  >
                    <option value="CMR">CMR</option>
                    <option value="RCAR">RCAR</option>
                  </select>
                  <label>Caisse de retraite</label>
                </div>
                <div className="form-group form-floating">
                  <input
                    type="text"
                    className="form-input"
                    placeholder=" "
                    value={formData.matriculeRetraite}
                    onChange={(e) => setFormData({ ...formData, matriculeRetraite: e.target.value })}
                  />
                  <label>Matricule retraite</label>
                </div>
              </div>
            </div>
          </div>

          {/* ===== Section 7: Diplômes ===== */}
          <div className="p-6 pt-0">
            <div className="form-section">
              <div className="flex items-center justify-between mb-5">
                <h3 className="form-section-title !mb-0 !pb-0 !border-b-0">
                  <GraduationCap size={20} />
                  Diplômes
                </h3>
                <button type="button" className="btn btn-outline btn-sm" onClick={addDiplome}>
                  <Plus size={16} />
                  Ajouter un diplôme
                </button>
              </div>
              {diplomes.length === 0 ? (
                <p className="text-sm text-gray-400 py-6 text-center">
                  Aucun diplôme enregistré. Cliquez sur "Ajouter un diplôme" pour en ajouter.
                </p>
              ) : (
                <div className="space-y-4">
                  {diplomes.map((dip, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-4 p-4 bg-gray-50/70 rounded-lg border border-gray-200/80 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="form-group form-floating">
                          <input
                            type="text"
                            className="form-input"
                            placeholder=" "
                            required
                            value={dip.intituleFr}
                            onChange={(e) => updateDiplome(index, 'intituleFr', e.target.value)}
                          />
                          <label>Intitulé (Fr) *</label>
                        </div>
                        <div className="form-group form-floating">
                          <input
                            type="text"
                            className="form-input"
                            placeholder=" "
                            value={dip.intituleAr}
                            onChange={(e) => updateDiplome(index, 'intituleAr', e.target.value)}
                          />
                          <label>Intitulé (Ar)</label>
                        </div>
                        <div className="form-group form-floating">
                          <input
                            type="text"
                            className="form-input"
                            placeholder=" "
                            value={dip.etablissement}
                            onChange={(e) => updateDiplome(index, 'etablissement', e.target.value)}
                          />
                          <label>Établissement</label>
                        </div>
                        <div className="form-group form-floating">
                          <input
                            type="number"
                            className="form-input"
                            placeholder=" "
                            value={dip.anneeObtention}
                            onChange={(e) => updateDiplome(index, 'anneeObtention', e.target.value)}
                          />
                          <label>Année d'obtention</label>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn-icon text-gray-300 hover:text-danger hover:bg-red-50 mt-6 shrink-0"
                        onClick={() => removeDiplome(index)}
                        title="Supprimer"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="card-footer flex justify-between items-center">
            <div className="text-sm text-gray-400">
              <span className="form-required">*</span> Champs obligatoires
            </div>
            <div className="flex gap-3">
              <Link to="/agents" className="btn btn-outline px-6">
                Annuler
              </Link>
              <button
                type="submit"
                className="btn btn-primary px-8"
                disabled={isSubmitting}
              >
                <Save size={18} />
                {isSubmitting ? 'Traitement...' : 'Enregistrer le dossier'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgentForm;