import "./Sidebar.css";
import { assets } from "../../assets/assets";
import { NavLink } from "react-router-dom";

const navItems = [
  { to: "add", label: "Add Items", icon: assets.add_icon },
  { to: "list", label: "List Items", icon: assets.list_icon },
  { to: "orders", label: "Orders", icon: assets.parcel_icon },
  { to: "analytics", label: "Analytics", icon: assets.analytics_icon },
  { to: "coupons", label: "Coupons", icon: assets.coupon_icon },
];

const Sidebar = () => {
  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <nav className="admin-sidebar__nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `admin-sidebar__link${isActive ? " admin-sidebar__link--active" : ""}`
            }
          >
            <span className="admin-sidebar__icon" aria-hidden>
              <img src={item.icon} alt="" />
            </span>
            <span className="admin-sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
