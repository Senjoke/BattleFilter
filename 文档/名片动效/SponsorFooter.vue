<template>
  <footer class="preview-page">
    <div class="preview-header">
      <p class="eyebrow">Sponsor Footer</p>
      <h1>个人网站 Footer 名片区域 · 最终合成版</h1>
      <p class="desc">
        Top1 使用 Version 04 内部 Quantum Mesh 动效，并叠加贴合外轮廓的 Version 03 外部彗星环绕粒子；Top2 使用 Version 01 Plasma Rail 动效；Top1/Top2/Top3 均增强呼吸灯。
      </p>
    </div>

    <div class="site-footer">
      <div class="footer-inner">
        <section class="footer-panel sponsor-panel">
          <div class="panel-head">
            <h3>赞助者排行榜</h3>
            <span>TOP SUPPORTERS</span>
          </div>

          <div class="sponsor-list">
            <div
              v-for="(sponsor, index) in sponsors"
              :key="`sponsor-${index}`"
              class="card-shell"
              :class="[rankClass(index), effectClass(index)]"
            >
              <div v-if="index === 0" class="edge-particles" aria-hidden="true">
                <span
                  v-for="n in 18"
                  :key="n"
                  class="edge-dot"
                  :style="{ '--i': n - 1, '--delay': ((n - 1) * -0.366) + 's' }"
                />
              </div>

              <div class="name-card sponsor-card">
                <span>{{ sponsor }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="footer-panel operator-panel">
          <div class="panel-head">
            <h3>运营团队</h3>
            <span>OPS TEAM</span>
          </div>

          <div class="operator-list">
            <div
              v-for="(operator, index) in operators"
              :key="`operator-${index}`"
              class="name-card operator-card"
              :style="{ '--op': index }"
            >
              <span>{{ operator }}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  </footer>
</template>

<script setup>
const sponsors = Array.from({ length: 8 }, () => '赞助者#6666')
const operators = Array.from({ length: 4 }, () => '运营者#8888')

const rankClass = (index) => {
  if (index === 0) return 'rank-one'
  if (index === 1) return 'rank-two'
  if (index === 2) return 'rank-three'
  return 'rank-normal'
}

const effectClass = (index) => {
  if (index === 0) return 'effect-top-one'
  if (index === 1) return 'effect-top-two'
  if (index === 2) return 'effect-top-three'
  return 'effect-normal'
}
</script>

<style scoped>
.preview-page {
  min-height: 100vh;
  padding: 42px 24px 64px;
  background:
    radial-gradient(circle at 10% 8%, rgba(99, 102, 241, 0.08), transparent 34%),
    radial-gradient(circle at 90% 20%, rgba(217, 70, 239, 0.08), transparent 32%),
    #f8fafc;
  color: #0f172a;
}

.preview-header {
  max-width: 1180px;
  margin: 0 auto 28px;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #7c3aed;
}

.preview-header h1 {
  margin: 0;
  font-size: clamp(26px, 4vw, 42px);
  letter-spacing: -0.04em;
}

.desc {
  max-width: 880px;
  margin: 12px 0 0;
  color: #64748b;
  line-height: 1.7;
}

.site-footer {
  position: relative;
  max-width: 1180px;
  margin: 0 auto;
  overflow: hidden;
  padding: 28px;
  border-radius: 28px;
  background:
    radial-gradient(circle at 12% 24%, rgba(59, 130, 246, 0.14), transparent 34%),
    radial-gradient(circle at 86% 62%, rgba(168, 85, 247, 0.12), transparent 32%),
    linear-gradient(135deg, #111827, #0f172a 52%, #020617);
  box-shadow:
    0 26px 80px rgba(15, 23, 42, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.site-footer::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(
      120deg,
      transparent 0%,
      rgba(255, 255, 255, 0.045) 42%,
      transparent 66%
    );
  opacity: 0.7;
  transform: translateX(-38%);
  animation: footerSheen 12s ease-in-out infinite;
}

.footer-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 34px;
}

.footer-panel {
  min-width: 0;
}

.sponsor-panel {
  flex: 1 1 auto;
}

.operator-panel {
  flex: 0 0 188px;
}

.panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 15px;
}

.panel-head h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 800;
  color: #f8fafc;
}

.panel-head span {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.16em;
  color: rgba(226, 232, 240, 0.42);
}

.sponsor-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 15px 17px;
}

