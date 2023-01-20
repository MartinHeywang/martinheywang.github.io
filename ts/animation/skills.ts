import * as media from "../media";

const details = document.querySelector(".skills__details")!;
const detailsList = details.querySelectorAll<HTMLDivElement>(".skills__detail");
const skillsList = document.querySelectorAll<HTMLAnchorElement>(".skills__list li");

let selected: string | null = location.hash.startsWith("#detail:")
    ? location.hash.substring(8)
    : null;

export function initSkillsSection() {
    // w/o JavaScript, the skills section totally works : using #links and :target
    // but there is an odd behavior: the browser automatically scrolls
    // (and it can't be prevented, I tried)

    // so with JavaScript here we're trying to achieve the same kind of effect
    // but without the odd behaviors.

    detailsList.forEach(detail => {
        detail.id = "";
    });

    skillsList.forEach(item => {
        item.addEventListener("click", () => {
            selected = item.dataset.detail!;

            updateDetailPanel(window.innerWidth < media.breakpoints.mobile);
        });
    });

    updateDetailPanel();
}

export function updateDetailPanel(scroll = false) {
    console.log(`update detail panel (selected = '${selected}') (scroll = ${scroll})`);

    detailsList.forEach(detail => {
        detail.style.display = "none";

        if (selected === detail.dataset.detail) {
            detail.style.display = "";

            if (scroll)
                details.scrollIntoView({
                    behavior: "smooth",
                });
        }
    });
}
