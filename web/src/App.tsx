import { useEffect, useState } from 'react';

type InterfaceLanguage = 'ar' | 'en';

// Placeholder product name (spec: "Masar" until the owner picks the final name). Arabic strings need a fluent
// reader's check before the pilot (CODING_STANDARDS 3.5).
const STRINGS = {
  ar: { appName: 'مسار', dir: 'rtl', other: 'en', switchLabel: 'English' },
  en: { appName: 'Masar', dir: 'ltr', other: 'ar', switchLabel: 'العربية' },
} as const;

// shortcut: the interface language lives in memory only; the Settings ticket stores it server-side.
export function App() {
  const [language, setLanguage] = useState<InterfaceLanguage>('ar');
  const strings = STRINGS[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = strings.dir;
    document.title = strings.appName;
  }, [language, strings]);

  return (
    <>
      <header className="app-header">
        <span className="app-name">{strings.appName}</span>
        <button type="button" lang={strings.other} onClick={() => setLanguage(strings.other)}>
          {strings.switchLabel}
        </button>
      </header>
      <main className="app-main" />
    </>
  );
}
