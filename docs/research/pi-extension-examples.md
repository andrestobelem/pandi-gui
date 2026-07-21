# Catálogo explicado de las extensiones de ejemplo de Pi

## Alcance

Este documento explica, uno por uno, los **78 ejemplos de extensiones** incluidos en `@earendil-works/pi-coding-agent` **0.81.0**. El relevamiento usa como fuentes primarias el código y la documentación instalados con el paquete.

Los ejemplos son material didáctico: muestran una API o patrón de integración, pero no necesariamente incluyen el endurecimiento, la portabilidad o la experiencia de producto requeridos para producción. En particular, una extensión se ejecuta con los permisos completos del proceso de Pi; solo deben cargarse fuentes confiables.

## Cómo ejecutar un ejemplo

Para probar un archivo individual:

```bash
pi --extension /ruta/al/ejemplo.ts
# equivalente corto
pi -e /ruta/al/ejemplo.ts
```

Para ejemplos organizados como paquete o directorio, se carga el directorio o su `index.ts`. Si contiene `package.json`, primero se instalan sus dependencias con `npm install` dentro del directorio.

Para mantener una extensión activa y recargable, se copia a `~/.pi/agent/extensions/` o a `.pi/extensions/` dentro del Workspace y luego se usa `/reload`.

## Los 78 ejemplos

### 1. [`auto-commit-on-exit.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/auto-commit-on-exit.ts)

Escucha `session_shutdown` y, si encuentra cambios, crea automáticamente un commit usando la última Response como base del mensaje. Enseña cleanup de sesión, lectura del Transcript y ejecución de Git mediante `pi.exec`; debe tratarse como ejemplo riesgoso porque decide y persiste cambios sin una revisión final explícita.

### 2. [`bash-spawn-hook.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/bash-spawn-hook.ts)

Recrea la herramienta `bash` con `createBashTool()` y modifica cada proceso antes de iniciarlo mediante `spawnHook`. El ejemplo carga `~/.profile` y agrega `PI_SPAWN_HOOK=1`, mostrando cómo ajustar comando, directorio y entorno sin reimplementar el backend de procesos.

### 3. [`bookmark.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/bookmark.ts)

Agrega `/bookmark` y `/unbookmark` para etiquetar entradas del Transcript con `pi.setLabel()`. Las etiquetas quedan persistidas y aparecen en `/tree`, por lo que el ejemplo sirve para navegación, checkpoints semánticos y metadata de sesión.

### 4. [`border-status-editor.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/border-status-editor.ts)

Reemplaza el editor con una subclase de `CustomEditor` cuyos bordes muestran modelo, nivel de razonamiento, uso de contexto, directorio y rama Git. También oculta el indicador y footer estándar, anima un spinner durante el Run y demuestra composición avanzada de editor, lifecycle y renderizado sensible al ancho.

### 5. [`built-in-tool-renderer.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/built-in-tool-renderer.ts)

Vuelve a registrar `read`, `bash`, `edit` y `write`, delegando la ejecución a las implementaciones originales pero reemplazando `renderCall` y `renderResult`. Es la referencia para cambiar la representación visual de Tool Activity sin alterar su comportamiento real.

### 6. [`claude-rules.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/claude-rules.ts)

Descubre archivos dentro de `.claude/rules/` y agrega al system prompt un índice para que el Coding Agent pueda leer las reglas pertinentes bajo demanda. Muestra cómo combinar `session_start`, filesystem y `before_agent_start` sin insertar siempre el contenido completo de todas las reglas.

### 7. [`commands.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/commands.ts)

Implementa `/commands` usando `pi.getCommands()` para listar comandos provenientes de extensiones, prompts y skills. Incluye autocompletado del filtro por origen, selector interactivo y acceso a `sourceInfo`, por lo que también enseña cómo mostrar provenance sin inferirla desde el nombre.

### 8. [`confirm-destructive.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/confirm-destructive.ts)

