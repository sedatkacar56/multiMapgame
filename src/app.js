const COLORS = [
  '#f4b63f','#ef6a67','#4fb3a5','#768ce3','#a87ad2','#79ad54','#e78c45','#d85e9f',
  '#50a7d0','#b7a64a','#9b7b5a','#5fc27d','#d66f3f','#6e6ac7','#c45b68','#4aa0a0',
  '#d19a66','#8fbc8f','#bf70c9','#7e9bbd'
]
const REALM_IDENTITIES = [
  {name:'Russian Empire',point:[48,58]}, {name:'Nordic Union',point:[16,63]},
  {name:'Atlantic Kingdom',point:[-3,50]}, {name:'Frankish Empire',point:[3,45]},
  {name:'Central European Empire',point:[16,50]}, {name:'Balkan Federation',point:[22,44]},
  {name:'Ottoman Empire',point:[31,39]}, {name:'Caucasian Kingdom',point:[44,42]},
  {name:'Persian Empire',point:[52,33]}, {name:'Arabian Caliphate',point:[44,24]},
  {name:'North African Kingdom',point:[10,29]}, {name:'Baltic League',point:[25,56]},
  {name:'Alpine Confederacy',point:[10,47]}, {name:'Mediterranean Republic',point:[16,38]},
  {name:'Black Sea Dominion',point:[34,45]}, {name:'Levantine Kingdom',point:[36,33]},
  {name:'Maghreb Sultanate',point:[-3,31]}, {name:'Iberian Crown',point:[-5,40]},
  {name:'Danubian League',point:[20,48]}, {name:'Caspian Khanate',point:[54,44]},
  {name:'Nile Kingdom',point:[30,27]}, {name:'Mesopotamian Empire',point:[44,34]},
  {name:'British Crown',point:[-2,54]}, {name:'Gallic Republic',point:[2,47]},
  {name:'Germanic Confederation',point:[10,51]}, {name:'Polish-Lithuanian Commonwealth',point:[24,52]},
  {name:'Ruthenian Hetmanate',point:[32,49]}, {name:'Anatolian Sultanate',point:[29,39]},
  {name:'Armenian Highlands',point:[44,40]}, {name:'Nubian Kingdom',point:[32,20]},
  {name:'Atlas Kingdom',point:[-1,33]}, {name:'Arabian Peninsula League',point:[45,20]},
  {name:'Khorasan Empire',point:[58,36]}
]
const REGION = new Set([
  'Albania','Algeria','Armenia','Austria','Azerbaijan','Belarus','Belgium','Bosnia and Herzegovina',
  'Bulgaria','Croatia','Cyprus','Czechia','Denmark','Egypt','Estonia','Finland','France','Georgia',
  'Germany','Greece','Hungary','Iran','Iraq','Ireland','Israel','Italy','Jordan',
  'Kosovo','Kuwait','Latvia','Lebanon','Libya','Lithuania','Luxembourg','Moldova','Montenegro','Morocco',
  'Netherlands','North Macedonia','Norway','Oman','Poland','Portugal','Qatar','Romania',
  'Saudi Arabia','Serbia','Slovakia','Slovenia','Spain','Sweden','Switzerland','Syria','Tunisia','Turkey',
  'Ukraine','United Arab Emirates','United Kingdom','Yemen'
])
const SEA_LINKS = [
  ['United Kingdom','France'],['Ireland','United Kingdom'],['Denmark','Sweden'],['Italy','Tunisia'],
  ['Italy','Albania'],['Greece','Turkey'],['Cyprus','Turkey'],['Cyprus','Syria'],['Spain','Morocco']
]
const RUSSIA_BORDER_LINKS = {
  Norway: ['Murmansk'],
  Finland: ['Murmansk','Karelia','Leningrad'],
  Estonia: ['Leningrad','Pskov'],
  Latvia: ['Pskov'],
  Lithuania: ['Kaliningrad'],
  Poland: ['Kaliningrad'],
  Belarus: ['Pskov','Smolensk','Bryansk'],
  Ukraine: ['Bryansk','Kursk','Belgorod','Voronezh','Rostov'],
  Georgia: ['Krasnodar','Karachay-Cherkess','Kabardin-Balkar','North Ossetia','Chechnya','Dagestan'],
  Azerbaijan: ['Dagestan']
}
const $ = selector => document.querySelector(selector)
const roll = () => Math.floor(Math.random() * 6) + 1
const turnMessage = player => player.name==='You'?'Your campaign turn.':`${player.name}'s campaign turn.`
const escapeHtml = value => String(value).replace(/[&<>'"]/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[character]))
function ringArea(ring) {
  return ring.slice(0,-1).reduce((sum, point, index) => {
    const next=ring[index+1]
    return sum + point[0]*next[1] - next[0]*point[1]
  },0)/2
}
function orientGeometry(geometry) {
  const polygons=geometry.type==='Polygon'?[geometry.coordinates]:geometry.coordinates
  polygons.forEach(polygon => polygon.forEach((ring,index) => {
    const area=ringArea(ring)
    if((index===0&&area>0)||(index>0&&area<0))ring.reverse()
  }))
}
const state = {
  territories: [], players: [], humanCount: 1, playerCount: 4, phase: 'setup', turn: 0,
  claimWinner: null, selected: null, dice: [], battle: null, message: 'Prepare your campaign.', aiTimer: null, fastAI: true, musicOn: false,
  turnCount: 0, roundCount: 0, turnDeadline: 0, alliances: [], ceasefires: [], pendingRenewals: [], diplomacyTarget: null, diplomacyOffers: [], diplomacySent: {}, diplomacyAggression: {}, attackMode: 'normal', attacksThisTurn: {}, musicStyle: 'campaign', strengthsOn: false, captureAttackOn: false, fogOfWar: false,
  showPacts: false, controlsHidden: false, panelHidden: false, rebelsOn: false, nuclearOn: false, nuclearStrike: null, nuclearTargeting: 'random', nuclearPending: null, battleCounts: {}, alliancesOn: true, autoRejectOffers: false, strengthView: 'off', paused: false, musicVolume: .65, attackAnimation: null,
  showLabels: true, showPlayerLabels: true,
  playerNames: Array(33).fill(''), playerLabelSize: 9
}
let mapZoom
let currentZoom={k:1,x:0,y:0}
let mapProjection
let musicContext, musicGain, musicTimer, musicStep=0, musicChange=0, warTrack
let turnClockTimeout, turnClockInterval
const musicVoices=new Set()

document.querySelector('#root').innerHTML = `
  <main>
    <header>
      <div class="brand"><span class="brand-mark">BD</span><div><b>Borderline</b><em>Dominion</em></div></div>
      <div class="turn-banner"><span id="phase-label">THE OLD WORLD</span><strong id="message">Awaiting commanders</strong><small data-turn-countdown></small></div>
      <div class="header-actions"><button class="ghost" id="save-game">Save</button><button class="ghost" id="load-game">Load</button><button class="ghost" id="load-file">Load file</button><button class="ghost" id="export-game">Export</button><button class="ghost" id="delete-game">Delete</button><button class="ghost" id="new-game">New game</button><input id="load-file-input" type="file" accept="application/json,.json" style="display:none" /></div>
    </header>
    <section class="game-shell">
      <div class="map-wrap">
        <svg class="map" viewBox="0 0 1200 750" role="img" aria-label="Interactive political map">
          <defs>
            <filter id="shadow"><feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity=".3" /></filter><marker id="attack-arrowhead" markerWidth="8" markerHeight="8" refX="7" refY="3.5" orient="auto"><path d="M0,0 L8,3.5 L0,7 z" fill="#f0c771" /></marker>
            <pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#d7d1bd"/><line x1="0" y1="0" x2="0" y2="8" stroke="#c2bba6" stroke-width="2" /></pattern>
          </defs>
          <rect width="1200" height="750" class="sea"/>
          <g id="map-viewport"><g id="countries"></g><g id="rebel-fires"></g><g id="attack-arrows"></g><g id="labels"></g><g id="strength-badges"></g><g id="player-labels"></g></g>
        </svg>
        <div class="map-controls">
          <button id="zoom-in" title="Zoom in" aria-label="Zoom in">+</button>
          <button id="zoom-out" title="Zoom out" aria-label="Zoom out">−</button>
          <button id="zoom-reset" title="Reset map" aria-label="Reset map">⌂</button>
          <button id="toggle-labels" class="names-button" aria-pressed="false">Place names</button>
          <button id="toggle-player-labels" class="names-button" aria-pressed="false">Player names</button>
          <button id="toggle-fast-ai" class="names-button" aria-pressed="false" title="AI turns play immediately; human turns stay manual">Fast AI</button><button id="toggle-pause-ai" class="names-button" aria-pressed="false" title="Pause automatic AI turns">Pause AI</button>
          <button id="toggle-hard-mode" class="names-button" aria-pressed="false" title="Cycle Normal, Moderate, and Hard attack modes">Mode: Normal · 1 attack</button><button id="toggle-strengths" class="names-button" aria-pressed="false" title="Toggle attack and defense strength bonuses">Strengths: Off</button><select id="strength-view" class="strength-view" aria-label="Strength map view" disabled><option value="off">Strength view: Off</option><option value="attack">Attack heatmap</option><option value="defense">Defense heatmap</option><option value="combined">Combined strength</option></select><button id="toggle-capture-attack" class="names-button" aria-pressed="false" title="Allow a newly captured territory to attack immediately">New capture attack: Off</button><button id="toggle-rebels" class="names-button" aria-pressed="false" title="Toggle Hard-mode rebellions">Rebels: Off</button>
          <button id="toggle-fog" class="names-button" aria-pressed="false" title="Hide distant enemy territories">Fog of war: Off</button>
          <button id="toggle-music" class="names-button" aria-pressed="false" title="Toggle the campaign soundtrack">♫ Music: Off</button><select id="music-style" class="music-style" aria-label="Music style"><option value="campaign">Campaign</option><option value="tension">Battle tension</option><option value="march">War march</option><option value="shadow">Relaxing ambient</option><option value="calm">Quiet command</option></select><label class="volume-control">Volume <input id="music-volume" type="range" min="0" max="1" step=".05" value=".65" /></label>
          <button id="toggle-pacts" class="names-button" aria-pressed="false">Pacts</button><button id="toggle-alliances" class="names-button" aria-pressed="true">Alliances: On</button><button id="toggle-auto-reject" class="names-button" aria-pressed="false">Auto-reject offers: Off</button><button id="toggle-fullscreen" class="names-button" aria-pressed="false">Fullscreen</button><button id="toggle-panel" class="names-button" aria-pressed="false">Hide panel</button><button id="toggle-controls" class="names-button" aria-pressed="false">Hide controls</button>
          <label class="label-size-control">Name size <input id="player-label-size" type="range" min="4" max="14" step="1" value="9"><output id="player-label-size-value">9</output></label>
        </div><button id="show-controls" class="show-controls" aria-label="Show map controls">☰ Controls</button><button id="show-panel" class="show-panel" aria-label="Show players panel">☰ Players</button><div id="diplomacy-panel"></div>
        <div class="compass"><i>N</i><span>✦</span></div><div class="map-caption">EUROPE · NORTH AFRICA · WESTERN ASIA</div>
        <div id="nuclear-alert" class="nuclear-alert" aria-live="assertive"></div>
      </div>
      <aside>
        <div class="panel-title"><span>Players</span><small id="territory-total">0 territories</small></div>
        <div id="player-quick"></div>
        <div class="players" id="players"><p class="empty">Your rival commanders will appear here.</p></div>
        <div id="actions"></div>
        <div class="rules"><span>FIELD RULES</span><p id="rules-text">Each territory can attack once per turn. Only shared borders and marked sea routes are valid. Ties favor the defender. Alliances last 3 turns; ceasefires last 1.</p></div>
      </aside>
    </section>
    <div id="mobile-turn-action" class="mobile-turn-action"></div><div id="modal"></div><div id="offer-modal"></div><div id="save-dialog"></div><audio id="war-track" loop preload="auto" aria-hidden="true" style="position:absolute;width:1px;height:1px;opacity:0;pointer-events:none" src="./assets/music/mehter-march.mp3"></audio>
  </main>`
warTrack=$('#war-track')

async function loadMap() {
  try {
    const [worldResponse, russiaResponse] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json'),
      fetch('./data/russia-regions.geojson')
    ])
    if (!worldResponse.ok || !russiaResponse.ok) throw new Error()
    const topology = await worldResponse.json()
    const russia = await russiaResponse.json()
    const object = topology.objects.countries
    const collection = topojson.feature(topology, object)
    const allNeighbors = topojson.neighbors(object.geometries)
    const selected = object.geometries.map((geometry, index) => ({ index, name: geometry.properties?.name || '' })).filter(item => REGION.has(item.name))
    const idByIndex = new Map(selected.map(({ index }) => [index, String(object.geometries[index].id)]))
    const countries = selected.map(({ index, name }) => ({
      id: String(object.geometries[index].id), name, feature: collection.features[index],
      neighbors: allNeighbors[index].map(i => idByIndex.get(i)).filter(Boolean), owner: null, rebel: false, attacked: false, attacks: 0, attackStrength: 0, defenseStrength: 0
    }))
    const russianRegions = russia.features.map(feature => {
      orientGeometry(feature.geometry)
      return {
        id: `ru-${feature.properties.id}`, name: feature.properties.name, feature,
        neighbors: feature.properties.neighbors.map(id => `ru-${id}`), owner: null, rebel: false, attacked: false, attacks: 0, attackStrength: 0, defenseStrength: 0
      }
    })
    state.territories = [...countries, ...russianRegions]
    state.territories.forEach(t=>t.landNeighbors=[...t.neighbors])
    const byName = new Map(state.territories.map(t => [t.name, t]))
    SEA_LINKS.forEach(([a,b]) => { const x=byName.get(a), y=byName.get(b); if(x&&y){ if(!x.neighbors.includes(y.id))x.neighbors.push(y.id); if(!y.neighbors.includes(x.id))y.neighbors.push(x.id) } })
    Object.entries(RUSSIA_BORDER_LINKS).forEach(([countryName, regionNames]) => regionNames.forEach(regionName => {
      const country=byName.get(countryName), region=byName.get(regionName)
      if(country&&region){
        if(!country.neighbors.includes(region.id))country.neighbors.push(region.id)
        if(!region.neighbors.includes(country.id))region.neighbors.push(country.id)
        if(!country.landNeighbors.includes(region.id))country.landNeighbors.push(region.id)
        if(!region.landNeighbors.includes(country.id))region.landNeighbors.push(country.id)
      }
    }))
    drawMap(); render()
  } catch {
    document.querySelector('#root').innerHTML = '<div class="loading error">Could not load the world map<small>Check your internet connection and reload.</small></div>'
  }
}

