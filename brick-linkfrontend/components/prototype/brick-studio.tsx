"use client"
import { useState } from "react"
import { ArrowRight, Blocks, Check, Heart, LockKeyhole, Search, Sparkles } from "lucide-react"
import { useBrickBox } from "@/hooks/use-brick-box"
import { useBuildIdeas } from "@/hooks/use-build-ideas"
import { families, modelById } from "@/lib/demo/catalog"
import { countPieces } from "@/lib/demo/inventory"
import type { Blueprint } from "@/lib/demo/types"
import { BrickBoxDialog } from "./brick-box"
import { IdeaCard } from "./idea-card"
import { BuildDetail } from "./build-detail"
import "./prototype.css"
import "./gallery.css"

export default function BrickStudio() {
  const box = useBrickBox()
  const ideas = useBuildIdeas(box.collection)
  const [boxOpen, setBoxOpen] = useState(false)
  const [boxTab, setBoxTab] = useState<"sets" | "pieces" | "made">("sets")
  const [selected, setSelected] = useState<Blueprint | null>(null)
  const protectedCount = Object.values(box.collection.sets).filter(set => set.keepBuilt).length + box.collection.creations.filter(model => model.keepBuilt).length
  return <div className="kit-app">
    <header className="kit-header"><a className="kit-brand" href="/" aria-label="Brick Kit home"><span className="brand-mark"><Blocks size={27} /></span>brick<span className="brand-hyphen">-</span>kit<span className="brand-dot">®</span></a><nav aria-label="Main navigation"><span className="nav-active">Let’s make</span><button className="box-nav" onClick={() => setBoxOpen(true)}><Blocks size={19} /> My brick box <span>{Object.values(box.collection.sets).reduce((s,x)=>s+x.quantity,0)}</span></button></nav></header>
    <main className="kit-main">
      <section className="studio-hero"><div><p className="hero-kicker"><span /> A little imagination goes a long way</p><h1>Big ideas.<br /><span>Already in your box.</span></h1><p className="hero-description">Turn the bricks you have into something<br className="desktop-break" /> you haven’t imagined yet.</p><button className="hero-box-link" onClick={() => setBoxOpen(true)}>Take a peek in my brick box <ArrowRight size={18} /></button></div><div className="hero-world" aria-hidden="true"><span className="orbit orbit-one"/><span className="orbit orbit-two"/><span className="hero-star star-one">✦</span><img src="/demo/models/star-skimmer.svg" className="hero-rocket" alt=""/><span className="hero-star star-two">✦</span><span className="hero-caption">a box full of<br />what ifs.</span></div></section>
      <div className="collection-strip"><div className="strip-icon"><Blocks size={22} /></div><div><strong>Your next adventure starts here.</strong><p>{box.hydrated ? <>{ideas.readyCount} mini builds ready · {countPieces(ideas.available)} pieces to play with{protectedCount > 0 && <span className="protected-summary"> · <LockKeyhole size={12} /> {protectedCount} kept built</span>}</> : 'Opening your brick box…'}</p></div><button className="kit-text-button" onClick={() => setBoxOpen(true)}>Edit my box <ArrowRight size={16} /></button></div>
      <section className="ideas-section" aria-labelledby="ideas-heading"><div className="ideas-heading"><div><span className="section-kicker">SMALL BUILDS, BIG POSSIBILITIES</span><h2 id="ideas-heading">What shall we make?</h2></div><span className="ideas-aside"><Sparkles size={17} /> A little help from kit</span></div>
        <div className="family-choices" aria-label="Choose a kind of build">{families.map(family => <button key={family.id} aria-pressed={ideas.family === family.id} onClick={() => { ideas.setFamily(family.id); ideas.setSavedOnly(false) }}><span style={{background:modelById[family.model].background}}><img src={modelById[family.model].image} alt="" /></span>{family.label}</button>)}</div>
        <form className="idea-prompt" onSubmit={e => { e.preventDefault(); ideas.submitPrompt() }}><Search size={18} /><input aria-label="What would you like to build?" placeholder="A dragon? A spaceship? Tell kit your idea…" value={ideas.prompt} onChange={e => ideas.setPrompt(e.target.value)} /><button type="submit" aria-label="Find an idea"><ArrowRight size={20} /></button></form>
        {ideas.promptMessage && <p className="prompt-feedback" role="status">{ideas.promptMessage}</p>}
        <div className="idea-controls"><button className={`bricks-switch ${ideas.onlyMyBricks ? 'is-on' : ''}`} role="switch" aria-checked={ideas.onlyMyBricks} onClick={() => ideas.setOnlyMyBricks(!ideas.onlyMyBricks)}><span className="switch-track"><span>{ideas.onlyMyBricks && <Check size={11} />}</span></span><span>Use my bricks</span></button><span className="filter-explanation">{ideas.onlyMyBricks ? 'Every piece is already in your box.' : 'Dream a little. We’ll show what you need.'}</span><button className={`saved-filter ${ideas.savedOnly ? 'is-active' : ''}`} aria-pressed={ideas.savedOnly} onClick={() => ideas.setSavedOnly(!ideas.savedOnly)}><Heart size={16} fill={ideas.savedOnly ? 'currentColor' : 'none'} /> Saved ideas <span>{box.collection.wishlist.length}</span></button></div>
        <p className="results-count" aria-live="polite">{box.hydrated ? `${ideas.ideas.length} little ${ideas.ideas.length === 1 ? 'idea' : 'ideas'}${ideas.onlyMyBricks ? ' ready to make' : ' to explore'}` : 'Finding your next adventure…'}</p>
        {ideas.ideas.length ? <div className="idea-grid" aria-busy={!box.hydrated}>{ideas.ideas.map(idea => <IdeaCard key={idea.model.id} {...idea} onOpen={() => setSelected(idea.model)} onSave={() => box.toggleWish(idea.model.id)} />)}</div> : <div className="gallery-empty"><Blocks size={38} /><h3>{ideas.savedOnly ? 'A little room for dreams' : 'Let’s find your next adventure'}</h3><p>{ideas.savedOnly ? 'Tap a heart to save an idea. You can include ideas that need more pieces, too.' : 'Your box doesn’t have all the pieces for these ideas yet. Add your sets, or explore something new.'}</p><div><button className="kit-button kit-button-light" onClick={() => setBoxOpen(true)}>Open my brick box</button><button className="kit-button kit-button-outline" onClick={() => ideas.setOnlyMyBricks(false)}>Show more ideas <Sparkles size={16} /></button></div></div>}
      </section>
      <footer className="studio-footer"><span>Made for little hands & big imaginations.</span><a href="/explore">Explore the LEGO model library <ArrowRight size={14} /></a></footer>
    </main>
    {boxOpen && <BrickBoxDialog box={box} initialTab={boxTab} open onClose={() => setBoxOpen(false)} />}
    {selected && <BuildDetail model={selected} box={box} onClose={() => setSelected(null)} onManageBox={tab => { setSelected(null); setBoxTab(tab); setBoxOpen(true) }} />}
  </div>
}
