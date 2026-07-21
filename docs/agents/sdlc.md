# Software Development Lifecycle

Este repositorio sigue Continuous Delivery al estilo de Dave Farley. El objetivo no es completar fases ni producir documentos: es **aprender rápido, integrar cambios pequeños y mantener el software desplegable**.

Fuentes y decisiones: `docs/research/dave-farley-ci-cd.md`.

## Invariantes

- `main` está siempre verde y potencialmente desplegable.
- El trabajo se integra a trunk en lotes pequeños, idealmente varias veces por día.
- Cada commit integrado recibe feedback automatizado en minutos.
- Una pipeline rota tiene prioridad sobre trabajo nuevo.
- Todo cambio destinado a producción atraviesa el mismo deployment pipeline.
- El candidato se construye una vez y el mismo artefacto inmutable se promueve entre entornos.
- Desplegar y liberar una capacidad son decisiones separadas.
- TypeScript es el lenguaje, Node es el runtime y npm gestiona las dependencias y ejecuta los scripts.
- Los commits son atómicos, usan Conventional Commits y nunca incluyen `Co-authored-by`.

## El ciclo

No es un proceso waterfall. Un cambio recorre este loop en el menor lote seguro y vuelve a empezarlo con lo aprendido:

`hipótesis → cambio pequeño → feedback → integración → despliegue → observación → aprendizaje`

### 1. Formular la hipótesis

Expresar qué problema observamos, para quién, qué resultado esperamos y cómo sabremos si mejoró.

La documentación debe ser proporcional:

- Crear un issue para cambios de comportamiento, bugs, riesgos, incidentes o trabajo que requiera coordinación.
- Una corrección trivial de documentación o mantenimiento puede quedar trazada solamente por su commit.
- Escribir una especificación cuando el problema tenga decisiones o alcance no obvios.
- Crear tickets separados solo cuando el cambio no entre en un lote pequeño verificable.
- Crear un ADR únicamente para decisiones duraderas, transversales o costosas de revertir.

No se implementa un issue marcado `needs-triage` o `needs-info`.

### 2. Diseñar para recibir feedback

Antes de implementar:

- identificar el comportamiento observable que debe cambiar;
- elegir el seam público más alto y estable desde el cual probarlo;
- definir ejemplos y criterios de aceptación verificables;
- reducir el cambio a un tracer bullet vertical;
- preferir diseños simples, modulares, cohesivos y fáciles de probar.

Las capacidades grandes se construyen incrementalmente. El código incompleto se mantiene oculto con feature flags, branch by abstraction o cambios compatibles hacia atrás; no se conserva aislado en una rama larga.

### 3. Implementar con TDD

Trabajar en ciclos cortos:

1. **Red:** una prueba de comportamiento falla por la razón esperada.
2. **Green:** implementar lo mínimo para hacerla pasar.
3. **Refactor:** mejorar el diseño con todas las pruebas verdes.
4. **Commit:** guardar un incremento atómico y coherente.

Las pruebas verifican contratos y comportamiento público, no detalles internos. Los nombres usan el lenguaje de `CONTEXT.md` cuando exista.

### 4. Integrar continuamente

- Trabajar directamente sobre trunk o mediante una rama/PR que viva menos de un día.
- Sincronizar e integrar al menos diariamente; apuntar a múltiples integraciones por día.
- Los PRs sirven para colaboración o control de riesgo, no para acumular cambios ni esperar ceremonias.
- La revisión puede ser pairing, revisión de PR o revisión posterior según el riesgo; nunca debe convertir una integración pequeña en un lote grande.
- Ante un commit rojo, revertirlo o arreglarlo inmediatamente.

## Deployment pipeline

El pipeline es un sistema de falsificación: intenta demostrar cuanto antes que un candidato **no** es apto. Los controles más rápidos y baratos van primero.

### Etapa 1 — Commit stage

Corre en cada push y PR. Objetivo: terminar en menos de 10 minutos; aspiración: menos de 5.

1. Checkout del commit exacto.
2. `npm ci`.
3. Verificación de formato y lint.
4. Chequeo estático de TypeScript.
5. Pruebas rápidas y deterministas.
6. Build/empaquetado reproducible.
7. Publicación de un artefacto inmutable identificado por commit SHA y digest.

Si falla, el candidato termina aquí.

### Etapa 2 — Acceptance