function drawMap() {
  currentZoom=d3.zoomIdentity
  mapProjection = d3.geoMercator().center([34,45]).scale(430).translate([600,440])
  const path = d3.geoPath(mapProjection)
  const group = $('#countries'), labels=$('#labels'); group.innerHTML = ''; labels.innerHTML=''
  state.territories.forEach(t => {
    const el = document.createElementNS('http://www.w3.org/2000/svg','path')
    el.setAttribute('d', path(t.feature)); el.setAttribute('class','country'); el.dataset.id=t.id
    el.addEventListener('click', () => territoryClick(t.id))
    const title=document.createElementNS('http://www.w3.org/2000/svg','title'); el.appendChild(title)
    group.appendChild(el)
    const center=path.centroid(t.feature), label=document.createElementNS('http://www.w3.org/2000/svg','text')
    const bounds=path.bounds(t.feature), width=bounds[1][0]-bounds[0][0], height=bounds[1][1]-bounds[0][1]
    const vertical=height>width*1.28
    t.mapCenter=center;t.mapArea=path.area(t.feature);t.mapBounds=bounds;t.geoCenter=d3.geoCentroid(t.feature)
    label.setAttribute('x',center[0]);label.setAttribute('y',center[1]);label.setAttribute('class','place-label');label.dataset.id=t.id
    label.setAttribute('transform',vertical?`rotate(-90 ${center[0]} ${center[1]})`:'')
    label.dataset.area=String(path.area(t.feature));label.dataset.width=String(width);label.dataset.height=String(height);label.dataset.vertical=String(vertical)
    label.textContent=t.name;labels.appendChild(label)
  })
  mapZoom=d3.zoom().scaleExtent([1,6]).translateExtent([[0,0],[1200,750]])
    .on('start',()=>$('.map').classList.add('zooming'))
    .on('zoom',event=>{
      currentZoom=event.transform
      d3.select('#map-viewport').attr('transform',currentZoom)
    })
    .on('end',()=>{$('.map').classList.remove('zooming');updateLabels();updatePlayerLabels()})
  d3.select('.map').call(mapZoom).on('dblclick.zoom',null)
  updateLabels();updatePlayerLabels()
}

function updateLabels() {
  const button=$('#toggle-labels')
  if(button){button.classList.toggle('active',state.showLabels);button.setAttribute('aria-pressed',String(state.showLabels))}
  const mobile=window.innerWidth<=900||window.innerHeight<=500
  const labels=[...document.querySelectorAll('.place-label')]
  const accepted=[]
  labels.sort((a,b)=>Number(b.dataset.area)-Number(a.dataset.area)).forEach(label=>{
    const area=Number(label.dataset.area)||999
    const vertical=label.dataset.vertical==='true'
    const available=vertical?Number(label.dataset.height):Number(label.dataset.width)
    const baseFont=6.5/currentZoom.k
    const fitFont=available*.82/Math.max(1,(label.textContent?.length||1)*.54)
    const fontSize=Math.min(baseFont,fitFont)
    const screenFont=fontSize*currentZoom.k
    const readable=mobile
      ? area*currentZoom.k*currentZoom.k>8&&screenFont>=2.7
      : area*currentZoom.k*currentZoom.k>22&&screenFont>=4.1
    const [screenX,screenY]=currentZoom.apply([Number(label.getAttribute('x')),Number(label.getAttribute('y'))])
    const textWidth=(label.textContent?.length||1)*screenFont*.54+4
    const textHeight=screenFont*1.35+3
    const width=vertical?textHeight:textWidth
    const height=vertical?textWidth:textHeight
    const box={left:screenX-width/2,right:screenX+width/2,top:screenY-height/2,bottom:screenY+height/2}
    const overlaps=accepted.some(other=>!(box.right<other.left||box.left>other.right||box.bottom<other.top||box.top>other.bottom))
    const territory=state.territories.find(t=>t.id===label.dataset.id)
    const visible=state.showLabels&&state.strengthView!=='combined'&&(!territory||isTerritoryVisible(territory))&&readable&&!overlaps
    label.style.display=visible?'block':'none'
    if(visible)accepted.push(box)
    label.style.fontSize=`${fontSize}px`
    label.style.strokeWidth=`${Math.max(.35,1/currentZoom.k)}px`
  })
}

function updatePlayerLabels() {
  const button=$('#toggle-player-labels'), group=$('#player-labels')
  if(button){button.classList.toggle('active',state.showPlayerLabels);button.setAttribute('aria-pressed',String(state.showPlayerLabels))}
  if($('#player-label-size-value'))$('#player-label-size-value').textContent=state.playerLabelSize
  if(!group)return
  const ownershipKey=state.players.map(player=>`${player.id}:${state.territories.filter(t=>t.owner===player.id).map(t=>t.id).join(',')}`).join('|')
  const viewKey=`${currentZoom.k.toFixed(3)},${currentZoom.x.toFixed(1)},${currentZoom.y.toFixed(1)}`
  const labelKey=`${state.showPlayerLabels}|${state.fogOfWar}|${window.MultiSync?.active?window.MultiSync.playerIndex:'local'}|${state.turn}|${state.playerLabelSize}|${viewKey}|${ownershipKey}`
  if(group.dataset.labelKey===labelKey)return
  group.dataset.labelKey=labelKey
  group.innerHTML=''
  if(!state.showPlayerLabels||!state.players.length)return
  const entries=state.players.map(player=>{
    if(state.fogOfWar&&state.phase==='war'&&(!player.isHuman||(window.MultiSync?.active&&player.id!==window.MultiSync.playerIndex)))return null
    const owned=largestLandComponent(player.id)
    if(!owned.length)return null
    const bounds=owned.reduce((box,t)=>[[Math.min(box[0][0],t.mapBounds[0][0]),Math.min(box[0][1],t.mapBounds[0][1])],[Math.max(box[1][0],t.mapBounds[1][0]),Math.max(box[1][1],t.mapBounds[1][1])]],[[Infinity,Infinity],[-Infinity,-Infinity]])
    const middle=[(bounds[0][0]+bounds[1][0])/2,(bounds[0][1]+bounds[1][1])/2]
    const realmWidth=bounds[1][0]-bounds[0][0], realmHeight=bounds[1][1]-bounds[0][1]
    const onLand=point=>{const geo=mapProjection.invert(point);return geo&&owned.some(t=>d3.geoContains(t.feature,geo))}
    const candidates=[middle,...owned.flatMap(t=>[t.mapCenter,[(t.mapBounds[0][0]+t.mapBounds[1][0])/2,(t.mapBounds[0][1]+t.mapBounds[1][1])/2]])]
    for(let y=1;y<8;y++)for(let x=1;x<8;x++)candidates.push([bounds[0][0]+realmWidth*x/8,bounds[0][1]+realmHeight*y/8])
    const unique=[...new Map(candidates.filter(onLand).map(point=>[`${point[0].toFixed(1)}:${point[1].toFixed(1)}`,point])).values()]
      .sort((a,b)=>Math.hypot(a[0]-middle[0],a[1]-middle[1])-Math.hypot(b[0]-middle[0],b[1]-middle[1]))
    return {player,owned,middle,candidates:unique,realmWidth,realmHeight,vertical:realmHeight>realmWidth*1.15,area:owned.reduce((sum,t)=>sum+t.mapArea,0)}
  }).filter(Boolean).sort((a,b)=>b.area-a.area)
  const mobile=window.innerWidth<=900||window.innerHeight<=500
  const accepted=[]
  entries.forEach(({player,owned,candidates,realmWidth,realmHeight,vertical})=>{
    const words=player.name.trim().split(/\s+/)
    let lines=[player.name]
    if(player.name.length>14&&words.length>1){
      let best=1
      for(let i=2;i<words.length;i++)if(Math.abs(words.slice(0,i).join(' ').length-words.slice(i).join(' ').length)<Math.abs(words.slice(0,best).join(' ').length-words.slice(best).join(' ').length))best=i
      lines=[words.slice(0,best).join(' '),words.slice(best).join(' ')]
    }
    const longest=Math.max(...lines.map(line=>line.length))
    const major=(vertical?realmHeight:realmWidth)*currentZoom.k
    const minor=(vertical?realmWidth:realmHeight)*currentZoom.k
    const initialSize=Math.max(mobile?3:4,Math.min(state.playerLabelSize,major*.74/Math.max(1,longest*.6),minor*.52/lines.length))
    const makeBox=(center,size)=>{
      const [screenX,screenY]=currentZoom.apply(center)
      const bannerWidth=Math.max(20,longest*size*.6+10), bannerHeight=size*lines.length+7
      const width=vertical?bannerHeight:bannerWidth, height=vertical?bannerWidth:bannerHeight
      return {left:screenX-width/2,right:screenX+width/2,top:screenY-height/2,bottom:screenY+height/2,bannerWidth,bannerHeight,center,size}
    }
    const overlapPadding=mobile?0:2
    const hasOverlap=box=>accepted.some(other=>!(box.right+overlapPadding<other.left||box.left-overlapPadding>other.right||box.bottom+overlapPadding<other.top||box.top-overlapPadding>other.bottom))
    const fitsOnLand=box=>{
      const inset=mobile?1:2
      const xs=[box.left+inset,(box.left+box.right)/2,box.right-inset], ys=[box.top+inset,(box.top+box.bottom)/2,box.bottom-inset]
      const points=xs.flatMap(x=>ys.map(y=>[x,y]))
      return points.every(point=>{
        const mapPoint=currentZoom.invert(point), geoPoint=mapProjection.invert(mapPoint)
        return geoPoint&&owned.some(t=>d3.geoContains(t.feature,geoPoint))
      })
    }
    let box
    for(let size=initialSize;size>=(mobile?2:3)&&!box;size-=.5)box=candidates.map(center=>makeBox(center,size)).find(candidate=>!hasOverlap(candidate)&&fitsOnLand(candidate))
    if(!box)return
    const {center,size:fontSize}=box
    accepted.push(box)
    const label=document.createElementNS('http://www.w3.org/2000/svg','g')
    label.setAttribute('class','realm-label')
    label.setAttribute('transform',`translate(${center[0]} ${center[1]}) rotate(${vertical?-90:0}) scale(${1/currentZoom.k})`)
    const rect=document.createElementNS('http://www.w3.org/2000/svg','rect')
    rect.setAttribute('x',String(-box.bannerWidth/2));rect.setAttribute('y',String(-box.bannerHeight/2));rect.setAttribute('width',String(box.bannerWidth));rect.setAttribute('height',String(box.bannerHeight));rect.setAttribute('rx','3');rect.setAttribute('fill',player.color)
    const text=document.createElementNS('http://www.w3.org/2000/svg','text')
    text.setAttribute('text-anchor','middle');text.setAttribute('dominant-baseline','central');text.style.fontSize=`${fontSize}px`
    lines.forEach((line,index)=>{const part=document.createElementNS('http://www.w3.org/2000/svg','tspan');part.setAttribute('x','0');part.setAttribute('y',String((index-(lines.length-1)/2)*fontSize*1.02));part.textContent=line;text.appendChild(part)})
    label.append(rect,text);group.appendChild(label)
  })
}

