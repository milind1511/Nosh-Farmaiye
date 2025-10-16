import "./Header.css";

const Header = () => {
  return (
    <header className="hero">
      <div className="hero__content">
        <span className="hero__eyebrow">घर की रसोई • Ghar ki Rasoi</span>
        <h1>
          Slow-cooked <span>delicacies</span> crafted with heirloom
          spices.
        </h1>
        <p>
          Each handi is simmered patiently the way our owner-chef prepares it
          for festivals at home—layered with saffron, hand-ground masalas, and
          pure ghee. Fresh tandoori rotis and indulgent desserts complete the
          experience.
        </p>
        <div className="hero__cta-group">
          <a className="hero__cta hero__cta--primary" href="#explore-menu">
            Explore the menu
          </a>
        </div>
        <div className="hero__meta">
          <div>
            <p className="hero__meta-title">Delivery slots</p>
            <p className="hero__meta-value">Lunch &amp; Dinner • Daily</p>
          </div>
        </div>
      </div>
      <div className="hero__visual" aria-hidden>
        <div className="hero__card">
          <span className="hero__card-badge">Chef’s Special</span>
          <h3>Nalli Nihari</h3>
          <p>12-hour slow simmer, finished with smoked ghee tadka.</p>
          <ul>
            <li>Handmade garam masala</li>
            <li>Stone-ground spices</li>
            <li>House-curated saffron</li>
          </ul>
        </div>
      </div>
    </header>
  );
};

export default Header;
