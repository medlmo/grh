import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { ShieldCheck, LogIn } from 'lucide-react';
import styles from './Login.module.css';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login({ email, motDePasse: password });
      navigate('/');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginHeader}>
          <div className={styles.loginLogo}>
            <ShieldCheck />
          </div>
          <h1 className={styles.loginTitle}>{t('auth.login_title')}</h1>
          <p className={styles.loginSubtitle}>{t('auth.login_subtitle')}</p>
        </div>

        {error && <div className={`${styles.loginError} mb-6`}>{error}</div>}

        <form className={styles.loginForm} onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('auth.email')}</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="agent@region.ma"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('auth.password')}</label>
            <input 
              type="password" 
              className="form-input" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary w-full mt-4" 
            disabled={isLoading}
          >
            {isLoading ? <span className="spinner w-5 h-5 border-2 border-white/30 border-t-white"></span> : (
              <>
                <LogIn size={18} />
                {t('auth.login_button')}
              </>
            )}
          </button>
        </form>

        <div className="flex justify-center mt-6">
          <div className={styles['lang-switch']}>
            <button
              className={`${styles['lang-btn']} ${i18n.language === 'fr' ? styles.langBtnActive : ''}`}
              onClick={() => i18n.changeLanguage('fr')}
            >
              Français
            </button>
            <button
              className={`${styles['lang-btn']} ${i18n.language === 'ar' ? styles.langBtnActive : ''}`}
              onClick={() => i18n.changeLanguage('ar')}
            >
              العربية
            </button>
          </div>
        </div>

        <div className={styles.loginInstitutional}>
          {t('auth.institutional')}
        </div>
      </div>
    </div>
  );
};

export default Login;
