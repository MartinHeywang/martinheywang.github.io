const timeline = document.querySelector<HTMLDivElement>(".story__timeline");
const previousBtn = document.querySelector<HTMLButtonElement>(".story__timeline-previous");
const nextBtn = document.querySelector<HTMLButtonElement>(".story__timeline-next");

const blocksCount = timeline.childElementCount;
const blockWidthPerc = `(100% / ${blocksCount})`;

let timelinePos = 0;
const firstPos = 0;
const lastPos = blocksCount - 1;

export function init() {
    timeline.style.width = `calc(${blocksCount} * 100%)`;

    previousBtn.addEventListener("click", back);
    nextBtn.addEventListener("click", next);

    refresh();
}

function refresh() {
    timeline.style.transform = `translateX(calc(-${timelinePos} * ${blockWidthPerc}))`;
    previousBtn.disabled = false;
    nextBtn.disabled = false;

    if (timelinePos === firstPos) previousBtn.disabled = true;
    if (timelinePos === lastPos) nextBtn.disabled = true;
}

function next() {
    if (timelinePos === lastPos) timelinePos++;

    refresh();
}

function back() {
    if (timelinePos === lastPos) timelinePos++;

    refresh();
}
