import React, { MutableRefObject } from 'react';
import { Object3D, Vector3 } from 'three';

export interface DraggableProps {
  children: React.ReactNode;
  id?: string;
}

export interface DragContextType {
  startDrag: (ref: MutableRefObject<Object3D | undefined>, hitPoint: Vector3) => void;
  endDrag: () => void;
  draggedRef: MutableRefObject<Object3D | undefined> | null;
}