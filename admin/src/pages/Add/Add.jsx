import { useContext, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import "./Add.css";
import { assets } from "../../assets/assets";
import axios from "axios";
import { toast } from "react-toastify";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";
import { extractCurrencySymbol } from "../../utils/currency";

const Add = ({ url }) => {
  const navigate = useNavigate();
  const {
    token,
    admin,
    categories,
    categoriesLoading,
    categoriesError,
    refreshCategories,
  } = useContext(StoreContext);
  const [image, setImage] = useState(false);
  const currencySymbol = useMemo(() => extractCurrencySymbol(), []);


  const [data, setData] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
  });

  const categoryOptions = useMemo(() => {
    if (!Array.isArray(categories)) return [];
    return categories
      .filter((item) => item && (item.id || item.slug))
      .map((item) => ({
        value: item.id || item.slug,
        label: item.labelEn || item.label || item.id || item.slug,
      }));
  }, [categories]);

  useEffect(() => {
    if (categoryOptions.length === 0) return;
    setData((prev) => {
      if (prev.category && categoryOptions.some((opt) => opt.value === prev.category)) {
        return prev;
      }
      return { ...prev, category: categoryOptions[0].value };
    });
  }, [categoryOptions]);

  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    if (!data.category) {
      toast.error("Please choose a category before adding the dish.");
      return;
    }

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", Number(data.price));
    formData.append("category", data.category);
    formData.append("image", image);

    try {
      const response = await axios.post(`${url}/api/food/add`, formData, {
        headers: { token },
      });
      if (response.data.success) {
        setData({
          name: "",
          description: "",
          price: "",
          category: categoryOptions[0]?.value || "",
        });
        setImage(false);
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("We couldn’t add that dish. Please retry.");
    }
  };
  useEffect(() => {
    if (!admin && !token) {
      toast.error("Please Login First");
      navigate("/");
    }
  }, [admin, token, navigate]);
  return (
    <section className="add admin-panel">
      <form onSubmit={onSubmitHandler}>
        <div className="add-img-upload">
          <p>Upload image</p>
          <label htmlFor="image">
            <img
              src={image ? URL.createObjectURL(image) : assets.upload_area}
              alt=""
            />
          </label>
          <input
            onChange={(e) => setImage(e.target.files[0])}
            type="file"
            id="image"
            hidden
            required
          />
        </div>
        <div className="add-product-name flex-col">
          <p>Product name</p>
          <input
            onChange={onChangeHandler}
            value={data.name}
            type="text"
            name="name"
            placeholder="Type here"
            required
          />
        </div>
        <div className="add-product-description flex-col">
          <p>Product description</p>
          <textarea
            onChange={onChangeHandler}
            value={data.description}
            name="description"
            rows="6"
            placeholder="Write content here"
            required
          ></textarea>
        </div>
        <div className="add-category-price">
          <div className="add-category flex-col">
            <p>Product category</p>
            <select
              name="category"
              required
              onChange={onChangeHandler}
              value={data.category}
              disabled={categoriesLoading || categoryOptions.length === 0}
            >
              {categoriesLoading ? (
                <option value="" disabled>
                  Loading categories…
                </option>
              ) : categoryOptions.length === 0 ? (
                <option value="" disabled>
                  No categories available
                </option>
              ) : (
                categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))
              )}
            </select>
            {categoriesError ? (
              <div className="add-category-status">
                <p>{categoriesError}</p>
                <button type="button" onClick={refreshCategories}>
                  Retry
                </button>
              </div>
            ) : null}
          </div>
          <div className="add-price flex-col">
            <p>
              Product price <span className="add-price__currency">({currencySymbol})</span>
            </p>
            <input
              onChange={onChangeHandler}
              value={data.price}
              type="number"
              name="price"
              placeholder={`${currencySymbol}0`}
              min="0"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          className="add-btn"
          disabled={categoriesLoading || categoryOptions.length === 0}
        >
          ADD
        </button>
      </form>
    </section>
  );
};

Add.propTypes = {
  url: PropTypes.string.isRequired,
};

export default Add;
