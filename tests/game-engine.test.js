const assert = require("assert");

global.window = {};
require("../game-data.js");
require("../game-engine.js");

const engine = new window.GameEngine(window.GAME_DATA);

assert.strictEqual(engine.scene.id, "party");
assert.strictEqual(engine.state.turnsLeft, 4);

const beforeSimulation = engine.snapshot();
const simulation = engine.simulate("observe_lily");
assert.strictEqual(simulation.ok, true);
assert.strictEqual(engine.state.metrics.empathy, beforeSimulation.metrics.empathy);
assert.strictEqual(engine.state.simulationsLeft, 1);

assert.strictEqual(engine.commit("observe_lily").ok, true);
assert.ok(engine.state.clues.includes("lily_retort"));
assert.strictEqual(engine.state.turnsLeft, 3);
assert.strictEqual(engine.commit("observe_lily").ok, false);

engine.commit("ask_ivors");
engine.selectClue("lily_retort");
engine.selectClue("ivors_conflict");
const inference = engine.connectSelectedClues();
assert.strictEqual(inference.ok, true);
assert.strictEqual(inference.hypothesis.id, "self_hypothesis");

engine.advanceScene();
assert.strictEqual(engine.scene.id, "departure");
engine.commit("observe_gretta");
engine.commit("identify_song");
engine.selectClue("gretta_reaction");
engine.selectClue("old_song");
assert.strictEqual(engine.connectSelectedClues().hypothesis.id, "song_hypothesis");

engine.advanceScene();
assert.strictEqual(engine.scene.id, "hotel");
assert.strictEqual(engine.commit("ask_michael_gently").ok, true);
engine.commit("offer_silence");
engine.commit("look_at_snow");
engine.selectClue("michael_truth");
engine.selectClue("snow_reflection");
assert.strictEqual(engine.connectSelectedClues().hypothesis.id, "love_hypothesis");
engine.advanceScene();

assert.strictEqual(engine.state.ended, true);
assert.ok(["snow", "companion", "distance"].includes(engine.state.ending.id));
console.log(`Game flow passed with ending: ${engine.state.ending.title}`);

const distanceEngine = new window.GameEngine(window.GAME_DATA);
distanceEngine.commit("tip_lily");
distanceEngine.commit("debate_ivors");
distanceEngine.advanceScene();
distanceEngine.commit("observe_gretta");
distanceEngine.commit("identify_song");
distanceEngine.commit("ask_about_song");
distanceEngine.commit("press_on_stairs");
distanceEngine.advanceScene();
distanceEngine.commit("compare_love");
distanceEngine.advanceScene();
assert.strictEqual(distanceEngine.state.ending.id, "distance");
console.log(`Conflict flow passed with ending: ${distanceEngine.state.ending.title}`);
