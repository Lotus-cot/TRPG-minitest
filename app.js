const engine = new window.GameEngine();
let actionFilter = "all";
let graphFocus = "recent";

const $ = (selector) => document.querySelector(selector);
const elements = {
  sceneEyebrow: $("#sceneEyebrow"),
  sceneTitle: $("#sceneTitle"),
  sceneDescription: $("#sceneDescription"),
  actRail: $("#actRail"),
  sceneBriefing: $("#sceneBriefing"),
  turnsLeft: $("#turnsLeft"),
  simulationsLeft: $("#simulationsLeft"),
  advanceButton: $("#advanceButton"),
  metrics: $("#metrics"),
  actionList: $("#actionList"),
  prediction: $("#prediction"),
  clueList: $("#clueList"),
  graph: $("#graph"),
  graphFocus: $("#graphFocus"),
  connectButton: $("#connectButton"),
  selectionHint: $("#selectionHint"),
  journal: $("#journal"),
  endingDialog: $("#endingDialog"),
  endingTitle: $("#endingTitle"),
  endingText: $("#endingText"),
  endingMetrics: $("#endingMetrics"),
  restartButton: $("#restartButton"),
};

const metricLabels = {
  trust: "信任",
  intimacy: "亲密",
  tension: "紧张",
  empathy: "共情",
  openness: "开放",
};

function render() {
  renderScene();
  renderMetrics();
  renderActions();
  renderKnowledge();
  renderJournal();
}

function renderScene() {
  const scene = engine.scene;
  elements.sceneEyebrow.textContent = scene.eyebrow;
  elements.sceneTitle.textContent = scene.title;
  elements.sceneDescription.textContent = scene.description;
  elements.turnsLeft.textContent = engine.state.turnsLeft;
  elements.simulationsLeft.textContent = engine.state.simulationsLeft;
  elements.advanceButton.textContent = engine.state.sceneIndex === engine.data.scenes.length - 1
    ? "结束故事"
    : "结束本幕";
  elements.advanceButton.disabled = engine.state.ended;
  renderActRail();
  renderSceneBriefing(scene);
}

function renderActRail() {
  elements.actRail.replaceChildren();
  engine.data.scenes.forEach((scene, index) => {
    const step = document.createElement("div");
    const state = index < engine.state.sceneIndex ? "complete" : index === engine.state.sceneIndex ? "current" : "future";
    step.className = `act-step ${state}`;
    step.innerHTML = `
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${scene.title}</strong>
    `;
    elements.actRail.appendChild(step);
  });
}

function renderSceneBriefing(scene) {
  const briefing = scene.briefing ?? {};
  const cards = [
    ["当前状态", briefing.opening],
    ["本幕目标", briefing.objective],
    ["核心冲突", briefing.conflict],
    ["在场人物", briefing.participants?.join(" · ")],
  ].filter(([, value]) => value);
  elements.sceneBriefing.innerHTML = cards
    .map(([label, value]) => `<article><span>${label}</span><p>${value}</p></article>`)
    .join("");
}

function renderMetrics() {
  elements.metrics.replaceChildren();
  Object.entries(engine.state.metrics).forEach(([key, value]) => {
    const metric = document.createElement("div");
    metric.className = `metric ${key}`;
    metric.innerHTML = `
      <div><span>${metricLabels[key]}</span><strong>${value}</strong></div>
      <div class="meter"><i style="width:${value}%"></i></div>
    `;
    elements.metrics.appendChild(metric);
  });
}

function renderActions() {
  elements.actionList.replaceChildren();
  engine.availableActions()
    .filter((action) => actionFilter === "all" || action.type === actionFilter)
    .forEach((action) => {
      const card = document.createElement("article");
      const disabled = !action.available || action.used || engine.state.turnsLeft <= 0;
      card.className = `action-card ${action.type}${disabled ? " locked" : ""}`;
      card.innerHTML = `
        <div>
          <span>${action.type === "investigate" ? "调查行动" : "情感行动"}</span>
          <h3>${action.title}</h3>
          <p>${action.description}</p>
        </div>
        <div class="action-buttons">
          <button type="button" data-simulate="${action.id}" ${disabled || engine.state.simulationsLeft <= 0 ? "disabled" : ""}>
            心理预演
          </button>
          <button type="button" data-commit="${action.id}" ${disabled ? "disabled" : ""}>
            ${action.used ? "已经行动" : action.available ? "采取行动" : "尚未理解"}
          </button>
        </div>
      `;
      elements.actionList.appendChild(card);
    });
}