Intercepta `session_before_switch` y `session_before_fork` para pedir confirmación antes de reemplazar, limpiar o ramificar una Session. Demuestra que los eventos `before_*` pueden devolver `{ cancel: true }` y actuar como barreras de seguridad.

### 9. [`custom-compaction.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/custom-compaction.ts)

Reemplaza la compactación estándar desde `session_before_compact` y produce un resumen personalizado de todo el contexto con otro modelo. Enseña el contrato de una compactación aportada por extensión, el uso de `signal` y cómo contabilizar el uso de una llamada de modelo anidada.

### 10. [`custom-footer.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/custom-footer.ts)

El comando `/footer` alterna un footer propio creado con `ctx.ui.setFooter()`. La implementación consume datos como rama Git, estados de otras extensiones, modelo y uso de contexto, mostrando cómo sustituir por completo el footer y luego restaurar el incorporado.

### 11. [`custom-header.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/custom-header.ts)

Instala un header personalizado al iniciar la Session y ofrece `/builtin-header` para volver al original. Es un ejemplo mínimo de `ctx.ui.setHeader()` y de construcción de componentes TUI para reemplazar branding e indicaciones iniciales.

### 12. [`custom-provider-anthropic/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/custom-provider-anthropic)

Registra `custom-anthropic`, un provider completo con autenticación OAuth, modelos propios y una implementación de streaming basada en el SDK oficial de Anthropic. Enseña la variante avanzada de `registerProvider`: login, refresh de credenciales, catálogo y adaptación de eventos del proveedor; requiere instalar `@anthropic-ai/sdk`.

### 13. [`custom-provider-gitlab-duo/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/custom-provider-gitlab-duo)

Integra GitLab Duo a través del AI Gateway y expone modelos Claude y GPT reutilizando los streamers Anthropic/OpenAI de `pi-ai`. Muestra autenticación con token de GitLab, OAuth, headers y compatibilidad específica del gateway sin reimplementar todos los protocolos de modelo.

### 14. [`dirty-repo-guard.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/dirty-repo-guard.ts)

Consulta `git status` antes de cambiar o bifurcar la Session y avisa cuando hay cambios sin commit. A diferencia de un hook sobre herramientas, protege transiciones de sesión mediante `session_before_switch` y `session_before_fork`.

### 15. [`doom-overlay/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/doom-overlay)

Añade `/doom-overlay` y ejecuta DOOM, compilado a WebAssembly, en un overlay centrado a 35 FPS. Demuestra renderizado TUI en tiempo real, color de 24 bits, controles de teclado y overlays responsivos; descarga el WAD shareware en el primer uso.

### 16. [`dynamic-resources/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/dynamic-resources)

Responde a `resources_discover` aportando rutas de skills, prompts y themes durante startup o reload. Es el patrón para generar o seleccionar recursos dinámicamente sin copiarlos a las ubicaciones estándar de descubrimiento.

### 17. [`dynamic-tools.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/dynamic-tools.ts)

Registra una herramienta durante `session_start` y permite agregar otras en caliente con `/add-echo-tool <name>`. Prueba que `registerTool()` puede usarse después del arranque y que las herramientas nuevas quedan disponibles inmediatamente, incluyendo metadata para el system prompt.

### 18. [`entry-renderer.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/entry-renderer.ts)

El comando `/status-card` persiste una entrada con `pi.appendEntry()` y la dibuja mediante `registerEntryRenderer()`. La diferencia central es que la tarjeta aparece en el Transcript pero **no** entra en el contexto del modelo, apropiado para UI y estado durable exclusivo del Developer.

### 19. [`event-bus.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/event-bus.ts)

Muestra comunicación entre extensiones mediante el bus compartido `pi.events`. Un listener se registra al iniciar y `/emit` publica un evento, ilustrando integración desacoplada sin imports directos entre extensiones.

### 20. [`file-trigger.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/file-trigger.ts)

