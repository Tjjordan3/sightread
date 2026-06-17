interface HomeScreenProps {
  onStart: () => void;
  onOpenSettings: () => void;
}

export function HomeScreen({ onStart, onOpenSettings }: HomeScreenProps) {
  return (
    <div className="screen home-screen">
      <button
        type="button"
        className="icon-button home-screen__settings"
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        ⚙
      </button>

      <div className="home-screen__hero">
        <div className="home-screen__logo" aria-hidden>
          📷
        </div>
        <h1>Sightread</h1>
        <p className="subtitle">Read the world through your webcam</p>
      </div>

      <ul className="tip-list">
        <li>
          <span className="tip-list__icon" aria-hidden>
            🎥
          </span>
          <div>
            <strong>Live vision</strong>
            <p>Stream your webcam and understand the scene with AI.</p>
          </div>
        </li>
        <li>
          <span className="tip-list__icon" aria-hidden>
            💬
          </span>
          <div>
            <strong>Smart prompts</strong>
            <p>Presets for navigation, safety, reading text, and more.</p>
          </div>
        </li>
        <li>
          <span className="tip-list__icon" aria-hidden>
            🌐
          </span>
          <div>
            <strong>Browser companion</strong>
            <p>
              No Meta glasses required. Use your device camera or upload a
              photo.
            </p>
          </div>
        </li>
      </ul>

      <div className="home-screen__footer">
        <p className="footnote">
          Your browser will ask for camera permission when you start.
        </p>
        <button type="button" className="btn btn--primary" onClick={onStart}>
          Start with webcam
        </button>
      </div>
    </div>
  );
}
