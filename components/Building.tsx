
import React, { forwardRef } from 'react';
import { useBox } from '@react-three/cannon';
import { Draggable } from './Interaction';
import { Object3D } from 'three';
import * as THREE from 'three';

// Dimensions
const PILLAR_HEIGHT = 3.5;
const SLAB_HEIGHT = 0.4; // This is "Kinda Big" (Standard)

// Simple Building (Thinner pillars for easier collapse)
const PILLAR_WIDTH_SIMPLE = 0.5; 
const SLAB_WIDTH_SIMPLE = 5.0;
const OFFSET_SIMPLE = 2.2;

// Apartment (Thick pillars for "Big Beam" look)
const PILLAR_WIDTH_APARTMENT = 0.7;
const GRID_SIZE = 4.0; 

// Bank Dimensions
const BANK_GRID = 4.0;
const PILLAR_WIDTH_BANK = 0.6; // Visual Width
const PILLAR_PHYSICS_WIDTH_BANK = 0.8; // Physics Width (Includes Steel Ropes)

// Beam Heights
const BEAM_HEIGHT_KINDA_BIG = 0.4;

// Tighter Gap for "Next to each other" but no overlap
const GAP = 0.05;

// --- Optimization: Pre-create geometries and materials ---
const pillarSimpleGeometry = new THREE.BoxGeometry(PILLAR_WIDTH_SIMPLE, PILLAR_HEIGHT, PILLAR_WIDTH_SIMPLE);
const pillarApartmentGeometry = new THREE.BoxGeometry(PILLAR_WIDTH_APARTMENT, PILLAR_HEIGHT, PILLAR_WIDTH_APARTMENT);
const pillarBankGeometry = new THREE.BoxGeometry(PILLAR_WIDTH_BANK, PILLAR_HEIGHT, PILLAR_WIDTH_BANK);

const slabSimpleGeometry = new THREE.BoxGeometry(SLAB_WIDTH_SIMPLE, SLAB_HEIGHT, SLAB_WIDTH_SIMPLE);

// Standard Apartment Slab (Kinda Big) - Tight fit
const slabApartmentGeometry = new THREE.BoxGeometry(GRID_SIZE - GAP, BEAM_HEIGHT_KINDA_BIG, GRID_SIZE - GAP);
// Bank Slab - Tight fit
const slabBankGeometry = new THREE.BoxGeometry(BANK_GRID - GAP, BEAM_HEIGHT_KINDA_BIG, BANK_GRID - GAP);

// Bank Wall Geometries (Fits between pillars)
const WALL_THICKNESS = 0.4;
const WINDOW_THICKNESS = 0.15; // Thinner for windows
// Visual Length (Connects to visual pillar)
const WALL_LENGTH_BANK_VISUAL = BANK_GRID - PILLAR_WIDTH_BANK - GAP; 
const wallBankGeometryX = new THREE.BoxGeometry(WALL_LENGTH_BANK_VISUAL, PILLAR_HEIGHT, WALL_THICKNESS);
const wallBankGeometryZ = new THREE.BoxGeometry(WALL_THICKNESS, PILLAR_HEIGHT, WALL_LENGTH_BANK_VISUAL);

// Bank Window Geometries
const windowBankGeometryX = new THREE.BoxGeometry(WALL_LENGTH_BANK_VISUAL, PILLAR_HEIGHT, WINDOW_THICKNESS);
const windowBankGeometryZ = new THREE.BoxGeometry(WINDOW_THICKNESS, PILLAR_HEIGHT, WALL_LENGTH_BANK_VISUAL);

// Apartment Wall Geometries (Fits between apartment pillars)
const WALL_LENGTH_APT = GRID_SIZE - PILLAR_WIDTH_APARTMENT - GAP;
const wallApartmentGeometryX = new THREE.BoxGeometry(WALL_LENGTH_APT, PILLAR_HEIGHT, WALL_THICKNESS);
const wallApartmentGeometryZ = new THREE.BoxGeometry(WALL_THICKNESS, PILLAR_HEIGHT, WALL_LENGTH_APT);

// Debris / Small Cube Geometry
const debrisGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);