Sobre el artefacto de la etapa anterior:

- pruebas de aceptación en seams públicos;
- pruebas de integración y contrato necesarias;
- controles de seguridad, dependencias y licencias relevantes;
- validación de migraciones y compatibilidad hacia atrás.

Estos controles se paralelizan cuando sea posible. Las pruebas lentas o inestables se mejoran; no se acepta que degraden silenciosamente el feedback.

### Etapa 3 — Despliegue representativo

Desplegar automáticamente el mismo artefacto en un entorno similar a producción y ejecutar:

- smoke tests;
- health checks;
- validación de configuración e infraestructura;
- pruebas no funcionales justificadas por el riesgo, como rendimiento, resiliencia o seguridad dinámica.

### Etapa 4 — Producción

Promover el mismo artefacto, sin reconstruirlo. El despliegue debe ser repetible y permitir roll-forward o rollback seguro. Después:

- verificar salud y comportamiento;
- observar errores, latencia y señales de producto;
- detener o revertir ante una regresión confirmada.

No existe una ruta manual alternativa a producción. Una intervención de emergencia también queda registrada y luego se automatiza o elimina.

## Continuous Delivery vs. Continuous Deployment

La política inicial es **Continuous Delivery**: todo candidato verde queda listo para producción y una decisión explícita inicia su promoción.

Se podrá adoptar **Continuous Deployment** —promoción automática tras una pipeline verde— cuando haya:

- pipeline confiable y rápida;
- despliegue pequeño y reversible;
- observabilidad suficiente;
- mecanismos seguros para cambios de datos;
- capacidad demostrada de recuperar rápidamente.

Una feature flag puede mantener una capacidad desactivada luego del despliegue. **Deploy no significa release.**

## Trazabilidad automática

La pipeline conserva y relaciona:

- issue o hipótesis, cuando exista;
- commits y revisión;
- resultados de pruebas y controles;
- versión y digest del artefacto;
- entorno, configuración y momento de cada despliegue;
- aprobación de release, cuando exista;
- resultado de health checks.

La trazabilidad es un subproducto de la automatización, no un formulario paralelo.

## Feedback de producción

Después del release se contrasta la hipótesis con evidencia. Bugs, deuda e incidentes vuelven al ciclo como información nueva.

Para incidentes:

1. restaurar el servicio;
2. conservar evidencia;
3. entender qué feedback faltó o llegó tarde;
4. agregar la prueba, señal o protección más temprana que habría detectado el problema;
5. ejecutar la acción correctiva como un lote pequeño.

Medir al menos:

- frecuencia de despliegue;
- lead time desde commit hasta producción;
- tasa de fallos por cambio;
- tiempo de recuperación;
- duración y tasa de éxito de la pipeline.

Las métricas se usan para mejorar el sistema, no para evaluar individuos.

## Criterio de terminado

Un cambio está terminado cuando:

- el comportamiento esperado está demostrado;
- los controles aplicables están verdes;
- está integrado en `main`;
- el artefacto está listo para promover o ya fue desplegado, según el alcance;
- la documentación o ADR cambió si el contrato o la decisión cambió;
- la evidencia permite rastrear necesidad, commit, pruebas y artefacto.

## Estado actual del repositorio

Este repositorio todavía no contiene `package.json`, código TypeScript, scripts de calidad, artefacto desplegable ni destino de despliegue. Por eso **todavía no tiene CI/CD operativo**; solo tiene la política.

Para volverla ejecutable, en este orden:

1. definir qué producto genera el repositorio;
2. definir el destino de despliegue/publicación;
3. crear el proyecto Node + TypeScript y sus scripts de verificación;
4. implementar el commit stage en GitHub Actions;
5. empaquetar y publicar un artefacto inmutable;
6. agregar acceptance y un entorno representativo;
7. automatizar la promoción a producción y la observación posterior.

No se simularán etapas vacías para afirmar que existe CD antes de contar con un producto desplegable.

## Skills relacionadas

- `triage`: clasifica trabajo entrante.
- `to-spec`: formaliza una hipótesis compleja.
- `to-tickets`: divide trabajo grande en tracer bullets.
- `tdd`: guía red → green → refactor.
- `code-review`: contrasta el cambio con especificación y estándares.
- `domain-modeling`: mantiene el lenguaje y las decisiones del dominio.
