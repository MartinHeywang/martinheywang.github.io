import color from "../color";
import { breakpoints } from "../media";

const scrollIndicator = document.querySelector(".landing-page__scroll-indicator")!;

const animation = document.querySelector("div.landing-page__animation")!;
const canvas = animation.querySelector<HTMLCanvasElement>("canvas.landing-page__canvas")!;
const ctx = canvas.getContext("2d")!;

// requestAnimationFrame + animation utils
let rafActive = false;
let rafId: number | null = null;
let interval: NodeJS.Timer | null = null;

const BALL_PERIOD_MS = 5000; // a new ball is launched every 5s
const MIN_BALL_MASS = 300;
const MAX_BALL_MASS = 700;

type Ball = {
    readonly dateLaunched: Date;
    readonly mass: number;
    readonly radius: number;
    x: number; // in the axis system, the ball is a point
    speed: number;
    dateMoved?: Date;
    readonly color: string;
};

let currentBall: Ball | null = null;
let ballMoveInterval: NodeJS.Timer;

// axis definition with default values
let minX = -1;
let maxX = 1;
let minY = -1;
let maxY = 1;

// equation of the curve ====
const f = (x: number) => -0.5 * x ** 4 + 0.35 * x ** 3 + 1.13 * x ** 2 + 0.12 * x - 0.7;
// derivative of f
const fPrime = (x: number) => -2 * x ** 3 + 1.05 * x ** 2 + 2.26 * x + 0.12;

// the abscisses of the extremums of f
const fExtremums = [
    -0.79754 /* local max */, -0.05463 /* local min */, 1.37716 /* global max */,
];
// ==========================

const e = 2.718; // Euler's constant
// property: sign(x) = sign(sigmoid(x))
const sigmoid = (x: number) => (2 * e ** (2 * x)) / (1 + e ** (2 * x)) - 1;

let curveSamples: number;

let oldBallPositions: number[] = [];

export function initBallAnimation() {
    const ch = (canvas.height = animation.clientHeight);
    const cw = (canvas.width = animation.clientWidth);

    curveSamples = 1500;

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
            const offset = 90;

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
    if (cw <= breakpoints.mobile) {
        // this is intentionally off the screen, we don't want to show the extremum (it's too high!)
        rightExtremum.canvasX = mainCurveSpanPx + 200;
        rightExtremum.canvasY += 50;

        // other bull-eyed adjustments
        leftExtremum.canvasX -= 40;
        leftExtremum.canvasY += 20;
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

// start the animation if not yet started
function startAnimation() {
    if (!rafActive) {
        rafActive = true;
        rafId = window.requestAnimationFrame(updateAnimation);

        interval = setInterval(newBall, BALL_PERIOD_MS);
    }
}

function stopAnimation() {
    if (rafActive) {
        window.cancelAnimationFrame(rafId!);
        rafActive = false;
        rafId = null;

        clearInterval(interval!);
    }
}

function calculateBallCoords(ballX: number) {
    if (!currentBall) return null;

    const y = f(ballX);
    const a = fPrime(ballX);

    // use the tangent formula to find the tangent of the curve at x
    const tangent = (argX: number) => fPrime(ballX) * (argX - ballX) + f(ballX);

    // so we can find the angle between it and the x axis
    // angle = atan(slope)
    // and slope = (y2 - y1)/(x2 - x1)
    const angle = Math.atan(tangent(0) / (tangent(0) / a));

    // curveX and curveY are the exact position on the curve
    const { x: curveX, y: curveY } = axisToCanvas({ x: ballX, y });

    const factor = 1.1;

    // but the ball is slightly above the curve, not centered on it
    // so that's why we have to adjust the values here a bit
    const canvasBallX = curveX + Math.sin(-angle) * currentBall.radius * factor;
    const canvasBallY = curveY - Math.cos(angle) * currentBall.radius * factor;

    return { ballX: canvasBallX, ballY: canvasBallY };
}

function updateBallPosition() {
    if (!currentBall) return;

    eraseOldBalls();

    const { ballX, ballY } = calculateBallCoords(currentBall.x)!;

    ctx.fillStyle = currentBall.color;
    ctx.beginPath();
    ctx.arc(ballX, ballY, currentBall.radius, 0, Math.PI * 2);
    ctx.fill();

    // add the x to the old ball positions at once
    // so it will be erased properly when eraseOldBalls() is called
    // that's to say : when a ball is drawn or when a new ball is launched
    oldBallPositions.push(currentBall.x);
}

function eraseOldBalls() {
    if (!currentBall) return;

    // the ball is moving fast, and the length of the array might change
    // b/w the time the for loop starts and ends
    // that way the stop condition of the loop does not change
    const length = oldBallPositions.length;

    for (let i = 0; i < length; i++) {
        const x = oldBallPositions[i];
        const { ballX: oldBallX, ballY: oldBallY } = calculateBallCoords(x)!;

        ctx.save();
        ctx.beginPath();
        ctx.arc(oldBallX, oldBallY, currentBall.radius + 0.8, 0, Math.PI * 2);
        ctx.clip();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }

    oldBallPositions.splice(0, length);
}

function updateAnimation() {
    window.requestAnimationFrame(updateAnimation);

    updateBallPosition();
}

function newBall() {
    eraseOldBalls();

    const mass =
        Math.round(Math.random() * (MAX_BALL_MASS - MIN_BALL_MASS)) + MIN_BALL_MASS;

    const INITIAL_SPEED = 0;
    const rnd = Math.random(); // for picking a random color

    currentBall = {
        mass,
        radius: mass / 20,
        dateLaunched: new Date(),
        x: fExtremums[2],
        speed: INITIAL_SPEED,
        color:
            rnd < 0.5
                ? color.secondary[700]
                : rnd < 0.85
                ? color.neutral[900]
                : "crimson",
    };

    clearInterval(ballMoveInterval);

    ballMoveInterval = setInterval(moveBall, 10);
}

function moveBall() {
    if (!currentBall) return;

    const lastTimeMoved = currentBall.dateMoved || currentBall.dateLaunched;
    const now = new Date();
    const deltaT = now.getTime() - lastTimeMoved.getTime();

    const slope = fPrime(currentBall.x);
    const deltaSpeed = sigmoid(slope);

    currentBall.speed += deltaSpeed;
    // clamp the speed and add a factor to it based on the mass
    currentBall.speed = Math.max(Math.min(0.1, currentBall.speed), 2) * (currentBall.mass / 500);

    // how many unit to move to the left (/1000 because we want deltaT in seconds)
    const deltaX = currentBall.speed * (deltaT / 1000);

    currentBall.x -= deltaX;
    currentBall.dateMoved = new Date();
}

// stop the animation when the canvas goes off the screen
const intersectionObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) return startAnimation();
    stopAnimation();
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
