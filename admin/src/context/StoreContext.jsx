import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import PropTypes from "prop-types";
import { API_BASE_URL } from "../config";

export const StoreContext = createContext(null);

const StoreContextProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  });
  const [admin, setAdmin] = useState(() => {
    if (typeof window === "undefined") return false;
    const storedValue = localStorage.getItem("admin");
    if (storedValue === null) return false;
    if (typeof storedValue === "string") {
      return storedValue === "true";
    }
    return Boolean(storedValue);
  });
  const [apiBaseUrl] = useState(API_BASE_URL);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoriesError, setCategoriesError] = useState(null);

  const fetchCategories = useCallback(async () => {
    setCategoriesLoading(true);
    try {
      const response = await axios.get(`${apiBaseUrl}/api/food/categories`);
      if (response.data.success && Array.isArray(response.data.data)) {
        setCategories(response.data.data);
        setCategoriesError(null);
      } else {
        const message = response.data.message || "Unable to load menu categories";
        setCategories([]);
        setCategoriesError(message);
        toast.error(message);
      }
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to load menu categories. Please retry.";
      setCategories([]);
      setCategoriesError(message);
      toast.error(message);
    } finally {
      setCategoriesLoading(false);
    }
  }, [apiBaseUrl]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const contextValue = useMemo(
    () => ({
      token,
      setToken,
      admin,
      setAdmin,
      apiBaseUrl,
      categories,
      categoriesLoading,
      categoriesError,
      refreshCategories: fetchCategories,
    }),
    [
      token,
      admin,
      apiBaseUrl,
      categories,
      categoriesLoading,
      categoriesError,
      fetchCategories,
    ]
  );
  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
};

StoreContextProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default StoreContextProvider;
