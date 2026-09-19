# ✂️ Piedra, Papel o Tijeras

Juego de **Piedra, Papel o Tijeras** en JavaScript puro: cuatro modos de juego, variante Big Bang, tres niveles de IA, estadísticas persistentes y partidas online entre dos navegadores.

Sin frameworks, sin paso de build y sin dependencias instaladas: se abre `index.html` y funciona.

---

## 🎮 Demo

👉 **[Jugar online](https://rock-paper-scissors-jade-six.vercel.app/)**

---

## ✨ Características

### Modos de juego
| Modo | Qué hace |
|---|---|
| **Clásico** | Rondas sueltas sin final. |
| **Primero a N** | Gana quien llegue antes a 3, 5 o 10 victorias. |
| **Contrarreloj** | Máximo de victorias en 15, 30 o 60 segundos. |
| **Online** | Dos personas en tiempo real vía WebRTC (PeerJS), compartiendo un enlace. |

### Dificultad del bot
| Nivel | Estrategia | Victorias del jugador* |
|---|---|---|
| **Fácil** | Elige a propósito una jugada perdedora en el 30 % de las rondas. | ~54 % |
| **Normal** | Azar puro. | ~34 % |
| **Difícil** | Cadena de Markov de orden 1 sobre tu historial: predice tu siguiente jugada y la contrarresta, con un 20 % de ruido para no ser imbatible. | ~34 % si varías, ~7 % si repites patrones |

<sub>*Medido sobre 8.000 rondas simuladas contra un jugador aleatorio. El nivel difícil solo usa jugadas pasadas: nunca mira la jugada en curso.</sub>

### Y además
- **Modo Big Bang** — añade 🦎 Lagarto y 🖖 Spock (10 reglas en lugar de 3), con los verbos correctos de cada pareja.
- **Arena animada** — cuenta de disparo y revelado simultáneo de ambas jugadas.
- **Estadísticas persistentes** — partidas, % de victoria, racha actual y mejor racha, con barra de reparto e historial de las últimas 12 rondas.
- **Tema claro/oscuro** — respeta la preferencia del sistema y recuerda la elección, sin parpadeo al cargar.
- **Reglas dinámicas** — la tarjeta se regenera según el modo activo.
- **Atajos de teclado** — `1`–`5` jugar, `T` tema, `M` sonido, `R` reiniciar.
- **Sonido sintetizado** con Web Audio API (silenciable), sin archivos de audio que descargar.

---

## ♿ Accesibilidad

- Marcado semántico con `aria-label`, `aria-pressed` y `aria-labelledby` en todos los controles.
- El resultado de cada ronda se anuncia mediante una región `aria-live`.
- Diálogos con `role="dialog"`, `aria-modal`, atrapado de foco, cierre con `Escape` y devolución del foco al origen.
- Anillos de foco visibles en todos los elementos interactivos y enlace «saltar al juego».
- `prefers-reduced-motion` desactiva animaciones y las rondas se resuelven al instante.
- Paleta con contraste revisado en ambos temas.

---

## 🛠️ Tecnologías

**HTML5** · **CSS3** (custom properties, grid, `color-mix`) · **JavaScript** (ES2020, sin dependencias) · **Web Audio API** · **PeerJS/WebRTC** · **localStorage**

PeerJS y canvas-confetti se cargan **bajo demanda** desde CDN: quien no use el modo online ni gane una partida no descarga nada de terceros.

---

## 🚀 Cómo ejecutarlo

```bash
git clone <este-repo>
cd rock-paper-scissors
```

Abre `index.html` en el navegador, o levanta un servidor local (necesario para el modo online):

```bash
npx serve .
```

---

## 🕹️ Cómo jugar online

1. Elige el modo **Online** y pulsa **Crear sala**.
2. Pulsa **Copiar** y abre el enlace en otra pestaña o envíaselo a otra persona.
3. Al conectar ambos, esperad la cuenta atrás de 3 y elegid a la vez.

El anfitrión arbitra cada ronda y define si se juega con Big Bang. La conexión es directa entre navegadores; solo el descubrimiento inicial pasa por el servidor de señalización de PeerJS.

---

## 📁 Estructura

```
index.html   Marcado y diálogos
style.css    Tokens de diseño, temas y responsive
script.js    Estado, lógica de juego, IA, estadísticas y capa online
```

---

## 🧠 Aprendizajes

- Gestión de estado en una aplicación sin framework, separando estado, render y efectos.
- Diseño de IA por niveles y verificación de su comportamiento mediante simulación en lugar de suposiciones.
- Comunicación P2P con WebRTC: fases de ronda, arbitraje y recuperación ante desconexiones.
- Accesibilidad real: regiones live, gestión de foco en diálogos y movimiento reducido.
- Sistema de diseño con custom properties y doble tema sin duplicar reglas.