// Visual Details Geometries (Ultra Low Poly for Performance)
const bentSteelGeometry = new THREE.TorusGeometry(0.3, 0.08, 4, 4, Math.PI); // Reduced segments
const xBraceGeometry = new THREE.CylinderGeometry(0.1, 0.1, GRID_SIZE * 1.2, 4); // Square profile (4 segments)
const xBraceBankGeometry = new THREE.CylinderGeometry(0.1, 0.1, 5.4, 4); // Correct length for Bank diagonal (sqrt(4^2 + 3.5^2) approx 5.3)
const ropeVerticalGeometry = new THREE.CylinderGeometry(0.04, 0.04, PILLAR_HEIGHT, 4); 

const pillarMaterial = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.5 });
const slabMaterial = new THREE.MeshStandardMaterial({ color: "#cbd5e1", roughness: 0.5 });
const pillarSimpleMaterial = new THREE.MeshStandardMaterial({ color: "#9ca3af", roughness: 0.5 });
const slabSimpleMaterial = new THREE.MeshStandardMaterial({ color: "#e5e7eb", roughness: 0.5 });
const bankWallMaterial = new THREE.MeshStandardMaterial({ color: "#94a3b8", roughness: 0.8 });
const debrisMaterial = new THREE.MeshStandardMaterial({ color: "#d97706", roughness: 0.8 }); // Amber color
const glassMaterial = new THREE.MeshStandardMaterial({ color: "#93c5fd", transparent: true, opacity: 0.6, roughness: 0.1, metalness: 0.8 });
const basementMaterial = new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.9 }); // Darker concrete for basement

const ropeMaterial = new THREE.MeshStandardMaterial({ color: "#334155", metalness: 0.6, roughness: 0.4 });

// Reusable physics box component that can render children (for visual embellishments like steel)
export const PhysicsBox = forwardRef<Object3D, any>(({ position, args, mass = 1, geometry, material, color, children, linearDamping, angularDamping, castShadow = true, receiveShadow = true, ...props }, ref) => {
  const [boxRef] = useBox(() => ({ 
    mass, 
    args, 
    position,
    // Use props for damping or default to low values
    linearDamping: linearDamping ?? 0.01, 
    angularDamping: angularDamping ?? 0.01 
  }), ref);
  
  return (
    <mesh ref={boxRef} castShadow={castShadow} receiveShadow={receiveShadow} geometry={geometry} material={material} {...props}>
       {!geometry && <boxGeometry args={args} />}
       {!material && <meshStandardMaterial color={color || 'white'} roughness={0.5} />}
       {children}
    </mesh>
  );
});

export type BuildingType = 'simple' | 'apartment' | 'bank';

const StorySimple: React.FC<{ level: number, yPos: number }> = ({ level, yPos }) => {
  const pillarY = yPos + PILLAR_HEIGHT / 2;
  const slabY = yPos + PILLAR_HEIGHT + SLAB_HEIGHT / 2;
  const o = OFFSET_SIMPLE;

  const pillarMass = 0.5;
  const slabMass = 1.0;

  return (
    <>
      <Draggable><PhysicsBox position={[o, pillarY, o]} args={[PILLAR_WIDTH_SIMPLE, PILLAR_HEIGHT, PILLAR_WIDTH_SIMPLE]} geometry={pillarSimpleGeometry} material={pillarSimpleMaterial} mass={pillarMass} /></Draggable>
      <Draggable><PhysicsBox position={[-o, pillarY, o]} args={[PILLAR_WIDTH_SIMPLE, PILLAR_HEIGHT, PILLAR_WIDTH_SIMPLE]} geometry={pillarSimpleGeometry} material={pillarSimpleMaterial} mass={pillarMass} /></Draggable>
      <Draggable><PhysicsBox position={[o, pillarY, -o]} args={[PILLAR_WIDTH_SIMPLE, PILLAR_HEIGHT, PILLAR_WIDTH_SIMPLE]} geometry={pillarSimpleGeometry} material={pillarSimpleMaterial} mass={pillarMass} /></Draggable>
      <Draggable><PhysicsBox position={[-o, pillarY, -o]} args={[PILLAR_WIDTH_SIMPLE, PILLAR_HEIGHT, PILLAR_WIDTH_SIMPLE]} geometry={pillarSimpleGeometry} material={pillarSimpleMaterial} mass={pillarMass} /></Draggable>

      <Draggable>
        <PhysicsBox 
            position={[0, slabY, 0]} 
            args={[SLAB_WIDTH_SIMPLE, SLAB_HEIGHT, SLAB_WIDTH_SIMPLE]} 
            mass={slabMass} 
            geometry={slabSimpleGeometry}
            material={slabSimpleMaterial}
        />
      </Draggable>
    </>
  );
};

