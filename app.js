const engine = new window.GameEngine();
let actionFilter = "all";

const $ = (selector) => document.querySelector(selector);
const elements = {
  sceneEyebrow: $("#sceneEyebrow"),
  sceneTitle: $("#sceneTitle"),
  sceneDescription: $("#sceneDescription"),
  turnsLeft: $("#turnsLeft"),
  simulationsLeft: $("#simulationsLeft"),
  advanceButton: $("#advanceButton"),
  metrics: $("#metrics"),
  actionList: $("#actionList"),
  prediction: $("#prediction"),
  clueList: $("#clueList"),
  graph: $("#graph"),
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
  const ids = new Set(["gabriel", "gretta", "lily", "ivors"]);
  if (engine.state.clues.includes("michael_name")) ids.add("michael");
  return ids;
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
  const width = elements.graph.clientWidth || 720;
  const height = 500;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const knownCharacters = engine.data.characters.filter((character) => knownCharacterIds().has(character.id));
  const clues = engine.state.clues.map((id) => ({ id, ...engine.data.clues[id] }));
  const hypotheses = engine.state.hypotheses.map((id) => ({
    ...engine.data.hypotheses.find((item) => item.id === id),
    character: "gabriel",
  }));
  const nodes = [
    ...knownCharacters.map((item, index) => ({
      id: `character:${item.id}`, label: item.name, kind: "character",
      x: 110, y: 80 + index * (340 / Math.max(1, knownCharacters.length - 1)),
    })),
    ...clues.map((item, index) => ({
      id: `clue:${item.id}`, label: item.title, kind: "clue", character: item.character,
      x: width * 0.5, y: 55 + index * (390 / Math.max(1, clues.length - 1)),
    })),
    ...hypotheses.map((item, index) => ({
      id: `hypothesis:${item.id}`, label: item.title, kind: "hypothesis", character: item.character,
      x: width - 115, y: 110 + index * 120,
    })),
  ];
  const nodeIndex = new Map(nodes.map((node) => [node.id, node]));

  [...clues, ...hypotheses].forEach((item) => {
    const source = nodeIndex.get(`${item.id && engine.data.clues[item.id] ? "clue" : "hypothesis"}:${item.id}`);
    const target = nodeIndex.get(`character:${item.character}`);
    if (!source || !target) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", source.x);
    line.setAttribute("y1", source.y);
    line.setAttribute("x2", target.x);
    line.setAttribute("y2", target.y);
    line.setAttribute("class", source.kind);
    svg.appendChild(line);
  });

  nodes.forEach((node) => {
    const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
    group.setAttribute("class", `graph-node ${node.kind}`);
    group.setAttribute("transform", `translate(${node.x} ${node.y})`);
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", node.kind === "character" ? "25" : "16");
    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("y", node.kind === "character" ? "42" : "31");
    label.setAttribute("text-anchor", "middle");
    label.textContent = node.label.length > 13 ? `${node.label.slice(0, 12)}…` : node.label;
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = node.label;
    group.append(circle, label, title);
    svg.appendChild(group);
  });
  elements.graph.appendChild(svg);
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

renderPrediction();
render();
