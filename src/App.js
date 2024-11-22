import React from 'react';
import './App.css';
import BubblePopGame from './bubble-pop-game.tsx'; // アップロードしたファイルをインポート

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <BubblePopGame /> {/* インポートしたコンポーネントを使用 */}
      </header>
    </div>
  );
}

export default App;