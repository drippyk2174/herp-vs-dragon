// Web remake of your game logic. Preserves hero_skill bar and original mechanics,
// uses a cleaner turn flow and improved clamping. Mana cap increased to 100 (user okayed).

// --- Constants ---
const MAX_HERO_HEALTH = 300;
const MAX_HERO_MANA = 100;

// --- Game State (starts similar to your original script) ---
let hero_health = 300;
let dragon_health = 500;
let hero_mana = 60;
let hero_skill = 20;
let shield_active = false;

let monster1_health = 0;
let monster2_health = 0;
let monster3_health = 0;
let monsters_spawned = false;

// --- DOM refs ---
const dragonArt = document.getElementById('dragon-art');
const heroHpBar = document.getElementById('hero-hp-bar');
const heroHpText = document.getElementById('hero-hp-text');
const heroManaBar = document.getElementById('hero-mana-bar');
const heroManaText = document.getElementById('hero-mana-text');
const heroSkillBar = document.getElementById('hero-skill-bar');
const heroSkillText = document.getElementById('hero-skill-text');
const dragonHpBar = document.getElementById('dragon-hp-bar');
const dragonHpText = document.getElementById('dragon-hp-text');

const hordeRow = document.getElementById('horde-row');
const m1HealthEl = document.getElementById('m1-health');
const m2HealthEl = document.getElementById('m2-health');
const m3HealthEl = document.getElementById('m3-health');

const logEl = document.getElementById('log');
const targetSelect = document.getElementById('target-select');
const overlay = document.getElementById('overlay');
const overlayBox = document.getElementById('overlay-box');

const actionButtons = document.querySelectorAll('.action-btn');
const targetRadios = document.querySelectorAll('input[name="target"]');

// Cheats & restart
document.getElementById('cheat-maxhp').addEventListener('click', () => {
  hero_health = MAX_HERO_HEALTH;
  appendLog('❤️ CHEAT: Hero health maxed out!');
  render();
});
document.getElementById('cheat-instantkill').addEventListener('click', () => {
  dragon_health = 0; monster1_health = monster2_health = monster3_health = 0;
  appendLog('⚡ CHEAT: Instant annihilation engaged!');
  render();
});
document.getElementById('restart').addEventListener('click', resetGame);

// Hook actions
actionButtons.forEach(btn => btn.addEventListener('click', () => {
  const action = btn.dataset.action;
  doHeroAction(action);
}));

// --- Utility / Rendering ---
function appendLog(text){
  const t = document.createElement('div');
  t.textContent = text;
  logEl.prepend(t);
}

function clampGameValues(){
  hero_health = Math.min(MAX_HERO_HEALTH, Math.max(0, hero_health));
  hero_mana = Math.min(MAX_HERO_MANA, Math.max(0, hero_mana));
  hero_skill = Math.max(0, hero_skill);
  dragon_health = Math.max(0, dragon_health);
  monster1_health = Math.max(0, monster1_health);
  monster2_health = Math.max(0, monster2_health);
  monster3_health = Math.max(0, monster3_health);
}

function percent(value, max){ return Math.round((value / max) * 100); }

function updateBars(){
  heroHpBar.style.width = percent(hero_health, MAX_HERO_HEALTH) + '%';
  heroHpText.textContent = `${hero_health}/${MAX_HERO_HEALTH}`;

  heroManaBar.style.width = percent(hero_mana, MAX_HERO_MANA) + '%';
  heroManaText.textContent = `${hero_mana}/${MAX_HERO_MANA}`;

  // Skill has no "max" in original; to show progress toward 50 (ultimate) we visualize up to 100
  heroSkillBar.style.width = Math.min(100, hero_skill) + '%';
  heroSkillText.textContent = `${hero_skill} Skill`;

  dragonHpBar.style.width = Math.min(100, Math.round((dragon_health/500)*100)) + '%';
  dragonHpText.textContent = `${dragon_health} / 500`;
}