const StoryApartment: React.FC<{ level: number, yPos: number, roomsX: number, roomsZ: number }> = ({ level, yPos, roomsX, roomsZ }) => {
  const isBasement = level === 0;
  
  const pillarY = yPos + PILLAR_HEIGHT / 2;
  
  const totalWidth = roomsX * GRID_SIZE;
  const totalDepth = roomsZ * GRID_SIZE;
  const startX = -totalWidth / 2;
  const startZ = -totalDepth / 2;

  const elements = [];
  
  // Physics Settings
  // Basement is super heavy and stable
  const pillarMass = isBasement ? 50.0 : 20.0; 
  const slabMass = isBasement ? 50.0 : 20.0;
  const wallMass = isBasement ? 50.0 : 20.0;
  
  // REDUCED DAMPING: Makes falling feel heavy and fast, less underwater
  const damping = 0.05;
  
  const currentPillarMat = isBasement ? basementMaterial : pillarMaterial;
  const currentWallMat = isBasement ? basementMaterial : bankWallMaterial;

  // 1. Generate Pillars
  for (let x = 0; x <= roomsX; x++) {
    for (let z = 0; z <= roomsZ; z++) {
      const px = startX + x * GRID_SIZE;
      const pz = startZ + z * GRID_SIZE;
      elements.push(
        <Draggable key={`p-${level}-${x}-${z}`}>
           <PhysicsBox 
             position={[px, pillarY, pz]} 
             args={[PILLAR_WIDTH_APARTMENT, PILLAR_HEIGHT, PILLAR_WIDTH_APARTMENT]} 
             geometry={pillarApartmentGeometry}
             material={currentPillarMat}
             mass={pillarMass}
             linearDamping={damping}
             angularDamping={damping}
           >
             {/* No Steel Ropes for Apartment */}
           </PhysicsBox>
        </Draggable>
      );
    }
  }

  // 2. Generate Walls (Strong)
  // X-Axis Walls
  for (let x = 0; x < roomsX; x++) {
    for (let z = 0; z <= roomsZ; z++) {
      const wx = startX + x * GRID_SIZE + GRID_SIZE / 2;
      const wz = startZ + z * GRID_SIZE;
      
      elements.push(
        <Draggable key={`apt-wx-${level}-${x}-${z}`}>
           <PhysicsBox 
             position={[wx, pillarY, wz]} 
             args={[WALL_LENGTH_APT, PILLAR_HEIGHT, WALL_THICKNESS]} 
             geometry={wallApartmentGeometryX}
             material={currentWallMat}
             mass={wallMass}
             linearDamping={damping}
             angularDamping={damping}
           />
        </Draggable>
      );
    }
  }

  // Z-Axis Walls
  for (let x = 0; x <= roomsX; x++) {
    for (let z = 0; z < roomsZ; z++) {
      const wx = startX + x * GRID_SIZE;
      const wz = startZ + z * GRID_SIZE + GRID_SIZE / 2;
      
      elements.push(
        <Draggable key={`apt-wz-${level}-${x}-${z}`}>
           <PhysicsBox 
             position={[wx, pillarY, wz]} 
             args={[WALL_THICKNESS, PILLAR_HEIGHT, WALL_LENGTH_APT]} 
             geometry={wallApartmentGeometryZ}
             material={currentWallMat}
             mass={wallMass}
             linearDamping={damping}
             angularDamping={damping}
           />
        </Draggable>
      );
    }
  }

  // 3. Generate Slabs
  for (let x = 0; x < roomsX; x++) {
    for (let z = 0; z < roomsZ; z++) {
       const sx = startX + x * GRID_SIZE + GRID_SIZE / 2;
       const sz = startZ + z * GRID_SIZE + GRID_SIZE / 2;
       
       const currentSlabHeight = BEAM_HEIGHT_KINDA_BIG;
       const currentGeometry = slabApartmentGeometry;
       const slabY = yPos + PILLAR_HEIGHT + currentSlabHeight / 2;

       elements.push(
        <Draggable key={`s-${level}-${x}-${z}`}>
           <PhysicsBox 
             position={[sx, slabY, sz]} 
             args={[GRID_SIZE - GAP, currentSlabHeight, GRID_SIZE - GAP]} 
             geometry={currentGeometry}
             material={isBasement ? basementMaterial : slabMaterial}
             mass={slabMass} 
             linearDamping={damping}
             angularDamping={damping}
           >
              {/* No Steel/Ropes/Connections for Apartment as requested */}
           </PhysicsBox>
        </Draggable>
       );
    }
  }

  // 4. Add Small Cubes (Debris) inside the rooms (Skip for Basement)
  if (!isBasement) {
    for (let x = 0; x < roomsX; x++) {
      for (let z = 0; z < roomsZ; z++) {
         const dx = startX + x * GRID_SIZE + GRID_SIZE / 2;
         const dz = startZ + z * GRID_SIZE + GRID_SIZE / 2;
         const dy = yPos + 0.5;
  
         elements.push(
          <Draggable key={`deb-${level}-${x}-${z}`}>
             <PhysicsBox 
               position={[dx, dy, dz]} 
               args={[0.5, 0.5, 0.5]} 
               geometry={debrisGeometry}
               material={debrisMaterial}
               mass={5.0} 
               linearDamping={0.1}
               angularDamping={0.1}
               castShadow={false} // Optimization
             />
          </Draggable>
         );
      }
    }
  }

  return <>{elements}</>;
};