function largestLandComponent(playerId) {
  const owned=state.territories.filter(t=>t.owner===playerId&&t.mapCenter)
  const byId=new Map(owned.map(t=>[t.id,t])), unseen=new Set(byId.keys()), components=[]
  while(unseen.size) {
    const first=unseen.values().next().value, queue=[first], component=[]
    unseen.delete(first)
    while(queue.length) {
      const territory=byId.get(queue.shift())
      component.push(territory)
      territory.landNeighbors.filter(id=>unseen.has(id)).forEach(id=>{unseen.delete(id);queue.push(id)})
    }
    components.push(component)
  }
  return components.sort((a,b)=>b.reduce((sum,t)=>sum+t.mapArea,0)-a.reduce((sum,t)=>sum+t.mapArea,0))[0]||[]
}

function changeZoom(multiplier) {
  if(mapZoom)d3.select('.map').call(mapZoom.scaleBy,multiplier)
}

function playCampaignBar() {
  if(!state.musicOn||!musicContext||!musicGain)return
  const now=musicContext.currentTime+.04
  const scene=state.battle?'battle':state.selected?'select':state.phase==='war'&&!state.players[state.turn]?.isHuman?'ai':'turn'
  const styles={campaign:{roots:[73.42,65.41,58.27,65.41],step:.48,type:'sine'},tension:{roots:[220,246.94,261.63,220],step:.25,type:'sawtooth'},march:{roots:[196,220,246.94,196],step:.36,type:'square'},shadow:{roots:[261.63,293.66,329.63,293.66],step:.82,type:'sine'},calm:{roots:[174.61,196,220,196],step:.7,type:'sine'}}
  const config=styles[state.musicStyle]||styles.campaign, sceneRoot=state.musicStyle==='campaign'?(scene==='battle'?config.roots[0]*.75:scene==='ai'?config.roots[1]*.9:config.roots[0]):config.roots[0], root=sceneRoot
  const tone=(frequency,start,duration,volume,type='triangle')=>{
    const oscillator=musicContext.createOscillator(), gain=musicContext.createGain(), filter=musicContext.createBiquadFilter()
    const voice={oscillator,gain,filter};musicVoices.add(voice)
    oscillator.onended=()=>{musicVoices.delete(voice);oscillator.disconnect();filter.disconnect();gain.disconnect()}
    oscillator.type=type;oscillator.frequency.value=frequency;filter.type='lowpass';filter.frequency.value=type==='sine'?420:760
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.16);gain.gain.exponentialRampToValueAtTime(.0001,start+duration)
    oscillator.connect(filter);filter.connect(gain);gain.connect(musicGain);oscillator.start(start);oscillator.stop(start+duration+.05)
  }
  const step=config.step
  tone(root,now,3.15,.06,config.type);tone(root*1.5,now,3.05,.035);tone(root*2,now+.02,2.9,.025)
  ;[2,2.25,2.4,3,2.67,2.25].forEach((ratio,index)=>tone(root*ratio,now+.18+index*step,.42,.042,index%2?'sine':config.type))
  if(state.musicStyle==='march'){
    // Original Mehter-inspired 2/4 davul pulse and bright zurna-like lead.
    ;[0,.36,.72,1.08,1.44,1.8,2.16,2.52].forEach((offset,index)=>tone(index%2===0?196:247,now+offset,.14,index%2===0?.11:.07,'triangle'))
    ;[0,.72,1.44,2.16].forEach(offset=>tone(330,now+offset,.09,.065,'square'))
    ;[392,392,494,523,494,440,392,349].forEach((frequency,index)=>tone(frequency,now+.1+index*.36,.3,.06,'sawtooth'))
  }
}

async function stopCampaignMusic() {
  clearInterval(musicTimer);musicTimer=null
  musicVoices.forEach(({oscillator})=>{try{oscillator.stop()}catch{}})
  musicVoices.clear()
  if(musicGain&&musicContext){musicGain.gain.cancelScheduledValues(musicContext.currentTime);musicGain.gain.setValueAtTime(0,musicContext.currentTime)}
  if(musicContext&&musicContext.state!=='closed')await musicContext.close()
  musicContext=null;musicGain=null
}

function stopAudioTrack(track){
  if(!track)return
  track.pause()
  track.currentTime=0
}
function stopWarTrack(){
  stopAudioTrack(warTrack)
}

async function startSelectedMusic(){
  if(!state.musicOn)return
  if(state.musicStyle==='first')state.musicStyle='campaign'
  if(state.musicStyle==='march'){
    await stopCampaignMusic()
    const track=warTrack
    if(track){
      track.volume=state.musicVolume
      try{await track.play()}catch{}
    }
    return
  }
  stopWarTrack()
  const AudioEngine=window.AudioContext||window.webkitAudioContext
  if(!AudioEngine){state.message='Synth music is not supported by this browser.';return}
  musicContext ||= new AudioEngine()
  try{if(musicContext.state==='suspended')await musicContext.resume()}catch{}
  if(!musicGain){musicGain=musicContext.createGain();musicGain.connect(musicContext.destination)}
  musicGain.gain.cancelScheduledValues(musicContext.currentTime)
  musicGain.gain.setValueAtTime(.0001,musicContext.currentTime)
  musicGain.gain.exponentialRampToValueAtTime(Math.max(.0001,state.musicVolume),musicContext.currentTime+.45)
  clearInterval(musicTimer);musicStep=0;playCampaignBar();musicTimer=setInterval(playCampaignBar,3200)
}

function updateMusicButtons() {
  const label=`♫ Music: ${state.musicOn?'On':'Off'}`
  const button=$('#toggle-music')
  if(button){button.textContent=label;button.classList.toggle('active',state.musicOn);button.setAttribute('aria-pressed',String(state.musicOn))}
  const setupButton=$('#setup-music')
  if(setupButton){setupButton.textContent=label;setupButton.classList.toggle('active',state.musicOn);setupButton.setAttribute('aria-pressed',String(state.musicOn))}
  const style=$('#music-style');if(style)style.value=state.musicStyle
  const volume=$('#music-volume');if(volume)volume.value=String(state.musicVolume)
}

function updateHardModeButtons() {
  const labels={normal:'Normal · 1 per territory',moderate:'Moderate · 3 total',hard:'Hard · all territories'}
  const label=`Mode: ${labels[state.attackMode]||labels.normal}`
  const button=$('#toggle-hard-mode')
  if(button){button.textContent=label;button.classList.toggle('active',state.attackMode!=='normal');button.setAttribute('aria-pressed',String(state.attackMode!=='normal'))}
  const setupButton=$('#setup-hard-mode')
  if(setupButton){setupButton.textContent=label;setupButton.classList.toggle('active',state.attackMode!=='normal');setupButton.setAttribute('aria-pressed',String(state.attackMode!=='normal'))}
  const rules=$('#rules-text')
  if(rules)rules.textContent=state.attackMode==='hard'
    ?'Hard mode: every territory may attack one neighboring enemy, and the realm continues until no legal attacks remain. Moderate mode allows 3 total attacks per realm. Normal mode allows 1 attack per territory. Ties favor the defender.'
      :state.attackMode==='moderate'
      ?'Moderate mode: each realm can make up to 3 total attacks per turn. Each territory fades after attacking once. Only neighboring enemies are valid.'
      :'Each territory can attack once per turn. Only shared borders and marked sea routes are valid. Ties favor the defender. Alliances last 3 turns; ceasefires last 1.'
  if(rules&&state.strengthsOn)rules.textContent+=' Strengths active: successful attacks improve ⚔ attack strength; successful defense improves 🛡 defense strength, capped at +3.'
}
function updateStrengthButtons(){
  const label=`Strengths: ${state.strengthsOn?'On':'Off'}`
  const button=$('#toggle-strengths');if(button){button.textContent=label;button.classList.toggle('active',state.strengthsOn);button.setAttribute('aria-pressed',String(state.strengthsOn))}
  const setup=$('#setup-strengths');if(setup){setup.textContent=label;setup.classList.toggle('active',state.strengthsOn);setup.setAttribute('aria-pressed',String(state.strengthsOn))}
}
function updateStrengthView(){state.strengthView??='off';const select=$('#strength-view');if(select){select.disabled=!state.strengthsOn;select.value=state.strengthsOn?state.strengthView:'off'}}
function updateCaptureAttackButtons(){
  const label=`New capture attack: ${state.captureAttackOn?'On':'Off'}`
  const button=$('#toggle-capture-attack');if(button){button.textContent=label;button.classList.toggle('active',state.captureAttackOn);button.setAttribute('aria-pressed',String(state.captureAttackOn))}
  const setup=$('#setup-capture-attack');if(setup){setup.textContent=label;setup.classList.toggle('active',state.captureAttackOn);setup.setAttribute('aria-pressed',String(state.captureAttackOn))}
}
function updateRebelButtons(){
  const label=`Rebels: ${state.rebelsOn?'On':'Off'}`
  const button=$('#toggle-rebels');if(button){button.textContent=label;button.classList.toggle('active',state.rebelsOn);button.setAttribute('aria-pressed',String(state.rebelsOn))}
  const setup=$('#setup-rebels');if(setup){setup.textContent=label;setup.classList.toggle('active',state.rebelsOn);setup.setAttribute('aria-pressed',String(state.rebelsOn))}
}
function updateNuclearButton(){const button=$('#setup-nuclear');if(button){button.textContent=`Nuclear bombs: ${state.nuclearOn?'On':'Off'}`;button.classList.toggle('active',state.nuclearOn);button.setAttribute('aria-pressed',String(state.nuclearOn))}}
function updateFogButton(){const label=`Fog of war: ${state.fogOfWar?'On':'Off'}`;const button=$('#toggle-fog');if(button){button.textContent=label;button.classList.toggle('active',state.fogOfWar);button.setAttribute('aria-pressed',String(state.fogOfWar))}const setup=$('#setup-fog');if(setup){setup.textContent=label;setup.classList.toggle('active',state.fogOfWar);setup.setAttribute('aria-pressed',String(state.fogOfWar))}}
function ensurePlayerLimitOptions(){if(state.phase!=='setup')return;const select=$('#total');if(!select)return;if(window.MultiSync?.active&&!select.querySelector('option[value="2"]'))select.insertAdjacentHTML('afterbegin','<option value="2">2 players</option>');for(let count=21;count<=33;count++){if(!select.querySelector(`option[value="${count}"]`))select.insertAdjacentHTML('beforeend',`<option value="${count}">${count} players</option>`)}select.value=String(state.playerCount)}
document.addEventListener('change',event=>{if(event.target?.id==='total')setTimeout(ensurePlayerLimitOptions,0)})
function updateAllianceButtons(){
  const label=`Alliances: ${state.alliancesOn?'On':'Off'}`
  const button=$('#toggle-alliances');if(button){button.textContent=label;button.classList.toggle('active',state.alliancesOn);button.setAttribute('aria-pressed',String(state.alliancesOn))}
  const setup=$('#setup-alliances');if(setup){setup.textContent=label;setup.classList.toggle('active',state.alliancesOn);setup.setAttribute('aria-pressed',String(state.alliancesOn))}
}
function updateAutoRejectButton(){const button=$('#toggle-auto-reject');if(button){button.textContent=`Auto-reject offers: ${state.autoRejectOffers?'On':'Off'}`;button.classList.toggle('active',state.autoRejectOffers);button.setAttribute('aria-pressed',String(state.autoRejectOffers))}}
function updatePauseButton(){const button=$('#toggle-pause-ai');if(button){button.textContent=state.paused?'Resume AI':'Pause AI';button.classList.toggle('active',state.paused);button.setAttribute('aria-pressed',String(state.paused))}}
function multiplayerSettingAllowed(){return !window.MultiSync?.active||(window.MultiSync.isHost&&state.phase==='setup')}

function attackLimit(){return state.attackMode==='moderate'?3:Infinity}
function canAttack(territory){return territory.attacks<1&&(state.attackMode!=='moderate'||(state.attacksThisTurn[territory.owner]||0)<attackLimit())}
function lastStandDefense(territory){if(territory.owner===null)return 0;if(state.territories.filter(t=>t.owner===territory.owner).length!==1)return 0;const base=state.strengthsOn?territory.defenseStrength||0:0;return Math.max(0,3-base)}
function hasAvailableAttack(playerId){return state.territories.some(source=>source.owner===playerId&&canAttack(source)&&source.neighbors.some(id=>{const target=state.territories.find(t=>t.id===id);return target&&target.owner!==playerId&&!isDiplomacyProtected(playerId,target.owner)}))}

async function toggleMusic() {
  state.musicOn=!state.musicOn
  const change=++musicChange
  updateMusicButtons()
  if(state.musicOn){
    if(change!==musicChange||!state.musicOn)return
    await startSelectedMusic()
    if(state.phase!=='setup')state.message='Campaign music started.'
  } else {
    await stopCampaignMusic()
    stopWarTrack()
  }
  if(change!==musicChange)return
  updateMusicButtons()
  if(state.phase!=='setup')$('#message').textContent=state.message
}

