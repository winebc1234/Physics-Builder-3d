
import React, { useState, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Physics, useBox, useSphere } from '@react-three/cannon';
import { OrbitControls, Environment, Sky } from '@react-three/drei';
import { Building, BuildingType } from './Building';
import { DragProvider, Draggable } from './Interaction';

const Floor = ({ isQuaking, quakePower = 1 }: { isQuaking: boolean, quakePower?: number }) => {
  // Use a large kinematic box for the floor so we can move it during earthquake
  const [ref, api] = useBox(() => ({ 
    type: 'Kinematic',
    args: [250, 2, 250], 
    position: [0, -1.1, 0],
    material: { friction: 0.9, restitution: 0.0 } // High friction floor to grip the building base
  }));

  const timeRef = useRef(0);

  useFrame((state, delta) => {
    if (isQuaking) {
      // Wake up the floor if quaking
      api.wakeUp();
      
      // Accumulate time based on normal speed
      const speed = 25;
      timeRef.current += delta * speed;
      const t = timeRef.current;
      
      // Base Magnitude 6.9 Simulation (Weaker than M7.5)
      const intensityX = 1.0 * quakePower;
      const intensityY = 0.4 * quakePower;
      const noiseFactor = 0.6 * quakePower;

      const x = Math.sin(t) * intensityX + (Math.random() - 0.5) * noiseFactor;
      const z = Math.cos(t * 0.9) * intensityX + (Math.random() - 0.5) * noiseFactor;
      
      // Vertical movement
      const y = -1.1 + Math.sin(t * 1.5) * intensityY + (Math.random() - 0.5) * (0.3 * quakePower);
      
      api.position.set(x, y, z);
    } else {
      api.position.set(0, -1.1, 0);
    }
  });

  return (
    <mesh ref={ref} receiveShadow>
      <boxGeometry args={[250, 2, 250]} />
      {/* Invisible material for the box itself, just catching shadows */}
      <shadowMaterial color="#171717" transparent opacity={0.2} />
      {/* Grid helper sitting on top of the box */}
      <gridHelper args={[250, 250, 0x555555, 0x333333]} position={[0, 1.01, 0]} />
    </mesh>
  );
};

const ConcreteCube = () => {
  const [ref] = useBox(() => ({ 
      mass: 40, 
      position: [-15, 2, 10], 
      args: [3, 3, 3], 
  }));
  
  return (
    <Draggable>
      <mesh ref={ref} castShadow receiveShadow>
        <boxGeometry args={[3, 3, 3]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>
    </Draggable>
  );
};

const Ball = () => {
  const [ref] = useSphere(() => ({ 
      mass: 80, 
      position: [12, 10, 12], 
      args: [1.2], 
  }));
  
  return (
    <Draggable>
      <mesh ref={ref} castShadow receiveShadow>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#f43f5e" roughness={0.4} />
      </mesh>
    </Draggable>
  );
};

interface SceneProps {
    stories: number;
    type: BuildingType;
    isQuaking: boolean;
    quakePower?: number;
    isPaused: boolean;
}

export const Scene: React.FC<SceneProps> = ({ stories, type, isQuaking, quakePower = 1, isPaused }) => {
  const [orbitEnabled, setOrbitEnabled] = useState(true);

  return (
    <>
      <Sky sunPosition={[100, 20, 100]} />
      <ambientLight intensity={0.5} />
      {/* Reduced shadow map size from 1024 to 512 to save GPU memory */}
      <pointLight position={[10, 30, 10]} castShadow intensity={1} shadow-mapSize={[512, 512]} />
      
      {/* 
          Optimization & Stability:
          - broadphase="SAP": Faster for many objects.
          - iterations=40: Better stability for tall stacks.
          - friction: 0.6: Concrete-like friction.
          - restitution: 0.05: Low bounce.
      */}
      <Physics 
        gravity={[0, -9.81, 0]} 
        isPaused={isPaused} 
        broadphase="SAP" 
        step={1/60}
        allowSleep={true} 
        iterations={40}
        defaultContactMaterial={{ 
            contactEquationRelaxation: 2, 
            friction: 0.6, 
            restitution: 0.05,
            contactEquationStiffness: 1e7
        }}
      >
        <DragProvider setOrbitEnabled={setOrbitEnabled}>
          <Building stories={stories} type={type} />
          <Floor isQuaking={isQuaking} quakePower={quakePower} />
          <Ball />
          <ConcreteCube />
        </DragProvider>
      </Physics>
      
      <OrbitControls makeDefault enabled={orbitEnabled} />
      <Environment preset="city" />
    </>
  );
};
