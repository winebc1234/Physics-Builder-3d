/// <reference lib="dom" />
import React, { createContext, useContext, useRef, useState, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { usePointToPointConstraint, useSphere } from '@react-three/cannon';
import { Vector3, BufferGeometry, LineBasicMaterial, Line as ThreeLine, CatmullRomCurve3 } from 'three';
import { DragContextType } from '../types';

const DragContext = createContext<DragContextType | null>(null);

export const useDrag = () => {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDrag must be used within a DragProvider');
  }
  return context;
};

// Visual line connecting cursor to object
const DragLine = ({ startRef, endRef, localPivot }: { startRef: React.MutableRefObject<any>, endRef: React.MutableRefObject<any>, localPivot: Vector3 }) => {
  const lineRef = useRef<any>(null);
  const { scene } = useThree();
  
  // Temporary vectors for calculation
  const startPos = new Vector3();
  const endPos = new Vector3();
  const worldPivot = new Vector3();

  useFrame(() => {
    if (!startRef.current || !endRef.current || !lineRef.current) return;

    // Get cursor position
    startPos.copy(startRef.current.position);

    // Get object position and rotate pivot to match object rotation
    const obj = endRef.current;
    
    // We can't trust obj.position directly from React state sometimes if physics updates it separately
    // But in R3F + Cannon, the mesh ref usually tracks the body.
    // Calculate world position of the attachment point
    worldPivot.copy(localPivot).applyQuaternion(obj.quaternion).add(obj.position);
    
    // Update line geometry
    const positions = new Float32Array([
      startPos.x, startPos.y, startPos.z,
      worldPivot.x, worldPivot.y, worldPivot.z
    ]);
    
    lineRef.current.geometry.setAttribute(
      'position', 
      new THREE.BufferAttribute(positions, 3)
    );
    lineRef.current.geometry.setAttribute(
      'position', 
      new THREE.BufferAttribute(positions, 3)
    );
    lineRef.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color="cyan" linewidth={2} opacity={0.6} transparent />
    </line>
  );
};
// Use global THREE for BufferAttribute since we are inside a module
import * as THREE from 'three';

// The cursor that follows the mouse and connects to the dragged object
const CursorConstraint = ({ targetRef, pivot }: { targetRef: React.MutableRefObject<any>, pivot: Vector3 }) => {
  const { size, viewport, camera } = useThree();
  
  // Create a kinematic sphere that follows the mouse intersection
  const [cursorRef, cursorApi] = useSphere(() => ({ 
    type: 'Kinematic', 
    args: [0.2], 
    position: [0, 0, 0],
    collisionFilterGroup: 0 // Don't collide with anything
  }));

  // Create the constraint between cursor and target
  // We use the passed 'pivot' for pivotB (the object's local attachment point)
  usePointToPointConstraint(cursorRef, targetRef, {
    pivotA: [0, 0, 0],
    pivotB: [pivot.x, pivot.y, pivot.z],
  });

  const initialDistance = useRef(0);

  useEffect(() => {
    if (targetRef.current) {
        // Calculate initial distance from camera to the specific hit point on the object
        // This makes the "grab" feel solid at the depth you clicked
        const objectPos = targetRef.current.position.clone();
        // Adjust for pivot? Approximate is usually fine for initial distance
        initialDistance.current = camera.position.distanceTo(objectPos);
    }
  }, [camera, targetRef]);

  useFrame((state) => {
    const x = (state.pointer.x * viewport.width) / 2;
    const y = (state.pointer.y * viewport.height) / 2;
    
    // Convert 2D mouse to 3D ray
    const vector = new Vector3(state.pointer.x, state.pointer.y, 0.5);
    vector.unproject(camera);
    
    const dir = vector.sub(camera.position).normalize();
    const distance = initialDistance.current || 10;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    cursorApi.position.set(pos.x, pos.y, pos.z);
  });

  return (
    <>
      <mesh ref={cursorRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
      </mesh>
      <DragLine startRef={cursorRef} endRef={targetRef} localPivot={pivot} />
    </>
  );
};

export const DragProvider: React.FC<{ 
  children: React.ReactNode, 
  setOrbitEnabled: (enabled: boolean) => void
}> = ({ children, setOrbitEnabled }) => {
  const [dragState, setDragState] = useState<{ ref: React.MutableRefObject<any>, pivot: Vector3 } | null>(null);

  const startDrag = (ref: React.MutableRefObject<any>, hitPoint: Vector3) => {
    setDragState({ ref, pivot: hitPoint });
    setOrbitEnabled(false);
  };

  const endDrag = () => {
    setDragState(null);
    setOrbitEnabled(true);
  };

  useEffect(() => {
    const handleUp = () => endDrag();
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  return (
    <DragContext.Provider value={{ startDrag, endDrag, draggedRef: dragState?.ref || null }}>
      {children}
      {dragState && <CursorConstraint targetRef={dragState.ref} pivot={dragState.pivot} />}
    </DragContext.Provider>
  );
};

export const Draggable: React.FC<{ children: React.ReactElement; className?: string }> = ({ children }) => {
  const { startDrag } = useDrag();
  
  return React.cloneElement(children as React.ReactElement<any>, {
    onPointerDown: (e: any) => {
      e.stopPropagation();

      const childAny = children as any;
      const ref = childAny.props?.ref || childAny.ref || { current: e.object };
      
      // Calculate local pivot point
      // e.point is the world intersection point
      // object.worldToLocal transforms it to local space
      const worldPoint = e.point.clone();
      const localPoint = e.object.worldToLocal(worldPoint);
      
      startDrag(ref, localPoint);
    },
    onPointerOver: (e: any) => { 
        e.stopPropagation();
        document.body.style.cursor = 'grab'; 
    },
    onPointerOut: (e: any) => { 
        document.body.style.cursor = 'auto'; 
    }
  });
};