function updateDragonArt(){
  if (dragon_health <= 0){
    dragonArt.textContent = `
          💀
       _______
      /       \\

     |  R.I.P  |          (\\_/)
     |  DRAGON |          (🏆.🏆)
     |_________|          (>👑 <)
                          VICTOR!
    `;
  } else if (dragon_health > 150){
    dragonArt.textContent = `
      <>=======() 
    _ (/-*-*-*-*-\) _
  _(_ |  \\ _ /  | _)_     (\\_/)
 (  _ |  (_^_)  | _  )    (o.o)
 (_(_ |  /   \\  | __))   (>⚔️ <)  
      \\_________/         DRAGON
        ALIVE
    `;
  } else {
    dragonArt.textContent = `
      <>=======() 
    _ (/-*-*-*-*-\) _
  _(_ |  \\ _ /  | _)_     (\\_/)
 (  _ |  (>__<)  | _  )   (💥.💥)
 (_(_ |  /💥 💥\\  | __))  (>⚔️ <)  
      \\_________/         DRAGON
       HURT - Beware!
    `;
  }
}

function showHorde(){
  const hordeActive = (dragon_health <= 50 && dragon_health > 0);
  if (hordeActive && !monsters_spawned){
    // spawn them once
    monster1_health = monster1_health || 20;
    monster2_health = monster2_health || 20;
    monster3_health = monster3_health || 20;
    monsters_spawned = true;
    appendLog('⚠️ SYSTEM: The dragon\'s roar has summoned a horde!');
  }
  hordeRow.classList.toggle('hidden', !(dragon_health <= 50 && (monster1_health>0 || monster2_health>0 || monster3_health>0)));
  m1HealthEl.textContent = monster1_health;
  m2HealthEl.textContent = monster2_health;
  m3HealthEl.textContent = monster3_health;

  // enable/disable target radio options depending on horde active or monster alive
  const enableTargets = (dragon_health <= 50 && (monster1_health>0 || monster2_health>0 || monster3_health>0));
  targetRadios.forEach(r => {
    if (r.value === 'D') { r.checked = r.checked || true; r.parentElement.style.opacity = 1; r.disabled = false; }
    else {
      // disable the radio if the monster is dead
      const id = parseInt(r.value, 10);
      const alive = (id ===1?monster1_health:(id===2?monster2_health:monster3_health)) > 0;
      r.disabled = !enableTargets || !alive;
      r.parentElement.style.opacity = (enableTargets && alive) ? 1 : 0.45;
    }
  });
}

function render(){
  clampGameValues();
  updateDragonArt();
  updateBars();
  showHorde();
}

// --- Game Logic: hero action followed by enemy turns ---
function getSelectedTarget(){
  const selected = document.querySelector('input[name="target"]:checked');
  return selected ? selected.value : 'D';
}

let turnLocked = false;

function lockTurn(){
  turnLocked = true;
  document.querySelectorAll('button, input[type=radio]').forEach(el => el.disabled = true);
}
function unlockTurn(){
  turnLocked = false;
  document.querySelectorAll('button, input[type=radio]').forEach(el => el.disabled = false);
  // keep restart & cheat enabled (re-enable them)
  document.getElementById('restart').disabled = false;
  document.getElementById('cheat-instantkill').disabled = false;
  document.getElementById('cheat-maxhp').disabled = false;
}

