import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import { freebies, siteLinks } from "./data/freebies";
import "./App.css";

const categories = ["全部", "紙本類", "配件類", "實用小物", "綜合類"];

const LOCAL_FAVORITES_KEY = "onceBeerFavorites";
const LOCAL_FAVORITES_OWNER_KEY = "onceBeerFavoritesOwnerUid";
const LOGIN_PROMPT_DISMISSED_KEY = "onceBeerLoginPromptDismissed";
const GUEST_OWNER = "guest";

const paperKeywords = [
  "小卡",
  "卡片",
  "貼紙",
  "透卡",
  "手幅",
  "紙袋",
  "提袋",
  "歌單",
  "明信片",
  "感謝卡",
  "香薰卡",
  "百貼布",
  "便利貼",
  "紀念章",
  "票根",
];

const accessoryKeywords = [
  "徽章",
  "胸針",
  "戒指",
  "手環",
  "髮夾",
  "吊飾",
  "鑰匙圈",
  "瀏海貼",
  "御守",
  "決策幣",
  "開瓶器",
  "香片",
];

const practicalKeywords = [
  "扇",
  "透扇",
  "折扇",
  "圓扇",
  "原子筆",
  "濕紙巾",
  "衛生紙",
  "手帕紙",
  "收納袋",
  "袋子",
  "環保袋",
  "鏡子",
  "凸面鏡",
  "圓鏡",
  "杯墊",
  "杯",
  "防蚊貼",
  "卡套",
  "零錢包",
  "行李飄帶",
  "梳子",
  "湯匙",
  "叉子",
  "毛巾",
];

const getItemCategory = (item) => {
  if (["紙本類", "配件類", "實用小物", "綜合類"].includes(item.category)) {
    return item.category;
  }

  const text = `${item.itemName || ""} ${item.displayName || ""}`;

  const matchedGroups = [];

  if (paperKeywords.some((keyword) => text.includes(keyword))) {
    matchedGroups.push("紙本類");
  }

  if (accessoryKeywords.some((keyword) => text.includes(keyword))) {
    matchedGroups.push("配件類");
  }

  if (practicalKeywords.some((keyword) => text.includes(keyword))) {
    matchedGroups.push("實用小物");
  }

  const uniqueGroups = [...new Set(matchedGroups)];

  if (uniqueGroups.length >= 2) {
    return "綜合類";
  }

  if (uniqueGroups.length === 1) {
    return uniqueGroups[0];
  }

  return "實用小物";
};

