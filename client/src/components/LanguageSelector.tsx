import React from 'react';
import { useTranslation } from 'react-i18next';

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (event: React.ChangeEvent<HTMLSelectElement>) => {
    i18n.changeLanguage(event.target.value);
    localStorage.setItem('i18nextLng', event.target.value); 
  };

  return (
    <select
      className="h-9 w-[120px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      onChange={changeLanguage}
      value={i18n.language} 
    >
      <option value="pt">Português</option>
      <option value="en">English</option>
    </select>
  );
}