function render() {
  $('#territory-total').textContent = `${state.territories.length} territories`
  $('#phase-label').textContent = state.phase==='claim'?'CLAIMING ERA':state.phase==='war'?`TURN ${state.turn+1}`:'THE OLD WORLD'
  $('#message').textContent = state.phase==='setup'?'Awaiting commanders':state.phase==='gameover'?'Campaign complete':state.message
  const fastButton=$('#toggle-fast-ai');if(fastButton){fastButton.classList.toggle('active',state.fastAI);fastButton.setAttribute('aria-pressed',String(state.fastAI))}
  updateHardModeButtons()
  updateStrengthButtons()
  updateStrengthView()
  updateCaptureAttackButtons()
  updateRebelButtons()
  updateNuclearButton()
  updateFogButton()
  updateAllianceButtons()
  updateAutoRejectButton()
  updatePauseButton()
  updateMusicButtons()
  const mapWrap=document.querySelector('.map-wrap'),nuclearAlert=$('#nuclear-alert')
  if(mapWrap)mapWrap.classList.toggle('nuclear-shock',Boolean(state.nuclearStrike))
  if(nuclearAlert){nuclearAlert.classList.toggle('active',Boolean(state.nuclearStrike));nuclearAlert.innerHTML=state.nuclearStrike?`<strong>☢ NUCLEAR STRIKE</strong><span>${escapeHtml(state.nuclearStrike.player)} · ${state.nuclearStrike.territories.map(escapeHtml).join(' · ')}</span>`:''}
  const quick=$('#player-quick'),currentPlayer=state.players[state.turn],currentAlliances=currentPlayer?state.alliances.filter(pact=>pact.key.split(':').map(Number).includes(currentPlayer.id)&&pact.until>state.roundCount).map(pact=>{const otherId=pact.key.split(':').map(Number).find(id=>id!==currentPlayer.id);return state.players.find(player=>player.id===otherId)}).filter(Boolean):[]
  const localTurn=Boolean(!window.MultiSync?.active||window.MultiSync.playerIndex===state.turn)
  if(quick){quick.innerHTML=state.phase==='war'&&currentPlayer?.isHuman&&localTurn?`<button class="primary panel-end-turn" id="panel-end-turn">End turn</button><label class="panel-alliance-select">Alliances<select id="panel-allies"><option value="">${currentAlliances.length?'Select allied country':'No active alliances'}</option>${currentAlliances.map(player=>`<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('')}</select></label>`:'';const endButton=$('#panel-end-turn');if(endButton)endButton.onclick=endTurn;const allies=$('#panel-allies');if(allies)allies.onchange=event=>{if(event.target.value){state.diplomacyTarget=Number(event.target.value);state.message=`${state.players[state.diplomacyTarget].name} selected.`;render()}}}
  const playerOrder=[...state.players].filter(player=>!state.fogOfWar||!window.MultiSync?.active||player.id===window.MultiSync.playerIndex).sort((a,b)=>Number(a.eliminated)-Number(b.eliminated)||state.territories.filter(t=>t.owner===b.id).length-state.territories.filter(t=>t.owner===a.id).length||a.id-b.id)
  $('#players').innerHTML = playerOrder.length ? playerOrder.map(p=>`
    <div class="player ${state.phase==='war'&&p.id===state.players[state.turn]?.id?'active':''} ${p.eliminated?'eliminated':''} ${state.diplomacyTarget===p.id?'diplomacy-target':''}" data-player-id="${p.id}" title="${state.phase==='war'&&p.id!==state.players[state.turn]?.id?'Select for diplomacy':'Your realm'}${(p.killedCountries||[]).length?` · Defeated: ${p.killedCountries.map(escapeHtml).join(', ')}`:''}"><span class="swatch" style="background:${p.color}"></span><div><b>${escapeHtml(p.name)}</b><small>${p.eliminated?'Eliminated':p.isHuman?'Human player':'AI player'}${state.phase==='war'&&p.id!==state.players[state.turn]?.id?agreementStatus(p.id):''}</small><small>☠ ${p.kills||0} · ☢ used ${p.nuclearUsed||0} · available ${p.nuclearBombs||0}</small></div><strong>${state.territories.filter(t=>t.owner===p.id).length}</strong></div>`).join('') : '<p class="empty">The players will appear here.</p>'
  document.querySelectorAll('.player[data-player-id]').forEach(row=>row.onclick=()=>{
    const targetId=Number(row.dataset.playerId), current=state.players[state.turn]
    if(state.phase==='war'&&current?.isHuman&&targetId!==current.id&&!state.players.find(p=>p.id===targetId)?.eliminated){state.diplomacyTarget=targetId;state.message=`${state.players[targetId].name} selected for diplomacy.`;render()}
  })
  document.querySelectorAll('.country').forEach(el => {
    const t=state.territories.find(x=>x.id===el.dataset.id), owner=state.players.find(p=>p.id===t.owner)
    const heat=['#d7d1bd','#f0d36a','#e9954f','#d9574f'],viewValue=state.strengthView==='attack'?(t.attackStrength||0):state.strengthView==='defense'?(t.defenseStrength||0):0
    const visible=isTerritoryVisible(t),fogged=state.fogOfWar&&!visible
    el.style.fill = fogged?'#1b2523':state.strengthsOn&&state.strengthView!=='off'&&state.strengthView!=='combined'?heat[Math.min(3,viewValue)]:(owner?.color || '#d7d1bd')
    const source=state.territories.find(x=>x.id===state.selected)
    const currentId=state.players[state.turn]?.id
    const pactClass=hasAlliance(currentId,t.owner)?'allied-border':hasCeasefire(currentId,t.owner)?'ceasefire-border':''
    el.style.pointerEvents=fogged?'none':'auto'
    el.setAttribute('class',`country ${t.id===state.selected?'selected':''} ${source?.neighbors.includes(t.id)&&t.owner!==currentId?'target':''} ${!canAttack(t)?'spent':''} ${t.rebel?'rebel':''} ${pactClass} ${fogged?'fogged':''}`)
    const pactLabel=hasAlliance(currentId,t.owner)?' · 🤝 Allied':hasCeasefire(currentId,t.owner)?' · 🕊 Ceasefire':''
    const strengthLabel=state.strengthsOn?` · ⚔ +${t.attackStrength||0} 🛡 +${t.defenseStrength||0}`:''
    el.querySelector('title').textContent=`${t.name} — ${t.rebel?'Rebels':owner?.name||'Unclaimed'}${pactLabel}${strengthLabel}`
  })
  const fireLayer=$('#rebel-fires');if(fireLayer){fireLayer.innerHTML='';state.territories.filter(t=>t.rebel&&isTerritoryVisible(t)).forEach(t=>{const base=[...document.querySelectorAll('.country')].find(el=>el.dataset.id===t.id);if(!base)return;const fire=document.createElementNS('http://www.w3.org/2000/svg','path');fire.setAttribute('d',base.getAttribute('d'));fire.setAttribute('class','rebel-fire-land');fire.dataset.id=t.id;fire.setAttribute('aria-label',`${t.name} is in rebellion`);fireLayer.appendChild(fire)})}
  renderActions(); renderModal(); ensurePlayerLimitOptions(); renderDiplomacyOffers(); updateLabels(); updatePlayerLabels()
  const currentPlayerForMobile=state.players[state.turn], mobileTurn=document.querySelector('#mobile-turn-action'),mobileCanEnd=Boolean(state.phase==='war'&&currentPlayerForMobile?.isHuman&&(!window.MultiSync?.active||window.MultiSync.playerIndex===state.turn)),mobileTargets=mobileCanEnd?diplomacyTargets(currentPlayerForMobile.id):[],mobileSeconds=Math.max(0,Math.ceil((state.turnDeadline-Date.now())/1000))
  if(mobileTurn){mobileTurn.innerHTML=state.phase==='war'&&currentPlayerForMobile?`<span data-turn-countdown>${escapeHtml(currentPlayerForMobile.name)} · ${mobileSeconds}s</span>${mobileCanEnd?'<button class="primary" id="mobile-end-turn">End turn</button>':''}${mobileCanEnd&&mobileTargets.length?`<select id="mobile-diplomacy-target" aria-label="Diplomacy target">${mobileTargets.map(target=>`<option value="${target.id}">${escapeHtml(target.name)}</option>`).join('')}</select><button class="secondary" id="mobile-alliance" ${state.alliancesOn?'':'disabled'}>Alliance</button><button class="secondary" id="mobile-ceasefire">Ceasefire</button>`:''}`:'';if(mobileCanEnd){$('#mobile-end-turn').onclick=endTurn;$('#mobile-alliance')?.addEventListener('click',()=>requestPact('alliance',$('#mobile-diplomacy-target').value));$('#mobile-ceasefire')?.addEventListener('click',()=>requestPact('ceasefire',$('#mobile-diplomacy-target').value))}}
  renderPacts()
  renderAttackArrow()
  renderStrengthBadges()
  const controls=$('.map-controls'),hideButton=$('#toggle-controls'),showButton=$('#show-controls'),shell=$('.game-shell'),panelButton=$('#toggle-panel'),showPanel=$('#show-panel');if(controls)controls.classList.toggle('hidden',state.controlsHidden);if(hideButton)hideButton.setAttribute('aria-pressed',String(state.controlsHidden));if(showButton)showButton.classList.toggle('visible',state.controlsHidden);if(shell)shell.classList.toggle('panel-hidden',state.panelHidden);if(panelButton){panelButton.textContent=state.panelHidden?'Show panel':'Hide panel';panelButton.setAttribute('aria-pressed',String(state.panelHidden))}if(showPanel)showPanel.classList.toggle('visible',state.panelHidden)
  document.querySelector('main')?.classList.toggle('multiplayer-in-game',Boolean(window.MultiSync?.active&&state.phase==='war'))
  window.dispatchEvent(new CustomEvent('borderline-rendered'))
  if(window.MultiSync?.active&&window.MultiSync.isHost&&state.phase==='war'&&isMultiplayerAI(state.players[state.turn])&&!state.aiTimer)setTimeout(runAI,0)
}

function renderPacts(){
  const panel=$('#diplomacy-panel');if(!panel)return
  const button=$('#toggle-pacts');if(button){button.classList.toggle('active',state.showPacts);button.setAttribute('aria-pressed',String(state.showPacts))}
  const viewerId=window.MultiSync?.active?window.MultiSync.playerIndex:null
  const humanIds=new Set(viewerId===null?state.players.filter(player=>player.isHuman&&!player.eliminated).map(player=>player.id):[viewerId]),pacts=[
    ...state.alliances.filter(pact=>pact.until>state.roundCount).map(pact=>({...pact,type:'Alliance'})),
    ...state.ceasefires.filter(pact=>pact.until>state.roundCount).map(pact=>({...pact,type:'Ceasefire'}))
  ].map(pact=>{const ids=pact.key.split(':').map(Number),humanId=ids.find(id=>humanIds.has(id)),otherId=ids.find(id=>id!==humanId),human=state.players.find(player=>player.id===humanId),other=state.players.find(player=>player.id===otherId);return {...pact,human,other}}).filter(pact=>pact.human&&pact.other&&!pact.other.eliminated)
  const renewals=state.pendingRenewals.map(pact=>{const ids=pact.key.split(':').map(Number),humanId=ids.find(id=>humanIds.has(id)),otherId=ids.find(id=>id!==humanId),human=state.players.find(player=>player.id===humanId),other=state.players.find(player=>player.id===otherId);return {...pact,displayType:pact.type==='alliance'?'Alliance':'Ceasefire',human,other}}).filter(pact=>pact.human&&pact.other&&!pact.other.eliminated)
  panel.classList.toggle('open',state.showPacts)
  panel.innerHTML=state.showPacts&&(pacts.length||renewals.length)?`<div class="pacts-card"><b>ACTIVE PACTS</b>${pacts.length?pacts.map(pact=>`<div class="pact-line"><span>${pact.type==='Alliance'?'🤝':'🕊'} ${escapeHtml(pact.other.name)}</span><small>${Math.max(0,pact.until-state.roundCount-1)} rounds left</small></div>`).join(''):''}${renewals.length?`<b class="renew-title">RENEWAL REQUESTS</b>${renewals.map(pact=>`<div class="pact-line"><span>${pact.displayType==='Alliance'?'🤝':'🕊'} ${escapeHtml(pact.other.name)}</span><button class="secondary renew-pact" data-renew-key="${pact.key}" data-renew-type="${pact.displayType}">Renew</button></div>`).join('')}`:''}</div>`:''
  panel.querySelectorAll('.renew-pact').forEach(button=>button.onclick=()=>renewPact(button.dataset.renewType,button.dataset.renewKey))
}

function renderAttackArrow(){
  const layer=$('#attack-arrows');if(!layer)return
  layer.innerHTML='';const animation=state.attackAnimation
  if(!animation||animation.until<Date.now())return
  const source=state.territories.find(t=>t.id===animation.sourceId),target=state.territories.find(t=>t.id===animation.targetId)
  if(!source?.mapCenter||!target?.mapCenter)return
  if(state.fogOfWar&&(!isTerritoryVisible(source)||!isTerritoryVisible(target)))return
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');line.setAttribute('x1',source.mapCenter[0]);line.setAttribute('y1',source.mapCenter[1]);line.setAttribute('x2',target.mapCenter[0]);line.setAttribute('y2',target.mapCenter[1]);line.setAttribute('class','attack-arrow');line.setAttribute('marker-end','url(#attack-arrowhead)');layer.appendChild(line)
}
function renderStrengthBadges(){
  const layer=$('#strength-badges');if(!layer)return
  layer.innerHTML='';if(!state.strengthsOn||state.strengthView!=='combined')return
  state.territories.forEach(t=>{if(!t.mapCenter||!isTerritoryVisible(t))return;const label=document.createElementNS('http://www.w3.org/2000/svg','text');label.setAttribute('x',t.mapCenter[0]);label.setAttribute('y',t.mapCenter[1]);label.setAttribute('class','strength-badge');label.textContent=`⚔${t.attackStrength||0}·🛡${(t.defenseStrength||0)+lastStandDefense(t)}`;layer.appendChild(label)})
}

function isTerritoryVisible(territory){
  if(!state.fogOfWar||state.phase==='setup'||state.phase==='claim')return true
  const viewerId=window.MultiSync?.active?window.MultiSync.playerIndex:null
  const humanIds=new Set(viewerId===null?state.players.filter(player=>player.isHuman&&!player.eliminated).map(player=>player.id):[viewerId])
  if(humanIds.has(territory.owner))return true
  return territory.neighbors.some(id=>humanIds.has(state.territories.find(t=>t.id===id)?.owner))
}

function pactKey(first,second){return [first,second].sort((a,b)=>a-b).join(':')}
function pactActive(list,first,second){return list.some(pact=>pact.key===pactKey(first,second)&&pact.until>state.roundCount)}
function hasAlliance(first,second){return pactActive(state.alliances,first,second)}
function hasCeasefire(first,second){return pactActive(state.ceasefires,first,second)}
function isDiplomacyProtected(first,second){return first!==null&&second!==null&&(hasAlliance(first,second)||hasCeasefire(first,second))}
function expireDiplomacy(){
  const expired=[...state.alliances.filter(pact=>pact.until<=state.roundCount).map(pact=>({...pact,type:'alliance'})),...state.ceasefires.filter(pact=>pact.until<=state.roundCount).map(pact=>({...pact,type:'ceasefire'}))]
  state.pendingRenewals.push(...expired.filter(pact=>!state.pendingRenewals.some(existing=>existing.key===pact.key)))
  state.alliances=state.alliances.filter(pact=>pact.until>state.roundCount);state.ceasefires=state.ceasefires.filter(pact=>pact.until>state.roundCount);state.diplomacyOffers=state.diplomacyOffers.filter(offer=>offer.until>state.roundCount&&state.players.some(p=>p.id===offer.from&&!p.eliminated)&&state.players.some(p=>p.id===offer.to&&!p.eliminated))
}
function allianceCount(playerId){return state.alliances.filter(pact=>pact.key.split(':').map(Number).includes(playerId)&&pact.until>state.roundCount).length}
function pactCount(playerId){return state.alliances.filter(pact=>pact.key.split(':').map(Number).includes(playerId)&&pact.until>state.roundCount).length+state.ceasefires.filter(pact=>pact.key.split(':').map(Number).includes(playerId)&&pact.until>state.roundCount).length}
function attackedThisRound(first,second){return Boolean(state.diplomacyAggression[pactKey(first,second)]===state.roundCount)}
function agreementStatus(playerId){
  const current=state.players[state.turn]?.id
  if(current===undefined||playerId===current)return ''
  if(hasAlliance(current,playerId))return ' · 🤝 Allied'
  if(hasCeasefire(current,playerId))return ' · 🕊 Ceasefire'
  return ''
}
function playersShareBorder(first,second){
  return state.territories.some(t=>t.owner===first&&t.neighbors.some(id=>state.territories.find(other=>other.id===id)?.owner===second))
}
function diplomacyTargets(playerId){
  return state.players.filter(target=>target.id!==playerId&&target.id!==null&&!target.eliminated)
}
function formPact(type,first,second){
  if(first===null||second===null||Number(first)===Number(second))return false
  if(type==='alliance'&&!state.alliancesOn)return false
  if(attackedThisRound(first,second))return false
  if(pactCount(first)>=2||pactCount(second)>=2)return false
  const list=type==='alliance'?state.alliances:state.ceasefires
  const other=type==='alliance'?state.ceasefires:state.alliances
  const key=pactKey(first,second)
  other.splice(0,other.length,...other.filter(pact=>pact.key!==key))
  list.splice(0,list.length,...list.filter(pact=>pact.key!==key))
  // Keep the agreement through the current round, then for its promised full rounds.
  list.push({key,until:state.roundCount+(type==='alliance'?4:2)})
  state.pendingRenewals=state.pendingRenewals.filter(pact=>pact.key!==key)
  return true
}
function renewPact(type,key){const ids=key.split(':').map(Number);if(window.MultiSync?.active&&!window.MultiSync.isHost&&!window.MultiSync.applyingRemote){if(!ids.includes(window.MultiSync.playerIndex))return;window.MultiSync.sendAction({kind:'pact-renew',pactType:type,key});return}if(formPact(type==='Alliance'?'alliance':'ceasefire',ids[0],ids[1])){state.message='Pact renewed.';render()}}
function requestPact(type,targetId){
  const current=state.players[state.turn]
  const target=state.players.find(player=>player.id===Number(targetId))
  if(!current||!target||current.id===target.id){state.message='Choose another realm for diplomacy.';render();return}
  if(window.MultiSync?.active&&!window.MultiSync.isHost&&!window.MultiSync.applyingRemote){window.MultiSync.sendAction({kind:'pact-request',pactType:type,targetId:Number(targetId)});state.message=`Diplomacy offer sent to ${target.name}.`;render();return}
  if(hasAlliance(current.id,target.id)||hasCeasefire(current.id,target.id)){state.message=`${target.name} already has an agreement with you.`;render();return}
  if(attackedThisRound(current.id,target.id)){state.message=`${target.name} rejects diplomacy because you attacked this realm this round.`;render();return}
  if(!target.isHuman&&!hasAvailableAttack(target.id)){state.message=`${target.name} has no available attacks and will not accept diplomacy now.`;render();return}
  const sentKey=`${state.roundCount}:${current.id}:${target.id}:${type}`
  if(state.diplomacySent[sentKey]){state.message=`You already sent that offer to ${target.name} this round.`;render();return}
  state.diplomacySent[sentKey]=true
  if(pactCount(current.id)>=2){state.message='Your realm already has the maximum of 2 diplomatic agreements.';render();return}
  const chance=type==='alliance'?.72:.84
  if(target.isHuman){if(state.autoRejectOffers){state.message=`${target.name} is auto-rejecting offers.`;render();return}if(!state.diplomacyOffers.some(offer=>offer.from===current.id&&offer.to===target.id)){state.diplomacyOffers.push({from:current.id,to:target.id,type,until:state.roundCount+4});state.message=`${type} offer sent to ${target.name}.`}render();return}
  if(Math.random()<chance){if(formPact(type,current.id,target.id))state.message=`${target.name} accepted your ${type}.`;else state.message=`${target.name} cannot accept more alliances.`}
  else state.message=`${target.name} rejected your ${type}.`
  render()
}
function acceptDiplomacyOffer(index,actorId=null){
  const offer=state.diplomacyOffers[index], localId=actorId??(window.MultiSync?.active?window.MultiSync.playerIndex:state.turn), current=state.players[localId]
  if(!offer||!current||offer.to!==current.id)return
  if(window.MultiSync?.active&&!window.MultiSync.isHost&&!window.MultiSync.applyingRemote){window.MultiSync.sendAction({kind:'pact-response',response:'accept',offerKey:`${offer.from}:${offer.to}:${offer.type}`});return}
  if(attackedThisRound(offer.from,offer.to)){state.diplomacyOffers.splice(index,1);state.message='This offer is rejected because an attack occurred between your realms this round.';render();return}
  if(pactCount(current.id)>=2||pactCount(offer.from)>=2){state.diplomacyOffers.splice(index,1);state.message='This pact cannot be formed because one realm already has 2 diplomatic agreements.';render();return}
  formPact(offer.type,offer.from,offer.to);state.diplomacyOffers.splice(index,1);state.message=`You accepted ${state.players[offer.from].name}'s ${offer.type}.`;render()
}
function rejectDiplomacyOffer(index,actorId=null){
  const offer=state.diplomacyOffers[index], localId=actorId??(window.MultiSync?.active?window.MultiSync.playerIndex:state.turn), current=state.players[localId]
  if(!offer||!current||offer.to!==current.id)return
  if(window.MultiSync?.active&&!window.MultiSync.isHost&&!window.MultiSync.applyingRemote){window.MultiSync.sendAction({kind:'pact-response',response:'reject',offerKey:`${offer.from}:${offer.to}:${offer.type}`});return}
  state.diplomacyOffers.splice(index,1);state.message=`You rejected ${state.players[offer.from].name}'s ${offer.type}.`;render()
}
function renderDiplomacyOffers(){
  const box=$('#offer-modal');if(!box)return
  const localId=window.MultiSync?.active?window.MultiSync.playerIndex:state.turn
  const current=state.players[localId], offers=state.phase==='war'&&current?.isHuman?state.diplomacyOffers.filter(offer=>offer.to===current.id):[]
  if(!offers.length){box.innerHTML='';return}
  box.innerHTML=`<div class="offer-backdrop"><div class="offer-card"><span class="eyebrow">INCOMING DIPLOMACY</span><h2>${offers.length>1?'AI REALMS ARE MAKING OFFERS':'AN AI REALM IS MAKING AN OFFER'}</h2>${offers.map(offer=>{const offerIndex=state.diplomacyOffers.indexOf(offer);return `<div class="offer-row"><p><b>${escapeHtml(state.players.find(player=>player.id===offer.from)?.name||'AI realm')}</b> proposes a <strong>${offer.type}</strong>.</p><div class="offer-actions"><button class="secondary" data-offer-accept="${offerIndex}">Accept</button><button class="secondary" data-offer-reject="${offerIndex}">Reject</button></div></div>`}).join('')}</div></div>`
  box.querySelectorAll('[data-offer-accept]').forEach(button=>button.onclick=()=>acceptDiplomacyOffer(Number(button.dataset.offerAccept)))
  box.querySelectorAll('[data-offer-reject]').forEach(button=>button.onclick=()=>rejectDiplomacyOffer(Number(button.dataset.offerReject)))
}
function aiDiplomacy(player){
  if(Math.random()>.2)return
  if(!hasAvailableAttack(player.id))return
  const targets=diplomacyTargets(player.id).filter(target=>pactCount(player.id)<2&&pactCount(target.id)<2&&!isDiplomacyProtected(player.id,target.id)&&!attackedThisRound(player.id,target.id)&&(!state.diplomacySent[`${state.roundCount}:${player.id}:${target.id}:alliance`]||!state.diplomacySent[`${state.roundCount}:${player.id}:${target.id}:ceasefire`]))
  if(!targets.length)return
  const target=targets.sort((a,b)=>state.territories.filter(t=>t.owner===b.id).length-state.territories.filter(t=>t.owner===a.id).length)[0]
  const type=state.alliancesOn&&Math.random()<.7?'alliance':'ceasefire'
  const sentKey=`${state.roundCount}:${player.id}:${target.id}:${type}`
  if(state.diplomacySent[sentKey])return
  state.diplomacySent[sentKey]=true
  if(target.isHuman){if(state.autoRejectOffers)return;if(!state.diplomacyOffers.some(offer=>offer.from===player.id&&offer.to===target.id)){state.diplomacyOffers.push({from:player.id,to:target.id,type,until:state.roundCount+4})}return}
  formPact(type,player.id,target.id)
}

