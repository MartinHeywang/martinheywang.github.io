import color from "../color";

const animation = document.querySelector<HTMLDivElement>(".landing-page__animation")!;
const canvas = animation.querySelector<HTMLCanvasElement>(".landing-page__canvas")!;
const ctx = canvas.getContext("2d")!;

// requestAnimationFrame utils
let rafActive = false;
let rafId: number;

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
let maxBallPositions: number;
let ballRadius: number;

export function initBallAnimation() {
    canvas.height = animation.clientHeight;
    const cw = (canvas.width = animation.clientWidth);

    maxBallPositions = 1000;
    ballRadius = cw >= 900 ? 35 : cw >= 600 ? 25 : 15;

    minX = cw >= 900 ? -1 : cw >= 600 ? -1 : -1;
    maxX = cw >= 900 ? 1 : cw >= 600 ? 0.8 : 0.6;
    minY = cw >= 900 ? -1 : cw >= 600 ? -1 : -0.9;
    maxY = cw >= 900 ? 1 : cw >= 600 ? 0.9 : 0.8;

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

    for (let i = 0; i < maxBallPositions; i++) {
        const x = minX + (deltaX / maxBallPositions) * i;
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
        const x = minX + (deltaX / maxBallPositions) * ballPosition;
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
        const ballX = curveX + Math.sin(- angle) * ballRadius * factor;
        const ballY = curveY - Math.cos(angle) * ballRadius * factor;

        return { ballX, ballY };
    }

    if (currentBallPosition !== undefined) {
        const { ballX: oldBallX, ballY: oldBallY } =
            calculateBallCoords(currentBallPosition);

        ctx.save();
        ctx.beginPath();
        ctx.arc(oldBallX, oldBallY, ballRadius + .8, 0, Math.PI * 2);
        ctx.clip();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    const factor = canvas.width >= 900 ? 0.4 : canvas.width >= 600 ? 0.2 : 0.15;

    currentBallPosition = maxBallPositions - (window.scrollY / maxBallPositions) * 2500;

    const { ballX, ballY } = calculateBallCoords(currentBallPosition);

    ctx.fillStyle = color.secondary[700];
    ctx.beginPath();
    ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
    ctx.fill();
}

function updateScroll() {
    // update variables on scroll - here none

    startAnimation();
}

function updateAnimation() {
    // decide whether to stop the animation or not
    if (window.scrollY > canvas.height) return window.cancelAnimationFrame(rafId);
    else window.requestAnimationFrame(updateAnimation);

    updateBallPosition();
}

window.addEventListener("scroll", updateScroll);

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
