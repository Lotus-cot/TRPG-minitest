const engine = new window.GameEngine();
let actionFilter = "all";
let graphFocus = "recent";

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
  const width = 1040;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
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
    (character) => knownIds.has(character.id) && (graphFocus === "all" || visibleCharacterIds.has(character.id))
  );
  const rows = knownCharacters.map((character) => ({
    character,
    items: items.filter((item) => item.character === character.id),
  }));
  const rowHeights = rows.map((row) => Math.max(132, Math.ceil(Math.max(1, row.items.length) / 3) * 88 + 38));
  const height = Math.max(240, rowHeights.reduce((total, value) => total + value, 0) + 30);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);

  let yOffset = 22;
  rows.forEach((row, rowIndex) => {
    const rowHeight = rowHeights[rowIndex];
    const characterY = yOffset + rowHeight / 2;
    const divider = document.createElementNS("http://www.w3.org/2000/svg", "line");
    divider.setAttribute("x1", "24");
    divider.setAttribute("x2", String(width - 24));
    divider.setAttribute("y1", String(yOffset + rowHeight));
    divider.setAttribute("y2", String(yOffset + rowHeight));
    divider.setAttribute("class", "graph-divider");
    svg.appendChild(divider);

    row.items.forEach((item, itemIndex) => {
      const column = itemIndex % 3;
      const line = Math.floor(itemIndex / 3);
      const itemX = 300 + column * 235;
      const itemY = yOffset + 42 + line * 88;
      const edge = document.createElementNS("http://www.w3.org/2000/svg", "path");
      edge.setAttribute("d", `M 156 ${characterY} C 205 ${characterY}, 220 ${itemY}, ${itemX - 90} ${itemY}`);
      edge.setAttribute("class", item.kind);
      svg.appendChild(edge);
      drawInfoCard(svg, item, itemX, itemY);
    });

    drawCharacterNode(svg, row.character, 105, characterY);
    yOffset += rowHeight;
  });

  if (!rows.length || !items.length) {
    const empty = document.createElementNS("http://www.w3.org/2000/svg", "text");
    empty.setAttribute("x", String(width / 2));
    empty.setAttribute("y", String(height / 2));
    empty.setAttribute("text-anchor", "middle");
    empty.setAttribute("class", "graph-empty-label");
    empty.textContent = graphFocus === "recent" ? "采取行动后，最近发现会显示在这里。" : "这个人物尚无已知线索。";
    svg.appendChild(empty);
  }

  elements.graph.appendChild(svg);
}

function drawCharacterNode(svg, character, x, y) {
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", "graph-node character");
  group.setAttribute("transform", `translate(${x} ${y})`);
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  circle.setAttribute("r", "31");
  const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
  label.setAttribute("y", "52");
  label.setAttribute("text-anchor", "middle");
  label.textContent = character.name;
  group.append(circle, label);
  svg.appendChild(group);
}

function drawInfoCard(svg, item, x, y) {
  const width = 190;
  const height = 58;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", `graph-info-card ${item.kind}`);
  group.setAttribute("transform", `translate(${x - width / 2} ${y - height / 2})`);
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("rx", "8");
  const type = document.createElementNS("http://www.w3.org/2000/svg", "text");
  type.setAttribute("x", "12");
  type.setAttribute("y", "17");
  type.setAttribute("class", "graph-card-type");
  type.textContent = item.kind === "hypothesis" ? "玩家推论" : "已知线索";
  const title = document.createElementNS("http://www.w3.org/2000/svg", "text");
  title.setAttribute("x", "12");
  title.setAttribute("y", "38");
  title.setAttribute("class", "graph-card-title");
  title.textContent = item.title.length > 15 ? `${item.title.slice(0, 14)}…` : item.title;
  const tooltip = document.createElementNS("http://www.w3.org/2000/svg", "title");
  tooltip.textContent = `${item.title}\n${item.text}`;
  group.append(rect, type, title, tooltip);
  group.addEventListener("click", () => {
    const clue = elements.clueList.querySelector(`[data-knowledge-id="${item.id}"]`);
    clue?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    clue?.classList.add("graph-highlight");
    window.setTimeout(() => clue?.classList.remove("graph-highlight"), 1400);
  });
  svg.appendChild(group);
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

renderPrediction();
render();
