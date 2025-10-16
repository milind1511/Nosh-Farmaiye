import { useCallback, useEffect, useState } from "react";
import "./Home.css";
import Header from "../../components/Header/Header";
import ExploreMenu from "../../components/ExploreMenu/ExploreMenu";
import FoodDisplay from "../../components/FoodDisplay/FoodDisplay";
import AppDownload from "../../components/AppDownload/AppDownload";
import FestiveOffers from "../../components/FestiveOffers/FestiveOffers";
import { useLocation, useNavigate } from "react-router-dom";

const Home = () => {
  const [category, setCategory] = useState("All");
  const location = useLocation();
  const navigate = useNavigate();

  const scrollToSection = useCallback((targetId) => {
    if (!targetId || typeof document === "undefined") return;
    const section = document.getElementById(targetId);
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    const handleNavigateHome = (event) => {
      if (!event?.detail) return;
      const { category: requestedCategory, targetId } = event.detail;
      if (requestedCategory) {
        setCategory(requestedCategory);
      }
      if (targetId) {
        window.requestAnimationFrame(() => scrollToSection(targetId));
      }
    };

    window.addEventListener("nosh:navigate-home", handleNavigateHome);
    return () => {
      window.removeEventListener("nosh:navigate-home", handleNavigateHome);
    };
  }, [scrollToSection]);

  useEffect(() => {
    if (!location.state) return;

    const { focusCategory, scrollTo } = location.state;

    if (focusCategory) {
      setCategory(focusCategory);
    }

    if (scrollTo) {
      window.requestAnimationFrame(() => scrollToSection(scrollTo));
    }

    navigate(location.pathname + location.search, { replace: true, state: null });
  }, [location, navigate, scrollToSection]);

  useEffect(() => {
    if (!location.hash) return;
    const targetId = location.hash.replace("#", "");
    if (targetId) {
      window.requestAnimationFrame(() => scrollToSection(targetId));
    }
  }, [location.hash, scrollToSection]);

  return (
    <div>
      <Header />
      <ExploreMenu category={category} setCategory={setCategory} />
      <FoodDisplay category={category} />
      <FestiveOffers />
      <AppDownload />
    </div>
  );
};

export default Home;
