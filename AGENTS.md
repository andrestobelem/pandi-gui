## Git conventions

- Usar [Conventional Commits](https://www.conventionalcommits.org/) para los mensajes de commit.
- Mantener los commits atómicos: un cambio lógico y autocontenido por commit.
- Nunca agregar trailers `Co-authored-by` ni atribuciones de coautoría.

## Runtime and language

- Usar Node y npm para el runtime, los scripts, los tests y la gestión de dependencias (`npm`/`npx`).
- La aplicación corre sobre el Node embebido de Electron; no agregar otro runtime JavaScript de producción sin una nueva decisión arquitectónica.
- Escribir el código nuevo en TypeScript.

## Software development lifecycle

Seguir el SDLC completo definido en `docs/agents/sdlc.md` para todo cambio: issue, triage, especificación, planificación, implementación, verificación, revisión, integración y release.

## Agent skills

### Issue tracker

Los issues viven en GitHub Issues. Ver `docs/agents/issue-tracker.md`.

### Triage labels

Se usan las etiquetas predeterminadas de triage. Ver `docs/agents/triage-labels.md`.

### Domain docs

Repositorio single-context: `CONTEXT.md` y `docs/adr/` en la raíz. Ver `docs/agents/domain.md`.
