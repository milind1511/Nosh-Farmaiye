import "./ExploreMenu.css";
import PropTypes from "prop-types";
import { useContext, useMemo } from "react";
import { StoreContext } from "../../context/StoreContext";

const ArrowIcon = () => (
  <svg
    aria-hidden="true"
    focusable="false"
    viewBox="0 0 24 24"
    role="img"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 12h12m-4-5 5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  </svg>
);

const ExploreMenu = ({ category, setCategory }) => {
  const {
    categories,
    categoriesLoading,
    categoriesError,
    usingFallbackCategories,
  } = useContext(StoreContext);

  const menuCategories = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories.filter((item) => item && (item.id || item.slug));
  }, [categories]);

  const scrollToFoodSection = () => {
    if (typeof window === "undefined") return;
    const section = document.getElementById("food-display");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleSelect = (id) => {
    setCategory((prev) => (prev === id ? "All" : id));
    if (typeof window !== "undefined") {
      window.requestAnimationFrame(scrollToFoodSection);
    }
  };

  const fallbackStatusMessage =
    !categoriesLoading &&
    menuCategories.length > 0 &&
    (categoriesError || usingFallbackCategories)
      ? (
          <p
            className={`explore-menu__status ${
              categoriesError
                ? "explore-menu__status--error"
                : "explore-menu__status--notice"
            }`}
          >
            {categoriesError
              ? `${categoriesError} Showing our house picks for now.`
              : "Showing our house picks while we refresh categories."}
          </p>
        )
      : null;

  return (
    <section className="explore-menu app-section" id="explore-menu">
      <header className="explore-menu__header">
        <div className="explore-menu__intro">
          <span className="explore-menu__badge">चखिए • Feast Your Senses</span>
          <h1>Curated categories from our home kitchen</h1>
        </div>
        <p className="explore-menu-text">
          Follow your cravings—whether it&apos;s smoky tandoor chicken, regal
          mutton slow-cooked overnight, or desserts mellowed with kesar and
          pista.
        </p>
      </header>
      <div className="explore-menu-list">
        {categoriesLoading ? (
          <p className="explore-menu__status">Loading categories…</p>
        ) : menuCategories.length === 0 ? (
          <p className="explore-menu__status explore-menu__status--error">
            {categoriesError || "We couldn’t load categories just now. Please retry."}
          </p>
        ) : (
          <>
            {fallbackStatusMessage}
            {menuCategories.map((item) => {
              const key = item.id || item.slug;
              const isActive =
                category === item.id ||
                category === item.slug ||
                category?.toLowerCase() === item.slug?.toLowerCase();
              const accent = item.accent || "rgba(205, 81, 53, 0.95)";
              const accentBackground = accent.startsWith("#")
                ? `${accent}1a`
                : "rgba(205, 81, 53, 0.12)";

              return (
                <button
                  type="button"
                  key={key}
                  className={`category-card ${
                    isActive ? "category-card--active" : ""
                  }`}
                  data-category={item.id || item.slug}
                  aria-pressed={isActive}
                  onClick={() => handleSelect(item.id || item.slug)}
                >
                  {item.badge ? (
                    <span className="category-card__badge">{item.badge}</span>
                  ) : null}
                  <span
                    className="category-card__icon"
                    style={{
                      color: accent,
                      backgroundColor: accentBackground,
                    }}
                  >
                    {item.icon || "🍽️"}
                  </span>
                  <div className="category-card__labels">
                    <span className="category-card__label-primary">
                      {item.labelHi || item.labelEn || item.label}
                    </span>
                    <span className="category-card__label-secondary">
                      {item.labelEn || item.label}
                    </span>
                  </div>
                  <p className="category-card__description">
                    {item.caption || item.description}
                  </p>
                  <span className="category-card__cta">
                    View dishes <ArrowIcon />
                  </span>
                </button>
              );
            })}
          </>
        )}
      </div>

      <hr />
    </section>
  );
};

ExploreMenu.propTypes = {
  category: PropTypes.string.isRequired,
  setCategory: PropTypes.func.isRequired,
};

export default ExploreMenu;
