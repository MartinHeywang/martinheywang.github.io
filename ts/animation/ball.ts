const animation = document.querySelector<HTMLDivElement>(".landing-page__animation")!;
const canvas = animation.querySelector<HTMLCanvasElement>(".landing-page__canvas")!;
const ctx = canvas.getContext("2d");

export function initBallAnimation() {
    if (!ctx) return;

    const vh = window.innerHeight;
    const _vw = window.innerWidth;

    const cw = (canvas.width = animation.clientWidth);
    const ch = (canvas.height = animation.clientHeight);
    
    const gap = 4; /* px */
    const count = cw >= 900 ? 12 : cw >= 600 ? 10 : 6;
    
    const rectWidth = (cw - (count - 1) * gap) / count;
    
    ctx.fillStyle = "dodgerblue";
    
    const minX = -1;
    const maxX = 1;
    const deltaX = maxX - minX;

    for (let i = 0; i < count; i++) {
        const x = minX + i * deltaX / count;

        const rectHeight = 0.5 * vh * (x ** 3 + 1.25 * x ** 2) + 70;

        ctx.fillRect(i * (rectWidth + gap), ch, rectWidth, -rectHeight);
    }
}
