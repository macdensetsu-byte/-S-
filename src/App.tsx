import React, { useState, useMemo } from 'react';
import { Calculator, ArrowRight, CheckCircle2, AlertTriangle, Ruler, ArrowRightLeft, SquareMenu, Info, Settings2 } from 'lucide-react';
import Rack3DViewer from './Rack3DViewer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'flat' | 'vertical' | 'kogeta'>('flat');

  const [jointDeduction, setJointDeduction] = useState<string>('30');
  const [minClearance, setMinClearance] = useState<string>('80');

  // 平曲げ (Horizontal S-Bend) State
  const [flatGapOffset, setFlatGapOffset] = useState<string>('300');
  const [flatCenterOffset, setFlatCenterOffset] = useState<string>('600');
  const [flatWidth, setFlatWidth] = useState<string>('300');
  const [flatAngle, setFlatAngle] = useState<number>(30);
  const [flatRungDist, setFlatRungDist] = useState<string>('150'); // 新規: 子桁からの距離

  const handleFlatGapChange = (val: string) => {
    setFlatGapOffset(val);
    const gap = parseFloat(val) || 0;
    const w = parseFloat(flatWidth) || 0;
    setFlatCenterOffset((gap + w).toString());
  };

  const handleFlatCenterChange = (val: string) => {
    setFlatCenterOffset(val);
    const center = parseFloat(val) || 0;
    const w = parseFloat(flatWidth) || 0;
    setFlatGapOffset((center - w).toString());
  };

  const handleFlatWidthChange = (val: string) => {
    setFlatWidth(val);
    const center = parseFloat(flatCenterOffset) || 0;
    const w = parseFloat(val) || 0;
    setFlatGapOffset((center - w).toString());
  };

  // 立上り/立下り (Vertical S-Bend) State
  const [vertOffset, setVertOffset] = useState<string>('300');
  const [vertHeight, setVertHeight] = useState<string>('70');
  const [vertAngle, setVertAngle] = useState<number>(30);
  const [vertRungDist, setVertRungDist] = useState<string>('150'); // 新規: 子桁からの距離

  // 子桁調整 (Kogeta Adjustment) State
  const [kogetaPitch, setKogetaPitch] = useState<string>('300');
  const [cutLength, setCutLength] = useState<string>('600');
  const [startDist, setStartDist] = useState<string>('150');

  // --- Calculations ---
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const optimizeRungLayout = (cutLength: number, clearanceStr: string) => {
    const clearance = parseFloat(clearanceStr) || 80;
    const spacing = 300;
    const usableLength = cutLength - 2 * clearance;
    if (usableLength < 0) return null;
    const intervals = Math.floor(usableLength / spacing);
    const rem = cutLength - (intervals * spacing);
    return {
      count: intervals + 1,
      clearance: rem / 2,
    };
  };

  // 1. 平曲げ計算
  const flatResult = useMemo(() => {
    const H = parseFloat(flatCenterOffset) || 0;
    const W = parseFloat(flatWidth) || 0;
    const d = parseFloat(jointDeduction) || 0;
    const rad = toRad(flatAngle);
    const radHalf = toRad(flatAngle / 2);

    const L = H === 0 ? 0 : H / Math.sin(rad);
    const shift = W * Math.tan(radHalf); // 内寸と外寸の差(全体のズレ)
    const middleLen = Math.max(0, L - d * 2);

    return {
      diagonal: L,
      inner: L - shift,
      outer: L + shift,
      shift: shift,
      middleLen: middleLen,
      isLimit: shift > 300
    };
  }, [flatCenterOffset, flatWidth, flatAngle, jointDeduction]);

  // 2. 立上り・立下り計算
  const vertResult = useMemo(() => {
    const H = parseFloat(vertOffset) || 0;
    const height = parseFloat(vertHeight) || 0;
    const d = parseFloat(jointDeduction) || 0;
    const rad = toRad(vertAngle);
    const radHalf = toRad(vertAngle / 2);

    const L = H === 0 ? 0 : H / Math.sin(rad);
    const shift = height * Math.tan(radHalf); // 内寸と外寸の差(全体のズレ)
    const middleLen = Math.max(0, L - d * 2);

    return {
      diagonal: L,
      inner: L - shift,
      outer: L + shift,
      shift: shift,
      middleLen: middleLen,
      isLimit: shift > 300
    };
  }, [vertOffset, vertHeight, vertAngle, jointDeduction]);

  // 3. 子桁調整計算
  const kogetaResult = useMemo(() => {
    const pitch = parseFloat(kogetaPitch) || 0;
    const L = parseFloat(cutLength) || 0;
    const start = parseFloat(startDist) || 0;

    if (pitch === 0) return { secondDist: 0, hit: false, suggestion: 0 };

    // 2箇所目の切断芯の位置 (1箇所目を 0 とし、次の子桁までを基準にする)
    const endPos = start + L;
    const secondDist = endPos % pitch;

    // vカットが子桁に干渉しないように、子桁から離すべき距離(マージン)
    const margin = 25; 
    const isFirstHit = start < margin || pitch - start < margin;
    const isSecondHit = secondDist < margin || pitch - secondDist < margin;

    // 推奨開始位置の探索
    let suggestion = -1;
    for (let s = margin; s <= pitch - margin; s += 5) {
      const e = (s + L) % pitch;
      if (e >= margin && (pitch - e) >= margin) {
        suggestion = s;
        break;
      }
    }

    return {
      secondDist,
      isFirstHit,
      isSecondHit,
      hit: isFirstHit || isSecondHit,
      suggestion,
    };
  }, [kogetaPitch, cutLength, startDist]);

  const NumberInput = ({ label, value, onChange, placeholder = "", unit = "mm" }: any) => (
    <div className="flex flex-col space-y-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border-2 border-slate-200 px-3 py-2.5 text-lg font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white shadow-sm transition-all"
        />
        <span className="absolute right-4 top-3 text-slate-400 font-medium select-none">{unit}</span>
      </div>
    </div>
  );

  const AngleSelector = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
    const angles = [15, 22.5, 30, 45, 60];
    return (
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-semibold text-gray-700">曲げる角度 (θ)</label>
        <div className="grid grid-cols-5 gap-2">
          {angles.map((a) => (
             <button
                key={a}
                onClick={() => onChange(a)}
                className={`flex items-center justify-center rounded-lg py-3 text-base font-bold transition-all ${
                  value === a
                    ? 'bg-blue-600 text-white shadow-md transform scale-105'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-slate-200'
                }`}
             >
               {a}°
             </button>
          ))}
        </div>
      </div>
    );
  };

  const ResultCard = ({ label, value, sub }: { label: string; value: number; sub?: string }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
      <p className="text-sm text-gray-500 font-medium mb-1">{label}</p>
      <div className="flex items-baseline space-x-1">
        <span className="text-3xl font-bold text-gray-900 tracking-tight">{value.toFixed(1)}</span>
        <span className="text-sm text-gray-500 font-medium bg-gray-100 px-1 rounded">mm</span>
      </div>
      {sub && <p className="text-xs text-gray-400 mt-2">{sub}</p>}
    </div>
  );

  const JointDeductionSettings = () => (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-4">
      <h3 className="font-bold text-slate-700 flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-slate-500" /> 継ぎ金具（自在継手）の設定
      </h3>
      <div className="pt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
        <NumberInput 
          label="継手の差し引き寸法（片側）" 
          value={jointDeduction} 
          onChange={setJointDeduction} 
          placeholder="例: 30"
        />
        <NumberInput 
          label="金具干渉のよけ寸法（端あき）" 
          value={minClearance} 
          onChange={setMinClearance} 
          placeholder="例: 80"
        />
      </div>
      <p className="text-xs text-slate-500 flex flex-col gap-1">
        <span>※差し引き寸法: カタログ記載の折れ点〜ラック切断面までの距離</span>
        <span>※よけ寸法（端あき）: 切断面から、継ぎ金具が子桁に当たらないための最小直線距離（通常80mm程度）</span>
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      {/* Header */}
      <header className="bg-blue-800 text-white pb-6 pt-6 px-4 shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Calculator className="w-6 h-6 text-blue-200" />
          <h1 className="text-xl font-bold tracking-wide">ラック加工アプリ</h1>
        </div>
        
        {/* Navigation Tabs */}
        <div className="max-w-2xl mx-auto mt-6">
          <div className="flex bg-blue-900/50 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('flat')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
                activeTab === 'flat' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:bg-blue-800/50'
              }`}
            >
              <ArrowRightLeft className="w-4 h-4" />
              横に曲げる(S字)
            </button>
            <button
              onClick={() => setActiveTab('vertical')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
                activeTab === 'vertical' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:bg-blue-800/50'
              }`}
            >
              <ArrowRight className="w-4 h-4 -rotate-45" />
              縦に曲げる(立上)
            </button>
            <button
              onClick={() => setActiveTab('kogeta')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-md transition-all ${
                activeTab === 'kogeta' ? 'bg-white text-blue-900 shadow-sm' : 'text-blue-100 hover:bg-blue-800/50'
              }`}
            >
              <SquareMenu className="w-4 h-4" />
              子桁を避ける
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-4">
        
        {/* ===================== 平曲げ ===================== */}
        {activeTab === 'flat' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <JointDeductionSettings />

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-3 text-slate-800">
                <Ruler className="w-5 h-5 text-blue-600" /> 入力値（横にS字に曲げる）
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="ラック間の空き (画像の「?」)" value={flatGapOffset} onChange={handleFlatGapChange} />
                <NumberInput label="ラックの幅 (W)" value={flatWidth} onChange={handleFlatWidthChange} />
                <div className="col-span-2 bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                  <NumberInput label="芯〜芯のズレ幅 (H)" value={flatCenterOffset} onChange={handleFlatCenterChange} />
                  <p className="text-xs text-blue-700 mt-2 font-medium flex items-center gap-1">
                    <Info className="w-3 h-3"/> 空き寸法を入力すると自動で計算されます。
                  </p>
                </div>
              </div>
              <AngleSelector value={flatAngle} onChange={setFlatAngle} />
            </div>

            <h3 className="font-bold text-gray-700 mb-3 ml-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> 加工・切断の指示
            </h3>
            
            <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-xl mb-6 shadow-sm">
               <p className="font-bold text-slate-800 text-lg mb-1 flex items-baseline gap-2">
                 ① 芯〜芯 斜辺ピッチは <span className="text-3xl text-blue-700">{flatResult.diagonal.toFixed(1)} <span className="text-lg">mm</span></span> です
               </p>
               <p className="text-sm text-amber-900 mb-4 ml-6">（※斜辺自体の長さ。切断マーキングには以下の寸法を使用してください）</p>

               <div className="bg-white p-4 rounded-lg border border-amber-200 mt-2 shadow-sm">
                 <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-200">
                   <NumberInput label="手前の子桁（ラング）からの距離 (中心まで)" value={flatRungDist} onChange={setFlatRungDist} placeholder="例: 150" />
                 </div>

                 {flatResult.isLimit ? (
                   <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 font-bold mb-4">
                     ⚠️ 警告: 子桁間(300mm)を超える斜め切断になります。<br/>曲げ角度が限界を超えているため、この仕様では金具接合ができません。ラック幅や角度を見直してください。
                   </div>
                 ) : (
                   <>
                     <p className="font-bold text-slate-800 text-base mb-1 flex items-baseline gap-2">
                       ② 切断位置と中継ぎラック寸法 (斜め切り):
                     </p>
                     <div className="text-sm text-amber-900 ml-6 mt-3 flex flex-col gap-3">
                       <div>
                         <p className="font-bold mb-1">■ 1箇所目の切断位置（子桁から測る内寸・外寸）</p>
                         <p className="text-xs text-slate-500 mb-2">※外側に隙間ができないよう、斜めに切断するためのマーク位置です</p>
                         <p>・ <strong>外側のマーク位置（外寸）</strong> : <span className="text-lg text-slate-800 bg-amber-200 px-2 rounded">{((parseFloat(flatRungDist) || 0) + flatResult.shift/2).toFixed(1)} mm</span> (中心より遠い)</p>
                         <p>・ <strong>内側のマーク位置（内寸）</strong> : <span className="text-lg text-slate-800 bg-amber-200 px-2 rounded">{Math.max(0, (parseFloat(flatRungDist) || 0) - flatResult.shift/2).toFixed(1)} mm</span> (中心より近い)</p>
                       </div>
                       <div className="border-t border-amber-200 pt-3">
                         <p className="font-bold mb-1">■ 中継ぎラックの切断寸法</p>
                         <div className="text-center bg-blue-50 py-3 rounded-lg border border-blue-200 my-2">
                           中心線: <span className="text-3xl font-extrabold text-blue-700">
                             {flatResult.middleLen.toFixed(1)} <span className="text-lg">mm</span>
                           </span>
                         </div>
                         <p className="text-xs text-slate-500">
                           ※斜辺ピッチ ({flatResult.diagonal.toFixed(1)}) - 両端の差し引き ({(parseFloat(jointDeduction || '0') * 2)}) <br/>
                           ※この中心線長さを元に、端を同じく斜め切りしてください。
                         </p>
                       </div>
                     </div>
                   </>
                 )}
               </div>

               {/* 中継ぎラックの桁割り最適化表示 */}
               {!flatResult.isLimit && optimizeRungLayout(flatResult.middleLen, minClearance) && (
                 <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mt-4 shadow-sm">
                   <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                     <Calculator className="w-4 h-4" />
                     「できるだけ子桁を残す」中継ぎラック最適カット法
                   </h4>
                   <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                     中継ぎ部分を切り出す際に、以下の端あき寸法に合わせて切断すると、金具との干渉を（{minClearance}mm）避けつつ、最大限に子桁を残すことができます。
                   </p>
                   <div className="flex gap-4 items-center">
                     <div className="flex-1 bg-white p-3 rounded border border-indigo-100 flex flex-col items-center text-center">
                       <span className="text-xs text-slate-500 font-bold mb-1">両端の推奨端あき寸法</span>
                       <span className="text-2xl font-black text-indigo-700">
                         {optimizeRungLayout(flatResult.middleLen, minClearance)?.clearance.toFixed(1)} <span className="text-sm font-bold">mm</span>
                       </span>
                     </div>
                     <div className="flex-1 bg-white p-3 rounded border border-indigo-100 flex flex-col items-center text-center">
                       <span className="text-xs text-slate-500 font-bold mb-1">残せる子桁（ラング）</span>
                       <span className="text-2xl font-black text-indigo-700">
                         {optimizeRungLayout(flatResult.middleLen, minClearance)?.count} <span className="text-sm font-bold">本</span>
                       </span>
                     </div>
                   </div>
                 </div>
               )}
            </div>

            <div className="mb-6">
              <Rack3DViewer 
                type="flat" 
                w={parseFloat(flatWidth) || 300} 
                h={parseFloat(flatCenterOffset) || 300} 
                l={flatResult.diagonal} 
                angle={flatAngle}
                railHeight={50}
                inner={flatResult.inner}
                outer={flatResult.outer}
                rungDist={parseFloat(flatRungDist) || 150}
                jointDeduction={parseFloat(jointDeduction) || 30}
                minClearance={parseFloat(minClearance) || 80}
              />
            </div>

            <button className="w-full border-2 border-blue-600 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md flex justify-center items-center gap-2" onClick={() => {
                setCutLength(flatResult.diagonal.toFixed(1));
                setActiveTab('kogeta');
            }}>
              <SquareMenu className="w-5 h-5"/> この斜辺ピッチで子桁調整を確認する <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* ===================== 立上り・立下り ===================== */}
        {activeTab === 'vertical' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <JointDeductionSettings />

             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-3 text-slate-800">
                <Ruler className="w-5 h-5 text-blue-600" /> 入力値 (縦に曲げる)
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <NumberInput label="立ち上げる高さ (H)" value={vertOffset} onChange={setVertOffset} />
                <NumberInput label="親桁の高さ (厚み)" value={vertHeight} onChange={setVertHeight} />
              </div>
              <AngleSelector value={vertAngle} onChange={setVertAngle} />
            </div>

            <h3 className="font-bold text-gray-700 mb-3 ml-1 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" /> 加工・切断の指示
            </h3>
            
            <div className="bg-amber-50 border-2 border-amber-300 p-5 rounded-xl mb-6 shadow-sm">
               <p className="font-bold text-slate-800 text-lg mb-1 flex items-baseline gap-2">
                 ① 芯〜芯 斜辺ピッチは <span className="text-3xl text-blue-700">{vertResult.diagonal.toFixed(1)} <span className="text-lg">mm</span></span> です
               </p>
               <p className="text-sm text-amber-900 mb-4 ml-6">（※斜辺自体の長さ。切断マーキングには以下の寸法を使用してください）</p>
               
               <div className="bg-white p-4 rounded-lg border border-amber-200 mt-2 shadow-sm">
                 <div className="mb-4 bg-slate-50 p-3 rounded border border-slate-200">
                   <NumberInput label="手前の子桁（ラング）からの距離 (中心まで)" value={vertRungDist} onChange={setVertRungDist} placeholder="例: 150" />
                 </div>

                 {vertResult.isLimit ? (
                   <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 font-bold mb-4">
                     ⚠️ 警告: 子桁間(300mm)を超える斜め切断になります。<br/>曲げ角度が限界を超えているため、この仕様では金具接合ができません。親桁の高さや角度を見直してください。
                   </div>
                 ) : (
                   <>
                     <p className="font-bold text-slate-800 text-base mb-1 flex items-baseline gap-2">
                       ② 切断位置と中継ぎラック寸法 (斜め切り):
                     </p>
                     <div className="text-sm text-amber-900 ml-6 mt-3 flex flex-col gap-3">
                       <div>
                         <p className="font-bold mb-1">■ 1箇所目の切断位置（子桁から測る内寸・外寸）</p>
                         <p className="text-xs text-slate-500 mb-2">※外側に隙間ができないよう、斜めに切断するためのマーク位置です</p>
                         <p>・ <strong>外側のマーク位置（外寸）</strong> : <span className="text-lg text-slate-800 bg-amber-200 px-2 rounded">{((parseFloat(vertRungDist) || 0) + vertResult.shift/2).toFixed(1)} mm</span> (中心より遠い)</p>
                         <p>・ <strong>内側のマーク位置（内寸）</strong> : <span className="text-lg text-slate-800 bg-amber-200 px-2 rounded">{Math.max(0, (parseFloat(vertRungDist) || 0) - vertResult.shift/2).toFixed(1)} mm</span> (中心より近い)</p>
                       </div>
                       <div className="border-t border-amber-200 pt-3">
                         <p className="font-bold mb-1">■ 中継ぎラックの切断寸法</p>
                         <div className="text-center bg-blue-50 py-3 rounded-lg border border-blue-200 my-2">
                           中心線: <span className="text-3xl font-extrabold text-blue-700">
                             {vertResult.middleLen.toFixed(1)} <span className="text-lg">mm</span>
                           </span>
                         </div>
                         <p className="text-xs text-slate-500">
                           ※斜辺ピッチ ({vertResult.diagonal.toFixed(1)}) - 両端の差し引き ({(parseFloat(jointDeduction || '0') * 2)}) <br/>
                           ※この中心線長さを元に、端を同じく斜め切りしてください。
                         </p>
                       </div>
                     </div>
                   </>
                 )}
               </div>

               {/* 中継ぎラックの桁割り最適化表示 */}
               {!vertResult.isLimit && optimizeRungLayout(vertResult.middleLen, minClearance) && (
                 <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-5 mt-4 shadow-sm">
                   <h4 className="font-bold text-indigo-900 flex items-center gap-1.5 mb-2">
                     <Calculator className="w-4 h-4" />
                     「できるだけ子桁を残す」中継ぎラック最適カット法
                   </h4>
                   <p className="text-xs text-indigo-700 mb-3 leading-relaxed">
                     中継ぎ部分を切り出す際に、以下の端あき寸法に合わせて切断すると、金具との干渉を（{minClearance}mm）避けつつ、最大限に子桁を残すことができます。
                   </p>
                   <div className="flex gap-4 items-center">
                     <div className="flex-1 bg-white p-3 rounded border border-indigo-100 flex flex-col items-center text-center">
                       <span className="text-xs text-slate-500 font-bold mb-1">両端の推奨端あき寸法</span>
                       <span className="text-xl flex items-baseline gap-1 font-black text-indigo-700">
                         {optimizeRungLayout(vertResult.middleLen, minClearance)?.clearance.toFixed(1)} <span className="text-sm font-bold">mm</span>
                       </span>
                     </div>
                     <div className="flex-1 bg-white p-3 rounded border border-indigo-100 flex flex-col items-center text-center">
                       <span className="text-xs text-slate-500 font-bold mb-1">残せる子桁（ラング）</span>
                       <span className="text-xl flex items-baseline gap-1 font-black text-indigo-700">
                         {optimizeRungLayout(vertResult.middleLen, minClearance)?.count} <span className="text-sm font-bold">本</span>
                       </span>
                     </div>
                   </div>
                 </div>
               )}
            </div>

            <div className="mb-6">
              <Rack3DViewer 
                type="vertical" 
                w={300} 
                h={parseFloat(vertOffset) || 300} 
                l={vertResult.diagonal} 
                angle={vertAngle}
                railHeight={parseFloat(vertHeight) || 70}
                inner={vertResult.inner}
                outer={vertResult.outer}
                rungDist={parseFloat(vertRungDist) || 150}
                jointDeduction={parseFloat(jointDeduction) || 30}
                minClearance={parseFloat(minClearance) || 80}
              />
            </div>

            <button className="w-full mt-4 border-2 border-blue-600 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-md flex justify-center items-center gap-2" onClick={() => {
                setCutLength(vertResult.diagonal.toFixed(1));
                setActiveTab('kogeta');
            }}>
              <SquareMenu className="w-5 h-5"/> この斜辺ピッチで子桁調整を確認する <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        )}

        {/* ===================== 子桁調整 ===================== */}
        {activeTab === 'kogeta' && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
             <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 mb-6 space-y-5">
              <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-3 text-gray-800">
                <SquareMenu className="w-5 h-5 text-blue-600" /> 子桁干渉シミュレーター
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                切断ピッチが子桁（ラング）と重ならないように、1箇所目の切断芯の位置を調整します。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <NumberInput label="子桁ピッチ" value={kogetaPitch} onChange={setKogetaPitch} placeholder="300" />
                <NumberInput label="切断ピッチ (L)" value={cutLength} onChange={setCutLength} />
              </div>
              <div className="pt-2 border-t">
                 <NumberInput label="手前の子桁から1箇所目切断芯までの距離" value={startDist} onChange={setStartDist} />
              </div>
            </div>

            <div className={`p-5 rounded-xl border ${kogetaResult.hit ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'} shadow-sm mb-6`}>
              <div className="flex items-start gap-3">
                {kogetaResult.hit ? (
                   <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                ) : (
                   <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h3 className={`font-bold ${kogetaResult.hit ? 'text-red-800' : 'text-green-800'} text-lg`}>
                    {kogetaResult.hit ? '子桁に干渉する可能性があります' : '干渉のリスクは低いです'}
                  </h3>
                  <div className="mt-2 space-y-1 text-sm text-gray-700">
                     <p>・1箇所目: 手前子桁から <strong>{parseFloat(startDist) || 0} mm</strong></p>
                     <p>・2箇所目: 手前子桁から <strong>{kogetaResult.secondDist.toFixed(1)} mm</strong></p>
                  </div>
                  {kogetaResult.hit && kogetaResult.suggestion !== -1 && (
                     <div className="mt-4 p-3 bg-white rounded-md border border-red-100">
                       <p className="text-sm font-semibold text-red-700">💡 提案：1箇所目の位置をずらす</p>
                       <p className="text-sm text-gray-600 mt-1">手前の子桁から <strong>{kogetaResult.suggestion.toFixed(0)} mm</strong> の位置から開始すると、両方の切断部が子桁を回避できます。</p>
                       <button 
                         onClick={() => setStartDist(kogetaResult.suggestion.toString())}
                         className="mt-3 w-full py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded font-medium text-sm transition-colors"
                        >
                         設定を {kogetaResult.suggestion.toFixed(0)} mm に変更する
                       </button>
                     </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

