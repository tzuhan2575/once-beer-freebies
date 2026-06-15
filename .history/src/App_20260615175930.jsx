import { freebies } from "./data/freebies";
import "./App.css";

function App() {
  const sortedFreebies = [...freebies].sort((a, b) => {
    if (a.priorityGroup === "featured" && b.priorityGroup !== "featured") return -1;
    if (a.priorityGroup !== "featured" && b.priorityGroup === "featured") return 1;
    return 0;
  });

  return (
    <div className="app">
      <header className="hero">
        <h1>ONCE 啤酒節應援物情報站</h1>
        <p>
          彙整高雄啤酒節期間 ONCE 粉絲創作者發布的應援物資訊，
          方便大家快速查看品項、領取資訊與原文連結。
        </p>
      </header>

      <main className="card-grid">
        {sortedFreebies.map((item) => (
          <article className="freebie-card" key={item.id}>
            <img src={item.mainImage} alt={item.itemName} className="card-image" />

            <div className="card-content">
              <a
                href={item.fanAccountUrl}
                target="_blank"
                rel="noreferrer"
                className="fan-account"
                onClick={(event) => event.stopPropagation()}
              >
                @{item.fanAccount}
              </a>

              <div className="card-meta">
                <span>{item.category}</span>
                <span>｜</span>
                <span>{item.itemName}</span>
              </div>


              {item.hasVideo && <div className="video-tag">含影片，請見原文</div>}
            </div>
          </article>
        ))}
      </main>
    </div>
  );
}

export default App;