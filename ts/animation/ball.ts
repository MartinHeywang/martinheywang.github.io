import color from "../color";
import { breakpoints } from "../media";

const animation = document.querySelector<HTMLDivElement>(".landing-page__animation")!;
const canvas = animation.querySelector<HTMLCanvasElement>(".landing-page__canvas")!;
const ctx = canvas.getContext("2d")!;

// requestAnimationFrame utils
let rafActive = false;
let rafId: number | null = null;

// axis definition
let minX = -1;
let maxX = 1;
let deltaX = maxX - minX;
let minY = -1;
let maxY = 1;
let deltaY = maxY - minY;

// equation of the curve drawn by the rectangles
const f = (x: number) => x ** 3 + 1.25 * x ** 2 - 0.7;
// derivative of f
const fPrime = (x: number) => 3 * x ** 2 + 2.5 * x;

let currentBallPosition: number;
let curveSamples: number;
let ballRadius: number;

let canvasOffsetY: number;
let scrollValue: number;

let speedFactor: number;

export function initBallAnimation() {
    const ch = canvas.height = animation.clientHeight;
    const cw = (canvas.width = animation.clientWidth);

    curveSamples = 1500;
    ballRadius = cw >= breakpoints.tablet ? cw * 0.025 : cw >= breakpoints.mobile ? cw * 0.04 : cw * 0.055;
    speedFactor = 5000;
    canvasOffsetY = canvas.getBoundingClientRect().y;

    // change the part of the function that's visible
    // on desktop, the function can take a lot of space and span the right side of the screen
    // while on mobile, the function should be more flat

    // order : desktop (first value) >= tablet (second value) >= mobile (third value) 
    minX = cw >= breakpoints.tablet ? -1 : cw >= breakpoints.mobile ? -1 : -1;
    maxX = cw >= breakpoints.tablet ? 1 : cw >= breakpoints.mobile ? 0.8 : 0.65;
    minY = cw >= breakpoints.tablet ? -1 : cw >= breakpoints.mobile ? -0.9 : -0.9;
    maxY = cw >= breakpoints.tablet ? 1 : cw >= breakpoints.mobile ? 1.4 : 2.1;

    drawCurve();

    startAnimation();
}

// start the animation if not yet started
function startAnimation() {
    if (!rafActive) {
        rafActive = true;
        rafId = window.requestAnimationFrame(updateAnimation);
    }
}

function drawCurve() {
    ctx.save();
    ctx.moveTo(0, canvas.height);
    ctx.beginPath();

    for (let i = 0; i < curveSamples; i++) {
        const x = minX + (deltaX / curveSamples) * i;
        const y = f(x);

        const { x: canvasX, y: canvasY } = axisToCanvas({ x, y });
        ctx.lineTo(canvasX, canvasY);
    }

    ctx.lineTo(canvas.width, 0);
    ctx.lineTo(canvas.width, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = color.primary[700];
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
}

function updateBallPosition() {
    function calculateBallCoords(ballPosition: number) {
        const x = minX + (deltaX / curveSamples) * ballPosition;
        const y = f(x);
        const a = fPrime(x);

        // use the tangent formula to find the tangent of the curve at x
        const tangent = (argX: number) => fPrime(x) * (argX - x) + f(x);

        // so we can find the angle between it and the x axis
        // angle = atan(slope)
        // and slope = (y2 - y1)/(x2 - x1)
        const angle = Math.atan(tangent(0) / (tangent(0) / a));

        // curveX and curveY are the exact position on the curve
        const { x: curveX, y: curveY } = axisToCanvas({ x, y });

        const factor = 1.1;

        // but the ball is slightly above the curve, not centered on it
        // so that's why we have to adjust the values here a bit
        const ballX = curveX + Math.sin(-angle) * ballRadius * factor;
        const ballY = curveY - Math.cos(angle) * ballRadius * factor;

        return { ballX, ballY };
    }

    if (currentBallPosition !== undefined) {
        const { ballX: oldBallX, ballY: oldBallY } =
            calculateBallCoords(currentBallPosition);

        ctx.save();
        ctx.beginPath();
        ctx.arc(oldBallX, oldBallY, ballRadius + 0.8, 0, Math.PI * 2);
        ctx.clip();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    currentBallPosition = curveSamples - (scrollValue / curveSamples) * speedFactor;

    const { ballX, ballY } = calculateBallCoords(currentBallPosition);

    ctx.fillStyle = color.secondary[700];
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
}

function updateScroll() {
    // ideally we would have changed that scrollValue to something that depends
    // on window.scrollY as well as the y offset of the canvas
    // but on mobile and with floating url bars, this y offset sometimes changes weirdly
    // and makes the ball jump from one place to another in some circumstances
    // so we'll prefer leaving it like that for now
    scrollValue = window.scrollY;

    startAnimation();
}

function updateAnimation() {
    window.requestAnimationFrame(updateAnimation);

    updateBallPosition();
}

window.addEventListener("scroll", updateScroll);

// stop the animation when the canvas goes off the screen - performance reasons
const intersectionObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) return startAnimation();

    rafId && window.cancelAnimationFrame(rafId);
    rafActive = false;
    rafId = null;
});
intersectionObserver.observe(canvas);

/**
 * Converts the given set of coords from the axis system
 * to the canvas system.
 *
 * @param coords the coords to convert
 * @returns the coords in the canvas system
 */
function axisToCanvas(coords: { x?: number; y?: number }) {
    const kx = canvas.width / (maxX - minX);
    const ky = canvas.height / (maxY - minY);

    // using Infinity here is quite odd
    // but the goal here is to have a type of number whether
    // we have passed a value or not
    // (Infinity only appears if we did not, so it's no big problem)

    return {
        x: coords.x !== undefined ? (coords.x - minX) * kx : Infinity,
        y: coords.y !== undefined ? canvas.height - (coords.y - minY) * ky : Infinity,
    };
}
