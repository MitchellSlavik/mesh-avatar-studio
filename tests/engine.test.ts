import { expect, test } from 'vitest';
import fixture from '../samples/miko-qipao/rig.json';
import { parseRig, validateRig, PARAMS } from 'mesh-avatar';
import { createRig } from '../packages/runtime/src/engine/rig.js';
import { createPhysics } from '../packages/runtime/src/engine/physics.js';

test('rig instances have isolated coordinates and physics state', () => {
  const a = parseRig(fixture);
  const b = parseRig(fixture);
  b.head.shiftX += 100;
  const first = createRig(a);
  const second = createRig(b);
  const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
  P.angleX = 30;
  const x = [600, 400];
  const y = [...x];
  first.applyHead(x, 1, P);
  second.applyHead(y, 1, P);
  expect(x).not.toEqual(y);
  const { Physics } = createPhysics(first, a);
  expect(new Physics()).not.toBe(new Physics());
});

test('missing optional parts and variable strand lengths stay finite', () => {
  const rig = parseRig(fixture);
  delete rig.hand;
  delete rig.buns;
  rig.accessories = [];
  rig.strands = [rig.strands![0]];
  rig.strands[0].nodes.splice(1, 1);
  const engine = createRig(rig);
  const { Physics } = createPhysics(engine, rig);
  const physics = new Physics();
  const P = Object.fromEntries(PARAMS.map(p => [p.id, p.def]));
  const phys = physics.step(P, 1 / 60);
  const out = engine.deformBase(500, 300, engine.baseWeights(500, 300), P, phys, [0, 0]);
  expect(out.every(Number.isFinite)).toBe(true);
  expect(physics.chains).toHaveLength(0);
});

test('rigid parts keep their shape under head and body motion and leave the rest unchanged', () => {
  const plain = parseRig(fixture);
  const rig = parseRig({ ...fixture, rigid: [{ name: 'card', outline: [[150, 600], [350, 600], [350, 900], [150, 900]], anchor: [250, 880] }] });
  const engine = createRig(rig), reference = createRig(plain);
  const P = { ...Object.fromEntries(PARAMS.map(p => [p.id, p.def])), angleX: 20, angleY: -15, angleZ: 30, bodyAngleX: 5, bodyAngleZ: 10, breath: 1 };
  const phys = new (createPhysics(engine, rig).Physics)().step(P, 1 / 60);
  const move = (x: number, y: number) => engine.deformBase(x, y, engine.baseWeights(x, y, 0), P, phys, [0, 0]);
  const corners = [[160, 610], [340, 610], [340, 890], [160, 890]].map(([x, y]) => [x, y, ...move(x, y)]);
  for (const [x0, y0, a0, b0] of corners) for (const [x1, y1, a1, b1] of corners)
    expect(Math.hypot(a1 - a0, b1 - b0)).toBeCloseTo(Math.hypot(x1 - x0, y1 - y0), 9);
  // the part follows its anchor, not the head: the top does not swing further than the bottom
  expect(Math.abs(corners[0][2] - corners[0][0] - (corners[3][2] - corners[3][0]))).toBeLessThan(20);
  const outside = [600, 400];
  expect(move(outside[0], outside[1])).toEqual(reference.deformBase(outside[0], outside[1], reference.baseWeights(outside[0], outside[1], 0), P, phys, [0, 0]));
});

test('rigid parts are optional, need an outline and anchor, and unique names', () => {
  const part = { name: 'fan', outline: [[0, 0], [10, 0], [10, 10]], anchor: [5, 5] };
  expect(validateRig(fixture)).toEqual([]);
  expect(validateRig({ ...fixture, rigid: [part] })).toEqual([]);
  expect(validateRig({ ...fixture, rigid: [part, part] })).toEqual(['rig.rigid[1].name: must be unique']);
  expect(validateRig({ ...fixture, rigid: [{ ...part, outline: [[0, 0], [1, 1]] }] })).toEqual(['rig.rigid[0].outline: expected 3..Infinity items']);
});
