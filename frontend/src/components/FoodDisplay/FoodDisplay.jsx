import PropTypes from "prop-types";
import { useContext, useMemo } from "react";
import "./FoodDisplay.css";
import { StoreContext } from "../../context/StoreContext";
import FoodItem from "../FoodItem/FoodItem";
import { DEFAULT_CATEGORY_DESCRIPTOR } from "../../utils/categoryMeta";

const FoodDisplay = ({ category }) => {
  const {
    food_list,
    getCategoryDescriptor,
    defaultCategoryDescriptor,
  } = useContext(StoreContext);

  const descriptor = useMemo(() => {
    const fallback = defaultCategoryDescriptor || DEFAULT_CATEGORY_DESCRIPTOR;
    if (!category || category === "All") {
      return fallback;
    }

    if (typeof getCategoryDescriptor === "function") {
      const descriptorFromCategory = getCategoryDescriptor(category);
      if (descriptorFromCategory) return descriptorFromCategory;
    }

    return {
      ...fallback,
      headline: `${category} specials from our chefs`,
    };
  }, [category, getCategoryDescriptor, defaultCategoryDescriptor]);

  const filteredItems = useMemo(() => {
    if (!Array.isArray(food_list)) return [];
    if (!category || category === "All") return food_list;
    return food_list.filter((item) => {
      const itemCategory = item?.category;
      if (!itemCategory) return false;
      return (
        itemCategory === category ||
        itemCategory?.toLowerCase() === category?.toLowerCase()
      );
    });
  }, [food_list, category]);

  return (
    <section className="food-display app-section" id="food-display">
      <header className="food-display__header">
        <div className="food-display__intro">
          <span
            className="food-display__badge"
            style={{
              backgroundColor: descriptor.accent
                ? `${descriptor.accent}1f`
                : "rgba(205, 81, 53, 0.12)",
              color: descriptor.accent
                ? descriptor.accent
                : "rgba(205, 81, 53, 0.95)",
            }}
          >
            {descriptor.eyebrow}
          </span>
          <h2>{descriptor.headline}</h2>
        </div>
        <p className="food-display__description">{descriptor.description}</p>
        <a className="food-display__cta" href="#explore-menu">
          Browse all categories
        </a>
      </header>

      {filteredItems.length === 0 ? (
        <div className="food-display__empty">
          <p>हम इस समय इस श्रेणी के व्यंजन तैयार कर रहे हैं।</p>
          <p>
            We&apos;re slow-cooking the perfect recipes—peek back soon or choose
            another category.
          </p>
        </div>
      ) : (
        <div className="food-display-list">
          {filteredItems.map((item) => (
            <FoodItem
              key={item._id}
              id={item._id}
              name={item.name}
              description={item.description}
              price={item.price}
              image={item.image}
              category={item.category}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default FoodDisplay;

FoodDisplay.propTypes = {
  category: PropTypes.string,
};