function renderActions() {
  const box=$('#actions')
  if(state.phase==='claim') {
    box.innerHTML=`<div class="action-card"><label>Roll for territory</label><div class="dice-row">${state.players.map((p,i)=>`<div class="die-wrap"><span class="die">${state.dice[i]??'—'}</span><small>${p.name.replace('Commander ','P')}</small></div>`).join('')}</div><button class="primary" id="roll" ${state.claimWinner!==null?'disabled':''}>${state.claimWinner===null?'Roll all dice':state.players[state.claimWinner].isHuman?'Choose a country':'AI is choosing…'}</button></div>`
    $('#roll').onclick=rollForClaim
  } else if(state.phase==='war') {
    const p=state.players[state.turn]
    const content=state.battle?`<div class="battle-result"><div><small>ATTACK${state.strengthsOn?' · ⚔':''}</small><b>${state.battle.attackerRoll}</b></div><span>vs</span><div><small>DEFEND${state.strengthsOn?' · 🛡':''}</small><b>${state.battle.defenderRoll}</b></div></div>`:`<p>${p?.isHuman?(state.attackMode==='hard'?'Use each neighboring border territory once; End turn when ready.':state.attackMode==='moderate'?'Your realm has up to 3 attacks total this turn.':'Select your country, then choose a highlighted neighboring enemy.'):'The AI is considering its borders…'}</p>`
    const targets=p?.isHuman?diplomacyTargets(p.id):[]
    const selectedTarget=targets.find(target=>target.id===state.diplomacyTarget)?.id??targets[0]?.id
    if(selectedTarget!==undefined)state.diplomacyTarget=selectedTarget
    const diplomacy=p?.isHuman?`<div class="action-card diplomacy-card"><label>Diplomacy · Click a country or choose below</label>${targets.length?`<select id="diplomacy-target">${targets.map(target=>`<option value="${target.id}" ${target.id===selectedTarget?'selected':''}>${escapeHtml(target.name)}${agreementStatus(target.id)}</option>`).join('')}</select><div class="diplomacy-buttons"><button id="make-alliance" class="secondary" ${state.alliancesOn?'':'disabled'}>Alliance · 3 turns</button><button id="make-ceasefire" class="secondary">Ceasefire · 1 turn</button></div>`:'<p>No active realms are available.</p>'}</div>`:''
    const nuclearAction=p?.isHuman&&state.nuclearPending===p.id?'<div class="action-card nuclear-prompt"><label>☢ Nuclear bomb ready</label><p>Click any enemy or rebel territory on the map. The connected blast group will be chosen automatically.</p></div>':''
    const canEndTurn=Boolean(p?.isHuman&&(!window.MultiSync?.active||window.MultiSync.playerIndex===state.turn)),seconds=Math.max(0,Math.ceil((state.turnDeadline-Date.now())/1000))
    box.innerHTML=`${diplomacy}${nuclearAction}<div class="action-card"><label>Battle orders</label>${content}${canEndTurn?`<div class="turn-countdown" data-turn-countdown>${seconds}s remaining</div><button class="primary" id="end-turn">End turn</button>`:''}</div>`
    if(canEndTurn) $('#end-turn').onclick=endTurn
    if(p?.isHuman&&targets.length){$('#diplomacy-target').onchange=e=>{state.diplomacyTarget=Number(e.target.value)};$('#make-alliance').onclick=()=>requestPact('alliance',$('#diplomacy-target').value);$('#make-ceasefire').onclick=()=>requestPact('ceasefire',$('#diplomacy-target').value)}
  } else box.innerHTML=''
}