Observa un archivo externo —por defecto `/tmp/agent-trigger.txt`— y, cuando aparece contenido, lo inyecta con `pi.sendMessage()`. Sirve como puente sencillo para webhooks, automatizaciones o procesos externos y muestra la obligación de cerrar watchers en `session_shutdown`.

### 21. [`git-checkpoint.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/git-checkpoint.ts)

Crea checkpoints Git alrededor de los turnos y asocia el estado del árbol de trabajo con puntos del Transcript. Al usar `/fork`, puede ofrecer restaurar el código al checkpoint correspondiente; combina eventos de turno, resultados de herramientas, branching de sesión y operaciones Git.

### 22. [`git-merge-and-resolve.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/git-merge-and-resolve.ts)

Después de `agent_end`, hace fetch y merge del upstream cuando el árbol está limpio. Si hay conflictos, detecta sus marcadores y envía un Prompt de seguimiento con archivos y rangos `ours/theirs`, dejando que el Coding Agent resuelva el merge; es deliberadamente invasivo y no debería habilitarse sin aceptar esa política Git.

### 23. [`github-issue-autocomplete.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/github-issue-autocomplete.ts)

Precarga issues abiertos mediante `gh issue list` y agrega sugerencias `#1234` encima del autocomplete incorporado. Enseña `ctx.ui.addAutocompleteProvider()`, delegación al provider anterior y caché local para evitar ejecutar `gh` en cada tecla.

### 24. [`gondolin/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/gondolin)

Redirige herramientas incorporadas y comandos `!` a una micro-VM Gondolin, montando el Workspace como `/workspace`. Demuestra operaciones remotas/sustituibles, lifecycle de una VM, `user_bash` y modificación del system prompt para explicar al modelo el entorno invitado.

### 25. [`handoff.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/handoff.ts)

`/handoff <objetivo>` resume lo relevante y crea una Session nueva y enfocada, como alternativa a seguir compactando una sesión larga. El ejemplo cubre selección de modelo, UI transitoria, `ctx.newSession()` y el uso seguro del contexto nuevo dentro de `withSession`.

### 26. [`hello.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/hello.ts)

Es el ejemplo mínimo de una herramienta personalizada: declara parámetros con TypeBox, registra `hello` y devuelve contenido textual más `details`. Es el mejor punto de partida para entender la forma básica de `pi.registerTool()`.

### 27. [`hidden-thinking-label.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/hidden-thinking-label.ts)

Personaliza el rótulo que sustituye bloques de razonamiento ocultos con `ctx.ui.setHiddenThinkingLabel()`. El comando `/thinking-label` permite alternar variantes y probar cómo la función recibe información del bloque oculto.

### 28. [`inline-bash.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/inline-bash.ts)

Expande expresiones `!{comando}` dentro del Prompt antes de enviarlo al modelo. Usa el evento `input`, ejecuta los comandos y devuelve una transformación del texto, mostrando preprocesamiento de entrada con resultados locales incorporados.

### 29. [`input-transform-streaming.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/input-transform-streaming.ts)

Consulta `event.streamingBehavior` para distinguir Prompts normales, steering y follow-ups. Omite preprocesamiento costoso durante steering de baja latencia y demuestra cómo una transformación debe adaptarse al momento en que llega la entrada.

### 30. [`input-transform.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/input-transform.ts)

Implementa los tres resultados del evento `input`: `continue`, `transform` y `handled`. `?quick` reescribe el Prompt, mientras `ping` y `time` responden mediante UI sin iniciar un Run del modelo.

### 31. [`interactive-shell.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/interactive-shell.ts)

Intercepta `user_bash` para ejecutar programas interactivos como Vim, `htop` o `git rebase -i` con control completo de terminal. Suspende temporalmente la TUI de Pi y la restaura al terminar, un patrón distinto de capturar stdout con la herramienta `bash` normal.

### 32. [`kimi-deferred-tools.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/kimi-deferred-tools.ts)

