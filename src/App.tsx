import { useEffect, useState } from 'react';
import { useGameStore } from './state/gameStore';
import { LEVEL_COUNT } from './engine/levels';
import { sfx } from './engine/audio';
import MainMenu from './screens/MainMenu';
import PlayScreen from './screens/PlayScreen';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const maxLevel = useGameStore((s) => s.maxLevel);
  const soundOn = useGameStore((s) => s.soundOn);

  const [screen, setScreen] = useState<'menu' | 'play'>('menu');
  const [playLevel, setPlayLevel] = useState(maxLevel);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // keep the audio engine in sync with the saved preference
  useEffect(() => {
    sfx.setMuted(!soundOn);
  }, [soundOn]);

  const startPlay = () => {
    setPlayLevel(maxLevel);
    setScreen('play');
  };

  const nextLevel = () => setPlayLevel((l) => Math.min(l + 1, LEVEL_COUNT));

  return (
    <div className="app">
      {screen === 'menu' ? (
        <MainMenu onPlay={startPlay} onOpenSettings={() => setSettingsOpen(true)} />
      ) : (
        <PlayScreen
          // remount per level so all per-level state starts fresh (no stale carry-over)
          key={playLevel}
          levelNumber={playLevel}
          onNext={nextLevel}
          onExit={() => setScreen('menu')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
