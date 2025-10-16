import axios from "axios";
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "react-toastify";
import {
  API_BASE_URL,
  DEFAULT_CURRENCY,
  DEFAULT_DELIVERY_FEE,
} from "../config";
import PropTypes from "prop-types";
import {
  DEFAULT_CATEGORY_DESCRIPTOR,
  FALLBACK_CATEGORIES,
  buildCategoryIndex,
  selectCategoryAccent,
  selectCategoryBadge,
  selectCategoryDescriptor,
  selectCategoryMeta,
} from "../utils/categoryMeta";

export const StoreContext = createContext(null);

const StoreContextProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState({});
  const url = API_BASE_URL;
  const [token, setToken] = useState("");
  const [food_list, setFoodList] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);
  const [usingFallbackCategories, setUsingFallbackCategories] =
    useState(true);

  const addToCart = useCallback(
    async (itemId) => {
      setCartItems((prev) => {
        const nextQuantity = (prev[itemId] || 0) + 1;
        return { ...prev, [itemId]: nextQuantity };
      });

      if (!token) return;

      try {
        const response = await axios.post(
          `${url}/api/cart/add`,
          { itemId },
          { headers: { token } }
        );
        if (response.data.success) {
          toast.success("Item added to cart");
        } else {
          toast.error(response.data.message || "Could not update cart");
        }
      } catch (error) {
        toast.error("We couldn’t reach the kitchen. Please retry.");
      }
    },
    [token, url]
  );

  const removeFromCart = useCallback(
    async (itemId) => {
      setCartItems((prev) => {
        const updated = { ...prev };
        if (!updated[itemId]) return updated;

        if (updated[itemId] === 1) {
          delete updated[itemId];
        } else {
          updated[itemId] -= 1;
        }
        return updated;
      });

      if (!token) return;

      try {
        const response = await axios.post(
          `${url}/api/cart/remove`,
          { itemId },
          { headers: { token } }
        );
        if (response.data.success) {
          toast.success("Item removed from cart");
        } else {
          toast.error(response.data.message || "Could not update cart");
        }
      } catch (error) {
        toast.error("We couldn’t reach the kitchen. Please retry.");
      }
    },
    [token, url]
  );

  const clearCart = useCallback(() => {
    setCartItems({});
  }, [setCartItems]);

  const getTotalCartAmount = useCallback(() => {
    return Object.entries(cartItems).reduce((sum, [itemId, quantity]) => {
      if (quantity <= 0) return sum;
      const itemInfo = food_list.find((product) => product._id === itemId);
      if (!itemInfo) return sum;
      return sum + itemInfo.price * quantity;
    }, 0);
  }, [cartItems, food_list]);

  const fetchFoodList = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/food/list`);
      if (response.data.success) {
        setFoodList(response.data.data);
      } else {
        toast.error(response.data.message || "Unable to load dishes");
      }
    } catch (error) {
      toast.error("We couldn’t load dishes. Please retry.");
    }
  }, [url]);

  const fetchFoodCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await axios.get(`${url}/api/food/categories`);
      const payload = response.data.data;
      if (
        response.data.success &&
        Array.isArray(payload) &&
        payload.length > 0
      ) {
        setCategories(payload);
        setCategoriesError(null);
        setUsingFallbackCategories(false);
      } else {
        const message = response.data.message || "Unable to load menu categories";
        setCategories(FALLBACK_CATEGORIES);
        setCategoriesError(message);
        setUsingFallbackCategories(true);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "We couldn’t load menu categories. Please retry.";
      setCategories(FALLBACK_CATEGORIES);
      setCategoriesError(message);
      setUsingFallbackCategories(true);
      toast.error(message);
    } finally {
      setCategoriesLoading(false);
    }
  }, [url]);

  const loadCartData = useCallback(
    async (authToken) => {
      try {
        const response = await axios.post(
          `${url}/api/cart/get`,
          {},
          { headers: { token: authToken } }
        );
        setCartItems(response.data.cartData || {});
      } catch (error) {
        toast.error("Unable to fetch your cart right now.");
      }
    },
    [url]
  );

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([fetchFoodList(), fetchFoodCategories()]);
      const storedToken = localStorage.getItem("token");
      if (storedToken) {
        setToken(storedToken);
        await loadCartData(storedToken);
      }
    };

    loadData();
  }, [fetchFoodList, fetchFoodCategories, loadCartData]);

  const categoryIndex = useMemo(
    () => buildCategoryIndex(categories),
    [categories]
  );

  const getCategoryMeta = useCallback(
    (key) => selectCategoryMeta(categoryIndex, key),
    [categoryIndex]
  );

  const getCategoryDescriptor = useCallback(
    (key) => selectCategoryDescriptor(categoryIndex, key),
    [categoryIndex]
  );

  const getCategoryAccent = useCallback(
    (key, fallback) => selectCategoryAccent(categoryIndex, key, fallback),
    [categoryIndex]
  );

  const getCategoryBadge = useCallback(
    (key) => selectCategoryBadge(categoryIndex, key),
    [categoryIndex]
  );

  const contextValue = useMemo(
    () => ({
      food_list,
      cartItems,
      setCartItems,
  clearCart,
      addToCart,
      removeFromCart,
      getTotalCartAmount,
      url,
      token,
      setToken,
      currency: DEFAULT_CURRENCY,
      deliveryFee: DEFAULT_DELIVERY_FEE,
      categories,
      categoriesLoading,
      categoriesError,
      getCategoryMeta,
      getCategoryDescriptor,
      getCategoryAccent,
      getCategoryBadge,
      defaultCategoryDescriptor: DEFAULT_CATEGORY_DESCRIPTOR,
      usingFallbackCategories,
    }),
    [
      food_list,
      cartItems,
      addToCart,
      removeFromCart,
      getTotalCartAmount,
      url,
      token,
      categories,
      categoriesLoading,
      categoriesError,
      getCategoryMeta,
      getCategoryDescriptor,
      getCategoryAccent,
      getCategoryBadge,
      usingFallbackCategories,
      clearCart,
    ]
  );

  return (
    <StoreContext.Provider value={contextValue}>{children}</StoreContext.Provider>
  );
};

StoreContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default StoreContextProvider;
