import React, { useState, useRef, useEffect } from 'react';
import { Globe } from 'lucide-react';
import { useTranslation } from '../i18n';

/**
 * Language selector dropdown — shows flag + language name.
 * Persists choice to localStorage automatically via the i18n store.
 */
export default function LanguageSwitcher() {
    const { language, setLanguage, languages } = useTranslation();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const current = languages.find(l => l.code === language) || languages[0];

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(!open)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all text-white text-sm"
                title="Change language"
            >
                <Globe className="w-4 h-4" />
                <span>{current.flag}</span>
                <span className="hidden sm:inline">{current.name}</span>
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-2 bg-gray-900 border border-white/20 rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
                    {languages.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => { setLanguage(lang.code); setOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all hover:bg-white/10 ${
                                language === lang.code
                                    ? 'bg-purple-500/20 text-purple-300'
                                    : 'text-white'
                            }`}
                        >
                            <span className="text-lg">{lang.flag}</span>
                            <span>{lang.name}</span>
                            {language === lang.code && (
                                <span className="ml-auto text-purple-400">✓</span>
                            )}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