const StoryBank: React.FC<{ level: number, yPos: number }> = ({ level, yPos }) => {
  const isBasement = level === 0;

  const GRID = BANK_GRID;
  const ROOMS_X = 4; // 4x4 = 16 rooms
  const ROOMS_Z = 4;
  
  const totalWidth = ROOMS_X * GRID;
  const totalDepth = ROOMS_Z * GRID;
  const startX = -totalWidth / 2;
  const startZ = -totalDepth / 2;
  
  const pillarY = yPos + PILLAR_HEIGHT / 2;
  const slabY = yPos + PILLAR_HEIGHT + BEAM_HEIGHT_KINDA_BIG / 2;
  
  // Physics: Heavier for Basement
  const mass = isBasement ? 50.0 : 20.0;
  
  // REDUCED DAMPING: More violent collapse
  const damping = 0.05;
  
  // Physics Wall Dimensions (To fit between wider physics pillars)
  const WALL_LENGTH_BANK_PHYSICS = BANK_GRID - PILLAR_PHYSICS_WIDTH_BANK - GAP;

  const elements = [];
  
  // 1. Pillars (Super Strong Mass)
  // We use wider args for physics to encompass the steel ropes
  for (let x = 0; x <= ROOMS_X; x++) {
    for (let z = 0; z <= ROOMS_Z; z++) {
      const px = startX + x * GRID;
      const pz = startZ + z * GRID;
      
      const pOffset = PILLAR_WIDTH_BANK / 2 + 0.05;

      elements.push(
        <Draggable key={`bank-p-${level}-${x}-${z}`}>
           <PhysicsBox 
             position={[px, pillarY, pz]} 
             // WIDER PHYSICS ARGS to include ropes
             args={[PILLAR_PHYSICS_WIDTH_BANK, PILLAR_HEIGHT, PILLAR_PHYSICS_WIDTH_BANK]} 
             // VISUAL GEOMETRY keeps original look
             geometry={pillarBankGeometry}
             material={isBasement ? basementMaterial : pillarMaterial}
             mass={mass}
             linearDamping={damping}
             angularDamping={damping}
           >
              {/* Vertical Steel Ropes connecting floors at corners of pillar */}
              <group>
                <mesh position={[pOffset, 0, pOffset]} material={ropeMaterial} geometry={ropeVerticalGeometry} />
                <mesh position={[-pOffset, 0, pOffset]} material={ropeMaterial} geometry={ropeVerticalGeometry} />
                <mesh position={[pOffset, 0, -pOffset]} material={ropeMaterial} geometry={ropeVerticalGeometry} />
                <mesh position={[-pOffset, 0, -pOffset]} material={ropeMaterial} geometry={ropeVerticalGeometry} />
              </group>
              
              {/* X-Bracing along X-Axis - BASEMENT ONLY */}
              {isBasement && x < ROOMS_X && (
                  <group>
                    <mesh position={[GRID/2, 0, 0]} rotation={[0, 0, Math.PI/4]} material={ropeMaterial} geometry={xBraceBankGeometry} />
                    <mesh position={[GRID/2, 0, 0]} rotation={[0, 0, -Math.PI/4]} material={ropeMaterial} geometry={xBraceBankGeometry} />
                  </group>
              )}

              {/* X-Bracing along Z-Axis - BASEMENT ONLY */}
              {isBasement && z < ROOMS_Z && (
                  <group rotation={[0, Math.PI/2, 0]}>
                    <mesh position={[GRID/2, 0, 0]} rotation={[0, 0, Math.PI/4]} material={ropeMaterial} geometry={xBraceBankGeometry} />
                    <mesh position={[GRID/2, 0, 0]} rotation={[0, 0, -Math.PI/4]} material={ropeMaterial} geometry={xBraceBankGeometry} />
                  </group>
              )}
           </PhysicsBox>
        </Draggable>
      );
    }
  }

  // 2. Walls (Inside) & Windows (Outside)
  // X-Axis
  for (let x = 0; x < ROOMS_X; x++) {
    for (let z = 0; z <= ROOMS_Z; z++) {
      const wx = startX + x * GRID + GRID / 2;
      const wz = startZ + z * GRID;
      
      const isOutside = z === 0 || z === ROOMS_Z;
      
      if (isOutside) {
        // Window
        elements.push(
            <Draggable key={`bank-win-x-${level}-${x}-${z}`}>
               <PhysicsBox 
                 position={[wx, pillarY, wz]} 
                 // SHORTER PHYSICS ARGS to avoid overlap with wider pillars
                 args={[WALL_LENGTH_BANK_PHYSICS, PILLAR_HEIGHT, WINDOW_THICKNESS]} 
                 geometry={windowBankGeometryX}
                 material={glassMaterial}
                 mass={5.0} 
                 linearDamping={0.1}
                 angularDamping={0.1}
               />
            </Draggable>
          );
      } else {
        // Wall
        elements.push(
          <Draggable key={`bank-wall-x-${level}-${x}-${z}`}>
             <PhysicsBox 
               position={[wx, pillarY, wz]} 
               // SHORTER PHYSICS ARGS
               args={[WALL_LENGTH_BANK_PHYSICS, PILLAR_HEIGHT, WALL_THICKNESS]} 
               geometry={wallBankGeometryX}
               material={bankWallMaterial}
               mass={20.0} 
               linearDamping={damping} 
               angularDamping={damping}
             />
          </Draggable>
        );
      }
    }
  }
  
  // Z-Axis
  for (let x = 0; x <= ROOMS_X; x++) {
    for (let z = 0; z < ROOMS_Z; z++) {
      const wx = startX + x * GRID;
      const wz = startZ + z * GRID + GRID / 2;
      
      const isOutside = x === 0 || x === ROOMS_X;
      
      if (isOutside) {
        // Window
        elements.push(
            <Draggable key={`bank-win-z-${level}-${x}-${z}`}>
               <PhysicsBox 
                 position={[wx, pillarY, wz]} 
                 args={[WINDOW_THICKNESS, PILLAR_HEIGHT, WALL_LENGTH_BANK_PHYSICS]} 
                 geometry={windowBankGeometryZ}
                 material={glassMaterial}
                 mass={5.0} 
                 linearDamping={0.1}
                 angularDamping={0.1}
               />
            </Draggable>
          );
      } else {
        // Wall
        elements.push(
          <Draggable key={`bank-wall-z-${level}-${x}-${z}`}>
             <PhysicsBox 
               position={[wx, pillarY, wz]} 
               args={[WALL_THICKNESS, PILLAR_HEIGHT, WALL_LENGTH_BANK_PHYSICS]} 
               geometry={wallBankGeometryZ}
               material={bankWallMaterial}
               mass={20.0} 
               linearDamping={damping}
               angularDamping={damping}
             />
          </Draggable>
        );
      }
    }
  }

  // 3. Slabs
  for (let x = 0; x < ROOMS_X; x++) {
    for (let z = 0; z < ROOMS_Z; z++) {
      const sx = startX + x * GRID + GRID / 2;
      const sz = startZ + z * GRID + GRID / 2;
      
      elements.push(
        <Draggable key={`bank-s-${level}-${x}-${z}`}>
           <PhysicsBox 
             position={[sx, slabY, sz]} 
             args={[GRID - GAP, BEAM_HEIGHT_KINDA_BIG, GRID - GAP]} 
             geometry={slabBankGeometry}
             material={isBasement ? basementMaterial : slabMaterial}
             mass={mass} 
             linearDamping={damping}
             angularDamping={damping}
           >
              <group position={[0, -BEAM_HEIGHT_KINDA_BIG/2 - 0.2, 0]}>
                 <mesh rotation={[0, 0, Math.PI/2]} material={ropeMaterial}>
                    <cylinderGeometry args={[0.25, 0.25, GRID-0.5, 4]} />
                 </mesh>
                 <mesh rotation={[Math.PI/2, 0, 0]} material={ropeMaterial}>
                    <cylinderGeometry args={[0.25, 0.25, GRID-0.5, 4]} />
                 </mesh>
              </group>
              {/* "Bent" Steel Detail on Slab */}
              <group>
                  <mesh position={[0, BEAM_HEIGHT_KINDA_BIG/2 + 0.1, 0]} rotation={[Math.PI/2, Math.PI/4, 0]} material={ropeMaterial} geometry={bentSteelGeometry} />
                  <mesh position={[GRID/2 - 0.2, 0, 0]} rotation={[0, 0, Math.PI/2]} material={ropeMaterial} geometry={bentSteelGeometry} />
                  <mesh position={[-GRID/2 + 0.2, 0, 0]} rotation={[0, 0, Math.PI/2]} material={ropeMaterial} geometry={bentSteelGeometry} />
                  <mesh position={[0, 0, GRID/2 - 0.2]} rotation={[Math.PI/2, 0, 0]} material={ropeMaterial} geometry={bentSteelGeometry} />
                  <mesh position={[0, 0, -GRID/2 + 0.2]} rotation={[Math.PI/2, 0, 0]} material={ropeMaterial} geometry={bentSteelGeometry} />
              </group>
           </PhysicsBox>
        </Draggable>
      );
    }
  }

  return <>{elements}</>;
};

