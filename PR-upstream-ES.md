## Dos fallos con datos de equipo incompletos

Al abrir la tabla de la liga se lanza una excepción y el simulador nunca se
dibuja. Capturado en una sesión real de Nutaku:

```
Uncaught (in promise) TypeError: Cannot read properties of undefined (reading '9')
    at Array.map (<anonymous>)
    at SimHelpers.getSkillPercentage
    at League.extract
    at Array.forEach (<anonymous>)
    at BattleSimulatorModule.runManagedSim
    at Helpers.doWhenSelectorAvailable
```

Aparece como promesa rechazada y no como error porque la rama de ligas de
`run()` es un callback `async`. Por eso pasa desapercibido en una consola que
el juego ya llena con avisos de rastreadores bloqueados.

### Qué falla

**`getSkillPercentage`** evalúa `e.skills[id]?.skill.percentage_value ?? 0`.
La cadena opcional empieza en `skills[id]`, así que una chica que llega sin
objeto `skills` lanza la excepción antes de que el `??` pueda aplicarse.

**Los tres caminos de `extract()`** leen las siete posiciones del equipo del
jugador de forma directa:

```js
[0,1,2,3,4,5,6].map(key => playerTeam.girls[key].element_data.type)
```

Un equipo con menos de siete chicas falla en `.element_data`. `League` ya lee
el equipo del *oponente* a través de `if (teamMember && teamMember.element)`
treinta y cinco líneas más abajo, de modo que el lado del jugador es el único
sin protección. Además ese código vive dentro de `if (!normalisedElements)`,
que solo se ejecuta cuando el juego no envió `theme_elements`: en ese punto ya
se sabe que los datos vienen incompletos.

**`ImprovedWaifuModule`** tiene la misma asimetría dentro de un mismo
`if/else`: marcar como favorita contempla que la chica no tenga entrada
guardada, desmarcarla accede directamente y falla en
`delete waifuInfo.girls[id].fav`. Ocurre dentro de un manejador de clic, así
que la estrella cambia en la interfaz y `saveWaifuInfo` nunca se ejecuta.

### Qué hace este cambio

Una chica ausente no aporta nada, que es justamente lo que el `?? 0` ya
significaba para una chica sin esa habilidad concreta. No se inventa ningún
valor: un equipo sin array `girls` devuelve cero elementos y ningún
multiplicador, en lugar de lanzar una excepción.

La lectura de las posiciones se traslada a `SimHelpers.getTeamElementTypes`,
de manera que la comprobación exista una sola vez en lugar de repetirse en
`League`, `Season` y `BDSMPvE`.

Valores que antes fallaban, comprobados contra esta rama:

| entrada | antes | después |
| --- | --- | --- |
| chica sin objeto `skills` | TypeError al leer `'9'` | `1.1` |
| posición de equipo vacía | TypeError al leer `'skills'` | `1.25` |
| equipo de dos chicas | TypeError al leer `'element_data'` | `['fire', 'water']` |
| sin array `girls` | TypeError | `1` / `[]` |

Los equipos completos no se ven afectados: siete chicas con habilidades
devuelven exactamente lo mismo que antes.

### Notas

- Solo código fuente. Sin subir la versión y sin reconstruir `dist/`, porque
  el README sitúa esos pasos en la publicación de una versión y te
  corresponden a ti.
- También se elimina un punto y coma suelto en la línea de
  `getSkillPercentage` que `.eslintrc.yaml` no permite.
- Detectado mientras se ejecutaba un fork de este script. Ese fork incluye
  además cambios de compilación y herramientas que **no** forman parte de este
  PR: estos dos commits son únicamente las correcciones de los fallos, y van
  separados para que puedas aceptar uno sin el otro.

Gracias por mantener el proyecto.
