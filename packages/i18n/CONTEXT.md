# CONTEXT.md — i18n

Ubiquitous language. Glossary only. No implementation.

## Terms

- **I18n**: native locale catalogs. Enabled with `i18n` in `Config`. Files live in `src/locales/<lang>/<namespace>.json`.
- **Namespace**: one JSON file per language folder. Addressed as `ns:key`; dotted keys split on the first segment.
- **Translate**: lookup via `t()` with default-locale fallback. Unknown keys echo.
- **Available locales**: loaded locale names via `availableLocales()`. Reflects the `languages` allowlist when set.
- **Raw lookup**: one-locale read with no default-locale fallback. Undefined on a missing key. Used to fill command metadata localizations. Via `lookup()`.
