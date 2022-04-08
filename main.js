console.log("%cWelcome!", "color: skyblue; background-color: #222; font-weight: bold; font-size: 2rem;")

function initializeTimeline() {
    const timeline = document.querySelector(".story__timeline");
    const blocksCount = timeline.childElementCount;

    timeline.style.width = `calc(${blocksCount} * 100%)`;

    let timelinePos = 0;
    const firstPos = 0;
    const lastPos = blocksCount - 1;

    const previousBtn = document.querySelector(".story__timeline-previous")
    const nextBtn = document.querySelector(".story__timeline-next")

    const blockWidthPerc = `(100% / ${blocksCount})`;

    previousBtn.addEventListener("click", () => {
        if(timelinePos === firstPos) return;
        timelinePos--

        refreshTimelineAndControls()
    })
    nextBtn.addEventListener("click", () => {
        if(timelinePos === lastPos);
        timelinePos++

        refreshTimelineAndControls()
    })
    
    const refreshTimelineAndControls = () => {
        timeline.style.transform = `translateX(calc(-${timelinePos} * ${blockWidthPerc}))`
        previousBtn.disabled = false;
        nextBtn.disabled = false;

        if(timelinePos === firstPos) previousBtn.disabled = true;
        if(timelinePos === lastPos) nextBtn.disabled = true;
    }

    refreshTimelineAndControls();
}

initializeTimeline()