Presenta un buscador `tool_search` y mantiene una calculadora fuera del conjunto activo hasta que el modelo la solicita. Es una demostración mínima de herramientas diferidas: registrar todo, activar dinámicamente con `setActiveTools()` y reducir el conjunto inicial de schemas.

### 33. [`mac-system-theme.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/mac-system-theme.ts)

Detecta si macOS está en modo claro u oscuro y sincroniza el theme de Pi; además observa cambios mientras la Session está abierta. Enseña `getTheme()`/`setTheme()`, integración con el sistema operativo y cleanup de procesos o timers.

### 34. [`message-renderer.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/message-renderer.ts)

Registra un renderer para mensajes personalizados y ofrece `/status` para emitir uno con color, formato y detalles expandibles. A diferencia de `entry-renderer.ts`, estos mensajes creados con `sendMessage()` sí participan en el contexto del modelo.

### 35. [`minimal-mode.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/minimal-mode.ts)

Sobrescribe el renderizado de `read`, `bash`, `write`, `edit`, `find`, `grep` y `ls`. En vista colapsada muestra solo la invocación y reserva el resultado completo para la vista expandida, demostrando una presentación de Tool Activity más silenciosa.

### 36. [`modal-editor.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/modal-editor.ts)

Reemplaza el editor por una subclase de `CustomEditor` con modos similares a Vim: insert, normal, movimiento con `hjkl` y comandos de edición. Muestra cómo interceptar teclas propias y delegar las restantes a `super.handleInput()` para conservar keybindings globales.

### 37. [`model-status.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/model-status.ts)

Escucha `model_select` y actualiza un estado del footer con provider/modelo y origen del cambio. Es la referencia mínima para reaccionar a `/model`, ciclos por teclado o restauración de una Session.

### 38. [`notify.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/notify.ts)

Envía una notificación de escritorio desde el terminal cuando el Coding Agent termina y espera otra entrada. Usa secuencias OSC compatibles con terminales como Ghostty, iTerm2 y WezTerm, mostrando una integración externa disparada por lifecycle.

### 39. [`overlay-qa-tests.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/overlay-qa-tests.ts)

Incluye una batería manual de comandos para probar anchors, márgenes, porcentajes, stacking, foco, ocultamiento, overflow, side panels y animación. No es una feature única sino un laboratorio de QA para `ctx.ui.custom({ overlay: true })` y `OverlayHandle`.

### 40. [`overlay-test.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/overlay-test.ts)

`/overlay-test` abre un modal flotante con inputs inline y casos difíciles como emoji, caracteres anchos y texto con estilos ANSI. Es una prueba compacta de composición y manejo de teclado dentro de overlays.

### 41. [`permission-gate.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/permission-gate.ts)

Intercepta `tool_call` y pide confirmación antes de comandos `bash` que coinciden con patrones peligrosos como `rm -rf`, `sudo` o permisos 777. Enseña bloqueo preventivo mediante `{ block: true, reason }`; una lista por patrones no reemplaza una política de seguridad completa.

### 42. [`pirate.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/pirate.ts)

El comando `/pirate` cambia estado interno y `before_agent_start` modifica el system prompt para que el Coding Agent responda como pirata. Es una demostración pequeña de comportamiento dinámico por turno y de cómo encadenar cambios al prompt efectivo.

### 43. [`plan-mode/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/plan-mode)

Implementa un modo de planificación de solo lectura con `/plan`, flag `--plan` y shortcut. Deshabilita `edit`/`write`, filtra `bash` con una allowlist, extrae pasos numerados, persiste el plan y muestra progreso con `[DONE:n]`; es uno de los ejemplos más completos de coordinación entre tools, eventos, UI y estado.

### 44. [`preset.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/preset.ts)

Define presets nombrados de modelo, thinking level, herramientas e instrucciones. Se activan con `--preset`, `/preset` o un shortcut y se guardan en JSON, mostrando configuración compuesta, autocompletado, `setModel()`, `setThinkingLevel()` y `setActiveTools()`.