function renderModal() {
  const modal=$('#modal')
  if(state.phase==='setup') modal.innerHTML=`<div class="modal-backdrop"><div class="setup-card"><span class="eyebrow">NEW CAMPAIGN</span><h1>Claim the old world.</h1><p>Each player starts with one connected realm. Hold your borders and conquer the continent.</p><div class="setup-grid"><label>Human players<select id="humans"><option value="1">1 player</option><option value="2">2 players</option><option value="3">3 players</option></select></label><label>Total players<select id="total">${Array.from({length:18},(_,i)=>i+3).map(count=>`<option value="${count}">${count} players</option>`).join('')}</select></label></div><div class="name-editor"><span>REALM NAMES · OPTIONAL</span>${Array.from({length:state.playerCount},(_,i)=>`<label><i style="background:${COLORS[i%COLORS.length]}"></i><small>${i<state.humanCount?'Human':'AI'}</small><input id="player-name-${i}" value="${escapeHtml(state.playerNames[i]||'')}" placeholder="Automatic by location" maxlength="24" /></label>`).join('')}</div><button class="music-start ${state.musicOn?'active':''}" id="setup-music" aria-pressed="${state.musicOn}">♫ Music: ${state.musicOn?'On':'Off'}</button><label class="music-choice">Music style<select id="setup-music-style"><option value="campaign">Campaign</option><option value="tension">Battle tension</option><option value="march">War march</option><option value="shadow">Relaxing ambient</option><option value="calm">Quiet command</option></select></label><button class="music-start ${state.strengthsOn?'active':''}" id="setup-strengths" aria-pressed="${state.strengthsOn}">Strengths: ${state.strengthsOn?'On':'Off'}</button><button class="music-start ${state.captureAttackOn?'active':''}" id="setup-capture-attack" aria-pressed="${state.captureAttackOn}">New capture attack: ${state.captureAttackOn?'On':'Off'}</button><button class="music-start ${state.rebelsOn?'active':''}" id="setup-rebels" aria-pressed="${state.rebelsOn}">Rebels: ${state.rebelsOn?'On':'Off'}</button><button class="music-start ${state.fogOfWar?'active':''}" id="setup-fog" aria-pressed="${state.fogOfWar}">Fog of war: ${state.fogOfWar?'On':'Off'}</button><button class="music-start ${state.nuclearOn?'active':''}" id="setup-nuclear" aria-pressed="${state.nuclearOn}">Nuclear bombs: ${state.nuclearOn?'On':'Off'}</button><label class="music-choice">Nuclear targeting<select id="nuclear-targeting"><option value="random">Random connected strike</option><option value="most">Country battled most</option><option value="manual">Choose starting region</option></select></label><button class="music-start ${state.alliancesOn?'active':''}" id="setup-alliances" aria-pressed="${state.alliancesOn}">Alliances: ${state.alliancesOn?'On':'Off'}</button><button class="music-start ${state.attackMode!=='normal'?'active':''}" id="setup-hard-mode" aria-pressed="${state.attackMode!=='normal'}">Mode: ${state.attackMode==='moderate'?'Moderate · 3 total':state.attackMode==='hard'?'Hard · all territories':'Normal · 1 per territory'}</button><button class="primary large" id="begin">Begin campaign <span>→</span></button><small>3–33 players · Empty names are generated by location</small></div></div>`
  else if(state.phase==='gameover') modal.innerHTML=`<div class="modal-backdrop"><div class="setup-card victory"><span class="eyebrow">TOTAL VICTORY</span><h1>${state.message}</h1><button class="primary large" id="again">Play again</button></div></div>`
  else { modal.innerHTML=''; return }
  if(state.phase==='setup') { $('#humans').value=state.humanCount; $('#total').value=state.playerCount; $('#setup-music-style').value=state.musicStyle; $('#nuclear-targeting').value=state.nuclearTargeting; $('#humans').onchange=e=>{state.humanCount=+e.target.value;renderModal()}; $('#total').onchange=e=>{state.playerCount=+e.target.value;renderModal()}; $('#setup-music-style').onchange=e=>{state.musicStyle=e.target.value}; $('#nuclear-targeting').onchange=e=>{state.nuclearTargeting=e.target.value}; Array.from({length:state.playerCount},(_,i)=>{$(`#player-name-${i}`).oninput=e=>state.playerNames[i]=e.target.value}); $('#setup-music').onclick=toggleMusic; $('#setup-strengths').onclick=toggleStrengths; $('#setup-capture-attack').onclick=toggleCaptureAttack; $('#setup-rebels').onclick=toggleRebels; $('#setup-fog').onclick=toggleFog; $('#setup-nuclear').onclick=toggleNuclear; $('#setup-alliances').onclick=toggleAlliances; $('#setup-hard-mode').onclick=toggleHardMode; $('#begin').onclick=()=>{if(window.MultiSync?.lobbyConfiguring){state.message='Return to the room lobby to start the campaign.';return}startGame()};if(window.MultiSync?.lobbyConfiguring)$('#begin').style.display='none' }
  else $('#again').onclick=()=>{if(window.MultiSync?.active){location.reload();return}state.phase='setup';render()}
}

function startGame() {
  const multiplayerSlots=window.MultiSync?.active?window.MultiSync.slotConfig:null
  state.players=Array.from({length:state.playerCount},(_,i)=>({id:i,name:multiplayerSlots?.[i]?.name||`Player ${i+1}`,color:COLORS[i%COLORS.length],isHuman:multiplayerSlots?multiplayerSlots[i]?.type==='human':i<state.humanCount,eliminated:false,kills:0,killedCountries:[],nuclearBombs:0,nuclearUsed:0}))
  assignConnectedRealms()
  assignRealmNames()
  if(window.MultiSync?.active)state.fastAI=true
  Object.assign(state,{phase:'war',turn:0,turnCount:0,roundCount:0,turnDeadline:Date.now()+60000,alliances:[],ceasefires:[],pendingRenewals:[],diplomacyTarget:null,diplomacyOffers:[],diplomacySent:{},diplomacyAggression:{},attacksThisTurn:{},battleCounts:{},nuclearPending:null,paused:false,showPacts:Boolean(window.MultiSync?.active),selected:null,claimWinner:null,dice:[],battle:null,nuclearStrike:null,message:turnMessage(state.players[0])}); render();startTurnClock();if(!state.players[0]?.isHuman)runAI()
}

function assignRealmNames() {
  const available=[...REALM_IDENTITIES]
  const unnamed=[]
  state.players.forEach((player,index)=>{
    const custom=state.playerNames[index].trim()
    if(custom){player.name=custom;return}
    const owned=largestLandComponent(player.id)
    const totalWeight=owned.reduce((sum,t)=>sum+Math.max(t.mapArea,1),0)
    const center=owned.reduce((point,t)=>{const weight=Math.max(t.mapArea,1);point[0]+=t.geoCenter[0]*weight;point[1]+=t.geoCenter[1]*weight;return point},[0,0]).map(value=>value/totalWeight)
    unnamed.push({player,center})
  })
  while(unnamed.length) {
    if(!available.length){const fallback=unnamed.shift();fallback.player.name=`Realm ${fallback.player.id+1}`;continue}
    let best
    unnamed.forEach(realm=>available.forEach(identity=>{
      const distance=Math.hypot((realm.center[0]-identity.point[0])*Math.cos(realm.center[1]*Math.PI/180),realm.center[1]-identity.point[1])
      if(!best||distance<best.distance)best={realm,identity,distance}
    }))
    best.realm.player.name=best.identity.name
    unnamed.splice(unnamed.indexOf(best.realm),1)
    available.splice(available.indexOf(best.identity),1)
  }
}

function mapDistance(first, second) {
  const a=d3.geoCentroid(first.feature), b=d3.geoCentroid(second.feature)
  const latitude=(a[1]+b[1])/2*Math.PI/180
  return Math.hypot((a[0]-b[0])*Math.cos(latitude),a[1]-b[1])
}

function assignConnectedRealms() {
  state.territories.forEach(t=>{t.owner=null;t.rebel=false;t.attacked=false;t.attacks=0;t.attackStrength=0;t.defenseStrength=0})
  const seeds=[state.territories[Math.floor(Math.random()*state.territories.length)]]
  while(seeds.length<state.players.length) {
    const available=state.territories.filter(t=>!seeds.includes(t))
    seeds.push(available.reduce((best,candidate) => {
      const candidateDistance=Math.min(...seeds.map(seed=>mapDistance(candidate,seed)))
      const bestDistance=Math.min(...seeds.map(seed=>mapDistance(best,seed)))
      return candidateDistance>bestDistance?candidate:best
    }))
  }
  seeds.forEach((seed,index)=>seed.owner=state.players[index].id)
  let remaining=state.territories.length-seeds.length
  while(remaining>0) {
    let progress=false
    const playerOrder=[...state.players].sort((a,b)=>state.territories.filter(t=>t.owner===a.id).length-state.territories.filter(t=>t.owner===b.id).length)
    for(const player of playerOrder) {
      const ownedIds=new Set(state.territories.filter(t=>t.owner===player.id).map(t=>t.id))
      const frontier=state.territories.filter(t=>t.owner===null&&t.neighbors.some(id=>ownedIds.has(id)))
      if(!frontier.length)continue
      frontier.sort((a,b)=>b.neighbors.filter(id=>state.territories.find(t=>t.id===id)?.owner===null).length-a.neighbors.filter(id=>state.territories.find(t=>t.id===id)?.owner===null).length)
      const bestChoices=frontier.slice(0,Math.min(3,frontier.length))
      bestChoices[Math.floor(Math.random()*bestChoices.length)].owner=player.id
      remaining--;progress=true
      if(remaining===0)break
    }
    if(!progress) {
      const territory=state.territories.find(t=>t.owner===null)
      const nearest=state.territories.filter(t=>t.owner!==null).reduce((best,candidate)=>mapDistance(territory,candidate)<mapDistance(territory,best)?candidate:best)
      territory.owner=nearest.owner;remaining--
    }
  }
}

function rollForClaim() {
  if(state.claimWinner!==null)return
  let results,winner
  do { results=state.players.map(roll); winner=results.indexOf(Math.max(...results)) } while(results.filter(v=>v===Math.max(...results)).length>1)
  state.dice=results; state.claimWinner=winner; state.message=`${state.players[winner].name} rolled highest and may claim one territory.`; render()
  if(!state.players[winner].isHuman) state.aiTimer=setTimeout(()=>claimForAI(winner),800)
}

function claimForAI(playerId) {
  const options=state.territories.filter(t=>t.owner===null), owned=state.territories.filter(t=>t.owner===playerId)
  const adjacent=options.filter(t=>owned.some(o=>o.neighbors.includes(t.id))), pool=adjacent.length?adjacent:options
  if(pool.length) finishClaim(pool[Math.floor(Math.random()*pool.length)].id,playerId)
}

function finishClaim(id,playerId) {
  const t=state.territories.find(x=>x.id===id); if(!t||t.owner!==null)return
  t.owner=playerId; state.claimWinner=null; state.dice=[]; state.selected=null
  if(state.territories.every(x=>x.owner!==null)){state.phase='war';state.turn=0;state.message=`${state.players[0].name} begins the first campaign turn.`;render();runAI()}
  else {state.message=`${state.players[playerId].name} claimed ${t.name}. Roll again.`;render()}
}

