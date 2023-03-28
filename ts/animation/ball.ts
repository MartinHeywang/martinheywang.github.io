import color from "../color";
import { breakpoints } from "../media";

const scrollIndicator = document.querySelector(".landing-page__scroll-indicator")!;

const animation = document.querySelector("div.landing-page__animation")!;
const canvas = animation.querySelector<HTMLCanvasElement>("canvas.landing-page__canvas")!;
const ctx = canvas.getContext("2d")!;

// requestAnimationFrame utils
let rafActive = false;
let rafId: number | null = null;

// axis definition
let minX = -1;
let maxX = 1;
let minY = -1;
let maxY = 1;

// equation of the curve
const f = (x: number) => -0.5 * x ** 4 + 0.35 * x ** 3 + 1.13 * x ** 2 + 0.12 * x - 0.7;
// derivative of f
const fPrime = (x: number) => -2 * x ** 3 + 1.05 * x ** 2 + 2.26 * x + 0.12;

// the extremums of f, used as to define the position and the scale of the curve on the canvas
const fExtremums = [-0.8, -0.05, 1.38];

let currentBallPosition: number;
let curveSamples: number;
let ballRadius: number;

let canvasOffsetY: number;
let scrollValue: number;

let speedFactor: number;

export function initBallAnimation() {
    const ch = (canvas.height = animation.clientHeight);
    const cw = (canvas.width = animation.clientWidth);

    curveSamples = 1500;
    ballRadius =
        cw >= breakpoints.tablet
            ? cw * 0.025
            : cw >= breakpoints.mobile
            ? cw * 0.04
            : cw * 0.055;
    speedFactor = 5000;
    canvasOffsetY = canvas.getBoundingClientRect().y;

    // -> change how the curve is displayed based on the viewport width
    // on desktop, the function can take a lot of space and span the right side of the screen
    // while it should be more flat on mobile

    // the place the curve, we only need two points that are on this curve
    // here, we use the two local maximums of the function

    type Point = {
        x: number;
        y: number;
        canvasX: number;
        canvasY: number;
    };

    // the main portion of the curve is in this zone (max 1440px)
    const mainCurveSpanPx = Math.min(animation.clientWidth, 1440);
    // the curve is centered (just as the layout) - this value is the gap that lies on each side of the curve
    const inlineCurveMargin = (animation.clientWidth - mainCurveSpanPx) / 2;

    // the two points that we use to draw the curve
    // we define both its x and y value, as well as where it should be on the canvas coordinate system
    // using the extremums as those points here is strategic
    // because it ensures that the curve won't go over a certain point for example
    let leftExtremum: Point = {
        x: fExtremums[0],
        y: f(fExtremums[0]),
        canvasX: inlineCurveMargin + 50, // looks better with +50 here, not a big deal
        // function computes the nb of pixels from the bottom of the page to the bottom of the scroll indicator
        canvasY: (() => {
            const rect = scrollIndicator.getBoundingClientRect();
            const offset = 100;

            return window.scrollY + rect.top + rect.height + offset;
        })(),
    };

    let rightExtremum: Point = {
        x: fExtremums[2],
        y: f(fExtremums[2]),
        canvasX: inlineCurveMargin + mainCurveSpanPx,
        canvasY: -30, // negative value here so the curve overflows at the top of the screen
    };

    // the chosen points are different on mobile
    if(cw <= breakpoints.mobile) {
        // this is intentionally off the screen, we don't want to show the extremum (it's too high!)
        rightExtremum.canvasX = mainCurveSpanPx + 200;
    }

    const xDistance = Math.abs(leftExtremum.x - rightExtremum.x);
    const yDistance = Math.abs(leftExtremum.y - rightExtremum.y);
    const xCanvasDistance = Math.abs(leftExtremum.canvasX - rightExtremum.canvasX);
    const yCanvasDistance = Math.abs(leftExtremum.canvasY - rightExtremum.canvasY);

    // coefficients (how many pixels for one axis unit)
    const kx = xCanvasDistance / xDistance;
    const ky = yCanvasDistance / yDistance;

    minX = leftExtremum.x - leftExtremum.canvasX / kx;
    maxX = rightExtremum.x + (canvas.clientWidth - rightExtremum.canvasX) / kx;
    minY = leftExtremum.y - (canvas.clientHeight - leftExtremum.canvasY) / ky;
    maxY = rightExtremum.y + rightExtremum.canvasY / ky;

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
        const x = minX + ((maxX - minX) / curveSamples) * i;
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
        const x = minX + ((maxX - minX) / curveSamples) * ballPosition;
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