### 45. [`project-trust.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/project-trust.ts)

Implementa el evento temprano `project_trust` para decidir, recordar o dejar indeterminada la confianza de un Workspace. Debe instalarse globalmente o cargarse con `-e`, porque una extensión local todavía no puede decidir si su propio Workspace es confiable.

### 46. [`prompt-customizer.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/prompt-customizer.ts)

Lee `systemPromptOptions` dentro de `before_agent_start` para saber qué herramientas, skills e instrucciones están realmente activas. Agrega orientación contextual sin redescubrir recursos ni ignorar los append prompts proporcionados por el Developer.

### 47. [`protected-paths.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/protected-paths.ts)

Bloquea `write` y `edit` cuando el destino coincide con rutas sensibles como `.env`, `.git/` o `node_modules/`. Ilustra narrowing tipado de eventos de herramientas y una política por path; para producción también habría que considerar normalización, symlinks y otras herramientas mutadoras.

### 48. [`provider-payload.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/provider-payload.ts)

Registra `before_provider_request` y `after_provider_response` para escribir payloads, status y headers en `.pi/provider-payload.log`. Es útil para depurar serialización y caching del provider, pero puede registrar Prompts, código y credenciales sensibles, por lo que no debería quedar habilitado indiscriminadamente.

### 49. [`qna.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/qna.ts)

`/qna` analiza la última Response, extrae preguntas y permite elegir o editar respuestas mediante UI. Finalmente precarga texto en el editor con `setEditorText()`, mostrando el patrón “generador de Prompt”: transformar una Response en la próxima entrada del Developer.

### 50. [`question.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/question.ts)

Registra una herramienta `question` con opciones y entrada libre. Usa `ctx.ui.custom()` para combinar lista y editor inline, y devuelve la elección al modelo como resultado de herramienta.

### 51. [`questionnaire.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/questionnaire.ts)

Amplía el patrón anterior con una herramienta `questionnaire` que admite una o varias preguntas. Para múltiples preguntas ofrece tabs, navegación, respuestas parciales y confirmación conjunta, mostrando una UI modal con estado más complejo.

### 52. [`rainbow-editor.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/rainbow-editor.ts)

Decora la palabra `ultrathink` con un brillo animado dentro de un editor personalizado. Es un ejemplo deliberadamente visual de renderizado dinámico, timers, invalidación y extensión de `CustomEditor`.

### 53. [`reload-runtime.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/reload-runtime.ts)

Agrega `/reload-runtime`, que llama `ctx.reload()`, y la herramienta `reload_runtime`, que encola ese comando como follow-up. Enseña por qué el reload pertenece a `ExtensionCommandContext` y cómo tratarlo como operación terminal para no reutilizar estado de la instancia vieja.

### 54. [`rpc-demo.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/rpc-demo.ts)

Ejercita métodos de UI soportados por modo RPC: input, editor, confirmación, notificaciones, status, widgets y prefill. Está pensado para ejecutarse junto al cliente de ejemplo `examples/rpc-extension-ui.ts` y verificar el protocolo UI bidireccional fuera de la TUI.

### 55. [`sandbox/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/sandbox)

Usa `@anthropic-ai/sandbox-runtime` para aplicar restricciones de filesystem y red a comandos `bash` a nivel del sistema operativo. Incluye configuración por Workspace, comando `/sandbox`, flag `--no-sandbox` y soporte para `user_bash`; depende de `sandbox-exec` en macOS o Bubblewrap en Linux.

### 56. [`send-user-message.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/send-user-message.ts)

Expone `/ask`, `/steer`, `/followup` y `/askwith` para demostrar `pi.sendUserMessage()`. A diferencia de un mensaje custom, genera un Prompt real y enseña las reglas de entrega inmediata, steering durante streaming y follow-up después de que el Run se estabilice.

### 57. [`session-name.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/session-name.ts)

