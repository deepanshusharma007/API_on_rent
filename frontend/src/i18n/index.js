/**
 * Internationalization (i18n) support for the AI API Rental SaaS.
 *
 * Usage:
 *   import { useTranslation } from '../i18n';
 *   const { t, language, setLanguage, languages } = useTranslation();
 *   <p>{t('marketplace.title')}</p>
 */
import { create } from 'zustand';

// ==============================
// Translation dictionaries
// ==============================

const translations = {
    en: {
        // Common
        'common.loading': 'Loading...',
        'common.error': 'An error occurred',
        'common.save': 'Save',
        'common.cancel': 'Cancel',
        'common.delete': 'Delete',
        'common.confirm': 'Confirm',
        'common.back': 'Back',
        'common.logout': 'Logout',
        'common.copied': 'Copied to clipboard!',

        // Auth
        'auth.login': 'Login',
        'auth.register': 'Register',
        'auth.email': 'Email',
        'auth.password': 'Password',
        'auth.loginTitle': 'Welcome Back',
        'auth.registerTitle': 'Create Account',
        'auth.noAccount': "Don't have an account?",
        'auth.hasAccount': 'Already have an account?',

        // Marketplace
        'marketplace.title': 'AI API Marketplace',
        'marketplace.subtitle': 'Rent access to premium AI models',
        'marketplace.purchase': 'Purchase',
        'marketplace.purchasing': 'Purchasing...',
        'marketplace.soldOut': 'Sold Out',
        'marketplace.oneTime': 'one-time payment',
        'marketplace.tokenCap': 'tokens',
        'marketplace.modelSelector': 'Preferred Model (all models accessible regardless of selection)',

        // Dashboard
        'dashboard.title': 'My Rentals',
        'dashboard.subtitle': 'Manage your AI API rentals',
        'dashboard.active': 'Active Rentals',
        'dashboard.history': 'Rental History',
        'dashboard.noActive': 'No active rentals',
        'dashboard.noHistory': 'No rental history yet',
        'dashboard.browsePlans': 'Browse Plans',
        'dashboard.virtualKey': 'Virtual API Key',
        'dashboard.timeLeft': 'Time Left',
        'dashboard.tokensLeft': 'Tokens Left',
        'dashboard.tokensUsed': 'Tokens Used',
        'dashboard.requests': 'Requests',
        'dashboard.expired': 'Expired',

        // Playground
        'playground.title': 'API Playground',
        'playground.subtitle': 'Test AI models with your rental key',
        'playground.send': 'Send',
        'playground.sending': 'Sending...',
        'playground.selectModel': 'Select Model',
        'playground.enterPrompt': 'Enter your prompt...',
        'playground.copyCurl': 'Copy cURL',
        'playground.response': 'Response',

        // Admin
        'admin.title': 'Admin Panel',
        'admin.overview': 'Overview',
        'admin.users': 'Users',
        'admin.plans': 'Plans',
        'admin.keys': 'Provider Keys',
        'admin.analytics': 'Analytics',
        'admin.alerts': 'Alerts',
        'admin.totalUsers': 'Total Users',
        'admin.activeRentals': 'Active Rentals',
        'admin.revenue': 'Revenue',
        'admin.exportCsv': 'Export CSV',

        // Status
        'status.title': 'System Status',
        'status.healthy': 'Healthy',
        'status.degraded': 'Degraded',
        'status.down': 'Down',

        // Time
        'time.minutes': 'min',
        'time.hours': 'hour',
        'time.hoursPlural': 'hours',
        'time.days': 'day',
        'time.daysPlural': 'days',
    },

    es: {
        'common.loading': 'Cargando...',
        'common.error': 'Ocurrió un error',
        'common.save': 'Guardar',
        'common.cancel': 'Cancelar',
        'common.delete': 'Eliminar',
        'common.confirm': 'Confirmar',
        'common.back': 'Volver',
        'common.logout': 'Cerrar sesión',
        'common.copied': '¡Copiado al portapapeles!',

        'auth.login': 'Iniciar sesión',
        'auth.register': 'Registrarse',
        'auth.email': 'Correo electrónico',
        'auth.password': 'Contraseña',
        'auth.loginTitle': 'Bienvenido de vuelta',
        'auth.registerTitle': 'Crear cuenta',
        'auth.noAccount': '¿No tienes cuenta?',
        'auth.hasAccount': '¿Ya tienes cuenta?',

        'marketplace.title': 'Mercado de API de IA',
        'marketplace.subtitle': 'Alquila acceso a modelos de IA premium',
        'marketplace.purchase': 'Comprar',
        'marketplace.purchasing': 'Comprando...',
        'marketplace.soldOut': 'Agotado',
        'marketplace.oneTime': 'pago único',
        'marketplace.tokenCap': 'tokens',
        'marketplace.modelSelector': 'Modelo preferido (todos los modelos accesibles independientemente de la selección)',

        'dashboard.title': 'Mis Alquileres',
        'dashboard.subtitle': 'Gestiona tus alquileres de API de IA',
        'dashboard.active': 'Alquileres Activos',
        'dashboard.history': 'Historial de Alquileres',
        'dashboard.noActive': 'No hay alquileres activos',
        'dashboard.noHistory': 'Sin historial de alquileres',
        'dashboard.browsePlans': 'Ver Planes',
        'dashboard.virtualKey': 'Clave API Virtual',
        'dashboard.timeLeft': 'Tiempo Restante',
        'dashboard.tokensLeft': 'Tokens Restantes',
        'dashboard.tokensUsed': 'Tokens Usados',
        'dashboard.requests': 'Solicitudes',
        'dashboard.expired': 'Expirado',

        'playground.title': 'Área de Pruebas',
        'playground.subtitle': 'Prueba modelos de IA con tu clave de alquiler',
        'playground.send': 'Enviar',
        'playground.sending': 'Enviando...',
        'playground.selectModel': 'Seleccionar Modelo',
        'playground.enterPrompt': 'Escribe tu prompt...',
        'playground.copyCurl': 'Copiar cURL',
        'playground.response': 'Respuesta',

        'admin.title': 'Panel de Administración',
        'admin.overview': 'Resumen',
        'admin.users': 'Usuarios',
        'admin.plans': 'Planes',
        'admin.keys': 'Claves de Proveedor',
        'admin.analytics': 'Analíticas',
        'admin.alerts': 'Alertas',
        'admin.totalUsers': 'Total de Usuarios',
        'admin.activeRentals': 'Alquileres Activos',
        'admin.revenue': 'Ingresos',
        'admin.exportCsv': 'Exportar CSV',

        'status.title': 'Estado del Sistema',
        'status.healthy': 'Saludable',
        'status.degraded': 'Degradado',
        'status.down': 'Caído',

        'time.minutes': 'min',
        'time.hours': 'hora',
        'time.hoursPlural': 'horas',
        'time.days': 'día',
        'time.daysPlural': 'días',
    },

    hi: {
        'common.loading': 'लोड हो रहा है...',
        'common.error': 'एक त्रुटि हुई',
        'common.save': 'सहेजें',
        'common.cancel': 'रद्द करें',
        'common.delete': 'हटाएं',
        'common.confirm': 'पुष्टि करें',
        'common.back': 'वापस',
        'common.logout': 'लॉग आउट',
        'common.copied': 'क्लिपबोर्ड पर कॉपी किया गया!',

        'auth.login': 'लॉग इन',
        'auth.register': 'रजिस्टर',
        'auth.email': 'ईमेल',
        'auth.password': 'पासवर्ड',
        'auth.loginTitle': 'वापसी पर स्वागत है',
        'auth.registerTitle': 'खाता बनाएं',
        'auth.noAccount': 'खाता नहीं है?',
        'auth.hasAccount': 'पहले से खाता है?',

        'marketplace.title': 'AI API मार्केटप्लेस',
        'marketplace.subtitle': 'प्रीमियम AI मॉडल का एक्सेस किराए पर लें',
        'marketplace.purchase': 'खरीदें',
        'marketplace.purchasing': 'खरीद रहे हैं...',
        'marketplace.soldOut': 'बिक गया',
        'marketplace.oneTime': 'एकमुश्त भुगतान',
        'marketplace.tokenCap': 'टोकन',
        'marketplace.modelSelector': 'पसंदीदा मॉडल (चयन की परवाह किए बिना सभी मॉडल उपलब्ध हैं)',

        'dashboard.title': 'मेरे किराए',
        'dashboard.subtitle': 'अपने AI API किराए प्रबंधित करें',
        'dashboard.active': 'सक्रिय किराए',
        'dashboard.history': 'किराए का इतिहास',
        'dashboard.noActive': 'कोई सक्रिय किराया नहीं',
        'dashboard.noHistory': 'अभी तक कोई किराया इतिहास नहीं',
        'dashboard.browsePlans': 'प्लान देखें',
        'dashboard.virtualKey': 'वर्चुअल API कुंजी',
        'dashboard.timeLeft': 'शेष समय',
        'dashboard.tokensLeft': 'शेष टोकन',
        'dashboard.tokensUsed': 'उपयोग किए गए टोकन',
        'dashboard.requests': 'अनुरोध',
        'dashboard.expired': 'समाप्त',

        'playground.title': 'API खेल का मैदान',
        'playground.subtitle': 'अपनी किराये की कुंजी से AI मॉडल आज़माएं',
        'playground.send': 'भेजें',
        'playground.sending': 'भेज रहे हैं...',
        'playground.selectModel': 'मॉडल चुनें',
        'playground.enterPrompt': 'अपना प्रॉम्प्ट दर्ज करें...',
        'playground.copyCurl': 'cURL कॉपी करें',
        'playground.response': 'प्रतिक्रिया',

        'admin.title': 'एडमिन पैनल',
        'admin.overview': 'अवलोकन',
        'admin.users': 'उपयोगकर्ता',
        'admin.plans': 'प्लान',
        'admin.keys': 'प्रदाता कुंजियाँ',
        'admin.analytics': 'एनालिटिक्स',
        'admin.alerts': 'अलर्ट',
        'admin.totalUsers': 'कुल उपयोगकर्ता',
        'admin.activeRentals': 'सक्रिय किराए',
        'admin.revenue': 'राजस्व',
        'admin.exportCsv': 'CSV निर्यात',

        'status.title': 'सिस्टम स्थिति',
        'status.healthy': 'स्वस्थ',
        'status.degraded': 'अवक्रमित',
        'status.down': 'बंद',

        'time.minutes': 'मिनट',
        'time.hours': 'घंटा',
        'time.hoursPlural': 'घंटे',
        'time.days': 'दिन',
        'time.daysPlural': 'दिन',
    }
};

// ==============================
// Language metadata
// ==============================

export const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
];

// ==============================
// Zustand store for language state
// ==============================

const useLanguageStore = create((set) => ({
    language: localStorage.getItem('app_language') || 'en',
    setLanguage: (lang) => {
        localStorage.setItem('app_language', lang);
        set({ language: lang });
    },
}));

// ==============================
// Translation hook
// ==============================

export function useTranslation() {
    const { language, setLanguage } = useLanguageStore();

    const t = (key) => {
        const dict = translations[language] || translations.en;
        return dict[key] || translations.en[key] || key;
    };

    return { t, language, setLanguage, languages };
}

export default useLanguageStore;