.operator-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card-shell {
  position: relative;
  display: grid;
  place-items: center;
  isolation: isolate;
}

.rank-one {
  width: 154px;
  height: 54px;
}

.rank-two {
  width: 138px;
  height: 49px;
}

.rank-three {
  width: 126px;
  height: 45px;
}

.rank-normal {
  width: 114px;
  height: 40px;
}

.name-card {
  position: relative;
  display: grid;
  place-items: center;
  overflow: hidden;
  isolation: isolate;
  border: none;
  border-radius: 14px;
  color: #f8fbff;
  white-space: nowrap;
  letter-spacing: 0.025em;
  font-weight: 850;
  text-shadow: 0 0 12px rgba(226, 232, 240, 0.34);
  z-index: 2;
}

.rank-one .name-card {
  width: 154px;
  height: 54px;
  font-size: 14px;
}

.rank-two .name-card {
  width: 138px;
  height: 49px;
  font-size: 13px;
}

.rank-three .name-card {
  width: 126px;
  height: 45px;
  font-size: 12.5px;
}

.rank-normal .sponsor-card,
.operator-card {
  width: 114px;
  height: 40px;
  font-size: 12px;
}

.name-card span {
  position: relative;
  z-index: 6;
}

.rank-normal .sponsor-card {
  background:
    linear-gradient(135deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98));
  box-shadow:
    0 10px 22px rgba(0, 0, 0, 0.22),
    inset 0 0 18px rgba(148, 163, 184, 0.045);
}

.edge-particles {
  position: absolute;
  inset: -3px;
  z-index: 4;
  overflow: visible;
  pointer-events: none;
}

.edge-dot {
  position: absolute;
  left: 0;
  top: 0;
  background: var(--particle);
  box-shadow:
    -8px 0 10px rgba(147, 197, 253, 0.5),
    0 0 10px var(--particle),
    0 0 16px var(--glow-a);
  offset-anchor: 50% 50%;
  offset-rotate: auto;
  offset-path: path("M 17 3 H 143 Q 157 3 157 17 V 43 Q 157 57 143 57 H 17 Q 3 57 3 43 V 17 Q 3 3 17 3");
  offset-distance: 0%;
}

.rank-one .sponsor-card {
  background:
    radial-gradient(circle at 20% 16%, var(--card-hot-a), transparent 34%),
    radial-gradient(circle at 82% 76%, var(--card-hot-b), transparent 38%),
    linear-gradient(135deg, var(--card-bg-1), var(--card-bg-2) 52%, var(--card-bg-3));
  box-shadow:
    0 0 18px var(--glow-a),
    0 0 34px var(--glow-b),
    inset 0 0 26px rgba(255, 255, 255, 0.08);
}

.rank-two .sponsor-card {
  background:
    linear-gradient(135deg, var(--card-bg-1), var(--card-bg-2) 48%, var(--card-bg-3));
  box-shadow:
    0 0 15px var(--glow-a),
    0 0 24px rgba(255, 255, 255, 0.04),
    inset 0 0 22px rgba(255, 255, 255, 0.07);
}

.rank-three .sponsor-card {
  background:
    radial-gradient(circle at center, var(--soft-core), transparent 58%),
    linear-gradient(135deg, var(--card-bg-1), var(--card-bg-2));
  box-shadow:
    0 0 10px var(--glow-a),
    inset 0 0 16px rgba(255, 255, 255, 0.06);
}

/* Top1: Version 04 internal Quantum Mesh + Version 03 external Comet Rift particles. */
.effect-top-one {
  --particle: rgba(147, 197, 253, 0.95);
  --glow-a: rgba(129, 140, 248, 0.48);
  --glow-b: rgba(34, 211, 238, 0.38);
  --card-bg-1: #0c1024;
  --card-bg-2: #111827;
  --card-bg-3: #164e63;
  --card-hot-a: rgba(129, 140, 248, 0.42);
  --card-hot-b: rgba(34, 211, 238, 0.32);
}

.effect-top-one::before {
  content: "";
  position: absolute;
  inset: -9px;
  z-index: 0;
  border-radius: 23px;
  background:
    radial-gradient(circle at 24% 28%, var(--glow-a), transparent 46%),
    radial-gradient(circle at 76% 70%, var(--glow-b), transparent 48%);
  filter: blur(13px);
  opacity: 0.82;
  animation: strongerMeshHalo 4.8s ease-in-out infinite;
}

