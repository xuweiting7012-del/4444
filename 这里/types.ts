import * as THREE from 'three';

export enum TreeState {
  SCATTERED = 'SCATTERED',
  TREE_SHAPE = 'TREE_SHAPE',
  TEXT_SHAPE = 'TEXT_SHAPE'
}

export interface Wish {
  id: string;
  startTime: number;
}

export interface ParticleData {
  scatterPosition: THREE.Vector3;
  treePosition: THREE.Vector3;
  textPosition: THREE.Vector3;
  rotation: THREE.Euler;
  scale: number;
  color: THREE.Color;
  speedOffset: number;
  typeId: number; 
}