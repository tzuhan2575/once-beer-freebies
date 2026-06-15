import { useMemo, useState } from "react";
import { freebies } from "./data/freebies";
import "./App.css";

const categories = ["全部", "紙本類", "手持類", "配件類", "套組類", "食物類", "其他類"];

function App() {
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const filteredFreebies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return [...freebies]
      .sort((a, b) => {
        if (a.priorityGroup === "featured" && b.priorityGroup !== "featured") return -1;
        if (a.priorityGroup !== "featured" && b.priorityGroup === "featured") return 1;
        return 0;
      })
      .filter((item) => {
        const matchCategory =
          selectedCategory === "全部" || item.category === selectedCategory;

        const searchableText = [
          item.fanAccount,
          item.category,
          item.itemName,
          item.pickupMethod,
          item.pickupTime,
          item.pickupLocation,
          item.originalText,
        ]
          .join(" ")
          .toLowerCase();

        const matchKeyword =
          normalizedKeyword === "" || searchableText.includes(normalizedKeyword);

        return matchCategory && matchKeyword;
      });
  }, [selectedCategory, keyword]);

  return (
    <div className="app">
      <header className="hero">
        <h1>ONCE 啤酒節應援物情報站</h1>
        <p>
          彙整高雄啤酒節期間 ONCE 粉絲創作者發布的應援物資訊，
          方便大家快速查看品項、領取資訊與原文連結。
        </p>
      </header>

      <section className="filters">
        <input
          className="search-input"
          type="text"
          placeholder="搜尋關鍵字、帳號、品項、領取資訊..."
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />

        <div className="category-buttons">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className={
                selectedCategory === category
                  ? "category-button active"
                  : "category-button"
              }
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <div className="result-count">
        目前顯示 {filteredFreebies.length} 筆應援物資訊
      </div>

      {selectedItem && (
        <section className="detail-panel">
            <button className="back-button" onClick={() => setSelectedItem(null)}>
            ← 回到列表
            </button>

            <h2>{selectedItem.itemName}</h2>

            <a
            href={selectedItem.fanAccountUrl}
            target="_blank"
            rel="noreferrer"
            className="fan-account detail-account"
            >
            @{selectedItem.fanAccount}
            </a>

            <div className="detail-images">
            {selectedItem.images.map((image) => (
                <img key={image} src={image} alt={selectedItem.itemName} />
            ))}
            </div>

            {selectedItem.hasVideo && (
            <p className="video-note">此貼文含影片，請點擊原文觀看。</p>
            )}

            <div className="detail-info">
            <p><strong>類別：</strong>{selectedItem.category}</p>
            <p><strong>品項：</strong>{selectedItem.itemName}</p>
            <p><strong>領取方式：</strong>{selectedItem.pickupMethod}</p>
            <p><strong>領取時間：</strong>{selectedItem.pickupTime}</p>
            <p><strong>領取地點：</strong>{selectedItem.pickupLocation}</p>
            </div>

            <div className="original-text">
            <h3>發布原文</h3>
            <p>{selectedItem.originalText}</p>
            </div>

            <a
            href={selectedItem.postUrl}
            target="_blank"
            rel="noreferrer"
            className="primary-link"
            >
            查看原文
            </a>
        </section>
        )}

      <main className="card-grid">
        {filteredFreebies.map((item) => (
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
                <span>{item.displayName || item.itemName}</span>
              </div>
            </div>
          </article>
        ))}
      </main>

      {filteredFreebies.length === 0 && (
        <p className="empty-message">目前沒有符合條件的應援物資訊。</p>
      )}
    </div>
  );
}

export default App;