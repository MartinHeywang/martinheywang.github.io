const hueSlider = document.querySelector<HTMLInputElement>(".hue-slider__input")

export function init() {
    hueSlider.addEventListener("change", () => {
        setCSS(hueSlider.valueAsNumber);
        save(hueSlider.valueAsNumber);
    })

    hueSlider.addEventListener("input", () => {
        setCSS(hueSlider.valueAsNumber);
    })

    const defaultValue = retrieve();
    hueSlider.setAttribute("value", defaultValue.toString());
    setCSS(defaultValue);
}

function setCSS(value: number) {
    document.documentElement.style.setProperty("--clr-primary-hue", hueSlider.value);
}

function save(value: number) {
    localStorage.setItem("portfolio.primaryHue", value.toString());
}

function retrieve() {
    return parseInt(localStorage.getItem("portfolio.primaryHue")) || 25;
}