`/session-name` consulta o cambia el nombre visible de la Session con `getSessionName()` y `setSessionName()`. El nombre se persiste y reemplaza al primer Prompt como etiqueta en el selector de sesiones.

### 58. [`shutdown-command.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/shutdown-command.ts)

Agrega `/quit` y herramientas que solicitan salida mediante `ctx.shutdown()`. Demuestra shutdown cooperativo: Pi espera un punto seguro, emite `session_shutdown` para cleanup y luego termina, en vez de finalizar abruptamente el proceso.

### 59. [`snake.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/snake.ts)

`/snake` abre un juego de Snake como componente TUI interactivo. Sirve como ejemplo accesible de loop de animación, teclado, renderizado custom y persistencia de estado en la Session.

### 60. [`space-invaders.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/space-invaders.ts)

`/invaders` ejecuta Space Invaders con movimiento suave usando eventos press/release del protocolo de teclado Kitty. Implementa game loop, colisiones, caché de render, pausa y guardado mediante `appendEntry()`, mostrando una UI custom de alta interacción.

### 61. [`ssh.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/ssh.ts)

Con `--ssh`, sustituye las operaciones de `read`, `write`, `edit` y `bash` para ejecutarlas en una máquina remota. También redirige `user_bash` y modifica el system prompt para que el Coding Agent entienda el entorno; requiere acceso SSH ya configurado.

### 62. [`status-line.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/status-line.ts)

Actualiza una sección persistente del footer con `ctx.ui.setStatus()` al iniciar, comenzar y terminar turnos. Demuestra colores del theme y estados pequeños que conviven con el footer estándar.

### 63. [`structured-output.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/structured-output.ts)

Define `structured_output`, una herramienta final con schema estricto y `terminate: true`. El objetivo es que el Run pueda acabar en el resultado estructurado sin pagar otra llamada al modelo, siempre que todas las herramientas finalizadas en ese batch también sean terminantes.

### 64. [`subagent/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent)

Registra `subagent`, que inicia procesos Pi separados con contextos aislados. Soporta ejecución individual, paralela y encadenada, streaming de progreso, límites de concurrencia, cancelación y contabilidad de uso; además descubre definiciones Markdown de agentes globales o, con consentimiento, locales al Workspace.

### 65. [`summarize.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/summarize.ts)

`/summarize` llama a otro modelo para resumir la Session y muestra el resultado en una UI transitoria. Demuestra llamadas de modelo anidadas, selección explícita de provider/modelo, loader cancelable y renderizado Markdown.

### 66. [`system-prompt-header.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/system-prompt-header.ts)

Durante `agent_start`, obtiene el system prompt efectivo con `ctx.getSystemPrompt()` y muestra su longitud en el footer. Limpia el estado durante `session_shutdown`, por lo que es una referencia mínima de inspección del prompt y lifecycle de UI.

### 67. [`tic-tac-toe.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/tic-tac-toe.ts)

Permite que el Developer juegue con `/tic-tac-toe` mientras el modelo juega mediante herramientas. Usa `executionMode: "sequential"` para serializar acciones sobre estado compartido, persiste el tablero y sincroniza UI, contexto y navegación del árbol de sesión.

### 68. [`timed-confirm.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/timed-confirm.ts)

Ofrece `/timed`, `/timed-select` y `/timed-signal` para diálogos que se descartan automáticamente. Compara el timeout incorporado —con countdown— con un `AbortSignal`, que permite distinguir expiración de cancelación manual.

### 69. [`titlebar-spinner.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/titlebar-spinner.ts)

Anima un spinner Braille en el título del terminal durante `agent_start`/`agent_end`. Muestra `ctx.ui.setTitle()`, timers e higiene de cleanup en `session_shutdown`.

### 70. [`todo.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/todo.ts)

Registra la herramienta `todo` para que el modelo administre tareas y `/todos` para que el Developer las vea. Persiste snapshots en `details`, reconstruye estado en `session_start` y `session_tree`, y personaliza el render de llamadas y resultados; es el ejemplo principal de estado compatible con branching.

