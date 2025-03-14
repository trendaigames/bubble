import React, { useEffect } from 'react';
import './App.css';
import BubblePopGame from './bubble-pop-game.tsx'; // ゲームコンポーネント

function App() {
  useEffect(() => {
    // Discord SDKがロードされているか確認
    if (window.Discord) {
      const clientId = '1349656104044593192'; // Discord Developer Portalで取得したClient ID

      // Discord SDKの初期化
      window.Discord.initialize(clientId, {
        buttons: [
          {
            label: 'ゲームをプレイ',
            url: 'https://discord.com', // ゲームのURL
          },
        ],
      });

      // プレイヤーの進行状況を更新
      window.Discord.updatePresence({
        details: 'パズルゲームをプレイ中...',
        state: 'レベル1', // ゲームの進行状況
        startTimestamp: Date.now(),
        largeImageKey: 'game_icon', // ゲームのアイコン
        smallImageKey: 'player_status', // プレイヤーの状態を示すアイコン
      });
    }

    return () => {
      // コンポーネントがアンマウントされる際にアクティビティをクリア
      if (window.Discord) {
        window.Discord.clearPresence();
      }
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <BubblePopGame /> {/* ゲームコンポーネント */}
      </header>
    </div>
  );
}

export default App;