function territoryClick(id) {
  const t=state.territories.find(x=>x.id===id)
  if(state.phase==='claim'){if(state.claimWinner!==null&&state.players[state.claimWinner].isHuman&&t.owner===null)finishClaim(id,state.claimWinner);return}
  const p=state.players[state.turn]; if(state.phase!=='war'||!p?.isHuman)return
  if(window.MultiSync?.active&&!window.MultiSync.applyingRemote&&window.MultiSync.playerIndex!==state.turn){state.message='Wait for your commander turn.';render();return}
  if(window.MultiSync?.active&&!window.MultiSync.isHost&&!window.MultiSync.applyingRemote){window.MultiSync.sendAction({kind:'territory-click',id});return}
  if(state.nuclearPending===p.id){if(t.owner===p.id){state.message='Choose an enemy or rebel territory for the nuclear strike.';render();return}state.nuclearPending=null;state.message=detonateNuclearBomb(p.id,id,'manual');render();return}
  if(!state.selected){if(t.owner!==p.id)state.message='Select one of your own territories first.';else if(!canAttack(t))state.message=`${t.name} has no attacks left this turn.`;else{state.selected=id;state.message=`Choose a neighboring enemy to attack from ${t.name}.`}render();return}
  const source=state.territories.find(x=>x.id===state.selected)
  if(id===source.id){state.selected=null;state.message='Attack cancelled.'}
  else if(t.owner===p.id){state.selected=id;state.message=`Now attacking from ${t.name}.`}
  else if(!source.neighbors.includes(id))state.message=`${source.name} does not border ${t.name}.`
  else if(isDiplomacyProtected(p.id,t.owner))state.message=`You cannot attack ${t.name} while an agreement is active.`
  else {resolveBattle(source.id,id,p.id);return} render()
}

function resolveBattle(sourceId,targetId,playerId) {
  const source=state.territories.find(t=>t.id===sourceId),target=state.territories.find(t=>t.id===targetId),defenderId=target.owner
  if(isDiplomacyProtected(playerId,defenderId)){state.selected=null;state.message='An active alliance or ceasefire prevents this attack.';render();return}
  const a=roll(),d=roll(),lastStand=lastStandDefense(target),attackTotal=a+(state.strengthsOn?source.attackStrength||0:0),defenseTotal=d+(state.strengthsOn?target.defenseStrength||0:0)+lastStand,conquered=attackTotal>defenseTotal
  source.attacks=1;source.attacked=true;state.attacksThisTurn[playerId]=(state.attacksThisTurn[playerId]||0)+1;if(defenderId!==null&&defenderId!==playerId){state.diplomacyAggression[pactKey(playerId,defenderId)]=state.roundCount;state.battleCounts??={};const battleKey=`${playerId}:${defenderId}`,reverseKey=`${defenderId}:${playerId}`;state.battleCounts[battleKey]=(state.battleCounts[battleKey]||0)+1;state.battleCounts[reverseKey]=(state.battleCounts[reverseKey]||0)+1}if(conquered){target.owner=playerId;target.rebel=false;target.attacks=state.captureAttackOn?0:1;target.attacked=!state.captureAttackOn}state.attackAnimation=state.players[playerId]?.isHuman?null:{sourceId,targetId,until:Date.now()+(state.fastAI?450:1400)};state.battle=state.fogOfWar&&!state.players[playerId]?.isHuman&&!state.players[defenderId]?.isHuman?null:{attackerRoll:a,defenderRoll:d};state.selected=null
  if(state.strengthsOn){if(conquered)source.attackStrength=Math.min(3,(source.attackStrength||0)+1);else target.defenseStrength=Math.min(3,(target.defenseStrength||0)+1);if(conquered){target.attackStrength=0;target.defenseStrength=0}}
  state.battle=state.fogOfWar&&!state.players[playerId]?.isHuman&&!state.players[defenderId]?.isHuman?null:{attackerRoll:attackTotal,defenderRoll:defenseTotal};state.selected=null
  state.message=conquered?`${state.players[playerId].name} conquered ${target.name} from ${source.name}!`:`${target.name} held the line against ${source.name}.`;if(lastStand)state.message+=' Last stand defense: 3 total.'
  if(conquered&&defenderId!==null&&!state.territories.some(t=>t.owner===defenderId)) {
    const defeated=state.players.find(p=>p.id===defenderId)
    if(state.players[playerId]){state.players[playerId].kills=(state.players[playerId].kills||0)+1;(state.players[playerId].killedCountries??=[]).push(defeated?.name||'Unknown country')}
    defeated.eliminated=true
    state.message+=` ${defeated.name} has been eliminated.`
    if(state.nuclearOn){state.players[playerId].nuclearBombs=(state.players[playerId].nuclearBombs||0)+1;if(state.nuclearTargeting==='manual'&&state.players[playerId].isHuman){state.nuclearPending=playerId;state.message+=' Choose a starting territory for the nuclear strike.'}else state.message+=detonateNuclearBomb(playerId,null,state.nuclearTargeting==='manual'?'most':state.nuclearTargeting)}
  }
  const survivors=state.players.filter(p=>state.territories.some(t=>t.owner===p.id))
  if(survivors.length===1){state.phase='gameover';state.message=`${survivors[0].name} is the last realm standing!`} render();if(state.attackAnimation)setTimeout(()=>{if(state.attackAnimation?.until<=Date.now()){state.attackAnimation=null;render()}},state.fastAI?500:1450)
}

function detonateNuclearBomb(playerId,targetId=null,mode=state.nuclearTargeting){
  if(!state.nuclearOn)return ''
  const player=state.players.find(p=>p.id===playerId)
  if(!player||!(player.nuclearBombs>0))return ''
  const eligible=state.territories.filter(t=>t.owner!==playerId)
  if(targetId&&(!eligible.some(t=>t.id===targetId)))return 'Choose an enemy or rebel territory for the nuclear strike.'
  let preferred=targetId?eligible.filter(t=>t.id===targetId):eligible
  if(mode==='most'&&!targetId){const opponents=[...new Set(eligible.map(t=>t.owner).filter(owner=>owner!==null&&owner!==playerId))].sort((a,b)=>(state.battleCounts[`${playerId}:${b}`]||0)-(state.battleCounts[`${playerId}:${a}`]||0));if(opponents.length&&(state.battleCounts[`${playerId}:${opponents[0]}`]||0)>0)preferred=eligible.filter(t=>t.owner===opponents[0])}
  const makeGroups=(length,starts)=>{const groups=[];starts.forEach(first=>first.neighbors.forEach(secondId=>{const second=state.territories.find(t=>t.id===secondId);if(!second||second.owner===playerId||second.id===first.id)return;if(length===2){groups.push([first,second]);return}second.neighbors.forEach(thirdId=>{const third=state.territories.find(t=>t.id===thirdId);if(third&&third.owner!==playerId&&third.id!==first.id&&third.id!==second.id)groups.push([first,second,third])})}));return groups}
  const starts=preferred.length?preferred:eligible,chains=makeGroups(3,starts),pairs=makeGroups(2,starts),strikePool=chains.length?chains:pairs.length?pairs:starts.map(t=>[t])
  if(!strikePool.length)return ''
  const strike=strikePool[Math.floor(Math.random()*strikePool.length)]
  player.nuclearBombs--;player.nuclearUsed=(player.nuclearUsed||0)+1
  state.nuclearStrike={player:player.name,territories:strike.map(territory=>territory.name)}
  setTimeout(()=>{state.nuclearStrike=null;render()},2600)
  const affectedOwners=new Set(strike.map(territory=>territory.owner).filter(owner=>owner!==null&&owner!==playerId))
  strike.forEach(territory=>{territory.owner=null;territory.rebel=true;territory.attacked=true;territory.attacks=1})
  affectedOwners.forEach(ownerId=>{const affected=state.players.find(p=>p.id===ownerId);if(affected&&!state.territories.some(t=>t.owner===ownerId))affected.eliminated=true})
  return ` ☢ ${player.name} detonated a nuclear bomb. Rebels appeared in ${strike.map(territory=>territory.name).join(', ')}.`
}

function spawnRebellion(){
  if(state.attackMode!=='hard'||!state.rebelsOn)return ''
  const active=state.players.filter(player=>!player.eliminated)
  const counts=active.map(player=>({player,count:state.territories.filter(t=>t.owner===player.id).length})).filter(entry=>entry.count>0)
  if(!counts.length)return ''
  const max=Math.max(...counts.map(entry=>entry.count))
  const leaders=counts.filter(entry=>entry.count===max)
  const leader=leaders[Math.floor(Math.random()*leaders.length)].player
  const candidates=state.territories.filter(t=>t.owner===leader.id&&!t.rebel)
  if(!candidates.length)return ''
  const territory=candidates[Math.floor(Math.random()*candidates.length)]
  territory.owner=null;territory.rebel=true;territory.attacked=true;territory.attacks=1
  return ` Rebels rose in ${territory.name}; conquer it to restore the realm.`
}
function clearTurnClock(){clearTimeout(turnClockTimeout);clearInterval(turnClockInterval);turnClockTimeout=null;turnClockInterval=null}
function startTurnClock(){
  clearTurnClock()
  if(state.phase!=='war'||!state.turnDeadline)return
  const turnId=state.turn
  const update=()=>{
    const seconds=Math.max(0,Math.ceil((state.turnDeadline-Date.now())/1000))
    document.querySelectorAll('[data-turn-countdown]').forEach(node=>{node.textContent=`${seconds}s remaining`})
    if(seconds<=0){clearTurnClock();if(window.MultiSync?.isHost&&state.phase==='war'&&state.turn===turnId)endTurn()}
  }
  update();turnClockInterval=setInterval(update,250)
  if(window.MultiSync?.isHost)turnClockTimeout=setTimeout(update,Math.max(0,state.turnDeadline-Date.now()+20))
}
function endTurn(){
  if(window.MultiSync?.active&&!window.MultiSync.applyingRemote&&window.MultiSync.playerIndex!==state.turn)return
  if(window.MultiSync?.active&&!window.MultiSync.isHost&&!window.MultiSync.applyingRemote){window.MultiSync.sendAction({kind:'end-turn'});return}
  clearTurnClock()
  clearTimeout(state.aiTimer);const endingPlayer=state.players[state.turn];if(endingPlayer?.isHuman)state.pendingRenewals=state.pendingRenewals.filter(pact=>!pact.key.split(':').map(Number).includes(endingPlayer.id));state.turnCount++;state.territories.forEach(t=>{t.attacked=false;t.attacks=0});state.attacksThisTurn={}
  const active=state.players.filter(player=>!player.eliminated),currentIndex=active.findIndex(player=>player.id===state.players[state.turn]?.id),roundComplete=currentIndex===active.length-1
  if(roundComplete){state.roundCount++;state.diplomacySent={};expireDiplomacy();state.diplomacyAggression={}}
  state.turn=active[(currentIndex+1)%active.length]?.id??state.turn
  state.turnDeadline=Date.now()+60000
  state.selected=null;state.battle=null;state.message=turnMessage(state.players[state.turn])+(roundComplete?spawnRebellion():'');render();startTurnClock();runAI()
}
function isMultiplayerAI(player){return Boolean(player&&window.MultiSync?.active&&window.MultiSync.isHost&&(window.MultiSync.slotConfig?.[player.id]?.type==='ai'||!player.isHuman))}
function runAI(){const p=state.players[state.turn],aiTurn=isMultiplayerAI(p)||(!window.MultiSync?.active&&p&&!p.isHuman);if(state.phase!=='war'||!p||!aiTurn)return;if(state.paused&&window.MultiSync?.active)state.paused=false;if(p.eliminated){endTurn();return}const thinkDelay=state.fastAI?35:800,finishDelay=state.fastAI?45:1000,noAttackDelay=state.fastAI?45:700;state.aiTimer=setTimeout(()=>{if(state.paused)return;expireDiplomacy();aiDiplomacy(p);const owned=state.territories.filter(t=>t.owner===p.id&&canAttack(t)),attacks=owned.flatMap(s=>s.neighbors.map(id=>state.territories.find(t=>t.id===id)).filter(t=>t&&t.owner!==p.id&&!isDiplomacyProtected(p.id,t.owner)).map(t=>({s,t})));if(attacks.length){const x=attacks[Math.floor(Math.random()*attacks.length)];resolveBattle(x.s.id,x.t.id,p.id);if(state.phase==='war')state.aiTimer=setTimeout(state.attackMode==='normal'?endTurn:runAI,state.nuclearStrike?2800:finishDelay)}else{state.message=state.fogOfWar?'Fog of war conceals enemy movements.':`${p.name} has no available border attacks.`;render();state.aiTimer=setTimeout(endTurn,noAttackDelay)}},thinkDelay)}