function doHeroAction(action){
  if (turnLocked) return;
  lockTurn();
  shield_active = false; // resets at start of hero turn in original loop semantics
  // spawn detection (if below threshold)
  if (dragon_health <= 50 && !monsters_spawned){
    monster1_health = monster1_health || 20;
    monster2_health = monster2_health || 20;
    monster3_health = monster3_health || 20;
    monsters_spawned = true;
    appendLog('⚠️ SYSTEM: Monsters are spawning!');
  }

  const target = getSelectedTarget();
  let damage = 0;

  if (action === 'attack'){
    damage = 15;
    hero_skill += 10; // restore hero skill bar behavior
    appendLog('⚔️ You swung your sword! (+10 Skill)');
  } else if (action === 'shield'){
    shield_active = true;
    hero_mana = Math.min(MAX_HERO_MANA, hero_mana + 10);
    appendLog('🛡️ You raised your shield and channeled +10 Mana!');
  } else if (action === 'counter'){
    const cost = 20;
    if (hero_mana >= cost){
      shield_active = true;
      damage = 20;
      hero_mana -= cost;
      appendLog('🛡️ Guard up + ⚡ Counter-Strike! (-20 Mana)');
    } else {
      appendLog('❌ Out of Mana for Counter-Strike! You stumble and leave yourself open!');
    }
  } else if (action === 'ultimate'){
    if (hero_skill >= 50){
      hero_skill -= 50;
      damage = 150;
      appendLog('🌟 UNBELIEVABLE! You unleashed your ultimate potential!');
    } else {
      appendLog('❌ You lack the inner focus to unleash this ultimate power yet.');
    }
  } else if (action === 'fireball'){
    const cost = 30;
    if (hero_mana >= cost){
      hero_mana -= cost;
      damage = 50;
      appendLog('🔥 GIGANTIC FIRE BALL CAST! (-30 Mana)');
    } else {
      appendLog('❌ Not enough Mana for Fire Ball!');
    }
  }

  // Cheats handled in UI (buttons)
  // Apply damage and lifesteal
  if (damage > 0){
    // lifesteal passive: +2 HP per attack, cap at MAX_HERO_HEALTH
    hero_health = Math.min(MAX_HERO_HEALTH, hero_health + 2);
    appendLog('🩸 LIFESTEAL PASSIVE: You drained 2 HP from your target!');
    if (target === '1' && monster1_health > 0){
      monster1_health -= damage;
      appendLog(`Slashed Monster 1 for ${damage} damage!`);
    } else if (target === '2' && monster2_health > 0){
      monster2_health -= damage;
      appendLog(`Slashed Monster 2 for ${damage} damage!`);
    } else if (target === '3' && monster3_health > 0){
      monster3_health -= damage;
      appendLog(`Slashed Monster 3 for ${damage} damage!`);
    } else {
      dragon_health -= damage;
      appendLog(`Dealt ${damage} damage to the Dragon!`);
    }
  }

  // If dragon hits 50 exactly in original code had a warning; replicate
  if (dragon_health === 50){
    appendLog('⚠️ SYSTEM WARNING: Monsters are Spawning everywhere!');
  }

  // clamp then run enemy turns with timed steps for UX
  render();

  // short delay before dragon turn
  setTimeout(() => {
    dragonTurn();
    render();
    // then monster horde turn
    setTimeout(() => {
      monsterHordeTurn();
      render();
      // unlock after full enemy resolution
      checkEndConditions();
      unlockTurn();
    }, 700);
  }, 600);
}

function dragonTurn(){
  if (dragon_health <= 0) return;
  appendLog('🎬 The dragon prepares a counter-attack...');
  if (shield_active){
    appendLog('💥 CLANG! Your shield deflected the dragon\'s scorching breath!');
  } else {
    hero_health -= 20;
    appendLog('🩸 OUCH! You took 20 piercing damage from the dragon\'s claws!');
  }
}

function monsterHordeTurn(){
  if (!(dragon_health <= 50 && dragon_health > 0)) return;
  if (monster1_health <= 0 && monster2_health <= 0 && monster3_health <= 0) return;

  appendLog('👹 The spawned monsters swarm forward to attack!');
  [monster1_health, monster2_health, monster3_health].forEach((mh, idx) => {
    if (mh > 0){
      if (shield_active){
        appendLog(`🛡️ Your shield blocked Monster ${idx+1}!`);
      } else {
        hero_health -= 5;
        appendLog(`💥 Monster ${idx+1} hits you for 5 damage!`);
      }
    }
  });
}

// End / win conditions
function checkEndConditions(){
  clampGameValues();
  if (hero_health <= 0){
    setTimeout(() => showOverlay('💀 GAME OVER\nYou were reduced to ashes by the dragon\'s army...'), 200);
  } else if (dragon_health <= 0 && monster1_health <= 0 && monster2_health <= 0 && monster3_health <= 0){
    setTimeout(() => showOverlay('🎉 VICTORY IS YOURS!\nThe legendary dragon and his horde have been vanquished!'), 200);
  }
}

function showOverlay(text){
  overlayBox.textContent = text;
  overlay.classList.remove('hidden');
  // disable all controls while overlay shown
  document.querySelectorAll('button, input[type=radio]').forEach(el => el.disabled = true);
}

// Reset
function resetGame(){
  hero_health = 300;
  dragon_health = 500;
  hero_mana = 60;
  hero_skill = 20;
  shield_active = false;
  monster1_health = 0;
  monster2_health = 0;
  monster3_health = 0;
  monsters_spawned = false;
  logEl.innerHTML = '';
  overlay.classList.add('hidden');
  render();
  unlockTurn();
  appendLog('🔁 Game restarted.');
}

// Start
resetGame();
render();
