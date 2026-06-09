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