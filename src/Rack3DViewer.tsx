import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Text, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  type: 'flat' | 'vertical';
  w: number; // 平曲げのラック幅 または 立上りのラック幅(表示用)
  h: number; // 振れ幅 (H)
  l: number; // 斜辺長さ (L)
  angle: number; // 角度
  railHeight: number; // 親桁高さ
  inner: number; // 内寸
  outer: number; // 外寸
  rungDist?: number; // 子桁からの距離
  jointDeduction?: number; // 自在継手の差し引き寸法
  minClearance?: number; // 金具干渉回避寸法
}

function MiteredBox({ 
  args, 
  position, 
  startAngle, 
  endAngle, 
  isFlat,
  rackXOffset, 
  rackZOffset, 
  children
}: {
  args: [number, number, number];
  position: [number, number, number];
  startAngle: number;
  endAngle: number;
  isFlat: boolean;
  rackXOffset: number;
  rackZOffset: number;
  children?: React.ReactNode;
}) {
  const geom = useMemo(() => {
    const [w, l, d] = args;
    const geometry = new THREE.BoxGeometry(w, l, d);
    const pos = geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);

      const rackX = x + rackXOffset;
      const rackZ = z + rackZOffset;

      if (y < 0) {
        // start end
        const shiftY = isFlat 
          ? rackX * Math.tan(startAngle)
          : rackZ * Math.tan(startAngle);
        pos.setY(i, y + shiftY);
      } else {
        // end end
        const shiftY = isFlat 
          ? rackX * Math.tan(endAngle)
          : rackZ * Math.tan(endAngle);
        pos.setY(i, y + shiftY);
      }
    }
    geometry.computeVertexNormals();
    return geometry;
  }, [args, startAngle, endAngle, isFlat, rackXOffset, rackZOffset]);

  return (
    <mesh position={position} geometry={geom}>
      {children}
    </mesh>
  );
}