function renderPrediction(result = null) {
  if (!result?.ok) {
    elements.prediction.innerHTML = `
      <p>${result?.message || "选择一个行动进行心理预演。"}</p>
      <p class="muted">预演只消耗本幕的预演次数，不改变人物关系。</p>
    `;
    return;
  }
  const predictions = result.predictions
    .map((entry) => `<li><strong>${metricLabels[entry.metric]}</strong> ${entry.magnitude}${entry.direction}</li>`)
    .join("");
  elements.prediction.innerHTML = `
    <div class="confidence"><span>预测可信度</span><strong>${result.confidence}%</strong></div>
    <h3>${result.action.title}</h3>
    <ul>${predictions}</ul>
    <p class="muted">${result.uncertainty}</p>
  `;
}

function knownCharacterIds() {
  return new Set(engine.data.characters
    .filter((character) => character.introducedIn <= engine.state.sceneIndex)
    .filter((character) => !character.unlockClue || engine.state.clues.includes(character.unlockClue))
    .map((character) => character.id));
}

function renderKnowledge() {
  const selected = new Set(engine.state.selectedClues);
  elements.clueList.replaceChildren();

  if (!engine.state.clues.length && !engine.state.hypotheses.length) {
    elements.clueList.innerHTML = `<p class="empty">你还没有认真观察任何事。</p>`;
  }

  engine.state.clues.forEach((id) => {
    const clue = engine.data.clues[id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = `clue ${clue.kind}${selected.has(id) ? " selected" : ""}`;
    button.dataset.knowledgeId = id;
    button.innerHTML = `<span>${clue.kind}</span><strong>${clue.title}</strong><p>${clue.text}</p>`;
    button.addEventListener("click", () => {
      engine.selectClue(id);
      renderKnowledge();
    });
    elements.clueList.appendChild(button);
  });

  engine.state.hypotheses.forEach((id) => {
    const hypothesis = engine.data.hypotheses.find((item) => item.id === id);
    const card = document.createElement("article");
    card.className = "hypothesis";
    card.dataset.knowledgeId = id;
    card.innerHTML = `<span>玩家推论</span><strong>${hypothesis.title}</strong><p>${hypothesis.text}</p>`;
    elements.clueList.prepend(card);
  });

  elements.connectButton.disabled = engine.state.selectedClues.length !== 2;
  elements.selectionHint.textContent = engine.state.selectedClues.length
    ? `已选择 ${engine.state.selectedClues.length}/2 条线索`
    : "选择两条线索建立推论";
  renderGraph();
}

function renderGraph() {
  elements.graph.replaceChildren();
  const knownIds = knownCharacterIds();
  let clues = engine.state.clues.map((id) => ({ id, ...engine.data.clues[id] }));
  let hypotheses = engine.state.hypotheses.map((id) => ({
    ...engine.data.hypotheses.find((item) => item.id === id),
    character: "gabriel",
    kind: "hypothesis",
  }));

  if (graphFocus === "recent") {
    clues = clues.slice(-6);
    hypotheses = hypotheses.slice(-2);
  } else if (graphFocus !== "all") {
    clues = clues.filter((item) => item.character === graphFocus);
    hypotheses = hypotheses.filter((item) => item.character === graphFocus);
  }

  const items = [...clues.map((item) => ({ ...item, kind: "clue" })), ...hypotheses];
  const visibleCharacterIds = new Set(items.map((item) => item.character));
  if (graphFocus !== "recent" && graphFocus !== "all") visibleCharacterIds.add(graphFocus);
  const knownCharacters = engine.data.characters.filter(
    (character) => knownIds.has(character.id) && visibleCharacterIds.has(character.id)
  );
  const clusters = knownCharacters.map((character) => ({
    character,
    items: items.filter((item) => item.character === character.id),
  }));

  const map = document.createElement("div");
  map.className = "knowledge-map";

  const overview = document.createElement("div");
  overview.className = "graph-overview";
  overview.innerHTML = `
    <div>
      <span>当前视图</span>
      <strong>${elements.graphFocus.selectedOptions[0]?.textContent || "最近发现"}</strong>
    </div>
    <div>
      <span>可见人物</span>
      <strong>${clusters.length}</strong>
    </div>
    <div>
      <span>线索</span>
      <strong>${clues.length}</strong>
    </div>
    <div>
      <span>推论</span>
      <strong>${hypotheses.length}</strong>
    </div>
  `;
  map.appendChild(overview);

  if (!clusters.length || !items.length) {
    const empty = document.createElement("div");
    empty.className = "graph-empty-state";
    empty.innerHTML = `
      <span>尚无记录</span>
      <strong>${graphFocus === "recent" ? "采取行动后，最近发现会显示在这里。" : "这个人物尚无已知线索。"}</strong>
      <p>调查、交流和线索关联都会逐步补全 Gabriel 对世界的理解。</p>
    `;
    map.appendChild(empty);
    elements.graph.appendChild(map);
    return;
  }

  clusters.forEach(({ character, items: characterItems }, clusterIndex) => {
    const cluster = document.createElement("section");
    cluster.className = "knowledge-cluster";
    cluster.style.setProperty("--cluster-index", clusterIndex);

    const identity = document.createElement("header");
    identity.className = "cluster-identity";
    identity.innerHTML = `
      <div class="character-sigil">${character.name.slice(0, 1)}</div>
      <div>
        <span>${character.role}</span>
        <h3>${character.name}</h3>
        <p>${character.note}</p>
      </div>
      <strong>${characterItems.length}</strong>
    `;
    cluster.appendChild(identity);

    const track = document.createElement("div");
    track.className = "cluster-track";
    characterItems.forEach((item, itemIndex) => {
      track.appendChild(createKnowledgeMapCard(item, itemIndex));
    });
    cluster.appendChild(track);
    map.appendChild(cluster);
  });

  elements.graph.appendChild(map);
}

function createKnowledgeMapCard(item, itemIndex) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = `map-card ${item.kind}`;
  card.style.setProperty("--item-index", itemIndex);
  card.innerHTML = `
    <span>${item.kind === "hypothesis" ? "玩家推论" : "已知线索"}</span>
    <strong>${item.title}</strong>
    <p>${item.text}</p>
    <i aria-hidden="true">${String(itemIndex + 1).padStart(2, "0")}</i>
  `;
  card.addEventListener("click", () => {
    const clue = elements.clueList.querySelector(`[data-knowledge-id="${item.id}"]`);
    clue?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    clue?.classList.add("graph-highlight");
    window.setTimeout(() => clue?.classList.remove("graph-highlight"), 1400);
  });
  return card;
}

