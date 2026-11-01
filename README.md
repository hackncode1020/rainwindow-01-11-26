# 🌧️❤️ Rainy Window: rain that writes love

A full-screen night window in the rain. Drops slide down the glass and merge, warm city lights glow out of focus behind it, and then the glass **fogs up**. An invisible finger draws a heart in the fog and writes a love note in handwriting. A **lightning flash** reveals hidden words, the fog slowly creeps back, and it all ends with a **glowing heart** on the glass.

**Live demo:** https://rainwindow-hackncode.sites.tab.bot/

> Day 6 of my **100 Days Daily Reel Challenge** by [@hack.n.code](https://instagram.com/hack.n.code) 💻❤️

---

## ✨ Scenes
1. **Tap the glass**: a start screen with the rain already running behind it
2. **Rain intro**: drops on clear glass over warm city bokeh
3. **Fog forms**: condensation creeps across the window in organic patches
4. **Fog heart**: a finger draws a heart, and drips run down from it
5. **The note**: *“I’d wait in every rain for you”* written in the fog
6. **Fog returns**: the wiped streaks slowly fade back
7. **Lightning ⚡**: a flash, soft thunder, and hidden words glow on the glass
8. **One more note**: *“rain or shine, it’s always you”*
9. **Finale**: a big heart that fills with light and glows, plus Replay, Send and Make-your-own buttons

## 🛠️ How it works
| Part | Tech |
|---|---|
| Rain on glass | One WebGL fragment shader: static beads that appear and evaporate, plus three layers of “runner” drops that slide in stop-and-go steps and leave trails. Each drop refracts the background like a tiny lens. |
| City lights | Drawn once with Canvas 2D (buildings, lit windows, bokeh discs, road reflections) into a sharp texture and a blurred texture |
| Fog | A Canvas 2D mask uploaded as a texture every frame. The finger wipes it with a soft brush (`destination-out`), and regrowth is a low-alpha white fill. |
| Handwriting | Caveat text rendered into a mask and revealed left to right, line by line, so it looks like it is being written |
| Lightning | A flash curve with three flickers, a glow texture for the hidden words, and Web Audio thunder |
| Sound | Rain and thunder are both **generated** with Web Audio noise and filters, so there are no audio files |

No libraries, no build step: just `index.html`, `style.css` and `app.js`.

## 💌 Make it personal
Add `?name=` to the link and the window writes the name in the fog at the end:

```
https://rainwindow-hackncode.sites.tab.bot/?name=YourPerson
```

By default no name is shown.

## ▶️ Run locally
```bash
git clone https://github.com/hackncode1020/rainwindow-01-11-26
cd rainwindow-01-11-26
python3 -m http.server 8000
# open http://localhost:8000
```

---

Made with ❤️ by **[@hack.n.code](https://instagram.com/hack.n.code)**. Comment **RAIN** on the reel for the code 🌧️
