import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./List.css";
import axios from "axios";
import { toast } from "react-toastify";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const ITEMS_PER_PAGE = 20;

const List = ({ url }) => {
  const navigate = useNavigate();
  const { token, admin } = useContext(StoreContext);
  const [list, setList] = useState([]);
  const [sortField, setSortField] = useState("name");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const currencyCode = import.meta.env.VITE_CURRENCY || "INR";

  const currencyFormatter = useMemo(() => {
    const locale = currencyCode === "INR" ? "en-IN" : "en-US";
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    });
  }, [currencyCode]);

  const fetchList = useCallback(async () => {
    try {
      const response = await axios.get(`${url}/api/food/list`);
      if (response.data.success) {
        setList(response.data.data);
      } else {
        toast.error(response.data.message || "Unable to load dishes");
      }
    } catch (error) {
      toast.error("Unable to load dishes. Please retry.");
    }
  }, [url]);

  const removeFood = useCallback(
    async (foodId) => {
      try {
        const response = await axios.post(
          `${url}/api/food/remove`,
          { id: foodId },
          { headers: { token } }
        );
        await fetchList();
        if (response.data.success) {
          toast.success(response.data.message);
        } else {
          toast.error(response.data.message || "Unable to remove dish");
        }
      } catch (error) {
        toast.error("Unable to remove dish. Please retry.");
      }
    },
    [fetchList, token, url]
  );
  useEffect(() => {
    if (!admin && !token) {
      toast.error("Please Login First");
      navigate("/");
    }
    fetchList();
  }, [admin, token, navigate, fetchList]);

  const sortedList = useMemo(() => {
    if (!Array.isArray(list)) return [];

    const sorted = [...list];

    const compareString = (a = "", b = "") => {
      return a.toString().localeCompare(b.toString(), undefined, {
        sensitivity: "base",
        numeric: true,
      });
    };

    sorted.sort((a, b) => {
      const direction = sortOrder === "desc" ? -1 : 1;

      if (sortField === "price") {
        const priceA = Number(a.price) || 0;
        const priceB = Number(b.price) || 0;
        return (priceA - priceB) * direction;
      }

      if (sortField === "category") {
        return compareString(a.category, b.category) * direction;
      }

      return compareString(a.name, b.name) * direction;
    });

    return sorted;
  }, [list, sortField, sortOrder]);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const getSortIndicator = (field) => {
    if (sortField !== field) return "inactive";
    return sortOrder;
  };

  const totalPages = useMemo(() => {
    if (!sortedList.length) return 1;
    return Math.max(1, Math.ceil(sortedList.length / ITEMS_PER_PAGE));
  }, [sortedList.length]);

  useEffect(() => {
    setCurrentPage((prev) => {
      if (prev < 1) return 1;
      if (prev > totalPages) return totalPages;
      return prev;
    });
  }, [totalPages]);

  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return sortedList.slice(start, end);
  }, [currentPage, sortedList]);

  const showPagination = sortedList.length > ITEMS_PER_PAGE;
  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, index) => index + 1),
    [totalPages]
  );

  const firstVisibleIndex = sortedList.length
    ? (currentPage - 1) * ITEMS_PER_PAGE + 1
    : 0;
  const lastVisibleIndex = firstVisibleIndex + paginatedList.length - 1;

  const goToPage = (page) => {
    setCurrentPage((prev) => {
      const next = Math.min(Math.max(page, 1), totalPages);
      return next === prev ? prev : next;
    });
  };

  return (
    <section className="list admin-panel flex-col">
      <header className="list-header">
        <div>
          <h3>All Food Items</h3>
          <p className="list-header__meta" aria-live="polite">
            {sortedList.length
              ? `Showing ${firstVisibleIndex}${
                  lastVisibleIndex > firstVisibleIndex ? `–${lastVisibleIndex}` : ""
                } of ${sortedList.length} item${sortedList.length === 1 ? "" : "s"}`
              : "No items available"}
          </p>
        </div>
      </header>
      <div className="list-table">
        <div className="list-table-format title">
          <b>Image</b>
          <button
            type="button"
            className="list-table__sort-button"
            onClick={() => toggleSort("name")}
          >
            <span>Name</span>
            <span
              className={`sort-indicator sort-indicator--${getSortIndicator(
                "name"
              )}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            className="list-table__sort-button"
            onClick={() => toggleSort("category")}
          >
            <span>Category</span>
            <span
              className={`sort-indicator sort-indicator--${getSortIndicator(
                "category"
              )}`}
              aria-hidden
            />
          </button>
          <button
            type="button"
            className="list-table__sort-button"
            onClick={() => toggleSort("price")}
          >
            <span>Price</span>
            <span
              className={`sort-indicator sort-indicator--${getSortIndicator(
                "price"
              )}`}
              aria-hidden
            />
          </button>
          <b>Action</b>
        </div>
  {paginatedList.map((item) => {
          const itemPrice = Number(item.price) || 0;

          return (
            <div key={item._id} className="list-table-format">
              <img src={`${url}/images/${item.image}`} alt="" />
              <p>{item.name}</p>
              <p>{item.category}</p>
              <p>{currencyFormatter.format(itemPrice)}</p>
              <button
                type="button"
                onClick={() => removeFood(item._id)}
                className="list-remove-button"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>
      {showPagination && (
        <nav className="list-pagination" aria-label="Food items pagination">
          <button
            type="button"
            className="list-pagination__button"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          <ul className="list-pagination__pages">
            {pageNumbers.map((pageNumber) => (
              <li key={pageNumber}>
                <button
                  type="button"
                  className={`list-pagination__page${
                    pageNumber === currentPage ? " list-pagination__page--active" : ""
                  }`}
                  onClick={() => goToPage(pageNumber)}
                  aria-current={pageNumber === currentPage ? "page" : undefined}
                >
                  {pageNumber}
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="list-pagination__button"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </nav>
      )}
    </section>
  );
};

List.propTypes = {
  url: PropTypes.string.isRequired,
};

export default List;
