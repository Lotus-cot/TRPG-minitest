# TRPG Minitest

A focused MVP for testing a player-facing narrative investigation, emotional interaction, knowledge graph, and choice-simulation loop before integrating the design into the larger TRPG repositories.

## Creative Direction

- Player character: Gabriel Conroy.
- Narrative goal: understand Gretta and the people around Gabriel through observation, investigation, conversation, and reflection.
- Adaptation policy: reasonable branches and alternative emotional outcomes are allowed while preserving the literary foundation.
- Expected play time: 20-30 minutes.
- Core cast: Gabriel, Gretta, Lily, Miss Ivors, and Michael Furey.
- Content boundary: characters, relationships, past events, and outcomes may change through play.

## MVP Scope

- 3 investigable scenes.
- 5 core characters.
- 10-15 discoverable clues.
- 3 endings.
- Limited actions per scene.
- 2 mental simulations per scene.
- Investigation actions: observe, ask, and connect clues.
- Emotional actions: press, accompany, and share vulnerability.
- Relationship dimensions: trust, intimacy, tension, empathy, and openness.
- NPC autonomous actions driven by goals and emotional state.
- Player knowledge graph containing confirmed facts, testimony, and player hypotheses.

## Core Loop

```text
Observe a scene
  -> investigate or converse
  -> discover clues and character knowledge
  -> update the player knowledge graph
  -> simulate possible actions
  -> commit to a real action
  -> update world and emotional state
  -> unlock scenes, clues, and endings
```

## Prototype Boundary

This repository is intentionally independent from `TRPG-World-Status`, `Game_Engine`, `Game_Module_The_Dead`, and `literary-empathy-prototype`. Successful mechanics can be extracted into those repositories after the MVP proves the gameplay loop.

## Current Playable Prototype

The repository now contains a dependency-free browser game that simulates the
complete MVP loop:

- play Gabriel across three scenes,
- spend limited actions and mental rehearsals,
- investigate or take emotional actions,
- discover clues and connect two clues into player hypotheses,
- watch the player-facing knowledge graph grow,
- trigger NPC responses between scenes,
- reach one of three relationship endings.

Mental rehearsal never mutates the real relationship state. It estimates likely
effects using only the clues and hypotheses Gabriel currently knows.

## Run

On Windows, run:

```powershell
.\start.ps1
```

The script opens:

```text
http://127.0.0.1:8010
```

Alternatively:

```powershell
npm start
```

No package installation is required.

## Test

```powershell
npm test
```

The automated test verifies that:

- mental rehearsal does not mutate real relationship metrics,
- clues unlock player hypotheses,
- actions cannot be committed twice,
- scene transitions and NPC reactions work,
- both empathetic and conflict-driven paths produce valid endings.

## Prototype Architecture

```text
game-data.js
  Story-specific scenes, actions, clues, hypotheses, and effects

game-engine.js
  Reusable state transitions, simulation, inference, NPC turns, and endings

app.js
  Player interface and player-knowledge graph projection
```

This separation demonstrates the intended future boundary:

- module data describes the story,
- the engine executes generic rules,
- the player interface only receives the player's current knowledge.
