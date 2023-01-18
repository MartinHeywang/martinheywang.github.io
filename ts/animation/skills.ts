const settings = document.querySelector(".skills__settings")!;
const search = document.querySelector(".skills__search")!;
const filter = document.querySelector(".skills__filter")!;
const sort = document.querySelector(".skills__sort")!;

export function initSkillsSection() {
    // the features of the table are not available w/o JavaScript
    // so it is hidden by default
    settings.classList.remove("skills__settings--hidden");

    setupFilterAndSort();
}

function onSettingsChanged() {

}

function setupFilterAndSort() {
    const filterSelect = filter.querySelector("select")!;
    const filterText = filter.querySelector("span")!;

    function updateFilterText() {
        filterText.textContent = filterSelect.value;
    }

    filterSelect.addEventListener("change", updateFilterText);
    updateFilterText();
    
    const sortSelect = sort.querySelector("select")!;
    const sortText = sort.querySelector("span")!;

    function updateSortText() {
        sortText.textContent = sortSelect.value;
    }
    
    sortSelect.addEventListener("change", updateSortText);
    updateSortText();
}
