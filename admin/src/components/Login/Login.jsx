import { useContext, useEffect, useState } from "react";
import PropTypes from "prop-types";
import "./Login.css";
import { toast } from "react-toastify";
import axios from "axios";
import { StoreContext } from "../../context/StoreContext";
import { useNavigate } from "react-router-dom";

const Login = ({ url }) => {
  const navigate = useNavigate();
  const { admin, setAdmin, token, setToken } = useContext(StoreContext);
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const onChangeHandler = (event) => {
    const { name, value } = event.target;
    setData((prev) => ({ ...prev, [name]: value }));
  };
  const onLogin = async (event) => {
    event.preventDefault();
    try {
      const response = await axios.post(url + "/api/user/login", data);
      if (response.data.success) {
        if (response.data.role === "admin") {
          setToken(response.data.token);
          setAdmin(true);
          localStorage.setItem("token", response.data.token);
          localStorage.setItem("admin", "true");
          toast.success("Login Successfully");
          navigate("/add");
        } else {
          toast.error("You are not an admin");
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Login failed. Please try again.");
    }
  };
  useEffect(() => {
    if (admin && token) {
      navigate("/add");
    }
  }, [admin, token, navigate]);
  return (
    <section className="login admin-panel">
      <form onSubmit={onLogin} className="login__form">
        <div className="login__header">
          <h2>Admin Console</h2>
          <p>Sign in to manage menus, orders, and festive perks.</p>
        </div>
        <div className="login__inputs">
          <input
            name="email"
            onChange={onChangeHandler}
            value={data.email}
            type="email"
            placeholder="Your email"
            required
          />
          <input
            name="password"
            onChange={onChangeHandler}
            value={data.password}
            type="password"
            placeholder="Your password"
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </section>
  );
};

Login.propTypes = {
  url: PropTypes.string.isRequired,
};

export default Login;
