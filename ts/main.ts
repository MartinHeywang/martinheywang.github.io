import { initBallAnimation } from "./animation/ball";
import { initSkillsSection } from "./animation/skills";

initBallAnimation();
window.addEventListener("resize", initBallAnimation);

initSkillsSection();
