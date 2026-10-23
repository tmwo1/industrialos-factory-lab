import { describe, expect, it } from 'vitest';
import { DEFAULT_INPUT, cloneInput, simulate, snapshotAt, stationIds, validateInput } from './simulation';
import type { SimulationInput } from './simulation';
import { buildShareUrl, DEFAULT_SCENARIO, parseScenario } from './share';

const input=(p:[number,number,number]=[20,40,25],transfer:[number,number]=[5,5],n=10):SimulationInput=>({modelVersion:1,batchSize:n,processingSeconds:p,transferSeconds:transfer});
describe('Independent reference cases',()=>{
 it.each([
  [[20,40,25],[5,5],10,455,180],[[10,40,25],[5,5],10,445,180],[[20,20,25],[5,5],10,300,112.5],
  [[20,40,25],[0,0],10,445,180],[[10,40,25],[0,0],10,435,180],[[20,20,25],[0,0],10,290,112.5],
  [[20,40,25],[5,5],1,95,0],[[20,20,20],[5,5],10,250,90],
 ] as [[number,number,number],[number,number],number,number,number][] )('p=%j transport=%j n=%i gives %is',(p,t,n,last,wait)=>{const r=simulate(input(p,t,n));expect(r.metrics.makespanMs).toBe(last*1000);expect(r.metrics.meanWaitMs).toBe(wait*1000);});
 it('distinguishes finite batch output from sustained capacity and reports ties',()=>{const r=simulate(input());expect(r.metrics.batchRate).toBeCloseTo(79.120879);expect(r.metrics.capacity).toBe(90);expect(r.metrics.bottlenecks).toEqual(['B']);expect(simulate(input([20,20,20])).metrics.bottlenecks).toEqual(['A','B','C']);});
});
describe('Physical and accounting invariants',()=>{
 let seed=28;const rnd=(max:number)=>{seed=(seed*48271)%2147483647;return seed%max;};
 const cases=Array.from({length:35},()=>input([1+rnd(300),1+rnd(300),1+rnd(300)],[rnd(31),rnd(31)],1+rnd(40)));
 it.each(cases)('conserves parts, FIFO, machine capacity and area identities for %j',cfg=>{
  const r=simulate(cfg);const expected=(cfg.processingSeconds.reduce((a,b)=>a+b,0)+cfg.transferSeconds[0]+cfg.transferSeconds[1]+(cfg.batchSize-1)*Math.max(...cfg.processingSeconds))*1000;
  expect(r.metrics.makespanMs).toBe(expected);
  const times=[...new Set(r.events.map(e=>e.timeMs))];let wipArea=0,queueArea=0;
  for(let k=0;k<times.length;k++){
   const t=times[k],s=snapshotAt(r,t);const waiting=s.stations.flatMap(st=>st.queued),processing=s.stations.flatMap(st=>st.processing===null?[]:[st.processing]),travelling=s.transit.map(p=>p.jobId),all=[...waiting,...processing,...travelling,...s.completedJobs];
   expect(all.length).toBe(cfg.batchSize);expect(new Set(all).size).toBe(cfg.batchSize);expect(s.wip+s.completed).toBe(cfg.batchSize);
   const duration=(times[k+1]??t)-t;wipArea+=duration*s.wip;queueArea+=duration*waiting.length;
  }
  expect(wipArea).toBeCloseTo(r.metrics.meanFlowMs*cfg.batchSize,5);expect(queueArea).toBeCloseTo(r.metrics.meanWaitMs*cfg.batchSize,5);
  for(const id of stationIds){const visits=r.intervals.filter(i=>i.stationId===id);expect(visits.map(i=>i.jobId)).toEqual(Array.from({length:cfg.batchSize},(_,i)=>i+1));for(let k=0;k<visits.length;k++){const v=visits[k];expect(v.startMs).toBeGreaterThanOrEqual(v.arrivalMs);if(k)expect(v.startMs).toBeGreaterThanOrEqual(visits[k-1].finishMs);}}
  for(let j=1;j<=cfg.batchSize;j++){const iv=r.intervals.filter(i=>i.jobId===j);const waitingTime=iv.reduce((sum,i)=>sum+i.startMs-i.arrivalMs,0);expect(iv[2].finishMs).toBe(waitingTime+(cfg.processingSeconds.reduce((a,b)=>a+b,0)+cfg.transferSeconds.reduce((a,b)=>a+b,0))*1000);}
 });
 it('long transports overlap rather than serialize',()=>{const r=simulate(input([1,1,1],[30,30],20));expect(snapshotAt(r,15000).transit.length).toBeGreaterThan(1);expect(r.metrics.makespanMs).toBe(82000);});
 it('transport adds a fixed shift without changing waiting time',()=>{const a=simulate(input([3,9,4],[0,0],20)),b=simulate(input([3,9,4],[30,17],20));for(let i=0;i<a.intervals.length;i++){const offset=[0,30000,47000][stationIds.indexOf(a.intervals[i].stationId)];expect(b.intervals[i].finishMs-a.intervals[i].finishMs).toBe(offset);}expect(b.metrics.meanWaitMs).toBe(a.metrics.meanWaitMs);});
 it('snapshots at ties reflect all completions and starts',()=>{const r=simulate(input([20,20,20],[0,0],10)),s=snapshotAt(r,60000);expect(s.completed).toBe(1);expect(s.stations.map(st=>st.processing)).toEqual([4,3,2]);expect(s.transit).toHaveLength(0);expect(snapshotAt(r,-100).timeMs).toBe(0);expect(snapshotAt(r,Infinity).completed).toBe(10);});
 it('playback order cannot change results or inputs',()=>{const cfg=cloneInput(DEFAULT_INPUT),r=simulate(cfg),before=JSON.stringify(r);for(const time of [300000,0,40000,455000,3300])snapshotAt(r,time);cfg.processingSeconds[0]=1;expect(r.input.processingSeconds[0]).toBe(20);expect(JSON.stringify(r)).toBe(before);expect(simulate(DEFAULT_INPUT)).toEqual(r);});
 it('shortening any station never delays departures',()=>{for(const cfg of cases){const original=simulate(cfg);for(let i=0;i<3;i++){const faster=cloneInput(cfg);faster.processingSeconds[i]=Math.max(1,Math.floor(faster.processingSeconds[i]/2));const r=simulate(faster);for(let j=2;j<r.intervals.length;j+=3)expect(r.intervals[j].finishMs).toBeLessThanOrEqual(original.intervals[j].finishMs);}}});
});
describe('Boundary validation',()=>{
 it.each([0,-1,201,1.5,NaN,Infinity])('rejects batch size %s',n=>expect(()=>simulate(input([20,40,25],[5,5],n))).toThrow());
 it.each([0,-1,301,.5,NaN])('rejects processing time %s',n=>expect(()=>simulate(input([n,40,25]))).toThrow());
 it.each([-1,31,2.3,NaN])('rejects transfer time %s',n=>expect(()=>simulate(input([20,40,25],[n,5]))).toThrow());
 it('rejects invalid wire shapes and unsupported versions',()=>{for(const bad of [null,[],{}, {modelVersion:2,...{batchSize:1,processingSeconds:[1,1,1],transferSeconds:[0,0]}},{...input(),processingSeconds:[1,2]}])expect(validateInput(bad).length).toBeGreaterThan(0);});
});
describe('Reproducible URL contract',()=>{
 it('roundtrips all settings and language',()=>{const s={...DEFAULT_SCENARIO,locale:'en' as const,input:input([7,23,9],[0,30],200),newSeconds:3};const url=buildShareUrl(s,'https://example.com/');expect(parseScenario(new URL(url).search)).toEqual({scenario:s,error:null});});
 it('opens the default scenario for an empty URL',()=>expect(parseScenario('').error).toBeNull());
 it.each(['?v=2&n=10&a=20&b=40&c=25&ab=5&bc=5&target=B&new=20&lang=ar','?v=1&n=0&a=20&b=40&c=25&ab=5&bc=5&target=B&new=20&lang=ar','?n=10','?v=1&n=10&a=20&b=40&c=25&ab=5&bc=5&target=X&new=20&lang=ar','?v=1&n=10&a=20&b=40&c=25&ab=5&bc=5&target=B&new=20&lang=fr'])('rejects invalid link %s',q=>expect(parseScenario(q).error).not.toBeNull());
 it('rejects duplicate parameters',()=>{const url=new URL(buildShareUrl(DEFAULT_SCENARIO,'https://example.com/'));url.searchParams.append('n','5');expect(parseScenario(url.search).error).not.toBeNull();});
});
