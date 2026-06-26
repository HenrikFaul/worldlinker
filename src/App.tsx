import { useEffect, useState } from 'react';
import { useGameStore } from './state/gameStore';
import { LEVEL_COUNT } from './engine/levels';
import { sfx } from './engine/audio';
import MainMenu from './screens/MainMenu';
import LevelSelect from './screens/LevelSelect';
import PlayScreen from './screens/PlayScreen';
import SettingsModal from './components/SettingsModal';

type Screen = 'menu' | 'select' | 'play';

export default function App() {
  const soundOn = useGameStore((s) => s.soundOn);

  const [screen, setScreen] = useState<Screen>('menu');
  const [playLevel, setPlayLevel] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // keep the audio engine in sync with the saved preference
  useEffect(() => {
    sfx.setMuted(!soundOn);
  }, [soundOn]);

  const pickLevel = (n: number) => {
    setPlayLevel(n);
    setScreen('play');
  };

  const nextLevel = () => setPlayLevel((l) => Math.min(l + 1, LEVEL_COUNT));

  return (
    <div className="app">
      {screen === 'menu' && (
        <MainMenu onPlay={() => setScreen('select')} onOpenSettings={() => setSettingsOpen(true)} />
      )}

      {screen === 'select' && (
        <LevelSelect onPick={pickLevel} onBack={() => setScreen('menu')} />
      )}

      {screen === 'play' && (
        <PlayScreen
          // remount per level so all per-level state starts fresh (no stale carry-over)
          key={playLevel}
          levelNumber={playLevel}
          onNext={nextLevel}
          onExit={() => setScreen('select')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
