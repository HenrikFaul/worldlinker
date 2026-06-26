import { useEffect, useState } from 'react';
import { useGameStore } from './state/gameStore';
import { initCloud } from './state/cloudSync';
import { getLevel, LEVEL_COUNT } from './engine/levels';
import { type DailyInfo } from './engine/daily';
import { sfx } from './engine/audio';
import MainMenu from './screens/MainMenu';
import LevelSelect from './screens/LevelSelect';
import DailyScreen from './screens/DailyScreen';
import StatsScreen from './screens/StatsScreen';
import PlayScreen from './screens/PlayScreen';
import SettingsModal from './components/SettingsModal';

type Screen = 'menu' | 'select' | 'daily' | 'stats' | 'play';

export default function App() {
  const soundOn = useGameStore((s) => s.soundOn);

  const [screen, setScreen] = useState<Screen>('menu');
  const [playMode, setPlayMode] = useState<'campaign' | 'daily'>('campaign');
  const [playLevel, setPlayLevel] = useState(1);
  const [dailyInfo, setDailyInfo] = useState<DailyInfo | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // keep the audio engine in sync with the saved preference
  useEffect(() => {
    sfx.setMuted(!soundOn);
  }, [soundOn]);

  // optional cloud save / sync (no-op when not configured)
  useEffect(() => {
    void initCloud();
  }, []);

  const pickLevel = (n: number) => {
    setPlayMode('campaign');
    setPlayLevel(n);
    setScreen('play');
  };

  const startDaily = (info: DailyInfo) => {
    setPlayMode('daily');
    setDailyInfo(info);
    setScreen('play');
  };

  const nextLevel = () => setPlayLevel((l) => Math.min(l + 1, LEVEL_COUNT));

  const renderPlay = () => {
    if (playMode === 'daily' && dailyInfo) {
      return (
        <PlayScreen
          key={`daily-${dailyInfo.dateKey}`}
          level={dailyInfo.puzzle}
          mode="daily"
          subtitle="Daily Word"
          title={dailyInfo.dateKey.slice(5)}
          daily={{ dateKey: dailyInfo.dateKey, yesterdayKey: dailyInfo.yesterdayKey }}
          onExit={() => setScreen('daily')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      );
    }
    return (
      <PlayScreen
        key={`lvl-${playLevel}`}
        level={getLevel(playLevel)}
        mode="campaign"
        subtitle="Level"
        title={String(playLevel)}
        onNext={nextLevel}
        onExit={() => setScreen('select')}
        onOpenSettings={() => setSettingsOpen(true)}
      />
    );
  };

  return (
    <div className="app">
      {screen === 'menu' && (
        <MainMenu
          onPlay={() => setScreen('select')}
          onDaily={() => setScreen('daily')}
          onOpenStats={() => setScreen('stats')}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {screen === 'select' && <LevelSelect onPick={pickLevel} onBack={() => setScreen('menu')} />}

      {screen === 'daily' && <DailyScreen onPlay={startDaily} onBack={() => setScreen('menu')} />}

      {screen === 'stats' && <StatsScreen onBack={() => setScreen('menu')} />}

      {screen === 'play' && renderPlay()}

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
