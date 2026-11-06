import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useLang } from "../context/LanguageContext";
import { languageToSave } from "../utils/languageToSave";

// Renders nothing. Keeps the logged-in account's saved language in step with
// the language the site is showing (see utils/languageToSave.js).
export default function LanguageSync() {
  const { lang } = useLang();
  const { user, updateUser } = useAuth();
  const tried = useRef(null);

  useEffect(() => {
    const next = languageToSave(user, lang, tried.current);
    if (!next) return;
    tried.current = `${user.id}:${next}`;
    updateUser({ language: next });
  }, [user, lang, updateUser]);

  return null;
}
