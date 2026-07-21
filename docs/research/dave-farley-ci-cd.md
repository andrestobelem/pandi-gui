# CI/CD al estilo de Dave Farley

Investigación para el SDLC de `pandi-gui`.

## Hallazgos

1. **El desarrollo de software es aprendizaje y descubrimiento.** Farley propone optimizar por aprendizaje mediante trabajo iterativo, feedback rápido, incrementalismo, empirismo y experimentación, en lugar de tratar el desarrollo como una línea de producción predecible. [5][6]

2. **Continuous Delivery es mantener el software desplegable y el flujo de valor continuo.** Farley diferencia los términos: desplegar es el acto técnico de llevar software a un entorno; release es habilitar una capacidad para usuarios; Continuous Deployment automatiza la decisión de desplegar a producción cuando el pipeline pasa. Continuous Delivery tiene un alcance más amplio: mantener un flujo continuo de valor. [1]

3. **La integración continua requiere publicar cambios muy frecuentemente.** Farley trata la integración frecuente, el feedback rápido y los cambios pequeños como condiciones esenciales. Defiende trunk-based development y advierte que las feature branches aíslan cambios y retrasan el feedback; describe commits múltiples veces al día como práctica deseable. [2]

4. **El deployment pipeline es el mecanismo central.** Cada cambio destinado a producción entra al pipeline como candidato a release; las etapas automatizadas deben rechazar cambios que no son aptos. El pipeline extiende CI desde el check-in hasta el release y concentra la evidencia de calidad. [3][4]

5. **Construir una vez y promover el mismo artefacto reduce el riesgo.** El pipeline debe empaquetar un candidato una única vez y someter ese artefacto a verificaciones progresivas en entornos posteriores, evitando que una reconstrucción introduzca variación entre etapas. [3]

6. **El pipeline también es trazabilidad y compliance.** Si todo cambio de producción pasa por él y se vinculan issue, commit, pruebas, artefacto y despliegue, se obtiene un audit trail consultable sin depender de procesos paralelos manuales. [4]

## Decisiones para este repositorio

- Optimizar el proceso por velocidad y calidad del aprendizaje, no por cumplimiento de etapas.
- `main` debe permanecer integrable y desplegable; no habrá ramas de feature de larga vida.
- Cada commit integrado en `main` activa el deployment pipeline y genera un candidato de release identificable.
- El pipeline construye una vez y promueve el mismo artefacto inmutable por todas las etapas.
- El commit stage es rápido y da feedback en minutos; una pipeline rota se arregla antes de continuar trabajo no urgente.
- Las capacidades incompletas se desacoplan del despliegue con flags, compatibilidad hacia atrás, branch by abstraction u otra técnica equivalente.
- El modo inicial es **Continuous Delivery**: producción permanece preparada y el release es una decisión explícita. Pasar a **Continuous Deployment** requiere que el producto, la observabilidad y el rollback permitan desplegar automáticamente a producción con seguridad.
- No existe una ruta alternativa o manual a producción fuera del pipeline, salvo el procedimiento documentado de hotfix.

## Fuentes primarias

1. Dave Farley, [Are we ‘Deploying’, ‘Releasing’ or ‘Delivering’?](https://www.davefarley.net/?p=333), 17 dic. 2020.
2. Dave Farley, [Continuous Integration and Feature Branching](https://www.davefarley.net/?p=247), 30 mar. 2018.
3. Dave Farley, [The Deployment Pipeline: Extending the Range of Continuous Integration](https://continuousdelivery.com/wp-content/uploads/2010/01/The-Deployment-Pipeline-by-Dave-Farley-2007.pdf), 2007.
4. Dave Farley, [Continuous Compliance](https://www.davefarley.net/?p=285), 3 sep. 2019.
5. Dave Farley, [What is Modern Software Engineering?](https://www.davefarley.net/?p=352), 27 ene. 2021.
6. Dave Farley, [Modern Software Engineering](https://ptgmedia.pearsoncmg.com/images/9780137314911/samplepages/9780137314911_Sample.pdf), Pearson, 2022, muestra oficial.