const getThanksTemplates = (item) => {
  if (!item) return [];

  const account = `@${item.fanAccount}`;
  const itemName = item.displayName || item.itemName;

  return [
    {
      type: "short",
      label: "簡短",
      text: `謝謝 ${account} 的應援物，會好好珍惜💙`,
    },
    {
      type: "normal",
      label: "一般",
      text: `今天領到 ${account} 的「${itemName}」了，真的很喜歡，謝謝你用心準備這份應援💙`,
    },
    {
      type: "cute",
      label: "可愛",
      text: `成功領到 ${account} 的「${itemName}」！實體好可愛，拿到的時候超開心，謝謝你讓啤酒節多了一份回憶💙`,
    },
    {
      type: "cherish",
      label: "珍惜",
      text: `謝謝 ${account} 準備的「${itemName}」，看得出來很用心，我會好好珍惜，不會轉售或丟棄💙`,
    },
    {
      type: "photo",
      label: "返圖",
      text: `領到 ${account} 的「${itemName}」了！附上返圖，謝謝你準備這麼棒的應援，辛苦了💙`,
    },
  ];
};

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
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);
  const [showThanksModal, setShowThanksModal] = useState(false);
  const [selectedThanksType, setSelectedThanksType] = useState("short");
  const [thanksCopyMessage, setThanksCopyMessage] = useState("");

  const cardSectionRef = useRef(null);

  const getLocalFavoriteIds = () => {
    const savedFavorites = localStorage.getItem(LOCAL_FAVORITES_KEY);

    if (!savedFavorites) return [];

    try {
      return JSON.parse(savedFavorites);
    } catch {
      return [];
    }
  };

  const saveLocalFavoriteIds = (ids, ownerUid = GUEST_OWNER) => {
    localStorage.setItem(LOCAL_FAVORITES_KEY, JSON.stringify(ids));
    localStorage.setItem(LOCAL_FAVORITES_OWNER_KEY, ownerUid);
  };

  const saveUserFavoritesToFirestore = async (userId, ids) => {
    await setDoc(
      doc(db, "userFavorites", userId),
      {
        favoriteIds: ids,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  };

  const loadUserFavoritesFromFirestore = async (userId) => {
    const snapshot = await getDoc(doc(db, "userFavorites", userId));

    if (!snapshot.exists()) {
      return [];
    }

    return snapshot.data().favoriteIds || [];
  };

  useEffect(() => {
    const localFavorites = getLocalFavoriteIds();
    setFavoriteIds(localFavorites);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        try {
          const localFavorites = getLocalFavoriteIds();
          const localOwnerUid = localStorage.getItem(LOCAL_FAVORITES_OWNER_KEY);

          const cloudFavorites = await loadUserFavoritesFromFirestore(
            currentUser.uid
          );

          const shouldMergeLocalFavorites =
            localFavorites.length > 0 && localOwnerUid !== currentUser.uid;

          const nextFavorites = shouldMergeLocalFavorites
            ? Array.from(new Set([...localFavorites, ...cloudFavorites]))
            : cloudFavorites;

          setFavoriteIds(nextFavorites);
          saveLocalFavoriteIds(nextFavorites, currentUser.uid);
          await saveUserFavoritesToFirestore(currentUser.uid, nextFavorites);
        } catch (error) {
          console.error("Load favorites failed:", error);
          alert("讀取雲端收藏失敗，會先使用本機收藏。");
        }
      } else {
        setFavoriteIds(getLocalFavoriteIds());
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    saveLocalFavoriteIds(favoriteIds, user ? user.uid : GUEST_OWNER);
  }, [favoriteIds, user]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 700);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, keyword, showFavoritesOnly]);

  useEffect(() => {
    if (selectedItem) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto",
      });
    }
  }, [selectedItem]);

  const pageSize = isMobile ? 10 : 15;

  const sortedFreebies = useMemo(() => {
    return [...freebies].sort((a, b) => {
      if (a.priorityGroup === "featured" && b.priorityGroup !== "featured") {
        return -1;
      }

      if (a.priorityGroup !== "featured" && b.priorityGroup === "featured") {
        return 1;
      }

      return 0;
    });
  }, []);

  const filteredFreebies = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return sortedFreebies.filter((item) => {
      const computedCategory = getItemCategory(item);

      const matchCategory =
        selectedCategory === "全部" || computedCategory === selectedCategory;

      const searchableText = [
        item.fanAccount,
        computedCategory,
        item.itemName,
        item.displayName,
        item.originalText,
      ]
        .join(" ")
        .toLowerCase();

      const keywordParts = normalizedKeyword
        .split(/\s+/)
        .filter((part) => part.length > 0);

      const matchKeyword =
        keywordParts.length === 0 ||
        keywordParts.every((part) => searchableText.includes(part));

      const matchFavorite = !showFavoritesOnly || favoriteIds.includes(item.id);

      return matchCategory && matchKeyword && matchFavorite;
    });
  }, [selectedCategory, keyword, showFavoritesOnly, favoriteIds, sortedFreebies]);

  const totalPages = Math.max(1, Math.ceil(filteredFreebies.length / pageSize));

  const paginatedFreebies = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredFreebies.slice(startIndex, startIndex + pageSize);
  }, [filteredFreebies, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const favoriteItems = useMemo(() => {
    return sortedFreebies.filter((item) => favoriteIds.includes(item.id));
  }, [favoriteIds, sortedFreebies]);

  const thanksTemplates = useMemo(() => {
    return getThanksTemplates(selectedItem);
  }, [selectedItem]);

  const selectedThanksText = useMemo(() => {
    return (
      thanksTemplates.find((template) => template.type === selectedThanksType)
        ?.text || ""
    );
  }, [thanksTemplates, selectedThanksType]);

  const openDetail = (item) => {
    setSelectedItem(item);
    setCurrentImageIndex(0);
    setCopyMessage("");
    setThanksCopyMessage("");
    setShowThanksModal(false);
  };

  const closeDetail = () => {
    setSelectedItem(null);
    setCurrentImageIndex(0);
    setLightboxImage(null);
    setShowThanksModal(false);
    setThanksCopyMessage("");
  };

  const openThanksModal = () => {
    setSelectedThanksType("short");
    setThanksCopyMessage("");
    setShowThanksModal(true);
  };

  const copyThanksText = async () => {
    try {
      await navigator.clipboard.writeText(selectedThanksText);
      setThanksCopyMessage("已複製感謝文字！");
    } catch {
      setThanksCopyMessage("複製失敗，請手動選取文字複製。");
    }
  };

  const toggleFavoriteDirectly = async (itemId) => {
    const nextFavoriteIds = favoriteIds.includes(itemId)
      ? favoriteIds.filter((id) => id !== itemId)
      : [...favoriteIds, itemId];

    setFavoriteIds(nextFavoriteIds);
    saveLocalFavoriteIds(nextFavoriteIds, user ? user.uid : GUEST_OWNER);

    if (user) {
      try {
        await saveUserFavoritesToFirestore(user.uid, nextFavoriteIds);
      } catch (error) {
        console.error("Save favorites failed:", error);
        alert("雲端收藏同步失敗，但本機收藏已保留。");
      }
    }
  };

  const toggleFavorite = async (itemId) => {
    const hasSeenLoginPrompt =
      localStorage.getItem(LOGIN_PROMPT_DISMISSED_KEY) === "true";

    if (!user && !hasSeenLoginPrompt) {
      setPendingFavoriteId(itemId);
      setShowLoginPrompt(true);
      return;
    }

    await toggleFavoriteDirectly(itemId);
  };

  const continueWithoutLogin = async () => {
    localStorage.setItem(LOGIN_PROMPT_DISMISSED_KEY, "true");
    setShowLoginPrompt(false);

    if (pendingFavoriteId) {
      await toggleFavoriteDirectly(pendingFavoriteId);
      setPendingFavoriteId(null);
    }
  };

  const loginFromPrompt = async () => {
    localStorage.setItem(LOGIN_PROMPT_DISMISSED_KEY, "true");
    setShowLoginPrompt(false);

    if (pendingFavoriteId && !favoriteIds.includes(pendingFavoriteId)) {
      const nextFavoriteIds = [...favoriteIds, pendingFavoriteId];
      setFavoriteIds(nextFavoriteIds);
      saveLocalFavoriteIds(nextFavoriteIds, GUEST_OWNER);
    }

    setPendingFavoriteId(null);

    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed:", error);
      alert("登入失敗，請再試一次。");
    }
  };

  const openExportModal = () => {
    if (favoriteItems.length === 0) {
      setCopyMessage("目前還沒有收藏任何應援物。");
      return;
    }

    const text =
      "我的萬斯啤酒節應援物收藏清單\n\n" +
      favoriteItems
        .map((item, index) => {
          return `${index + 1}. @${item.fanAccount}｜${
            item.displayName || item.itemName
          }
原文連結：${item.postUrl}`;
        })
        .join("\n\n");

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

  const scrollToCardSection = () => {
    setTimeout(() => {
      if (cardSectionRef.current) {
        cardSectionRef.current.scrollIntoView({
          behavior: "auto",
          block: "start",
        });
      }
    }, 0);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    scrollToCardSection();
  };

  const getPageNumbers = () => {
    const pages = [];

    if (totalPages <= 7) {
      for (let page = 1; page <= totalPages; page += 1) {
        pages.push(page);
      }

      return pages;
    }

    pages.push(1);

    if (currentPage > 4) {
      pages.push("start-ellipsis");
    }

    const startPage = Math.max(2, currentPage - 1);
    const endPage = Math.min(totalPages - 1, currentPage + 1);

    for (let page = startPage; page <= endPage; page += 1) {
      pages.push(page);
    }

    if (currentPage < totalPages - 3) {
      pages.push("end-ellipsis");
    }

    pages.push(totalPages);

    return pages;
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google login failed:", error);
      alert("登入失敗，請再試一次。");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
      alert("登出失敗，請再試一次。");
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
                {getItemCategory(selectedItem)}
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
                onClick={() =>
                  setLightboxImage(selectedItem.images[currentImageIndex])
                }
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
              <button
                type="button"
                className="thanks-open-button"
                onClick={openThanksModal}
              >
                感謝創作者
              </button>

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
            <h1>萬斯啤酒節應援物情報站</h1>
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

              {authLoading ? (
                <button type="button" className="login-button" disabled>
                  載入中
                </button>
              ) : user ? (
                <button
                  type="button"
                  className="login-button logged-in"
                  onClick={handleLogout}
                >
                  {user.displayName ? `${user.displayName}｜登出` : "已登入｜登出"}
                </button>
              ) : (
                <button
                  type="button"
                  className="login-button"
                  onClick={handleGoogleLogin}
                >
                  Google 登入
                </button>
              )}
            </div>

            <p className="sync-warning">
              提醒：若使用 Google 收藏同步，建議同一時間只在一個裝置操作收藏，避免多裝置同時修改造成收藏狀態不同步。
            </p>
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
            目前顯示 {paginatedFreebies.length} / {filteredFreebies.length}{" "}
            筆應援物資訊
          </div>

          <div ref={cardSectionRef} className="card-section-anchor" />

          {filteredFreebies.length > 0 && totalPages > 1 && (
            <nav className="pagination pagination-top">
              <button
                type="button"
                className="pagination-button"
                disabled={currentPage === 1}
                onClick={() => goToPage(Math.max(1, currentPage - 1))}
              >
                上一頁
              </button>

              <div className="page-number-list">
                {getPageNumbers().map((page) =>
                  typeof page === "number" ? (
                    <button
                      key={page}
                      type="button"
                      className={
                        currentPage === page
                          ? "page-number-button active"
                          : "page-number-button"
                      }
                      onClick={() => goToPage(page)}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={page} className="page-ellipsis">
                      …
                    </span>
                  )
                )}
              </div>

              <button
                type="button"
                className="pagination-button"
                disabled={currentPage === totalPages}
                onClick={() => goToPage(Math.min(totalPages, currentPage + 1))}
              >
                下一頁
              </button>
            </nav>
          )}

          <main className="card-grid">
            {paginatedFreebies.map((item) => (
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
                    <span>{getItemCategory(item)}</span>
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

      {showExportModal && (
        <div
          className="export-modal-backdrop"
          onClick={() => setShowExportModal(false)}
        >
          <div className="export-modal" onClick={(event) => event.stopPropagation()}>
            <h2>匯出收藏清單</h2>

            <textarea className="export-textarea" value={exportText} readOnly />

            {copyMessage && <p className="export-copy-message">{copyMessage}</p>}

            <div className="export-actions">
              <button
                type="button"
                className="primary-button"
                onClick={copyExportText}
              >
                複製文字
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowExportModal(false);
                  setCopyMessage("");
                }}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {showThanksModal && selectedItem && (
        <div
          className="thanks-modal-backdrop"
          onClick={() => setShowThanksModal(false)}
        >
          <div
            className="thanks-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>感謝創作者</h2>

            <p className="thanks-note">
              選一段想留言或發限動的文字，複製後可以回到原文留言、返圖或標記創作者。小小一句回應，對創作者來說會很有力量💙
            </p>

            <div className="thanks-type-buttons">
              {thanksTemplates.map((template) => (
                <button
                  key={template.type}
                  type="button"
                  className={
                    selectedThanksType === template.type
                      ? "thanks-type-button active"
                      : "thanks-type-button"
                  }
                  onClick={() => {
                    setSelectedThanksType(template.type);
                    setThanksCopyMessage("");
                  }}
                >
                  {template.label}
                </button>
              ))}
            </div>

            <textarea
              className="thanks-textarea"
              value={selectedThanksText}
              readOnly
            />

            {thanksCopyMessage && (
              <p className="thanks-copy-message">{thanksCopyMessage}</p>
            )}

            <div className="thanks-actions">
              <button
                type="button"
                className="primary-button"
                onClick={copyThanksText}
              >
                複製感謝文字
              </button>

              <a
                href={selectedItem.postUrl}
                target="_blank"
                rel="noreferrer"
                className="primary-link"
              >
                前往原文留言
              </a>

              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setShowThanksModal(false);
                  setThanksCopyMessage("");
                }}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {showLoginPrompt && (
        <div
          className="login-prompt-backdrop"
          onClick={() => setShowLoginPrompt(false)}
        >
          <div
            className="login-prompt-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <h2>要登入後同步收藏嗎？</h2>

            <p>
              不登入也可以收藏，但收藏只會保存在目前這台裝置。
              使用 Google 登入後，可以在不同裝置間同步收藏內容。
              若使用 Google 收藏同步，建議同一時間只在一個裝置操作收藏，避免多裝置同時修改造成收藏狀態不同步。
            </p>

            <div className="login-prompt-actions">
              <button
                type="button"
                className="primary-button"
                onClick={loginFromPrompt}
              >
                使用 Google 登入
              </button>

              <button
                type="button"
                className="secondary-button"
                onClick={continueWithoutLogin}
              >
                先不用，繼續收藏
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;