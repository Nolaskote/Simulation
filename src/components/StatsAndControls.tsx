import React from 'react';

export default function StatsAndControls({
  stats,
  showAsteroids,
  setShowAsteroids,
  showOrbits,
  setShowOrbits,
  haloEnabled,
  setHaloEnabled,
  visible = true,
  onRequestHide,
}: {
  stats: { total: number; phas: number; neosOnly: number };
  showAsteroids: boolean;
  setShowAsteroids: (v: boolean) => void;
  showOrbits: boolean;
  setShowOrbits: (v: boolean) => void;
  haloEnabled: boolean;
  setHaloEnabled: (v: boolean) => void;
  visible?: boolean;
  onRequestHide?: () => void;
}) {
  return (
    <div className={`panel panel--left ${visible ? 'is-visible' : 'is-hidden'}`}>
      <button className="panel-close" onClick={onRequestHide} aria-label="Ocultar panel">
        Ocultar
      </button>

      {/* Sección: Estadísticas */}
      <section className="section section--stats">
        <h3 className="title">Estadísticas</h3>
        <p className="stat-line">Total en BD: <strong>{stats.total.toLocaleString()}</strong></p>
        <p className="stat-line">PHA: <strong className="pha">{stats.phas.toLocaleString()}</strong></p>
        <p className="stat-line">NEO: <strong className="neo">{stats.neosOnly.toLocaleString()}</strong></p>
        <div className="separator" />
      </section>

      {/* Sección: Controles */}
      <section className="section section--controls">
        <h3 className="title">Controles</h3>
        <div className="grid">
          <label className="check">
            <input type="checkbox" checked={showAsteroids} onChange={e => setShowAsteroids(e.target.checked)} />
            <span>Mostrar Asteroides</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={showOrbits} onChange={e => setShowOrbits(e.target.checked)} />
            <span>Mostrar Órbitas</span>
          </label>
          <label className="check">
            <input type="checkbox" checked={haloEnabled} onChange={e => setHaloEnabled(e.target.checked)} />
            <span>Brillo alrededor</span>
          </label>
        </div>
        {/* Nueva línea blanca debajo de "Brillo alrededor" */}
        <div className="separator" />
      </section>

      {/* Sección: Indicaciones (leyenda) */}
      <section className="section section--legend">
        <h3 className="title">Indicaciones</h3>
        <div className="legend">
          <p>🖱️ Arrastra para rotar</p>
          <p>🔍 Rueda para zoom</p>
          <p>👆 Haz clic en asteroides</p>
          <p>🔴 Rojo = PHA</p>
          <p>⚪ Gris = NEO</p>
        </div>
      </section>
    </div>
  );
}
