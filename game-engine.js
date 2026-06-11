window.GameEngine = class GameEngine {
  constructor(data = window.GAME_DATA) {
    this.data = data;
    this.reset();
  }

  reset() {
    this.state = {
      sceneIndex: 0,
      turnsLeft: this.data.scenes[0].turns,
      simulationsLeft: 2,
      metrics: { trust: 45, intimacy: 42, tension: 18, empathy: 20, openness: 30 },
      clues: [],
      hypotheses: [],
      actionHistory: [],
      journal: ["晚宴开始。你扮演 Gabriel；World Status 提供世界事实，但你只能依据已知线索行动。"],
      selectedClues: [],
      ended: false,
      ending: null,
    };
    return this.snapshot();
  }

  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }

  get scene() {
    return this.data.scenes[this.state.sceneIndex];
  }

  hasRequirement(action) {
    const known = new Set([...this.state.clues, ...this.state.hypotheses]);
    if (action.requires && !action.requires.every((id) => known.has(id))) return false;
    if (action.requiresAny && !action.requiresAny.some((id) => known.has(id))) return false;
    return true;
  }

  availableActions() {
    return this.scene.actions.map((action) => ({
      ...action,
      available: this.hasRequirement(action) && !this.state.ended,
      used: this.state.actionHistory.some((entry) => entry.actionId === action.id),
    }));
  }

  applyEffects(effects = {}) {
    Object.entries(effects).forEach(([key, value]) => {
      const current = this.state.metrics[key] || 0;
      this.state.metrics[key] = Math.max(0, Math.min(100, current + value));
    });
  }

  reveal(ids = []) {
    ids.forEach((id) => {
      if (!this.state.clues.includes(id)) this.state.clues.push(id);
    });
  }

  confidenceFor(action) {
    const relevant = this.state.clues.length + this.state.hypotheses.length * 2;
    const requirementBonus = this.hasRequirement(action) ? 12 : 0;
    return Math.min(92, 42 + relevant * 3 + requirementBonus);
  }

  simulate(actionId) {
    if (this.state.ended) return { ok: false, message: "故事已经结束。" };
    if (this.state.simulationsLeft <= 0) return { ok: false, message: "本幕的心理预演次数已经用完。" };
    const action = this.scene.actions.find((candidate) => candidate.id === actionId);
    if (!action || !this.hasRequirement(action)) return { ok: false, message: "你还不知道如何想象这个行动。" };

    this.state.simulationsLeft -= 1;
    const confidence = this.confidenceFor(action);
    const predictions = Object.entries(action.effects).map(([metric, value]) => ({
      metric,
      direction: value >= 0 ? "可能上升" : "可能下降",
      magnitude: Math.abs(value) >= 10 ? "明显" : "轻微",
    }));
    this.state.journal.unshift(`心理预演：${action.title}。预测可信度 ${confidence}%。`);
    return {
      ok: true,
      action,
      confidence,
      predictions,
      uncertainty: confidence > 75 ? "你掌握的线索足以看清主要风险。" : "未知信息仍可能改变对方的反应。",
    };
  }

  commit(actionId) {
    if (this.state.ended) return { ok: false, message: "故事已经结束。" };
    if (this.state.turnsLeft <= 0) return { ok: false, message: "本幕已经没有行动机会。" };
    const action = this.scene.actions.find((candidate) => candidate.id === actionId);
    if (!action || !this.hasRequirement(action)) return { ok: false, message: "这个行动尚未解锁。" };
    if (this.state.actionHistory.some((entry) => entry.actionId === actionId)) {
      return { ok: false, message: "这个行动已经发生，无法重复选择。" };
    }

    this.applyEffects(action.effects);
    this.reveal(action.reveals);
    this.state.turnsLeft -= 1;
    this.state.actionHistory.push({ sceneId: this.scene.id, actionId: action.id });
    this.state.journal.unshift(`${action.title}：${action.outcome}`);
    return { ok: true, action, outcome: action.outcome, newClues: action.reveals || [] };
  }

  selectClue(clueId) {
    if (!this.state.clues.includes(clueId)) return { ok: false, message: "你尚未获得这条线索。" };
    const selected = this.state.selectedClues;
    if (selected.includes(clueId)) {
      this.state.selectedClues = selected.filter((id) => id !== clueId);
    } else if (selected.length < 2) {
      selected.push(clueId);
    } else {
      this.state.selectedClues = [selected[1], clueId];
    }
    return { ok: true, selected: [...this.state.selectedClues] };
  }

  connectSelectedClues() {
    const selected = new Set(this.state.selectedClues);
    const match = this.data.hypotheses.find((hypothesis) => {
      if (this.state.hypotheses.includes(hypothesis.id)) return false;
      if (hypothesis.requires) return hypothesis.requires.every((id) => selected.has(id));
      return hypothesis.requiresAnyPairs?.some((pair) => pair.every((id) => selected.has(id)));
    });
    if (!match) {
      return { ok: false, message: "这两条线索暂时无法形成有把握的推论。" };
    }
    this.state.hypotheses.push(match.id);
    this.state.selectedClues = [];
    this.applyEffects(match.effects);
    this.state.journal.unshift(`形成推论：${match.title}。${match.text}`);
    return { ok: true, hypothesis: match };
  }

  advanceScene() {
    if (this.state.ended) return { ok: false, message: "故事已经结束。" };
    const npcLine = this.state.metrics.tension >= 48 ? this.scene.npc.tense : this.scene.npc.calm;
    this.state.journal.unshift(`人物行动：${npcLine}`);
    if (this.scene.briefing?.nextHook) {
      this.state.journal.unshift(`幕间悬念：${this.scene.briefing.nextHook}`);
    }

    if (this.state.sceneIndex >= this.data.scenes.length - 1) {
      this.finish();
      return { ok: true, ended: true, npcLine, ending: this.state.ending };
    }
    this.state.sceneIndex += 1;
    this.state.turnsLeft = this.scene.turns;
    this.state.simulationsLeft = 2;
    this.state.journal.unshift(`进入：${this.scene.title}`);
    return { ok: true, ended: false, npcLine, scene: this.scene };
  }

  finish() {
    const { trust, intimacy, tension, empathy, openness } = this.state.metrics;
    const hasLoveHypothesis = this.state.hypotheses.includes("love_hypothesis");
    if (empathy >= 58 && tension <= 45 && (openness >= 45 || hasLoveHypothesis)) {
      this.state.ending = {
        id: "snow",
        title: "雪落在所有人身上",
        text: "Gabriel 没有征服 Gretta 的过去。他第一次允许另一个人的记忆保持完整，也承认爱可以包含无法占有的部分。",
      };
    } else if (trust >= 50 && intimacy >= 45 && tension < 65) {
      this.state.ending = {
        id: "companion",
        title: "未完成的陪伴",
        text: "你没有完全理解 Gretta，但选择不把困惑变成审判。你们之间留下了一条可以继续交谈的路。",
      };
    } else {
      this.state.ending = {
        id: "distance",
        title: "房间里的两座孤岛",
        text: "Gabriel 试图让过去给出胜负。答案没有带来安全感，反而使两个人都退回各自无法共享的沉默。",
      };
    }
    this.state.ended = true;
    this.state.journal.unshift(`结局：${this.state.ending.title}`);
  }
};
