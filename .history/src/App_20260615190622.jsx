import { useMemo, useState } from "react";
import { freebies, siteLinks } from "./data/freebies";
import "./App.css";

const categories = ["全部", "紙本類", "配件類", "套組類", "食物類", "其他類"];

function App() {
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);

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
          item.displayName,
          item.originalText,
        ]
          .join(" ")
          .toLowerCase();

        const matchKeyword =
          normalizedKeyword === "" || searchableText.includes(normalizedKeyword);

        return matchCategory && matchKeyword;
      });
  }, [selectedCategory, keyword]);

  const openDetail = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setCurrentImageIndex(0);
    setLightboxImage(null);
  };

  return (
    <div className="app">
      {selectedItem ? (
        <main className="detail-page">
          <section className="detail-panel">
            <button className="floating-back-button" onClick={closeDetail}>
  ← 回到列表
</button>

            <a
              href={selectedItem.fanAccountUrl}
              target="_blank"
              rel="noreferrer"
              className="detail-title account-title-link"
            >
              @{selectedItem.fanAccount}
            </a>

            <div className="detail-info">
              <p>
                <strong>類別：</strong>
                {selectedItem.category}
              </p>
              <p>
                <strong>品項：</strong>
                {selectedItem.itemName}
              </p>
            </div>

            <div className="original-text">
              <p>{selectedItem.originalText}</p>
            </div>

            <div className="image-carousel">
              <button
                type="button"
                className="carousel-button"
                onClick={() =>
                  setCurrentImageIndex((prev) =>
                    prev === 0 ? selectedItem.images.length - 1 : prev - 1
                  )
                }
                disabled={selectedItem.images.length <= 1}
              >
                ‹
              </button>

              <img
                src={selectedItem.images[currentImageIndex]}
                alt={selectedItem.itemName}
                className="carousel-image"
                onClick={() => setLightboxImage(selectedItem.images[currentImageIndex])}
              />

              <button
                type="button"
                className="carousel-button"
                onClick={() =>
                  setCurrentImageIndex((prev) =>
                    prev === selectedItem.images.length - 1 ? 0 : prev + 1
                  )
                }
                disabled={selectedItem.images.length <= 1}
              >
                ›
              </button>
            </div>

            {selectedItem.images.length > 1 && (
              <div className="image-count">
                {currentImageIndex + 1} / {selectedItem.images.length}
              </div>
            )}

            <div className="detail-actions">
              <a
                href={selectedItem.postUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-link"
              >
                查看原文
              </a>

              <a
                href={siteLinks.removalForm}
                target="_blank"
                rel="noreferrer"
                className="secondary-link"
              >
                原作者申請修改或撤下
              </a>
            </div>
          </section>
        </main>
      ) : (
        <>
          <header className="hero">
            <h1>ONCE 啤酒節應援物情報站</h1>
            <p>
              彙整高雄啤酒節期間 ONCE 粉絲創作者發布的應援物資訊，方便大家快速查看與回到原文確認。
            </p>

            <div className="hero-actions">
              <a
                href={siteLinks.submissionForm}
                target="_blank"
                rel="noreferrer"
                className="primary-link"
              >
                我要投稿
              </a>
            </div>
          </header>

          <section className="filters">
            <input
              className="search-input"
              type="text"
              placeholder="搜尋關鍵字、帳號"
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

          <main className="card-grid">
            {filteredFreebies.map((item) => (
              <article
                className="freebie-card"
                key={item.id}
                onClick={() => openDetail(item)}
              >
                <img
                  src={item.mainImage}
                  alt={item.displayName || item.itemName}
                  className="card-image"
                />

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

          <footer className="disclaimer">
            本網站僅彙整公開發布之應援物發放資訊，實際發放方式、時間、地點與數量請以發布者原文為準。
          </footer>
        </>
      )}

      {lightboxImage && (
        <div className="lightbox" onClick={() => setLightboxImage(null)}>
          <button className="lightbox-close" type="button">
            ×
          </button>
          <img src={lightboxImage} alt="放大圖片" />
        </div>
      )}
    </div>
  );
}

export default App;