import { useEffect, useMemo, useState } from "react";
import { freebies, siteLinks } from "./data/freebies";
import "./App.css";

const categories = ["全部", "紙本類", "配件類", "套組類", "食物類", "其他類"];

function App() {
  const [selectedCategory, setSelectedCategory] = useState("全部");
  const [keyword, setKeyword] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
const [exportText, setExportText] = useState("");
const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const savedFavorites = localStorage.getItem("onceBeerFavorites");

    if (savedFavorites) {
      try {
        setFavoriteIds(JSON.parse(savedFavorites));
      } catch {
        setFavoriteIds([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("onceBeerFavorites", JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  const sortedFreebies = useMemo(() => {
    return [...freebies].sort((a, b) => {
      if (a.priorityGroup === "featured" && b.priorityGroup !== "featured") return -1;
      if (a.priorityGroup !== "featured" && b.priorityGroup === "featured") return 1;
      return 0;
    });
  }, []);

  const filteredFreebies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return sortedFreebies.filter((item) => {
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

      const matchFavorite =
        !showFavoritesOnly || favoriteIds.includes(item.id);

      return matchCategory && matchKeyword && matchFavorite;
    });
  }, [selectedCategory, keyword, showFavoritesOnly, favoriteIds, sortedFreebies]);

  const favoriteItems = useMemo(() => {
    return sortedFreebies.filter((item) => favoriteIds.includes(item.id));
  }, [favoriteIds, sortedFreebies]);

  const openDetail = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    setCopyMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setCurrentImageIndex(0);
    setLightboxImage(null);
  };

  const toggleFavorite = (itemId) => {
    setFavoriteIds((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      }

      return [...prev, itemId];
    });
  };

  const openExportModal = () => {
  if (favoriteItems.length === 0) {
    setCopyMessage("目前還沒有收藏任何應援物。");
    return;
  }

  const text = [
    "我的 ONCE 啤酒節應援物收藏清單",
    "",
    ...favoriteItems.map((item, index) => {
      return `${index + 1}. @${item.fanAccount}｜${item.displayName || item.itemName}
原文連結：${item.postUrl}`;
    }),
  ].join("\n\n");

  setExportText(text);
  setCopyMessage("");
  setShowExportModal(true);
};

const copyExportText = async () => {
  try {
    await navigator.clipboard.writeText(exportText);
    setCopyMessage("已複製文字！");
  } catch {
    setCopyMessage("複製失敗，請再試一次。");
  }
};

  return (
    <div className="app">
      {selectedItem ? (
        <main className="detail-page">
          <button className="floating-back-button" onClick={closeDetail}>
            ← 回到列表
          </button>

          <section className="detail-panel">
            <div className="detail-header-row">
              <a
                href={selectedItem.fanAccountUrl}
                target="_blank"
                rel="noreferrer"
                className="detail-title account-title-link"
              >
                @{selectedItem.fanAccount}
              </a>

              <button
                type="button"
                className={
                  favoriteIds.includes(selectedItem.id)
                    ? "favorite-button active"
                    : "favorite-button"
                }
                onClick={() => toggleFavorite(selectedItem.id)}
              >
                {favoriteIds.includes(selectedItem.id) ? "♥ 已收藏" : "♡ 收藏"}
              </button>
            </div>

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

              <button
                type="button"
                className={
                  showFavoritesOnly
                    ? "secondary-action-button active"
                    : "secondary-action-button"
                }
                onClick={() => setShowFavoritesOnly((prev) => !prev)}
              >
                {showFavoritesOnly ? "查看全部" : `我的收藏 ${favoriteIds.length}`}
              </button>
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

          {showFavoritesOnly && (
            <section className="favorite-tools">
  <button
    type="button"
    className="copy-button"
    onClick={openExportModal}
  >
    匯出收藏清單
  </button>

  {copyMessage && <span className="copy-message">{copyMessage}</span>}
</section>
          )}

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
                <button
                  type="button"
                  className={
                    favoriteIds.includes(item.id)
                      ? "card-favorite-button active"
                      : "card-favorite-button"
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleFavorite(item.id);
                  }}
                  aria-label="收藏"
                >
                  {favoriteIds.includes(item.id) ? "♥" : "♡"}
                </button>

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
            <p className="empty-message">
              {showFavoritesOnly
                ? "目前還沒有收藏任何應援物。"
                : "目前沒有符合條件的應援物資訊。"}
            </p>
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