### 71. [`tool-override.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/tool-override.ts)

Reemplaza la herramienta incorporada `read` con una variante que registra accesos y aplica controles, además de exponer `/read-log`. Enseña que una extensión puede usar el mismo nombre que una herramienta built-in y que debe conservar exactamente su contrato de resultado.

### 72. [`tools.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/tools.ts)

Implementa `/tools`, una pantalla basada en `SettingsList` para habilitar o deshabilitar herramientas. Usa `getAllTools()`, `getActiveTools()` y `setActiveTools()`, y persiste la selección de forma compatible con reload y navegación por ramas.

### 73. [`trigger-compact.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/trigger-compact.ts)

Llama `ctx.compact()` cuando el uso de contexto supera un umbral y agrega `/trigger-compact` para activación manual. Muestra callbacks de éxito/error y la diferencia entre solicitar una compactación y bloquear esperando su finalización.

### 74. [`truncated-tool.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/truncated-tool.ts)

Envuelve Ripgrep como herramienta `rg` y limita la salida a 50 KB o 2000 líneas con las utilidades oficiales de truncamiento. Si recorta, guarda el resultado completo en un archivo temporal e informa su ubicación, evitando saturar el contexto del modelo.

### 75. [`widget-placement.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/widget-placement.ts)

Coloca un widget arriba y otro debajo del editor durante `session_start`. Es el ejemplo mínimo de `ctx.ui.setWidget()` y de su opción `placement: "belowEditor"`.

### 76. [`with-deps/`](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions/with-deps)

Es una extensión empaquetada con su propio `package.json` y dependencia `ms`. Registra `parse_duration` para probar que Jiti resuelve módulos desde el `node_modules` de la extensión; requiere ejecutar `npm install` en el directorio.

### 77. [`working-indicator.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/working-indicator.ts)

Personaliza el símbolo animado que aparece mientras Pi genera una Response. `/working-indicator` alterna distintas secuencias, colores o restauración del valor predeterminado mediante `ctx.ui.setWorkingIndicator()`.

### 78. [`working-message-test.ts`](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/working-message-test.ts)

Configura un mensaje `Working... (custom)` y un punto de color durante `session_start`. Su propósito es de regresión/manual QA: verificar que `setWorkingMessage()` y `setWorkingIndicator()` sobrevivan a la recreación del loader entre Runs.

## Qué ejemplos conviene estudiar primero

Un recorrido incremental razonable es:

1. `hello.ts`: forma mínima de una herramienta.
2. `permission-gate.ts`: interceptar y bloquear Tool Activity.
3. `input-transform.ts`: controlar la entrada antes del Run.
4. `todo.ts`: estado persistente y rendering.
5. `tools.ts`: comandos y UI custom.
6. `dynamic-resources/`: skills, prompts y themes.
7. `plan-mode/`: coordinación de varias APIs.
8. `subagent/` o un custom provider: integración avanzada.

Para Pandi, los ejemplos más relevantes son los que separan capacidades del agente de detalles exclusivos de la TUI: `hello.ts`, `todo.ts`, `permission-gate.ts`, `dynamic-tools.ts`, `dynamic-resources/`, los providers y los eventos de lifecycle. Los ejemplos basados en `ctx.ui.custom()`, editores, footer u overlays requieren un adaptation layer para una GUI web.

## Fuentes primarias

- [Documentación oficial de extensiones](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/docs/extensions.md)
- [README oficial de los ejemplos](https://github.com/earendil-works/pi-mono/blob/main/packages/coding-agent/examples/extensions/README.md)
- [Directorio oficial de ejemplos](https://github.com/earendil-works/pi-mono/tree/main/packages/coding-agent/examples/extensions)
- Snapshot local inspeccionado: `@earendil-works/pi-coding-agent` 0.81.0, `examples/extensions/`