interface BuildingProps {
  stories: number;
  type: BuildingType;
}

export const Building: React.FC<BuildingProps> = ({ stories, type }) => {
  const getGridDimensions = () => {
    return { x: 3, z: 3 }; // Default apartment
  };

  const dims = getGridDimensions();

  // Helper to calculate cumulative height for floors
  const getFloorY = (levelIndex: number) => {
    let y = 0;
    // Bank and Apartment have the same floor height structure here
    // But Simple is different.
    // We treat levelIndex = 0 as basement (y=0), levelIndex = 1 as first floor
    
    for (let i = 0; i < levelIndex; i++) {
       if (type === 'bank' || type === 'apartment') {
           y += PILLAR_HEIGHT + BEAM_HEIGHT_KINDA_BIG;
       } else {
           // Simple
           y += PILLAR_HEIGHT + SLAB_HEIGHT; 
       }
    }
    return y;
  };

  // Determine total levels to render
  // If 'simple', we just render 'stories' levels.
  // If 'bank' or 'apartment', we render 'stories' + 1 basement.
  // The 'stories' prop usually refers to main floors.
  const totalLevels = (type === 'bank' || type === 'apartment') ? stories + 1 : stories;

  return (
    <group position={[0, 0, 0]}>
      {Array.from({ length: totalLevels }).map((_, i) => {
        const yPos = getFloorY(i);
        // If bank/apartment, level 0 is basement.
        
        if (type === 'bank') {
            return <StoryBank key={i} level={i} yPos={yPos} />
        }
        
        return type === 'simple' 
          ? <StorySimple key={i} level={i} yPos={yPos} />
          : <StoryApartment key={i} level={i} yPos={yPos} roomsX={dims.x} roomsZ={dims.z} />
      })}
    </group>
  );
};
