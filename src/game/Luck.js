export function getLuckDegree({ luck, blessingSkillLevel, fortuneSkillLevel, currentStamina, maximumStamina }) {
  const base = (5 + luck * 10) / 100;
  const staminaRate = maximumStamina > 0 ? currentStamina / maximumStamina : 0;
  let bonus = 0;
  if (blessingSkillLevel > 0 && staminaRate <= blessingSkillLevel * 0.1) {
    bonus = blessingSkillLevel * 0.1 - staminaRate;
  } else if (fortuneSkillLevel > 0 && staminaRate >= 1 - fortuneSkillLevel * 0.1) {
    bonus = staminaRate - (1 - fortuneSkillLevel * 0.1);
  }
  return Math.max(0, base * (1 - bonus) + bonus);
}
