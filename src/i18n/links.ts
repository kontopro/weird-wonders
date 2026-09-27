import { langParam, useLang } from "@/i18n";

/** Current language plus the value for the `{-$lang}` route param in links. */
export function useLocalized() {
  const lang = useLang();
  return { lang, lp: langParam(lang) };
}