function renderJournal() {
  elements.journal.replaceChildren();
  engine.state.journal.slice(0, 8).forEach((entry) => {
    const item = document.createElement("li");
    item.textContent = entry;
    elements.journal.appendChild(item);
  });
}

function showEnding() {
  elements.endingTitle.textContent = engine.state.ending.title;
  elements.endingText.textContent = engine.state.ending.text;
  elements.endingMetrics.innerHTML = Object.entries(engine.state.metrics)
    .map(([key, value]) => `<span>${metricLabels[key]} <strong>${value}</strong></span>`)
    .join("");
  elements.endingDialog.showModal();
}

elements.actionList.addEventListener("click", (event) => {
  const simulateId = event.target.dataset.simulate;
  const commitId = event.target.dataset.commit;
  if (simulateId) {
    renderPrediction(engine.simulate(simulateId));
    render();
  }
  if (commitId) {
    const result = engine.commit(commitId);
    renderPrediction(result.ok ? {
      ok: true,
      action: result.action,
      confidence: 100,
      predictions: [],
      uncertainty: result.outcome,
    } : result);
    render();
  }
});

document.querySelectorAll("[data-action-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    actionFilter = button.dataset.actionFilter;
    document.querySelectorAll("[data-action-filter]").forEach((tab) => tab.classList.toggle("active", tab === button));
    renderActions();
  });
});

elements.connectButton.addEventListener("click", () => {
  const result = engine.connectSelectedClues();
  renderPrediction(result.ok ? {
    ok: true,
    action: { title: `形成推论：${result.hypothesis.title}` },
    confidence: 100,
    predictions: [],
    uncertainty: result.hypothesis.text,
  } : result);
  render();
});

elements.graphFocus.addEventListener("change", () => {
  graphFocus = elements.graphFocus.value;
  renderGraph();
});

elements.advanceButton.addEventListener("click", () => {
  const result = engine.advanceScene();
  renderPrediction({ ok: false, message: result.npcLine });
  render();
  if (result.ended) showEnding();
});

elements.restartButton.addEventListener("click", () => {
  elements.endingDialog.close();
  engine.reset();
  renderPrediction();
  render();
});

engine.data.characters.forEach((character) => {
  const option = document.createElement("option");
  option.value = character.id;
  option.textContent = character.name;
  elements.graphFocus.insertBefore(option, elements.graphFocus.lastElementChild);
});

renderPrediction();
render();