$('#new-game').onclick=()=>{clearTimeout(state.aiTimer);state.phase='setup';render()}
$('#zoom-in').onclick=()=>changeZoom(1.5)
$('#zoom-out').onclick=()=>changeZoom(1/1.5)
$('#zoom-reset').onclick=()=>{if(mapZoom)d3.select('.map').call(mapZoom.transform,d3.zoomIdentity)}
$('#toggle-labels').onclick=()=>{state.showLabels=!state.showLabels;updateLabels()}
$('#toggle-player-labels').onclick=()=>{state.showPlayerLabels=!state.showPlayerLabels;updatePlayerLabels()}
$('#player-label-size').oninput=e=>{state.playerLabelSize=Number(e.target.value);updatePlayerLabels()}
$('#toggle-fast-ai').onclick=()=>{if(!multiplayerSettingAllowed())return;state.fastAI=!state.fastAI;const button=$('#toggle-fast-ai');button.classList.toggle('active',state.fastAI);button.setAttribute('aria-pressed',String(state.fastAI));const player=state.players[state.turn];if(state.phase==='war'&&player&&!player.isHuman){clearTimeout(state.aiTimer);runAI()}}
function toggleHardMode(){if(!multiplayerSettingAllowed())return;const modes=['normal','moderate','hard'];state.attackMode=modes[(modes.indexOf(state.attackMode)+1)%modes.length];if(state.attackMode==='hard')state.rebelsOn=true;updateHardModeButtons();updateRebelButtons();if(state.phase==='war')render()}
function toggleStrengths(){if(!multiplayerSettingAllowed())return;state.strengthsOn=!state.strengthsOn;updateStrengthButtons();if(state.phase==='war')render()}
function toggleCaptureAttack(){if(!multiplayerSettingAllowed())return;state.captureAttackOn=!state.captureAttackOn;updateCaptureAttackButtons();if(state.phase==='war')render()}
function toggleRebels(){if(!multiplayerSettingAllowed())return;state.rebelsOn=!state.rebelsOn;updateRebelButtons();if(state.phase==='war')render()}
function toggleNuclear(){if(!multiplayerSettingAllowed())return;state.nuclearOn=!state.nuclearOn;updateNuclearButton();if(state.phase==='war')render()}
function toggleFog(){if(!multiplayerSettingAllowed())return;state.fogOfWar=!state.fogOfWar;updateFogButton();updateLabels();updatePlayerLabels();if(state.phase==='war')render()}
function toggleAlliances(){if(!multiplayerSettingAllowed())return;state.alliancesOn=!state.alliancesOn;updateAllianceButtons();if(state.phase==='war')render()}
$('#toggle-hard-mode').onclick=toggleHardMode
$('#toggle-strengths').onclick=toggleStrengths
$('#strength-view').onchange=e=>{if(state.strengthsOn){state.strengthView=e.target.value;render()}}
$('#toggle-capture-attack').onclick=toggleCaptureAttack
$('#toggle-rebels').onclick=toggleRebels
$('#toggle-fog').onclick=toggleFog
$('#toggle-alliances').onclick=toggleAlliances
$('#toggle-auto-reject').onclick=()=>{if(!multiplayerSettingAllowed())return;state.autoRejectOffers=!state.autoRejectOffers;if(state.autoRejectOffers)state.diplomacyOffers=[];updateAutoRejectButton();render()}
function fullscreenElement(){return document.fullscreenElement||document.webkitFullscreenElement}
function updateFullscreenButton(){const button=$('#toggle-fullscreen');if(!button)return;const active=Boolean(fullscreenElement());button.textContent=active?'Exit fullscreen':'Fullscreen';button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))}
$('#toggle-fullscreen').onclick=async()=>{try{if(fullscreenElement()){if(document.exitFullscreen)await document.exitFullscreen();else if(document.webkitExitFullscreen)document.webkitExitFullscreen()}else{const root=document.documentElement;if(root.requestFullscreen)await root.requestFullscreen();else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();else state.message='Fullscreen is not supported by this browser.'}}catch{state.message='Fullscreen could not be enabled.'}updateFullscreenButton();if(state.message)render()}
document.addEventListener('fullscreenchange',updateFullscreenButton)
document.addEventListener('webkitfullscreenchange',updateFullscreenButton)
window.addEventListener('resize',()=>{updateLabels();updatePlayerLabels()})
$('#toggle-pause-ai').onclick=()=>{if(!multiplayerSettingAllowed())return;state.paused=!state.paused;if(state.paused)clearTimeout(state.aiTimer);updatePauseButton();if(!state.paused)runAI()}
$('#toggle-pacts').onclick=()=>{state.showPacts=!state.showPacts;const button=$('#toggle-pacts');button.classList.toggle('active',state.showPacts);button.setAttribute('aria-pressed',String(state.showPacts));renderPacts()}
$('#toggle-controls').onclick=()=>{state.controlsHidden=true;render()}
$('#show-controls').onclick=()=>{state.controlsHidden=false;render()}
$('#toggle-panel').onclick=()=>{state.panelHidden=true;render()}
$('#show-panel').onclick=()=>{state.panelHidden=false;render()}
$('#toggle-music').onclick=toggleMusic
$('#music-style').onchange=async e=>{state.musicStyle=e.target.value;if(state.musicOn){await startSelectedMusic()}}
$('#music-volume').oninput=e=>{state.musicVolume=Number(e.target.value);if(warTrack)warTrack.volume=state.musicVolume;if(musicGain&&musicContext){musicGain.gain.cancelScheduledValues(musicContext.currentTime);musicGain.gain.linearRampToValueAtTime(state.musicVolume,musicContext.currentTime+.08)}}
function savedGameNames(){const prefix='borderline-dominion-save:';return Object.keys(localStorage).filter(key=>key.startsWith(prefix)).map(key=>key.slice(prefix.length)).sort()}
async function downloadCampaignFile(name,snapshot){const filename=`${name.replace(/[^a-z0-9-_ ]/gi,'').trim()||'campaign'}.json`;if(window.showSaveFilePicker){const handle=await window.showSaveFilePicker({suggestedName:filename,types:[{description:'Campaign JSON',accept:{'application/json':['.json']}}]});const writable=await handle.createWritable();await writable.write(snapshot);await writable.close();return handle.name||filename}const blob=new Blob([snapshot],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return filename}
function closeSaveDialog(){$('#save-dialog').innerHTML=''}
function saveDialog(action){
  const names=savedGameNames(),box=$('#save-dialog')
  if((action!=='save')&&!names.length){state.message='No saved campaigns found in this browser.';render();return}
  const options=names.map(name=>`<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')
  box.innerHTML=`<div class="save-backdrop"><div class="save-card"><span class="eyebrow">${action==='save'?'SAVE CAMPAIGN':action==='load'?'LOAD CAMPAIGN':action==='export'?'EXPORT CAMPAIGN':'DELETE CAMPAIGN'}</span>${action==='save'?`<label>Save name<select id="save-choice"><option value="__new">＋ New save name…</option>${options}</select></label><input id="save-name-input" placeholder="Campaign name" maxlength="40" />`:`<label>Choose campaign<select id="save-choice">${options}</select></label>`}<div class="save-actions"><button class="secondary" id="save-cancel">Cancel</button><button class="primary" id="save-confirm">${action==='save'?'Save':action==='load'?'Load':action==='export'?'Export':'Delete'}</button></div></div></div>`
  const choice=$('#save-choice'),input=$('#save-name-input');if(input)choice.onchange=()=>{input.disabled=choice.value!=='__new';if(!input.disabled)input.focus()};$('#save-cancel').onclick=closeSaveDialog;$('#save-confirm').onclick=async()=>{
    let name=action==='save'?(choice.value==='__new'?input.value.trim():choice.value):choice.value
    if(!name){state.message='Choose or enter a save name.';closeSaveDialog();render();return}
    const key=`borderline-dominion-save:${name}`
    if(action==='save'){if(state.phase==='setup'){state.message='Start a campaign before saving.'}else{let snapshot='';try{snapshot=JSON.stringify({...state,aiTimer:null,saveName:name,savedAt:new Date().toISOString()});localStorage.setItem(key,snapshot);state.message=`Campaign saved as “${name}”.`}catch(error){const reason=error?.name==='QuotaExceededError'?'browser storage is full':error?.name==='SecurityError'?'browser storage is blocked':error?.name||'unknown error';if(snapshot&&error?.name==='QuotaExceededError'){try{const filename=await downloadCampaignFile(name,snapshot);state.message=`Browser storage is full, so “${filename}” was saved to your computer.`}catch(fileError){state.message=fileError?.name==='AbortError'?'File save cancelled.':`Could not save the campaign file: ${fileError?.message||'unknown error'}`}}else state.message=`Could not save this campaign: ${reason}.`;console.error('Campaign save failed',error)}}}
    else if(action==='load'){try{clearTimeout(state.aiTimer);Object.assign(state,JSON.parse(localStorage.getItem(key)),{aiTimer:null});if(state.phase==='war'&&!state.players[state.turn]?.isHuman)runAI()}catch(error){state.message='That saved campaign could not be loaded.'}}
    else if(action==='export'){try{const data=localStorage.getItem(key),filename=await downloadCampaignFile(name,data);state.message=`Saved “${filename}”. You can choose the previous JSON file to overwrite it.`}catch(error){state.message=error?.name==='AbortError'?'File save cancelled.':'That campaign could not be exported.'}}
    else if(window.confirm(`Delete saved campaign “${name}”?`)){localStorage.removeItem(key);state.message=`Deleted saved campaign “${name}”.`}
    closeSaveDialog();render()
  }
}
function saveGame(){saveDialog('save')}
function loadGame(){saveDialog('load')}
function exportGame(){saveDialog('export')}
function deleteGame(){saveDialog('delete')}
$('#save-game').onclick=saveGame
$('#load-game').onclick=loadGame
$('#load-file').onclick=()=>$('#load-file-input').click()
$('#load-file-input').onchange=event=>{const file=event.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{try{clearTimeout(state.aiTimer);Object.assign(state,JSON.parse(reader.result),{aiTimer:null});state.message=`Loaded campaign file “${file.name}”.`;if(state.territories.length)drawMap();render();if(state.phase==='war'&&!state.players[state.turn]?.isHuman)runAI()}catch{state.message='That campaign file could not be loaded.';render()}event.target.value=''};reader.readAsText(file)}
$('#export-game').onclick=exportGame
$('#delete-game').onclick=deleteGame
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='s'){event.preventDefault();saveGame()}})
window.BorderlineGame={state,render,toggleMusic,async enableMusic(){if(!state.musicOn)await toggleMusic();else await startSelectedMusic()},prepareMultiplayer(room){const humans=room.slots.filter(Boolean).filter(slot=>slot.type==='human'),configuredCount=Number(window.MultiSync.pendingPlayerCount)||room.slots.length;state.humanCount=humans.length;state.playerCount=Math.max(room.slots.length,configuredCount);state.playerNames=Array(33).fill('');room.slots.forEach((slot,index)=>{if(slot)state.playerNames[index]=slot.name});window.MultiSync.slotConfig=room.slots;Object.assign(state,{phase:'setup',claimWinner:null,selected:null,fastAI:true,paused:false});render()},applyRemote(snapshot){Object.assign(state,snapshot,{aiTimer:null});if(state.phase==='war'&&!state.turnDeadline)state.turnDeadline=Date.now()+60000;if(state.territories.length&&!document.querySelector('.country'))drawMap();render();if(state.phase==='war')startTurnClock()}}
window.addEventListener('multiplayer-action',event=>{
  if(!window.MultiSync?.isHost)return
  const action=event.detail
  const senderIndex=action.playerId?window.MultiSync.playerIndexById?.[action.playerId]:undefined
  if(action.kind==='pact-response'){
    const offerIndex=state.diplomacyOffers.findIndex(offer=>`${offer.from}:${offer.to}:${offer.type}`===action.offerKey)
    if(offerIndex<0||senderIndex!==state.diplomacyOffers[offerIndex].to)return
    action.response==='accept'?acceptDiplomacyOffer(offerIndex,senderIndex):rejectDiplomacyOffer(offerIndex,senderIndex)
    return
  }
  if(action.kind==='pact-renew'){
    const ids=String(action.key||'').split(':').map(Number)
    if(senderIndex===undefined||!ids.includes(senderIndex)||ids.length!==2)return
    renewPact(action.pactType,action.key)
    return
  }
  if(senderIndex!==undefined&&senderIndex!==state.turn)return
  const wasApplyingRemote=window.MultiSync.applyingRemote
  window.MultiSync.applyingRemote=true
  try{
    if(action.kind==='territory-click')territoryClick(action.id)
    if(action.kind==='end-turn')endTurn()
    if(action.kind==='pact-request')requestPact(action.pactType,action.targetId)
  }finally{
    window.MultiSync.applyingRemote=wasApplyingRemote
    if(state.phase==='war'&&state.players[state.turn]&&!state.players[state.turn].isHuman){clearTimeout(state.aiTimer);state.aiTimer=null;runAI()}
  }
})
document.querySelector('#root').insertAdjacentHTML('beforeend','<div class="loading" id="loader"><span class="spinner"></span>Drawing the frontiers…</div>')
document.addEventListener('change',event=>{if(event.target?.id==='total'&&window.MultiSync)window.MultiSync.pendingPlayerCount=Number(event.target.value)})
loadMap().then(()=>$('#loader')?.remove())