.effect-top-one .edge-dot {
  width: 9px;
  height: 3px;
  border-radius: 999px;
  opacity: 0;
  animation: cometOrbit 6.6s linear infinite;
  animation-delay: var(--delay);
}

.effect-top-one .sponsor-card {
  animation: enhancedMeshBreath 4.8s ease-in-out infinite;
}

.effect-top-one .sponsor-card::before {
  content: "";
  position: absolute;
  inset: -20%;
  z-index: 1;
  background:
    linear-gradient(30deg, transparent 0 45%, rgba(165, 180, 252, 0.15) 46%, transparent 48%),
    linear-gradient(150deg, transparent 0 45%, rgba(34, 211, 238, 0.12) 46%, transparent 48%),
    repeating-linear-gradient(
      90deg,
      transparent 0 13px,
      rgba(255, 255, 255, 0.04) 14px,
      transparent 16px
    );
  background-size: 42px 42px, 42px 42px, 100% 100%;
  animation: hexMeshDrift 9s linear infinite;
}

.effect-top-one .sponsor-card::after {
  content: "";
  position: absolute;
  inset: -35%;
  z-index: 2;
  background:
    radial-gradient(circle at 30% 45%, rgba(165, 180, 252, 0.28), transparent 18%),
    radial-gradient(circle at 70% 55%, rgba(34, 211, 238, 0.2), transparent 20%);
  animation: quantumNodes 5.8s ease-in-out infinite;
}

/* Top2: Version 01 Plasma Rail animation. */
.effect-top-two {
  --glow-a: rgba(244, 114, 182, 0.58);
  --glow-b: rgba(34, 211, 238, 0.54);
  --card-bg-1: #180818;
  --card-bg-2: #1e1b4b;
  --card-bg-3: #0e7490;
  --flow-a: rgba(244, 114, 182, 0.58);
  --flow-b: rgba(103, 232, 249, 0.52);
}

.effect-top-two::before {
  content: "";
  position: absolute;
  inset: -8px;
  z-index: 0;
  border-radius: 21px;
  background:
    radial-gradient(ellipse at 28% 50%, rgba(244, 114, 182, 0.4), transparent 52%),
    radial-gradient(ellipse at 76% 52%, rgba(34, 211, 238, 0.36), transparent 50%);
  filter: blur(11px);
  opacity: 0.5;
  animation: strongerPlasmaHalo 4.7s ease-in-out infinite;
}

.effect-top-two .sponsor-card {
  animation: enhancedPlasmaBreath 4.7s ease-in-out infinite;
}

.effect-top-two .sponsor-card::before {
  content: "";
  position: absolute;
  inset: -40%;
  z-index: 1;
  background:
    linear-gradient(100deg, transparent 28%, var(--flow-a) 46%, var(--flow-b) 52%, transparent 70%);
  animation: mediumSweep 5.8s ease-in-out infinite;
}

/* Top3: Version 05 Void Ribbon animation with stronger breathing light. */
.effect-top-three {
  --glow-a: rgba(168, 85, 247, 0.58);
  --glow-b: rgba(96, 165, 250, 0.52);
  --card-bg-1: #090817;
  --card-bg-2: #171326;
  --soft-core: rgba(168, 85, 247, 0.26);
}

.effect-top-three::before {
  content: "";
  position: absolute;
  inset: -7px;
  border-radius: 20px;
  background:
    radial-gradient(ellipse at 28% 50%, rgba(216, 180, 254, 0.38), transparent 52%),
    radial-gradient(ellipse at 76% 52%, rgba(96, 165, 250, 0.34), transparent 50%);
  filter: blur(10px);
  opacity: 0.48;
  animation: strongerVoidHalo 4.6s ease-in-out infinite;
}

.effect-top-three .sponsor-card {
  animation: enhancedVoidBreath 4.6s ease-in-out infinite;
}

.effect-top-three .sponsor-card::before {
  content: "";
  position: absolute;
  inset: -45%;
  z-index: 1;
  background:
    radial-gradient(ellipse at 20% 50%, rgba(216, 180, 254, 0.24), transparent 40%),
    radial-gradient(ellipse at 80% 50%, rgba(96, 165, 250, 0.22), transparent 42%);
  animation: ribbonWave 6.8s ease-in-out infinite;
}