// 自在継手（調整接続金具、主にBG1N-Bなどを模擬）の片葉
function JointBracketLeaf({
  side,          
  direction,     
  width,         
  depth,         
  jointDeduction = 30,
  bendAngle = 0,
  isFlat = true,
}: {
  side: 'left' | 'right';
  direction: 'start' | 'end';
  width: number;
  depth: number;
  jointDeduction?: number;
  bendAngle?: number;
  isFlat?: boolean;
}) {
  const isLeft = side === 'left';
  const isEnd = direction === 'end';
  const plateThickness = 4;
  const plateHeight = depth * 0.75; 

  // 親桁の外側面にぴったり沿うようにX位置を配置
  const xPos = isLeft ? -width / 2 - plateThickness / 2 : width / 2 + plateThickness / 2;

  let pivotY = 0;
  if (isFlat) {
    pivotY = xPos * Math.tan(bendAngle);
  }

  const rackCutY = isEnd ? pivotY - jointDeduction : pivotY + jointDeduction;
  const plateFarEnd = isEnd ? rackCutY - 75 : rackCutY + 75;
  const plateCenterY = (pivotY + plateFarEnd) / 2;
  const plateLength = Math.abs(plateFarEnd - pivotY) || 0.1;

  // 質感（メッキ風の亜鉛メッキ鋼板）
  const metalMaterial = (
    <meshStandardMaterial 
      color="#b4bcc6" 
      metalness={0.9} 
      roughness={0.2} 
    />
  );

  const boltMaterial = (
    <meshStandardMaterial 
      color="#e2e8f0" 
      metalness={0.95} 
      roughness={0.1} 
    />
  );

  const slotMaterial = (
    <meshStandardMaterial 
      color="#2d3748" 
      roughness={0.8} 
    />
  );

  // 噛み合わせヒンジ部の寸法
  const hingeHeight = depth - 16;
  const knuckles = [];

  if (isEnd) {
    knuckles.push(
      <mesh key="top" position={[0, pivotY, hingeHeight * 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[8, 8, hingeHeight * 0.28, 16]} />
        {metalMaterial}
      </mesh>,
      <mesh key="bottom" position={[0, pivotY, -hingeHeight * 0.28]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[8, 8, hingeHeight * 0.28, 16]} />
        {metalMaterial}
      </mesh>
    );
  } else {
    knuckles.push(
      <mesh key="center" position={[0, pivotY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[7.8, 7.8, hingeHeight * 0.4, 16]} />
        {metalMaterial}
      </mesh>
    );
  }

  return (
    <group position={[xPos, 0, 0]}>
      {/* 1. 金具のメインプレート */}
      <mesh position={[0, plateCenterY, 0]}>
        <boxGeometry args={[plateThickness, plateLength, plateHeight]} />
        {metalMaterial}
      </mesh>

      {/* 2. インターロッキング・ヒンジ（噛み合わせナックル） */}
      {knuckles}

      {/* 3. 貫通ボルトピン */}
      <mesh position={[0, pivotY, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[4, 4, depth - 4, 16]} />
        {boltMaterial}
      </mesh>

      {/* ボルトの頭（六角ボルト） */}
      <mesh position={[0, pivotY, depth / 2 - 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6.5, 6.5, 4, 6]} />
        {boltMaterial}
      </mesh>

      {/* ナット側（六角ナット） */}
      <mesh position={[0, pivotY, -depth / 2 + 2]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[6.5, 6.5, 4, 6]} />
        {boltMaterial}
      </mesh>

      {/* 4. スライド調整用の長穴（スロット）と固定用コーチボルト */}
      {[-25, -55].map((offset, idx) => {
        const boltY = isEnd ? rackCutY + offset : rackCutY - offset;
        return (
          <group key={idx}>
            {/* 調整スロット（ダークな凹み窓をモデル化して高精細に見せる） */}
            <mesh position={[isLeft ? -plateThickness / 2 - 0.1 : plateThickness / 2 + 0.1, boltY, 0]}>
              <boxGeometry args={[0.2, 20, 8]} />
              {slotMaterial}
            </mesh>

            {/* ボルトキャップ（丸ボルト頭） */}
            <mesh position={[isLeft ? -plateThickness / 2 - 2 : plateThickness / 2 + 2, boltY, 0]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[5.5, 5.5, 3, 12]} />
              {boltMaterial}
            </mesh>

            {/* 四角ワッシャーを挟み込む */}
            <mesh position={[isLeft ? -plateThickness / 2 - 0.8 : plateThickness / 2 + 0.8, boltY, 0]}>
              <boxGeometry args={[1.5, 9, 9]} />
              {boltMaterial}
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// 梯子のようなケーブルラック部品
function LadderRack({ 
  startY, 
  endY, 
  width, 
  depth, 
  position, 
  rotation, 
  jointAtStart = false, 
  jointAtEnd = false,
  jointDeduction = 30,
  startBendAngle = 0,
  endBendAngle = 0,
  isFlat = true,
  minClearance = 80,
}: {
  startY: number;
  endY: number;
  width: number;
  depth: number;
  position: [number, number, number];
  rotation: [number, number, number];
  jointAtStart?: boolean;
  jointAtEnd?: boolean;
  jointDeduction?: number;
  startBendAngle?: number;
  endBendAngle?: number;
  isFlat?: boolean;
  minClearance?: number;
}) {
  const length = endY - startY;
  const centerY = (startY + endY) / 2;
  const railThickness = 15;

  // Render the rungs satisfying the minClearance from joint cuts
  // Note: For pieces that just extend (end pieces), they also connect to a joint.
  const spacing = 300; // 一般的な子桁ピッチ
  const rungs: number[] = [];
  
  if (jointAtEnd && !jointAtStart) {
    // 根元側の延長ピース: endYで切断されている
    const startPos = endY - minClearance;
    const count = Math.floor((length - minClearance) / spacing);
    for (let i = 0; i <= count; i++) rungs.push(startPos - i * spacing);
  } else if (jointAtStart && !jointAtEnd) {
    // 先端側の延長ピース: startYで切断されている
    const startPos = startY + minClearance;
    const count = Math.floor((length - minClearance) / spacing);
    for (let i = 0; i <= count; i++) rungs.push(startPos + i * spacing);
  } else {
    // 中継ぎピース (両端が切断されている)、またはどちらも切断されていない
    const usableLength = length - 2 * minClearance;
    if (usableLength >= 0) {
      const maxIntervals = Math.floor(usableLength / spacing);
      const totalSpan = maxIntervals * spacing;
      // 余りを両端に均等に振り分ける
      const remainder = length - totalSpan;
      const startC = remainder / 2;
      const startPos = startY + startC;
      for (let i = 0; i <= maxIntervals; i++) rungs.push(startPos + i * spacing);
    } else {
      if (length > 100) rungs.push(centerY);
    }
  }

  const leftRailX = -width / 2 + railThickness / 2;
  const rightRailX = width / 2 - railThickness / 2;

  return (
    <group position={position} rotation={rotation}>
      {/* 親桁左 */}
      <MiteredBox 
        args={[railThickness, length, depth]} 
        position={[leftRailX, centerY, 0]}
        startAngle={startBendAngle} endAngle={endBendAngle} isFlat={isFlat}
        rackXOffset={leftRailX} rackZOffset={0}
      >
        <meshStandardMaterial color="#8892b0" metalness={0.6} roughness={0.4} />
      </MiteredBox>

      {/* 親桁右 */}
      <MiteredBox 
        args={[railThickness, length, depth]} 
        position={[rightRailX, centerY, 0]}
        startAngle={startBendAngle} endAngle={endBendAngle} isFlat={isFlat}
        rackXOffset={rightRailX} rackZOffset={0}
      >
        <meshStandardMaterial color="#8892b0" metalness={0.6} roughness={0.4} />
      </MiteredBox>

      {/* 子桁（ラング） */}
      {rungs.map((ry, i) => (
        <mesh key={i} position={[0, ry, 0]}>
          <boxGeometry args={[width - railThickness, 30, depth - 5]} />
          <meshStandardMaterial color="#a8b2d0" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}

      {/* 半透明の底面プレート */}
      <MiteredBox 
        args={[width, length, depth]} 
        position={[0, centerY, 0]}
        startAngle={startBendAngle} endAngle={endBendAngle} isFlat={isFlat}
        rackXOffset={0} rackZOffset={0}
      >
         <meshBasicMaterial color="#ffffff" transparent opacity={0.05} />
      </MiteredBox>

      {/* 詳細な接続自在金具 */}
      {jointAtStart && (
        <group position={[0, startY - jointDeduction, 0]}>
          <JointBracketLeaf side="left" direction="start" width={width} depth={depth} jointDeduction={jointDeduction} bendAngle={startBendAngle} isFlat={isFlat} />
          <JointBracketLeaf side="right" direction="start" width={width} depth={depth} jointDeduction={jointDeduction} bendAngle={startBendAngle} isFlat={isFlat} />
        </group>
      )}
      {jointAtEnd && (
        <group position={[0, endY + jointDeduction, 0]}>
          <JointBracketLeaf side="left" direction="end" width={width} depth={depth} jointDeduction={jointDeduction} bendAngle={endBendAngle} isFlat={isFlat} />
          <JointBracketLeaf side="right" direction="end" width={width} depth={depth} jointDeduction={jointDeduction} bendAngle={endBendAngle} isFlat={isFlat} />
        </group>
      )}
    </group>
  );
}

export default function Rack3DViewer({ type, w, h, l, angle, railHeight, inner, outer, rungDist = 150, jointDeduction = 30, minClearance = 80 }: Props) {
  const rad = (angle * Math.PI) / 180;
  
  const width = type === 'flat' ? w : 300; 
  const depth = type === 'flat' ? railHeight : railHeight; 
  const d = jointDeduction;

  const parts = useMemo(() => {
    const extLen = 500; 

    if (type === 'flat') {
      const pos1: [number, number, number] = [0, 0, 0];
      const rot1: [number, number, number] = [0, 0, 0];

      const vX = -Math.sin(rad);
      const vY = Math.cos(rad);
      const pos2: [number, number, number] = [0, 0, 0];
      const rot2: [number, number, number] = [0, 0, rad]; 

      const endX = l * vX;
      const endY = l * vY;
      const pos3: [number, number, number] = [endX, endY, 0];
      const rot3: [number, number, number] = [0, 0, 0];

      return [
        { pos: pos1, rot: rot1, startY: -extLen, endY: -d, len: extLen - d, startBendAngle: 0, endBendAngle: rad / 2 },
        { pos: pos2, rot: rot2, startY: d, endY: l - d, len: l - 2 * d, startBendAngle: -rad / 2, endBendAngle: -rad / 2 },
        { pos: pos3, rot: rot3, startY: d, endY: extLen, len: extLen - d, startBendAngle: rad / 2, endBendAngle: 0 },
        { endX, endY }
      ];
    } else {
      const pos1: [number, number, number] = [0, 0, 0];
      const rot1: [number, number, number] = [0, Math.PI/2, 0]; 

      const vX = -Math.sin(rad);
      const vY = Math.cos(rad);
      const pos2: [number, number, number] = [0, 0, 0];
      const rot2: [number, number, number] = [0, Math.PI/2, rad];

      const endX = l * vX;
      const endY = l * vY;
      const pos3: [number, number, number] = [endX, endY, 0];
      const rot3: [number, number, number] = [0, Math.PI/2, 0];

      return [
        { pos: pos1, rot: rot1, startY: -extLen, endY: -d, len: extLen - d, startBendAngle: 0, endBendAngle: rad / 2 },
        { pos: pos2, rot: rot2, startY: d, endY: l - d, len: l - 2 * d, startBendAngle: -rad / 2, endBendAngle: -rad / 2 },
        { pos: pos3, rot: rot3, startY: d, endY: extLen, len: extLen - d, startBendAngle: rad / 2, endBendAngle: 0 },
        { endX, endY }
      ];
    }
  }, [type, l, angle, d]);

  const maxDim = Math.max(l, h) + 1500; 
  const p1 = parts[1];
  
  // 内寸・外寸の表示用
  // 斜辺の法線ベクトル（2D XY平面）
  const normalX = -Math.cos(rad);
  const normalY = -Math.sin(rad);
  const offsetDistance = type === 'flat' ? width / 2 : depth / 2;

  // 内側（進行方向に対して右側・内側）と外側
  // vX = -sin(rad), vY = cos(rad) なので
  // 左側法線: (-cos, -sin)
  // 右側法線: (cos, sin)
  const isFlat = type === 'flat';

  const leftOffsetX = -Math.cos(rad) * offsetDistance;
  const leftOffsetY = -Math.sin(rad) * offsetDistance;
  const rightOffsetX = Math.cos(rad) * offsetDistance;
  const rightOffsetY = Math.sin(rad) * offsetDistance;

  // カット後の正確な寸法線の座標計算
  const vX_dir = -Math.sin(rad);
  const vY_dir = Math.cos(rad);
  const orthoX = -Math.cos(rad);
  const orthoY = -Math.sin(rad);

  // 幅方向外側の位置
  const labelOffsetDistance = type === 'flat' ? width / 2 + 50 : depth / 2 + 50;
  const extLineStartX = d * vX_dir + orthoX * labelOffsetDistance;
  const extLineStartY = d * vY_dir + orthoY * labelOffsetDistance;
  const extLineEndX = (l - d) * vX_dir + orthoX * labelOffsetDistance;
  const extLineEndY = (l - d) * vY_dir + orthoY * labelOffsetDistance;

  const extMidX = (extLineStartX + extLineEndX) / 2;
  const extMidY = (extLineStartY + extLineEndY) / 2;

  return (
    <div className="w-full h-[350px] bg-slate-100 rounded-xl overflow-hidden border-2 border-slate-200 relative shadow-inner">
      <div className="absolute top-3 left-3 z-10 bg-white/90 px-3 py-1.5 rounded-lg text-sm font-bold text-slate-700 shadow-sm pointer-events-none flex items-center gap-2">
        <span className="flex h-3 w-3 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
        </span>
        3Dプレビュー（指で回せます）
      </div>
      <Canvas shadows camera={{ position: [0, 0, maxDim], fov: 45, near: 1, far: 20000 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[maxDim, maxDim, maxDim]} intensity={1.5} castShadow />
        
        {/* 中心を調整するためのグループ */}
        <group position={[type === 'flat' ? -h/2 : 0, 0, 0]}>
          {parts.slice(0, 3).map((p: any, i) => (
            <LadderRack 
              key={i} 
              startY={p.startY} 
              endY={p.endY} 
              width={width} 
              depth={depth} 
              position={p.pos} 
              rotation={p.rot}
              jointAtStart={i === 1 || i === 2}
              jointAtEnd={i === 0 || i === 1}
              jointDeduction={d}
              startBendAngle={p.startBendAngle}
              endBendAngle={p.endBendAngle}
              isFlat={type === 'flat'}
              minClearance={minClearance}
            />
          ))}

          {/* 寸法線の描画 (斜辺 L) */}
          <Line 
            points={[
              [0, 0, depth + 10],
              [parts[3].endX, parts[3].endY, depth + 10]
            ]} 
            color="#ef4444" 
            lineWidth={4} 
          />
          <group position={[parts[1].pos[0], parts[1].pos[1] - (type==='flat'? 150 : 200), depth + 20]}>
            <Html center>
              <div className="bg-red-600 text-white text-sm font-bold px-3 py-1 rounded-lg shadow-lg whitespace-nowrap border-2 border-white">
                斜辺ピッチ L: {l.toFixed(1)}
              </div>
            </Html>
          </group>

          {/* 中継ぎラックの実際の切断寸法の描画 (Orange) */}
          <Line 
            points={[
              [extLineStartX, extLineStartY, depth + 10],
              [extLineEndX, extLineEndY, depth + 10]
            ]} 
            color="#f97316" 
            lineWidth={4} 
          />
          <group position={[extMidX, extMidY, depth + 20]}>
            <Html center>
              <div className="bg-orange-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-lg whitespace-nowrap border-2 border-white flex flex-col items-center">
                <span className="opacity-90">中継ぎカット寸法</span>
                <span className="text-sm font-black text-yellow-200">{(l - 2 * d).toFixed(1)} mm</span>
              </div>
            </Html>
          </group>

          {/* 振れ幅の線 */}
          {h > 0 && type === 'flat' && (
            <>
              <Line
                points={[
                  [0, parts[2].pos[1], depth + 10],
                  [parts[2].pos[0], parts[2].pos[1], depth + 10]
                ]}
                color="#3b82f6"
                lineWidth={3}
              />
              <group position={[parts[2].pos[0]/2, parts[2].pos[1] + 150, depth + 20]}>
                <Html center>
                  <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-lg shadow-lg whitespace-nowrap border-2 border-white">
                    振れ幅 H: {h.toFixed(1)}
                  </div>
                </Html>
              </group>
            </>
          )}

          {/* 基準となる子桁と内寸・外寸の表示 */}
          {rungDist > 0 && (
            <>
              {/* 子桁の線 */}
              <Line 
                points={[
                  [-width/2, -rungDist, depth + 1],
                  [width/2, -rungDist, depth + 1]
                ]}
                color="#10b981" lineWidth={5}
              />
              <group position={[width/2 + 50, -rungDist, depth + 10]}>
                <Html center>
                   <div className="bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                     手前の子桁 (基点)
                   </div>
                </Html>
              </group>

              {/* 切断位置の表示 */}
              {isFlat && (
                <>
                  {/* 外寸 (左側) */}
                  <Line 
                    points={[
                      [width/2 + 30, -rungDist, depth],
                      [width/2 + 30, (w * Math.tan(rad/2)) / 2, depth]
                    ]}
                    color="#eab308" lineWidth={2} dashed
                  />
                  <group position={[width/2 + 50, -rungDist/2, depth + 20]}>
                    <Html center>
                       <div className="bg-amber-100 border border-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                         外側マーク: {(rungDist + (w * Math.tan(rad/2)) / 2).toFixed(1)}
                       </div>
                    </Html>
                  </group>

                  {/* 内寸 (右側) */}
                  <Line 
                    points={[
                      [-width/2 - 30, -rungDist, depth],
                      [-width/2 - 30, -(w * Math.tan(rad/2)) / 2, depth]
                    ]}
                    color="#eab308" lineWidth={2} dashed
                  />
                   <group position={[-width/2 - 50, -rungDist/2, depth + 20]}>
                    <Html center>
                       <div className="bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-bold px-1 py-0.5 rounded shadow whitespace-nowrap">
                         内側マーク: {Math.max(0, rungDist - (w * Math.tan(rad/2)) / 2).toFixed(1)}
                       </div>
                    </Html>
                  </group>
                </>
              )}

              {/* 立上り(Vertical)の切断位置表示 */}
              {!isFlat && (
                <>
                  {/* 外寸 */}
                  <Line 
                    points={[
                      [-width/2 - 30, -rungDist, 0],
                      [-width/2 - 30, (railHeight * Math.tan(rad/2)) / 2, 0]
                    ]}
                    color="#eab308" lineWidth={2} dashed
                  />
                  <group position={[-width/2 - 50, -rungDist/2, 0]}>
                    <Html center>
                       <div className="bg-amber-100 border border-amber-400 text-amber-900 text-xs font-bold px-2 py-0.5 rounded shadow whitespace-nowrap">
                         外側マーク: {(rungDist + (railHeight * Math.tan(rad/2)) / 2).toFixed(1)}
                       </div>
                    </Html>
                  </group>

                  {/* 内寸 */}
                  <Line 
                    points={[
                      [width/2 + 30, -rungDist, 0],
                      [width/2 + 30, -(railHeight * Math.tan(rad/2)) / 2, 0]
                    ]}
                    color="#eab308" lineWidth={2} dashed
                  />
                   <group position={[width/2 + 50, -rungDist/2, 0]}>
                    <Html center>
                       <div className="bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-bold px-1 py-0.5 rounded shadow whitespace-nowrap">
                         内側マーク: {Math.max(0, rungDist - (railHeight * Math.tan(rad/2)) / 2).toFixed(1)}
                       </div>
                    </Html>
                  </group>
                </>
              )}
            </>
          )}

          {h > 0 && type === 'vertical' && (
             <group position={[parts[2].pos[0]/2, parts[2].pos[1] + 150, 0]}>
               <Html center>
                 <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-lg shadow-lg whitespace-nowrap border-2 border-white">
                   高さ H: {h.toFixed(1)}
                 </div>
               </Html>
             </group>
          )}

        </group>
        <OrbitControls enablePan={true} enableZoom={true} makeDefault />
      </Canvas>
    </div>
  );
}