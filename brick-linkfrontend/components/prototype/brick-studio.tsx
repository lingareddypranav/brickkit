"use client"

import { useState } from "react"
import { ArrowRight, Blocks, Check, Clock3, Heart, LockKeyhole, Sparkles } from "lucide-react"
import { useBrickBox } from "@/hooks/use-brick-box"
import { models, partByKey } from "@/lib/demo/catalog"
import { availablePieces, countPieces, matchInventory } from "@/lib/demo/inventory"
import type { Blueprint } from "@/lib/demo/types"
import { BrickBoxDialog } from "./brick-box"
import { KitDialog } from "./kit-dialog"
import "./prototype.css"

export default function BrickStudio() {
  const box = useBrickBox()
  const [boxOpen, setBoxOpen] = useState(false)
  const [selected, setSelected] = useState<Blueprint | null>(null)
  const available = availablePieces(box.collection)
  const readyCount = models.filter(model => matchInventory(model.inventory, available).ready).length
  const protectedCount = Object.values(box.collection.sets).filter(set => set.keepBuilt).length + box.collection.creations.filter(model => model.keepBuilt).length

  return <div className="kit-app">
    <header className="kit-header"><a className="kit-brand" href="/" aria-label="Brick Kit home"><span className="brand-mark"><Blocks size={27} /></span>brick<span className="brand-hyphen">-</span>kit<span className="brand-dot">®</span></a><nav aria-label="Main navigation"><span className="nav-active">Let’s make</span><button className="box-nav" onClick={() => setBoxOpen(true)}><Blocks size={19} /> My brick box <span>{Object.values(box.collection.sets).reduce((s,x)=>s+x.quantity,0)}</span></button></nav></header>
    <main className="kit-main">
      <section className="studio-hero"><div><p className="hero-kicker"><span /> A little imagination goes a long way</p><h1>Big ideas.<br /><span>Already in your box.</span></h1><p className="hero-description">Turn the bricks you have into something<br className="desktop-break" /> you haven’t imagined yet.</p><button className="hero-box-link" onClick={() => setBoxOpen(true)}>Take a peek in my brick box <ArrowRight size={18} /></button></div><div className="hero-world" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="hero-star star-one">✦</span><img src="/demo/models/little-rocket.svg" className="hero-rocket" alt=""/><span className="hero-star star-two">✦</span><span className="hero-caption">a box full of<br />what ifs.</span></div></section>
      <div className="collection-strip"><div className="strip-icon"><Blocks size={22} /></div><div><strong>Your next adventure starts here.</strong><p>{box.hydrated ? <>{readyCount} mini builds ready · {countPieces(available)} pieces to play with{protectedCount > 0 && <span className="protected-summary"> · <LockKeyhole size={12} /> {protectedCount} kept built</span>}</> : 'Opening your brick box…'}</p></div><button className="kit-text-button" onClick={() => setBoxOpen(true)}>Edit my box <ArrowRight size={16} /></button></div>
      <section className="ideas-section" aria-labelledby="ideas-heading"><div className="ideas-heading"><div><span className="section-kicker">SMALL BUILDS, BIG POSSIBILITIES</span><h2 id="ideas-heading">What shall we make?</h2></div><span className="ideas-aside"><Sparkles size={17} /> A little help from kit</span></div>
        <div className="idea-grid" aria-busy={!box.hydrated}>{models.map(model => {
          const match = matchInventory(model.inventory, available)
          const wished = box.collection.wishlist.includes(model.id)
          return <article className="idea-card" key={model.id}><div className="idea-art" style={{background:model.background}}><button className="idea-open" onClick={() => setSelected(model)} aria-label={`See ${model.name}`}><img src={model.image} alt={model.name} /></button><span className={`build-status ${match.ready ? 'status-ready' : 'status-dream'}`}>{match.ready ? <Check size={14} /> : <Sparkles size={14} />}{match.ready ? 'Ready to build' : `Need ${match.missingCount} pieces`}</span><button className={`wish-button ${wished ? 'is-wished' : ''}`} aria-pressed={wished} aria-label={`${wished ? 'Unsave' : 'Save'} ${model.name}`} onClick={() => box.toggleWish(model.id)}><Heart size={18} fill={wished ? 'currentColor' : 'none'} /></button></div><div className="idea-card-body"><div><span className="model-family">{model.family === 'rides' ? 'ON THE MOVE' : model.family === 'animals' ? 'A NEW LITTLE FRIEND' : 'BEYOND THE MOON'}</span><h3><button onClick={() => setSelected(model)}>{model.name}</button></h3><p>{model.description}</p></div><div className="idea-meta"><span><Blocks size={14} /> {countPieces(model.inventory)} pieces</span><span><Clock3 size={14} /> {model.minutes} min</span><button onClick={() => setSelected(model)} aria-label={`Open ${model.name}`}><ArrowRight size={20} /></button></div></div></article>
        })}</div>
      </section>
      <footer className="studio-footer"><span>Made for little hands & big imaginations.</span><a href="/explore">Explore the LEGO model library <ArrowRight size={14} /></a></footer>
    </main>
    {boxOpen && <BrickBoxDialog box={box} open onClose={() => setBoxOpen(false)} />}
    {selected && <KitDialog open onClose={() => setSelected(null)} title={selected.name} description={selected.description}>
      <div className="detail-preview" style={{background:selected.background}}><img src={selected.image} alt={selected.name} /></div>
      <div className="detail-parts">{Object.entries(selected.inventory).map(([key,n]) => <span key={key}>{n} × {partByKey[key].colorName} {partByKey[key].name.toLowerCase()}</span>)}</div>
      <p>{matchInventory(selected.inventory,available).ready ? 'You have every piece for this little adventure.' : `Your box needs ${matchInventory(selected.inventory,available).missingCount} more pieces for this idea.`}</p>
      <button className="kit-button kit-button-dark" onClick={() => { setSelected(null); setBoxOpen(true) }}>Open my brick box <ArrowRight size={17} /></button>
    </KitDialog>}
  </div>
}