.effect-top-three .sponsor-card::after {
  content: "";
  position: absolute;
  inset: -22%;
  z-index: 2;
  background:
    linear-gradient(
      100deg,
      transparent 0 30%,
      rgba(216, 180, 254, 0.22) 42%,
      rgba(96, 165, 250, 0.24) 50%,
      transparent 65%
    );
  animation: liquidRibbon 7.5s ease-in-out infinite;
}

.operator-card {
  background:
    radial-gradient(circle at 24% 26%, rgba(45, 212, 191, 0.26), transparent 35%),
    linear-gradient(135deg, #07111f, #0f172a 54%, #083344);
  box-shadow:
    0 0 15px rgba(45, 212, 191, 0.24),
    inset 0 0 20px rgba(255, 255, 255, 0.055);
}

.operator-card::before {
  content: "";
  position: absolute;
  inset: -1px;
  z-index: 1;
  background:
    linear-gradient(90deg, transparent, rgba(103, 232, 249, 0.28), transparent),
    linear-gradient(135deg, transparent 0 42%, rgba(255, 255, 255, 0.09) 48%, transparent 56%),
    repeating-linear-gradient(
      90deg,
      transparent 0 10px,
      rgba(255, 255, 255, 0.035) 11px 12px
    );
  background-size: 180% 100%, 180% 100%, 100% 100%;
  animation: opsDataRail 6.2s ease-in-out infinite;
  animation-delay: calc(var(--op) * -0.42s);
  opacity: 0.9;
}

.operator-card::after {
  content: "";
  position: absolute;
  inset: -28%;
  z-index: 2;
  background:
    radial-gradient(circle at 50% 50%, transparent 0 36%, rgba(45, 212, 191, 0.24) 37% 38%, transparent 39%),
    linear-gradient(60deg, transparent 0 42%, rgba(103, 232, 249, 0.28) 46%, transparent 50%),
    linear-gradient(120deg, transparent 0 46%, rgba(255, 255, 255, 0.08) 48%, transparent 52%);
  opacity: 0.45;
  animation: opsHoloDrift 11s linear infinite;
  animation-delay: calc(var(--op) * -0.55s);
}

@keyframes footerSheen {
  0%,
  100% {
    transform: translateX(-46%);
    opacity: 0.22;
  }

  48%,
  60% {
    opacity: 0.66;
  }

  100% {
    transform: translateX(46%);
  }
}

@keyframes cometOrbit {
  0% {
    offset-distance: 0%;
    opacity: 0;
    transform: rotate(0deg) scaleX(0.55);
  }

  16% {
    opacity: 0;
  }

  30%,
  58% {
    opacity: 0.86;
  }

  84% {
    opacity: 0;
  }

  100% {
    offset-distance: 100%;
    opacity: 0;
    transform: rotate(0deg) scaleX(1.05);
  }
}

@keyframes strongerMeshHalo {
  0%,
  100% {
    opacity: 0.5;
    filter: blur(11px);
    transform: scale(0.95);
  }

  42%,
  58% {
    opacity: 0.98;
    filter: blur(17px);
    transform: scale(1.1);
  }
}

@keyframes enhancedMeshBreath {
  0%,
  100% {
    filter: brightness(0.92) saturate(1.04);
    box-shadow:
      0 0 12px rgba(129, 140, 248, 0.42),
      0 0 24px rgba(34, 211, 238, 0.26),
      inset 0 0 22px rgba(255, 255, 255, 0.07);
    transform: translateY(0) scale(1);
  }

  48%,
  60% {
    filter: brightness(1.3) saturate(1.35);
    box-shadow:
      0 0 22px rgba(165, 180, 252, 0.82),
      0 0 42px rgba(34, 211, 238, 0.58),
      inset 0 0 28px rgba(255, 255, 255, 0.13);
    transform: translateY(-1px) scale(1.018);
  }
}

@keyframes hexMeshDrift {
  from {
    background-position: 0 0, 0 0, 0 0;
  }

  to {
    background-position: 42px 24px, -42px 24px, 28px 0;
  }
}

@keyframes quantumNodes {
  0%,
  100% {
    transform: translateX(-8%) translateY(0);
    opacity: 0.36;
  }

  50% {
    transform: translateX(8%) translateY(-2%);
    opacity: 0.75;
  }
}

@keyframes strongerPlasmaHalo {
  0%,
  100% {
    opacity: 0.38;
    filter: blur(10px);
    transform: scale(0.94);
  }

  42%,
  58% {
    opacity: 0.96;
    filter: blur(16px);
    transform: scale(1.11);
  }
}

@keyframes enhancedPlasmaBreath {
  0%,
  100% {
    filter: brightness(0.9) saturate(1.02);
    box-shadow:
      0 0 10px rgba(244, 114, 182, 0.34),
      0 0 18px rgba(34, 211, 238, 0.2),
      inset 0 0 18px rgba(255, 255, 255, 0.06);
    transform: translateY(0) scale(1);
  }

  48%,
  60% {
    filter: brightness(1.28) saturate(1.34);
    box-shadow:
      0 0 20px rgba(244, 114, 182, 0.78),
      0 0 36px rgba(103, 232, 249, 0.54),
      inset 0 0 25px rgba(255, 255, 255, 0.12);
    transform: translateY(-1px) scale(1.018);
  }
}

@keyframes mediumSweep {
  0%,
  100% {
    transform: translateX(-36%);
    opacity: 0.24;
  }

  50% {
    transform: translateX(36%);
    opacity: 0.76;
  }
}

@keyframes strongerVoidHalo {
  0%,
  100% {
    opacity: 0.38;
    transform: scale(0.94);
  }

  42%,
  58% {
    opacity: 0.94;
    transform: scale(1.11);
  }
}

@keyframes enhancedVoidBreath {
  0%,
  100% {
    filter: brightness(0.9) saturate(1);
    box-shadow:
      0 0 8px rgba(168, 85, 247, 0.34),
      0 0 14px rgba(96, 165, 250, 0.18),
      inset 0 0 16px rgba(255, 255, 255, 0.06);
    transform: translateY(0) scale(1);
  }

  48%,
  60% {
    filter: brightness(1.28) saturate(1.34);
    box-shadow:
      0 0 18px rgba(216, 180, 254, 0.76),
      0 0 34px rgba(96, 165, 250, 0.52),
      inset 0 0 24px rgba(255, 255, 255, 0.12);
    transform: translateY(-1px) scale(1.018);
  }
}

@keyframes ribbonWave {
  0%,
  100% {
    transform: translateX(-14%) rotate(0deg);
    opacity: 0.36;
  }

  50% {
    transform: translateX(14%) rotate(6deg);
    opacity: 0.74;
  }
}

@keyframes liquidRibbon {
  0%,
  100% {
    transform: translateX(-42%) skewX(-18deg);
    opacity: 0.18;
  }

  50% {
    transform: translateX(42%) skewX(-18deg);
    opacity: 0.78;
  }
}

@keyframes opsDataRail {
  0%,
  100% {
    background-position: -130% 0, -80% 0, 0 0;
    opacity: 0.56;
  }

  50% {
    background-position: 130% 0, 120% 0, 0 0;
    opacity: 0.92;
  }
}

@keyframes opsHoloDrift {
  from {
    transform: rotate(0deg) translateX(-2px);
  }

  to {
    transform: rotate(360deg) translateX(-2px);
  }
}

@media (max-width: 820px) {
  .footer-inner {
    flex-direction: column;
    gap: 26px;
  }

  .operator-panel {
    flex: none;
    width: 100%;
  }

  .operator-list {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

@media (max-width: 520px) {
  .preview-page {
    padding: 30px 14px 48px;
  }

  .site-footer {
    padding: 22px 18px;
    border-radius: 22px;
  }

  .rank-one {
    width: 148px;
    height: 52px;
  }

  .rank-one .name-card {
    width: 148px;
    height: 52px;
  }

  .edge-dot {
    offset-path: path("M 16 3 H 138 Q 151 3 151 16 V 42 Q 151 55 138 55 H 16 Q 3 55 3 42 V 16 Q 3 3 16 3");
  }
}

@media (prefers-reduced-motion: reduce) {
  .site-footer::before,
  .edge-dot,
  .effect-top-one::before,
  .effect-top-one .sponsor-card,
  .effect-top-one .sponsor-card::before,
  .effect-top-one .sponsor-card::after,
  .effect-top-two::before,
  .effect-top-two .sponsor-card,
  .effect-top-two .sponsor-card::before,
  .effect-top-three::before,
  .effect-top-three .sponsor-card,
  .effect-top-three .sponsor-card::before,
  .effect-top-three .sponsor-card::after,
  .operator-card::before,
  .operator-card::after {
    animation: none !important;
  }
}
</style>
